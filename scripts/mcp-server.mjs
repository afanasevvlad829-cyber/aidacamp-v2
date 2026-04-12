#!/usr/bin/env node
/**
 * АйДаКемп MCP Server
 * Exposes stats.sh and browser-agent.sh as tools for Claude agents.
 *
 * Usage: node scripts/mcp-server.mjs
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, readdir, stat, mkdir, rename, access } from "node:fs/promises";

import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { appendFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = resolve(__dirname, "../logs/mcp-server.log");
const STATS_SH = resolve(__dirname, "stats.sh");
const BROWSER_SH = resolve(__dirname, "browser-agent.sh");
const YADISK_SH = resolve(__dirname, "yadisk.sh");

// --- Load tokens from .env files ---
async function loadEnv(path) {
  try {
    const content = await readFile(path, "utf-8");
    const vars = {};
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m) vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return vars;
  } catch { return {}; }
}

const LOCAL_ENV = await loadEnv(join(process.env.HOME || "/Users/vladimirafanasev", ".codex/mcp-state/yandex-direct-metrica-mcp/.env"));

function getToken(key) {
  return process.env[key] || LOCAL_ENV[key] || "";
}

// --- Logging ---
async function log(level, tool, message, details) {
  const ts = new Date().toISOString();
  const line = JSON.stringify({ ts, level, tool, message, ...(details ? { details } : {}) });
  try { await appendFile(LOG_FILE, line + "\n"); } catch {}
  // Всегда выводим в stderr — видно в терминале
  const icons = { info: "✅", error: "❌", warn: "⚠️" };
  const icon = icons[level] || "·";
  const time = ts.replace(/.*T/, "").replace(/\.\d+Z/, "");
  process.stderr.write(`${icon} ${time} [${tool}] ${message}\n`);
}

// --- Error classification ---
// Returns a human-readable error message for agents instead of raw API dumps
function classifyError(tool, err, context) {
  // Timeout
  if (err.killed || err.code === "ETIMEDOUT" || (err.message && err.message.includes("timeout"))) {
    return {
      category: "timeout",
      agent_message: `⏱ ${tool}: операция превысила лимит времени. Сервер работает, но внешний запрос не ответил вовремя. Попробуй повторить или упростить запрос.`,
    };
  }
  // Network / connection
  if (["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"].includes(err.code)) {
    return {
      category: "network",
      agent_message: `🌐 ${tool}: сетевая ошибка (${err.code}). Внешний сервис недоступен. MCP-сервер работает нормально — проблема на стороне API. Попробуй повторить через минуту.`,
    };
  }
  // SSH
  if (tool === "ssh" && err.message) {
    if (err.message.includes("Permission denied")) {
      return { category: "auth", agent_message: `🔑 ssh: доступ запрещён. Проверь хост и ключ.` };
    }
    if (err.message.includes("Connection refused") || err.message.includes("No route to host")) {
      return { category: "network", agent_message: `🌐 ssh: сервер недоступен. MCP работает — сервер ${context?.host || ""} не отвечает.` };
    }
  }
  // File not found
  if (err.code === "ENOENT") {
    return {
      category: "not_found",
      agent_message: `📁 ${tool}: файл или команда не найдены (${err.path || ""}). Проверь путь.`,
    };
  }
  // Generic JS error
  return {
    category: "internal",
    agent_message: `❌ ${tool}: ${err.message}. MCP-сервер работает — это ошибка в обработке запроса, не сбой сервера.`,
  };
}

// Classify VK API response errors (non-2xx)
function classifyVkError(tool, res, action) {
  const status = res.status;
  const body = res.body;
  const errMsg = body?.error?.message || body?.error_description || body?.detail || (typeof body === "string" ? body : JSON.stringify(body));

  if (status === 401 || status === 403) {
    return `🔑 ${tool} [${action}]: VK вернул HTTP ${status} (${errMsg}).\n` +
      `Токен уже был автоматически обновлён и запрос повторён — но ошибка осталась.\n` +
      `ДЕЙСТВИЯ: 1) Вызови diagnostics() чтобы проверить состояние токена. ` +
      `2) Если diagnostics показывает VK: OK — проблема в правах доступа к объекту, не в токене. ` +
      `3) Если diagnostics показывает VK: FAIL — сообщи пользователю: «VK OAuth не работает, нужна проверка client_id/client_secret». ` +
      `НЕ проси перезапустить MCP и НЕ ищи конфиги через SSH.`;
  }
  if (status === 400 || status === 422) {
    return `⚠️ ${tool} [${action}]: VK отклонил запрос (HTTP ${status}). Ошибка: ${errMsg}\n` +
      `ДЕЙСТВИЯ: Проверь параметры. Для создания объявлений сначала узнай формат через vk_packages(package_id: ...). ` +
      `API-токен видит ТОЛЬКО объекты, созданные через API — объекты из веб-интерфейса ads.vk.com недоступны.`;
  }
  if (status === 404) {
    return `🔍 ${tool} [${action}]: объект не найден (HTTP 404). Ошибка: ${errMsg}\n` +
      `ДЕЙСТВИЯ: Проверь ID. API видит только объекты, созданные через API. ` +
      `Для списка доступных кампаний: vk_campaigns(). Для групп: vk_manage_ad_group(action: "list", campaign_id: ...).`;
  }
  if (status >= 500) {
    return `🔧 ${tool} [${action}]: ошибка на стороне VK (HTTP ${status}). MCP работает — проблема у VK. Повтори через 30 сек.`;
  }
  return null; // not an error
}

// Classify Yandex Direct API response errors
function classifyDirectError(tool, res, action) {
  const body = res.body;
  if (body?.error) {
    const code = body.error.error_code || "";
    const msg = body.error.error_detail || body.error.error_string || JSON.stringify(body.error);
    if (code === 53 || code === 52) {
      return `🔑 ${tool} [${action}]: Директ: ошибка авторизации (код ${code}). Ошибка: ${msg}\n` +
        `ДЕЙСТВИЯ: 1) Вызови diagnostics() для проверки. ` +
        `2) Сообщи пользователю: «Токен Яндекс.Директ невалиден, нужно обновить вручную через OAuth». ` +
        `НЕ ищи токен через SSH — он хранится локально на Mac.`;
    }
    return `⚠️ ${tool} [${action}]: Директ отклонил запрос (код ${code}). Ошибка: ${msg}\n` +
      `ДЕЙСТВИЯ: Проверь параметры. Структура кампаний: 708664426 (Поиск), 708698819 (РСЯ). ` +
      `Для статистики используй stats(), не API Директа.`;
  }
  return null;
}

// --- HTTP helpers for APIs ---
function apiRequest(url, options = {}) {
  const timeoutMs = options.timeout || 30_000;
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? httpsRequest : httpRequest;
    const req = mod(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`API timeout after ${timeoutMs}ms: ${url}`));
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// --- VK OAuth client_credentials flow ---
// VK_CLIENT_ID + VK_CLIENT_SECRET → OAuth token (24h TTL, auto-refresh)
let _vkAccessToken = null;
let _vkTokenExpiry = 0;
let _vkRefreshToken = null;

async function vkGetOAuthToken() {
  if (_vkAccessToken && Date.now() < _vkTokenExpiry) return _vkAccessToken;

  const clientId = getToken("VK_CLIENT_ID") || getToken("VK_ACCOUNT_ID");
  const clientSecret = getToken("VK_CLIENT_SECRET") || getToken("VK_TOKEN");

  if (!clientId || !clientSecret) {
    throw new Error("VK: нет VK_CLIENT_ID + VK_CLIENT_SECRET в .env");
  }

  // Try refresh_token first (doesn't count toward 5-token limit)
  if (_vkRefreshToken) {
    const formData = `grant_type=refresh_token&refresh_token=${_vkRefreshToken}&client_id=${clientId}&client_secret=${clientSecret}`;
    const res = await apiRequest("https://ads.vk.com/api/v2/oauth2/token.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(formData) },
      body: formData,
    });
    if (res.body?.access_token) {
      _vkAccessToken = res.body.access_token;
      _vkRefreshToken = res.body.refresh_token || _vkRefreshToken;
      _vkTokenExpiry = Date.now() + (res.body.expires_in - 300) * 1000; // refresh 5min before expiry
      return _vkAccessToken;
    }
    _vkRefreshToken = null; // refresh failed, fall through to new token
  }

  // New token via client_credentials (with auto-cleanup if limit hit)
  for (let attempt = 0; attempt < 2; attempt++) {
    const formData = `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=read_ads,create_ads,read_payments`;
    const res = await apiRequest("https://ads.vk.com/api/v2/oauth2/token.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(formData) },
      body: formData,
    });
    if (res.body?.access_token) {
      _vkAccessToken = res.body.access_token;
      _vkRefreshToken = res.body.refresh_token || null;
      _vkTokenExpiry = Date.now() + (res.body.expires_in - 300) * 1000;
      return _vkAccessToken;
    }
    // Token limit reached (5 max) — cleanup all and retry once
    if (attempt === 0 && (res.status === 403 || res.body?.tokens_left === 0)) {
      const delForm = `client_id=${clientId}&client_secret=${clientSecret}`;
      await apiRequest("https://ads.vk.com/api/v2/oauth2/token/delete.json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(delForm) },
        body: delForm,
      });
      _vkAccessToken = null;
      _vkRefreshToken = null;
      _vkTokenExpiry = 0;
      continue;
    }
    throw new Error(`VK OAuth failed: ${JSON.stringify(res.body)}`);
  }
  throw new Error("VK OAuth: не удалось получить токен после cleanup");
}

async function vkCleanupToken() {
  if (!_vkAccessToken) return;
  const clientId = getToken("VK_CLIENT_ID") || getToken("VK_ACCOUNT_ID");
  const clientSecret = getToken("VK_CLIENT_SECRET") || getToken("VK_TOKEN");
  if (!clientId || !clientSecret) return;
  try {
    const formData = `client_id=${clientId}&client_secret=${clientSecret}`;
    await apiRequest("https://ads.vk.com/api/v2/oauth2/token/delete.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(formData) },
      body: formData,
    });
    _vkAccessToken = null;
    _vkRefreshToken = null;
    _vkTokenExpiry = 0;
  } catch {}
}

function _vkInvalidateToken() {
  _vkAccessToken = null;
  _vkRefreshToken = null;
  _vkTokenExpiry = 0;
}

async function vkApi(path, params = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await vkGetOAuthToken();
    const query = new URLSearchParams(params).toString();
    const sep = query ? "?" : "";
    const res = await apiRequest(`https://ads.vk.com/api/v2/${path}${sep}${query}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 && attempt === 0) {
      _vkInvalidateToken();
      continue;
    }
    return res;
  }
}

async function vkApiPost(path, body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await vkGetOAuthToken();
    const data = JSON.stringify(body);
    const res = await apiRequest(`https://ads.vk.com/api/v2/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
      body: data,
    });
    if (res.status === 401 && attempt === 0) {
      _vkInvalidateToken();
      continue;
    }
    return res;
  }
}

function directApi(service, method, params) {
  const token = getToken("YANDEX_ACCESS_TOKEN") || getToken("YANDEX_DIRECT_TOKEN");
  const login = getToken("YANDEX_DIRECT_CLIENT_LOGIN") || getToken("YANDEX_DIRECT_LOGIN") || "kv145";
  const data = JSON.stringify({ method, params });
  return apiRequest(`https://api.direct.yandex.com/json/v5/${service}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Login": login,
      "Accept-Language": "ru",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
    body: data,
  });
}

const server = new Server(
  { name: "aidacamp-tools", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// --- Tool definitions ---

// --- Known SSH hosts (shortcut aliases) ---
const SSH_HOSTS = {
  aidacamp: {
    host: "root@159.194.223.55",
    key: "~/.ssh/aidacamp_prod",
    description: "АйДаКемп prod server",
  },
};

const TOOLS = [
  {
    name: "diagnostics",
    description:
      "Диагностика MCP-сервера: проверяет VK OAuth токен, Direct токен, SSH-доступ к серверу, логи последних ошибок. " +
      "Вызывай ПЕРВЫМ ДЕЛОМ, если что-то не работает. НЕ проси пользователя перезапускать MCP — сначала проверь diagnostics.",
    inputSchema: {
      type: "object",
      properties: {
        checks: {
          type: "string",
          description: "Что проверить: all (по умолчанию), vk, direct, ssh, logs",
        },
      },
    },
  },
  {
    name: "ssh",
    description:
      "Выполнить команду на удалённом сервере через SSH. " +
      "Можно указать алиас (aidacamp) или произвольный хост. " +
      "Для АйДаКемп сервера (aidacamp): host=aidacamp, ключ подставится автоматически.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Команда для выполнения на удалённом сервере",
        },
        host: {
          type: "string",
          description: "Алиас (aidacamp) или user@hostname для подключения",
        },
        key: {
          type: "string",
          description: "Путь к SSH-ключу (необязательно, если используется алиас или ~/.ssh/config)",
        },
        port: {
          type: "number",
          description: "SSH-порт (по умолчанию 22)",
        },
      },
      required: ["command", "host"],
    },
  },
  {
    name: "stats",
    description:
      "Статистика рекламы и трафика АйДаКемп из PostgreSQL. " +
      "Команды: summary, direct, direct-daily, metrika, metrika-daily, goals, utm, placements, query, tables. " +
      "Периоды: today, yesterday, week, month, quarter, year, YYYY-MM-DD, YYYY-MM-DD:YYYY-MM-DD. " +
      "Таблицы: direct_campaign_stats, direct_placements, direct_search_queries, metrika_traffic, metrika_goals, metrika_utm.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Команда: summary | direct | direct-daily | metrika | metrika-daily | goals | utm | placements | query | tables | etl",
        },
        period: {
          type: "string",
          description: "Период: today, yesterday, week, month, quarter, year, YYYY-MM-DD, YYYY-MM-DD:YYYY-MM-DD",
        },
        sql: {
          type: "string",
          description: "SQL-запрос (только для command=query). Таблицы: direct_campaign_stats, direct_placements, direct_search_queries, metrika_traffic, metrika_goals, metrika_utm",
        },
        extra: {
          type: "string",
          description: "Доп. аргументы (напр. кол-во для placements)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "photos",
    description:
      "Поиск фотографий AidaCamp из проиндексированного каталога (9200 фото с AI-описаниями). " +
      "Команды: search <запрос> — поиск по описанию/тегам; best <сцена> [кол-во] — лучшие фото по сцене; " +
      "url <disk:/путь> — прямая ссылка на скачивание; preview <disk:/путь> — ссылка на превью; " +
      "scenes — список сцен; stats — общая статистика. " +
      "Сцены: занятие, хакатон, эмоции, спорт, территория, столовая, вожатые, награждение, портрет, обучение, скринкаст, обзор, прочее. " +
      "Качество: сайт (лучшее), соцсети, архив.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Команда: search | best | url | preview | info | scenes | stats",
        },
        query: {
          type: "string",
          description: "Поисковый запрос (для search), сцена (для best), путь disk:/... (для url/preview/info)",
        },
        count: {
          type: "number",
          description: "Кол-во результатов для best (по умолчанию 10)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "browser_agent",
    description:
      "Удалённый headless-браузер для скриншотов, скрапинга, краулинга, PDF, Lighthouse. " +
      "Работает через SSH на сервере. Используй вместо локального браузера.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Действие: screenshot | scrape | crawl | readpage | lighthouse | pdf | har | diff | list | fetch",
        },
        url: {
          type: "string",
          description: "URL для обработки",
        },
        options: {
          type: "string",
          description: "Доп. опции: для scrape — text|html|links|meta; для screenshot — filename [--full] [--mobile]; для crawl — max_pages [json|urls]",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "read_file",
    description: "Прочитать содержимое файла на локальной файловой системе.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Абсолютный путь к файлу" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Записать содержимое в файл (создаёт или перезаписывает).",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Абсолютный путь к файлу" },
        content: { type: "string", description: "Содержимое для записи" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "Список файлов и папок в директории.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Абсолютный путь к директории" },
      },
      required: ["path"],
    },
  },
  {
    name: "create_directory",
    description: "Создать директорию (включая вложенные).",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Абсолютный путь к директории" },
      },
      required: ["path"],
    },
  },
  // --- VK Ads (полное управление) ---
  // API: https://ads.vk.com/api/v2/
  // OAuth: client_credentials (VK_CLIENT_ID + VK_CLIENT_SECRET)
  // Лимит токенов: 5, auto-cleanup при исчерпании
  // Иерархия: ad_plan (кампания) → ad_group (группа) → banner (объявление)
  // Packages: 3232 (мультиформат), 3229 (мультиформат видео)
  {
    name: "vk_campaigns",
    description: "VK Ads: список кампаний (ad_plans). Поля: id, name, status, objective, budget_limit, budget_limit_day, package_id, date_start, date_end.",
    inputSchema: { type: "object", properties: {
      status: { type: "string", enum: ["all", "active", "blocked", "deleted"], description: "Фильтр по статусу" },
      fields: { type: "string", description: "Поля через запятую (по умолчанию: id,name,status,objective,budget_limit,budget_limit_day)" },
    }},
  },
  {
    name: "vk_manage_campaign",
    description: "VK Ads: создать, обновить или удалить кампанию (ad_plan). При создании автоматически создаётся группа.\n\nВАЖНО: objective для package 3232 — только 'site_conversions'. budget_limit и budget_limit_day нельзя ставить одновременно.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["create", "update", "delete"], description: "Действие" },
      id: { type: "number", description: "ID кампании (для update/delete)" },
      name: { type: "string", description: "Название" },
      objective: { type: "string", description: "Цель. Для package 3232 — только 'site_conversions'" },
      budget_limit: { type: "string", description: "Общий бюджет (руб). Нельзя вместе с budget_limit_day" },
      budget_limit_day: { type: "string", description: "Дневной бюджет (руб). Нельзя вместе с budget_limit" },
      status: { type: "string", enum: ["active", "blocked", "deleted"], description: "Статус (для update)" },
      package_id: { type: "number", description: "ID формата (3232=мультиформат). По умолчанию 3232" },
    }, required: ["action"]},
  },
  {
    name: "vk_manage_ad_group",
    description: "VK Ads: CRUD групп объявлений (ad_groups). Таргетинг задаётся в targetings: {sex: ['female'], age: {age_list: [25..45]}, geo: {regions: [1]}, pads: [...]}.\n\nВАЖНО: budget_limit и budget_limit_day нельзя ставить одновременно. autobidding_mode НЕ передавай при создании — API выставит автоматически. package_id обязателен при создании (3232=мультиформат).",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      campaign_id: { type: "number", description: "ID кампании (ad_plan_id)" },
      id: { type: "number", description: "ID группы (для update/delete)" },
      name: { type: "string", description: "Название группы" },
      package_id: { type: "number", description: "ID формата (3232=мультиформат). Обязателен при create" },
      targetings: { type: "object", description: "Таргетинг: {sex, age: {age_list}, geo: {regions}, fulltime, pads}" },
      budget_limit: { type: "string", description: "Общий бюджет группы (руб). Нельзя вместе с budget_limit_day" },
      budget_limit_day: { type: "string", description: "Дневной бюджет группы (руб). Нельзя вместе с budget_limit" },
      enable_utm: { type: "boolean", description: "Включить UTM-метки" },
      conversion_event_id: { type: "number", description: "ID события конверсии (для оптимизации на конверсии)" },
      status: { type: "string", enum: ["active", "blocked", "deleted"], description: "Статус (для update)" },
    }, required: ["action"]},
  },
  {
    name: "vk_manage_ad",
    description: "VK Ads: CRUD баннеров (banners). Создание: POST /ad_groups/{id}/banners.json.\n\nДля мультиформата (pkg 3232): title + text + content_image_id + content_icon_id + url.\nДля других пакетов: передавай textblocks и content как объекты напрямую.\n\nПеред созданием вызови vk_manage_ad(action='list') на существующих баннерах группы, чтобы увидеть нужные слоты.\n\ncall_to_action: 'learnMore', 'buy', 'signUp', 'book', 'install', 'contact', 'fillForm', 'joinGroup' и др.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      ad_group_id: { type: "number", description: "ID группы объявлений" },
      id: { type: "number", description: "ID баннера (для update/delete)" },
      title: { type: "string", description: "Заголовок (до 40 символов, слот title_40_vkads) — шорткат для textblocks" },
      text: { type: "string", description: "Описание (до 90 символов, слот text_90) — шорткат для textblocks" },
      textblocks: { type: "object", description: "Произвольные textblocks: {title_40_vkads:{text}, text_90:{text}, cta_sites_full:{text:'learnMore'}, ...}" },
      content: { type: "object", description: "Произвольный content: {image_1080x607:{id}, icon_256x256:{id}, ...}" },
      url: { type: "string", description: "Ссылка (создаст URL через /urls.json)" },
      url_id: { type: "number", description: "ID готовой ссылки (из /urls.json)" },
      content_image_id: { type: "number", description: "ID изображения 1080x607 — шорткат для content" },
      content_icon_id: { type: "number", description: "ID иконки 256x256 — шорткат для content" },
      call_to_action: { type: "string", description: "CTA: learnMore, buy, signUp, book и др. — шорткат для textblocks.cta_sites_full" },
      settings: { type: "object", description: "Доп. настройки баннера (settings)" },
      status: { type: "string", enum: ["active", "blocked", "deleted"], description: "Статус" },
    }, required: ["action"]},
  },
  {
    name: "vk_ads_stats",
    description: "VK Ads: статистика по дням — shows, clicks, spent, cpm, cpc, ctr, goals, cr. Уровни: campaign (ad_plans), group (ad_groups), banner (banners).",
    inputSchema: { type: "object", properties: {
      period: { type: "string", enum: ["yesterday", "week", "month", "quarter"], description: "Период" },
      level: { type: "string", enum: ["campaign", "group", "banner"], description: "Уровень детализации" },
    }},
  },
  // --- VK Ads: справочники и вспомогательные ---
  {
    name: "vk_urls",
    description: "VK Ads: список и создание ссылок (urls). list — все ссылки, create — новая.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create"], description: "Действие" },
      url: { type: "string", description: "URL для создания (action=create)" },
    }, required: ["action"]},
  },
  {
    name: "vk_content",
    description: "VK Ads: список и загрузка креативов (content). list — все креативы, upload — загрузка по URL изображения. Возвращает id для использования в баннерах.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "upload"], description: "Действие" },
      image_url: { type: "string", description: "URL изображения для загрузки (action=upload)" },
      content_type: { type: "string", enum: ["image", "video"], description: "Тип контента (по умолчанию image)" },
    }, required: ["action"]},
  },
  {
    name: "vk_packages",
    description: "VK Ads: справочник форматов объявлений (packages). 3232=мультиформат и т.д.",
    inputSchema: { type: "object", properties: {}},
  },
  {
    name: "vk_pads",
    description: "VK Ads: справочник площадок размещения (pads).",
    inputSchema: { type: "object", properties: {}},
  },
  {
    name: "vk_regions",
    description: "VK Ads: справочник регионов для таргетинга.",
    inputSchema: { type: "object", properties: {
      country: { type: "string", description: "Код страны (RU, BY и т.д.)" },
    }},
  },
  {
    name: "vk_interests",
    description: "VK Ads: справочник интересов для таргетинга.",
    inputSchema: { type: "object", properties: {}},
  },
  {
    name: "vk_demographics",
    description: "VK Ads: справочник демографических параметров для таргетинга.",
    inputSchema: { type: "object", properties: {}},
  },
  {
    name: "vk_pixels",
    description: "VK Ads: список пикселей (счётчиков) аккаунта.",
    inputSchema: { type: "object", properties: {}},
  },
  {
    name: "vk_pixel_events",
    description: "VK Ads: список событий конверсий пикселя. Возвращает conversion_event_id для использования в группах объявлений.",
    inputSchema: { type: "object", properties: {
      pixel_id: { type: "number", description: "ID пикселя (если не указан — все события)" },
    }},
  },
  {
    name: "vk_audiences",
    description: "VK Ads: CRUD аудиторий ретаргетинга.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "delete"], description: "Действие" },
      id: { type: "number", description: "ID аудитории (для delete)" },
      name: { type: "string", description: "Название (для create)" },
      source_id: { type: "number", description: "ID источника аудитории (для create)" },
    }, required: ["action"]},
  },
  {
    name: "vk_audience_sources",
    description: "VK Ads: список и создание источников аудиторий (файл, пиксель, похожая).",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create"], description: "Действие" },
      name: { type: "string", description: "Название (для create)" },
      type: { type: "string", description: "Тип источника (для create)" },
    }, required: ["action"]},
  },
  {
    name: "vk_lookalike",
    description: "VK Ads: создание похожей аудитории (lookalike).",
    inputSchema: { type: "object", properties: {
      source_audience_id: { type: "number", description: "ID исходной аудитории" },
      name: { type: "string", description: "Название" },
    }, required: ["source_audience_id"]},
  },
  {
    name: "vk_remarketing_rules",
    description: "VK Ads: правила ремаркетинга — список и создание.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create"], description: "Действие" },
      pixel_id: { type: "number", description: "ID пикселя (для create)" },
      name: { type: "string", description: "Название правила (для create)" },
      event_type: { type: "string", description: "Тип события (для create)" },
      url_pattern: { type: "string", description: "Шаблон URL (для create)" },
    }, required: ["action"]},
  },
  {
    name: "vk_banner_preview",
    description: "VK Ads: превью объявления (баннера) по ID.",
    inputSchema: { type: "object", properties: {
      banner_id: { type: "number", description: "ID баннера" },
    }, required: ["banner_id"]},
  },
  {
    name: "vk_stats_summary",
    description: "VK Ads: сводная статистика (не по дням) по кампаниям, группам или баннерам.",
    inputSchema: { type: "object", properties: {
      period: { type: "string", enum: ["yesterday", "week", "month", "quarter"], description: "Период" },
      level: { type: "string", enum: ["campaign", "group", "banner"], description: "Уровень" },
    }},
  },
  {
    name: "vk_mass_action",
    description: "VK Ads: массовые операции с кампаниями (остановить, запустить, удалить несколько сразу).",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["activate", "block", "delete"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "Массив ID кампаний" },
    }, required: ["action", "ids"]},
  },
  {
    name: "vk_lead_forms",
    description: "VK Ads: список и создание лид-форм.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create"], description: "Действие" },
      name: { type: "string", description: "Название формы (для create)" },
      fields: { type: "array", items: { type: "string" }, description: "Поля формы: name, phone, email и т.д. (для create)" },
    }, required: ["action"]},
  },
  // --- Яндекс Директ (полное управление) ---
  {
    name: "direct_campaigns",
    description: "Яндекс Директ: список кампаний, статусы, бюджеты.",
    inputSchema: { type: "object", properties: {
      status: { type: "string", enum: ["all", "active", "suspended", "archived"] },
    }},
  },
  {
    name: "direct_manage_campaign",
    description: "Яндекс Директ: создать, обновить, приостановить, возобновить, архивировать кампанию.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["create", "update", "resume", "suspend", "archive", "unarchive", "delete"], description: "Действие" },
      id: { type: "number", description: "ID кампании (для update/resume/suspend/archive/delete)" },
      name: { type: "string", description: "Название (для create/update)" },
      daily_budget: { type: "number", description: "Дневной бюджет в рублях" },
      strategy: { type: "string", enum: ["AVERAGE_CPC", "WB_MAXIMUM_CLICKS", "WB_MAXIMUM_CONVERSIONS", "AVERAGE_CPA"], description: "Стратегия" },
      start_date: { type: "string", description: "Дата начала YYYY-MM-DD" },
    }, required: ["action"]},
  },
  {
    name: "direct_manage_adgroup",
    description: "Яндекс Директ: создать, обновить или удалить группу объявлений.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      campaign_id: { type: "number", description: "ID кампании" },
      id: { type: "number", description: "ID группы (для update/delete)" },
      name: { type: "string", description: "Название группы" },
      region_ids: { type: "string", description: "ID регионов через запятую (напр. 1,213)" },
    }, required: ["action"]},
  },
  {
    name: "direct_manage_ad",
    description: "Яндекс Директ: создать, обновить, приостановить или удалить объявление.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "suspend", "resume", "delete"], description: "Действие" },
      ad_group_id: { type: "number", description: "ID группы объявлений" },
      id: { type: "number", description: "ID объявления (для update/suspend/resume/delete)" },
      title: { type: "string", description: "Заголовок (до 35 символов)" },
      title2: { type: "string", description: "Доп. заголовок (до 30 символов)" },
      text: { type: "string", description: "Текст объявления (до 81 символа)" },
      href: { type: "string", description: "Ссылка" },
    }, required: ["action"]},
  },
  {
    name: "direct_manage_keywords",
    description: "Яндекс Директ: добавить, обновить ставки или удалить ключевые слова.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "add", "update", "delete"], description: "Действие" },
      campaign_id: { type: "number", description: "ID кампании (для list)" },
      ad_group_id: { type: "number", description: "ID группы (для add)" },
      id: { type: "number", description: "ID ключевого слова (для update/delete)" },
      keyword: { type: "string", description: "Ключевое слово (для add)" },
      keywords: { type: "string", description: "Ключевые слова через ; (для массового add)" },
      bid: { type: "number", description: "Ставка в рублях (для add/update)" },
    }, required: ["action"]},
  },
  // --- Яндекс Директ: дополнительные сервисы ---
  {
    name: "direct_sitelinks",
    description: "Яндекс Директ: быстрые ссылки (sitelinks). list — по ID набора, create — создать набор, delete — удалить.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "delete"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "ID наборов (для list/delete)" },
      sitelinks: { type: "array", items: { type: "object" }, description: "Массив {Title, Href, Description} (для create)" },
    }, required: ["action"]},
  },
  {
    name: "direct_vcards",
    description: "Яндекс Директ: визитки (vcards) — адрес, телефон, режим работы.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "delete"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "ID визиток (для list/delete)" },
      campaign_id: { type: "number", description: "ID кампании (для list)" },
      vcard: { type: "object", description: "Данные визитки: {CompanyName, Phone:{CountryCode,CityCode,PhoneNumber}, WorkTime, Country, City, Street}" },
    }, required: ["action"]},
  },
  {
    name: "direct_adimages",
    description: "Яндекс Директ: изображения для объявлений. list — список, upload_url — загрузка по URL.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "upload_url", "delete"], description: "Действие" },
      image_url: { type: "string", description: "URL изображения для загрузки (action=upload_url)" },
      name: { type: "string", description: "Имя изображения (для upload_url)" },
      hashes: { type: "array", items: { type: "string" }, description: "Хеши изображений (для delete)" },
    }, required: ["action"]},
  },
  {
    name: "direct_adextensions",
    description: "Яндекс Директ: расширения объявлений — уточнения (callouts).",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "delete"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "ID расширений (для list/delete)" },
      callout: { type: "string", description: "Текст уточнения (для create)" },
      callouts: { type: "array", items: { type: "string" }, description: "Массив уточнений (для пакетного create)" },
    }, required: ["action"]},
  },
  {
    name: "direct_audience_targets",
    description: "Яндекс Директ: аудиторные условия (ретаргетинг, look-alike, интересы).",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "delete"], description: "Действие" },
      ad_group_id: { type: "number", description: "ID группы (для list/create)" },
      campaign_id: { type: "number", description: "ID кампании (для list)" },
      retargeting_list_id: { type: "number", description: "ID списка ретаргетинга (для create)" },
      interest_id: { type: "number", description: "ID интереса (для create)" },
      context_bid: { type: "number", description: "Ставка в рублях (для create)" },
      ids: { type: "array", items: { type: "number" }, description: "ID условий (для delete)" },
    }, required: ["action"]},
  },
  {
    name: "direct_retargeting_lists",
    description: "Яндекс Директ: списки ретаргетинга — управление аудиториями Метрики.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "ID списков (для list/delete)" },
      name: { type: "string", description: "Название (для create/update)" },
      conditions: { type: "array", items: { type: "object" }, description: "Условия [{Type, Goals:[{GoalId, Value}]}] (для create/update)" },
      id: { type: "number", description: "ID списка (для update)" },
    }, required: ["action"]},
  },
  {
    name: "direct_bid_modifiers",
    description: "Яндекс Директ: корректировки ставок (пол, возраст, устройство, регион, погода).",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      campaign_id: { type: "number", description: "ID кампании (для list/create)" },
      ad_group_id: { type: "number", description: "ID группы (для list/create)" },
      ids: { type: "array", items: { type: "number" }, description: "ID корректировок (для list/delete)" },
      modifier: { type: "object", description: "Корректировка: {CampaignId, MobileAdjustment:{BidModifier}, DemographicsAdjustment:{...}}" },
    }, required: ["action"]},
  },
  {
    name: "direct_bids",
    description: "Яндекс Директ: управление ставками на ключевые слова.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["get", "set", "set_auto"], description: "Действие" },
      campaign_id: { type: "number", description: "ID кампании (для get)" },
      ad_group_id: { type: "number", description: "ID группы (для get)" },
      keyword_ids: { type: "array", items: { type: "number" }, description: "ID ключевых слов" },
      bid: { type: "number", description: "Ставка в рублях (для set)" },
      context_bid: { type: "number", description: "Ставка в сетях (для set)" },
    }, required: ["action"]},
  },
  {
    name: "direct_changes",
    description: "Яндекс Директ: проверка изменений — что менялось с указанной даты.",
    inputSchema: { type: "object", properties: {
      since: { type: "string", description: "Дата-время: YYYY-MM-DDTHH:MM:SSZ" },
      campaign_ids: { type: "array", items: { type: "number" }, description: "ID кампаний" },
      field_names: { type: "array", items: { type: "string" }, description: "Поля: CampaignIds, AdGroupIds, AdIds" },
    }, required: ["since"]},
  },
  {
    name: "direct_dictionaries",
    description: "Яндекс Директ: справочники — регионы, валюты, интересы, площадки.",
    inputSchema: { type: "object", properties: {
      names: { type: "array", items: { type: "string" }, description: "Regions, Currencies, TimeZones, GeoRegions, Constants, InterestCategories, Interests, SupplySidePlatforms" },
    }, required: ["names"]},
  },
  {
    name: "direct_dynamic_targets",
    description: "Яндекс Директ: условия нацеливания для динамических объявлений.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      campaign_id: { type: "number", description: "ID кампании (для list)" },
      ad_group_id: { type: "number", description: "ID группы (для list/create)" },
      id: { type: "number", description: "ID условия (для update/delete)" },
      conditions: { type: "array", items: { type: "object" }, description: "[{Operand, Operator, Arguments}]" },
      bid: { type: "number", description: "Ставка в рублях" },
    }, required: ["action"]},
  },
  {
    name: "direct_negative_keywords",
    description: "Яндекс Директ: общие наборы минус-фраз (shared sets).",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "ID наборов (для list/delete)" },
      id: { type: "number", description: "ID набора (для update)" },
      name: { type: "string", description: "Название" },
      negative_keywords: { type: "array", items: { type: "string" }, description: "Минус-фразы" },
    }, required: ["action"]},
  },
  {
    name: "direct_turbopages",
    description: "Яндекс Директ: турбо-страницы.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "ID турбо-страниц" },
    }, required: ["action"]},
  },
  {
    name: "direct_leads",
    description: "Яндекс Директ: лиды из турбо-форм.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list"], description: "Действие" },
      since: { type: "string", description: "Дата с: YYYY-MM-DD" },
      until: { type: "string", description: "Дата по: YYYY-MM-DD" },
      turbo_page_ids: { type: "array", items: { type: "number" }, description: "ID турбо-страниц" },
    }, required: ["action"]},
  },
  {
    name: "direct_reports",
    description: "Яндекс Директ: кастомные отчёты (Reports API).",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["create"], description: "Действие" },
      report_type: { type: "string", description: "CAMPAIGN_PERFORMANCE_REPORT, AD_PERFORMANCE_REPORT, CUSTOM_REPORT и др." },
      date_from: { type: "string", description: "YYYY-MM-DD" },
      date_to: { type: "string", description: "YYYY-MM-DD" },
      field_names: { type: "array", items: { type: "string" }, description: "Поля отчёта" },
      filter: { type: "array", items: { type: "object" }, description: "[{Field, Operator, Values}]" },
      report_name: { type: "string", description: "Уникальное имя отчёта" },
    }, required: ["action"]},
  },
  {
    name: "direct_agency_clients",
    description: "Яндекс Директ: список клиентов агентства.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list"], description: "Действие" },
    }, required: ["action"]},
  },
  {
    name: "direct_creatives",
    description: "Яндекс Директ: креативы — видеодополнения, HTML5, смарт-центры.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "ID креативов" },
      types: { type: "array", items: { type: "string" }, description: "VIDEO_EXTENSION, CPC_VIDEO_CREATIVE, SMART_CREATIVE" },
    }, required: ["action"]},
  },
  {
    name: "direct_feeds",
    description: "Яндекс Директ: фиды товаров/услуг.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "ID фидов (для list/delete)" },
      id: { type: "number", description: "ID фида (для update)" },
      name: { type: "string", description: "Название" },
      url: { type: "string", description: "URL фида (для create)" },
    }, required: ["action"]},
  },
  {
    name: "direct_businesses",
    description: "Яндекс Директ: организации из Яндекс.Бизнеса.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list"], description: "Действие" },
      ids: { type: "array", items: { type: "number" }, description: "ID организаций" },
    }, required: ["action"]},
  },
  {
    name: "direct_smart_targets",
    description: "Яндекс Директ: условия нацеливания для смарт-баннеров.",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      campaign_id: { type: "number", description: "ID кампании (для list)" },
      ad_group_id: { type: "number", description: "ID группы (для list/create)" },
      id: { type: "number", description: "ID условия (для update/delete)" },
      conditions: { type: "array", items: { type: "object" }, description: "Условия фильтрации фида" },
    }, required: ["action"]},
  },
  // --- Microsoft Clarity ---
  {
    name: "clarity",
    description: "Microsoft Clarity: поведение на сайте — сессии, скролл, dead/rage клики, устройства, страницы. Данные из PostgreSQL (обновляются ежедневно).",
    inputSchema: { type: "object", properties: {
      report: { type: "string", enum: ["summary", "pages", "daily"], description: "Тип отчёта: summary (сводка), pages (по URL), daily (по дням)" },
      period: { type: "string", description: "Период: yesterday, week, month, YYYY-MM-DD" },
      limit: { type: "number", description: "Кол-во строк (по умолчанию 20)" },
    }},
  },
  // --- Google PageSpeed ---
  {
    name: "pagespeed",
    description: "Google PageSpeed Insights: аудит производительности, SEO, доступности сайта. Возвращает оценки и рекомендации.",
    inputSchema: { type: "object", properties: {
      url: { type: "string", description: "URL для проверки" },
      strategy: { type: "string", enum: ["mobile", "desktop"], description: "Стратегия (по умолчанию mobile)" },
      categories: { type: "string", description: "Категории через запятую: performance,seo,accessibility,best-practices (по умолчанию все)" },
    }, required: ["url"]},
  },
  // --- Обработка изображений ---
  {
    name: "image_edit",
    description: "Обработка изображений: яркость, контрастность, насыщенность, шарпинг, виньетка, ресайз, cinematic-эффекты. Использует ImageMagick и FFmpeg.",
    inputSchema: { type: "object", properties: {
      input: { type: "string", description: "Путь к исходному изображению" },
      output: { type: "string", description: "Путь для сохранения результата (если не указан — перезаписывает)" },
      brightness: { type: "number", description: "Яркость: -100..+100 (0 = без изменений)" },
      contrast: { type: "number", description: "Контрастность: -100..+100 (0 = без изменений)" },
      saturation: { type: "number", description: "Насыщенность в % (100 = без изменений, 130 = +30%)" },
      sharpen: { type: "number", description: "Сила шарпинга: 0..5 (0 = выкл, 1.5 = умеренный)" },
      vignette: { type: "boolean", description: "Добавить виньетку" },
      warmth: { type: "number", description: "Теплота: -30..+30 (0 = нейтрально, +20 = тёплый)" },
      resize: { type: "string", description: "Ресайз: '1080x607', '50%', '1920x'" },
      quality: { type: "number", description: "Качество сжатия: 1-100 (по умолчанию 85)" },
      format: { type: "string", enum: ["avif", "webp", "jpg", "png"], description: "Формат вывода" },
      cinematic: { type: "boolean", description: "Cinematic preset: теплота +15, контраст +10, виньетка, насыщенность 115%" },
      gamma: { type: "number", description: "Гамма-коррекция: 0.5..2.0 (1.0 = без изменений)" },
    }, required: ["input"]},
  },
];

// --- Handlers ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const callTime = new Date().toISOString().replace(/.*T/, "").replace(/\.\d+Z/, "");
  // Логируем входящий вызов с параметрами
  const argsSummary = Object.entries(args || {}).map(([k,v]) => `${k}=${typeof v === "string" && v.length > 60 ? v.slice(0,60) + "…" : v}`).join(", ");
  process.stderr.write(`\n📥 ${callTime} ← ${name}(${argsSummary})\n`);

  try {
    // --- Diagnostics tool ---
    if (name === "diagnostics") {
      const checks = (args.checks || "all").split(",").map(s => s.trim());
      const doAll = checks.includes("all");
      const results = [];
      const startTime = Date.now();

      // VK OAuth check
      if (doAll || checks.includes("vk")) {
        try {
          _vkInvalidateToken(); // force fresh token
          const token = await vkGetOAuthToken();
          const testRes = await vkApi("ad_plans.json", { limit: "1" });
          if (testRes.status === 200) {
            results.push(`✅ VK Ads: OK (токен получен, API отвечает, кампаний: ${testRes.body?.count || "?"})`);
          } else {
            results.push(`❌ VK Ads: токен получен, но API вернул HTTP ${testRes.status}: ${JSON.stringify(testRes.body).slice(0, 200)}`);
          }
        } catch (e) {
          results.push(`❌ VK Ads: ${e.message}`);
        }
      }

      // Direct check
      if (doAll || checks.includes("direct")) {
        try {
          const token = getToken("YANDEX_ACCESS_TOKEN") || getToken("YANDEX_DIRECT_TOKEN");
          if (!token) {
            results.push("❌ Яндекс.Директ: YANDEX_ACCESS_TOKEN не найден в .env");
          } else {
            const testRes = await directApi("campaigns", "get", { SelectionCriteria: { States: ["ON"] }, FieldNames: ["Id"], Page: { Limit: 1 } });
            if (testRes.body?.result) {
              results.push(`✅ Яндекс.Директ: OK (токен валиден, активных кампаний: ${testRes.body.result.Campaigns?.length || 0})`);
            } else if (testRes.body?.error) {
              results.push(`❌ Яндекс.Директ: код ${testRes.body.error.error_code} — ${testRes.body.error.error_detail || testRes.body.error.error_string}`);
            } else {
              results.push(`⚠️ Яндекс.Директ: неожиданный ответ — ${JSON.stringify(testRes.body).slice(0, 200)}`);
            }
          }
        } catch (e) {
          results.push(`❌ Яндекс.Директ: ${e.message}`);
        }
      }

      // SSH check
      if (doAll || checks.includes("ssh")) {
        try {
          const out = await run("ssh", ["-i", resolve(process.env.HOME || "", ".ssh/aidacamp_prod"), "-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=no", "root@159.194.223.55", "echo OK && uptime"], 10_000);
          results.push(`✅ SSH (159.194.223.55): ${out.trim()}`);
        } catch (e) {
          results.push(`❌ SSH: ${e.message}`);
        }
      }

      // Recent errors from log
      if (doAll || checks.includes("logs")) {
        try {
          const logContent = await readFile(LOG_FILE, "utf-8");
          const lines = logContent.trim().split("\n").filter(l => l.includes('"error"')).slice(-5);
          if (lines.length) {
            results.push(`📋 Последние ошибки (${lines.length}):`);
            for (const l of lines) {
              try {
                const entry = JSON.parse(l);
                results.push(`  ${entry.ts.slice(11, 19)} [${entry.tool}] ${entry.message.slice(0, 120)}`);
              } catch { results.push(`  ${l.slice(0, 120)}`); }
            }
          } else {
            results.push("📋 Ошибок в логе нет");
          }
        } catch {
          results.push("📋 Лог-файл не найден (ещё не было вызовов)");
        }
      }

      const elapsed = Date.now() - startTime;
      results.push(`\n⏱ Диагностика заняла ${elapsed}ms | PID: ${process.pid} | Uptime: ${Math.round(process.uptime())}s`);
      results.push(`\n💡 Если всё ✅ — MCP работает. Проблема в параметрах запроса или правах доступа к объекту. НЕ проси перезапуск MCP.`);

      return ok(results.join("\n"));
    }

    if (name === "ssh") {
      const alias = SSH_HOSTS[args.host];
      const host = alias ? alias.host : args.host;
      const key = args.key || (alias ? alias.key : null);
      const port = args.port || 22;

      const sshArgs = [
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ConnectTimeout=10",
      ];
      if (key) {
        const expandedKey = key.replace(/^~/, process.env.HOME || "/root");
        sshArgs.push("-i", expandedKey);
      }
      if (port !== 22) {
        sshArgs.push("-p", String(port));
      }
      sshArgs.push(host, args.command);

      try {
        const result = await run("ssh", sshArgs, 120_000);
        await log("info", name, `OK: ${host} "${args.command.slice(0, 60)}"`);
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        const classified = classifyError(name, err, { host });
        await log("error", name, classified.agent_message, { host, command: args.command, code: err.code });
        return { content: [{ type: "text", text: classified.agent_message }], isError: true };
      }
    }

    if (name === "stats") {
      const cmdArgs = [args.command];
      if (args.command === "query" && args.sql) {
        cmdArgs.push(args.sql);
      } else {
        if (args.period) cmdArgs.push(args.period);
        if (args.extra) cmdArgs.push(args.extra);
      }
      try {
        const result = await run(STATS_SH, cmdArgs);
        await log("info", name, `${args.command} OK`);
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        const msg = `⚠️ stats [${args.command}]: ошибка выполнения. ${err.code === "ETIMEDOUT" || err.killed ? "Таймаут — запрос слишком тяжёлый, упрости SQL или уменьши период." : `Детали: ${err.message}`} MCP-сервер работает нормально.`;
        await log("error", name, msg, { command: args.command, code: err.code });
        return { content: [{ type: "text", text: msg }], isError: true };
      }
    }

    if (name === "photos") {
      const cmdArgs = [args.command];
      if (args.command === "best") {
        if (args.query) cmdArgs.push(args.query);
        if (args.count) cmdArgs.push(String(args.count));
      } else if (args.command === "search") {
        if (args.query) cmdArgs.push(args.query);
      } else if (["url", "preview", "info"].includes(args.command)) {
        if (args.query) cmdArgs.push(args.query);
      }
      try {
        const result = await run(YADISK_SH, cmdArgs, 30_000);
        await log("info", name, `${args.command} OK`);
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        const msg = `⚠️ photos [${args.command}]: ${err.killed ? "таймаут поиска — попробуй более точный запрос" : err.message}. MCP-сервер работает.`;
        await log("error", name, msg, { command: args.command, query: args.query });
        return { content: [{ type: "text", text: msg }], isError: true };
      }
    }

    if (name === "browser_agent") {
      const cmdArgs = [args.action];
      if (args.url) cmdArgs.push(args.url);
      if (args.options) {
        let opts = args.options;
        if (args.action === "screenshot" && opts && !opts.match(/\.\w{2,4}(\s|$)/)) {
          const parts = opts.split(/\s+/);
          if (parts[0] && !parts[0].startsWith("--")) {
            parts[0] = parts[0] + ".png";
            opts = parts.join(" ");
          }
        }
        cmdArgs.push(...opts.split(" "));
      }
      try {
        const result = await run(BROWSER_SH, cmdArgs, 120_000);
        await log("info", name, `${args.action} OK: ${args.url || ""}`);
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        const msg = err.killed
          ? `⏱ browser_agent [${args.action}]: таймаут (2 мин). Страница слишком тяжёлая или сервер не отвечает. MCP работает.`
          : `⚠️ browser_agent [${args.action}]: ${err.message}. Проверь URL и доступность сервера. MCP работает.`;
        await log("error", name, msg, { action: args.action, url: args.url, code: err.code });
        return { content: [{ type: "text", text: msg }], isError: true };
      }
    }

    if (name === "read_file") {
      try {
        const content = await readFile(args.path, "utf-8");
        return { content: [{ type: "text", text: content }] };
      } catch (err) {
        const msg = err.code === "ENOENT"
          ? `📁 read_file: файл не найден: ${args.path}`
          : `⚠️ read_file: не удалось прочитать ${args.path}: ${err.message}`;
        await log("error", name, msg, { path: args.path, code: err.code });
        return { content: [{ type: "text", text: msg }], isError: true };
      }
    }

    if (name === "write_file") {
      try {
        await writeFile(args.path, args.content, "utf-8");
        await log("info", name, `OK: ${args.path} (${args.content.length} bytes)`);
        return { content: [{ type: "text", text: `Written ${args.content.length} bytes to ${args.path}` }] };
      } catch (err) {
        const msg = `⚠️ write_file: не удалось записать ${args.path}: ${err.message}`;
        await log("error", name, msg, { path: args.path, code: err.code });
        return { content: [{ type: "text", text: msg }], isError: true };
      }
    }

    if (name === "list_directory") {
      try {
        const entries = await readdir(args.path, { withFileTypes: true });
        const lines = entries.map(e => `${e.isDirectory() ? "[DIR]" : "[FILE]"} ${e.name}`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        const msg = err.code === "ENOENT"
          ? `📁 list_directory: папка не найдена: ${args.path}`
          : `⚠️ list_directory: ${err.message}`;
        await log("error", name, msg, { path: args.path, code: err.code });
        return { content: [{ type: "text", text: msg }], isError: true };
      }
    }

    if (name === "create_directory") {
      try {
        await mkdir(args.path, { recursive: true });
        return { content: [{ type: "text", text: `Created: ${args.path}` }] };
      } catch (err) {
        const msg = `⚠️ create_directory: не удалось создать ${args.path}: ${err.message}`;
        await log("error", name, msg, { path: args.path, code: err.code });
        return { content: [{ type: "text", text: msg }], isError: true };
      }
    }

    // --- VK Ads ---
    if (name === "vk_campaigns") {
      const fields = args.fields || "id,name,status,objective,budget_limit,budget_limit_day";
      const params = { limit: "100", fields };
      if (args.status && args.status !== "all") params._status = args.status;
      return await vkResult(await vkApi("ad_plans.json", params), name, "list");
    }

    if (name === "vk_manage_campaign") {
      if (args.action === "create") {
        const body = { name: args.name };
        if (args.objective) body.objective = args.objective;
        if (args.budget_limit) body.budget_limit = args.budget_limit;
        if (args.budget_limit_day) body.budget_limit_day = args.budget_limit_day;
        if (args.package_id) {
          body.campaigns = [{ name: args.name, package_id: args.package_id }];
        }
        return await vkResult(await vkApiPost("ad_plans.json", body), name, "create");
      }
      if (args.action === "update") {
        const body = {};
        if (args.name) body.name = args.name;
        if (args.budget_limit) body.budget_limit = args.budget_limit;
        if (args.budget_limit_day) body.budget_limit_day = args.budget_limit_day;
        if (args.status) body.status = args.status;
        return await vkResult(await vkApiPatch(`ad_plans/${args.id}.json`, body), name, "update");
      }
      if (args.action === "delete") {
        return await vkResult(await vkApiPatch(`ad_plans/${args.id}.json`, { status: "deleted" }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "vk_manage_ad_group") {
      if (args.action === "list") {
        const params = { limit: "100", fields: "id,name,ad_plan_id,status,package_id,targetings,budget_limit,budget_limit_day,autobidding_mode,conversion_event_id" };
        if (args.campaign_id) params._ad_plan_id = args.campaign_id;
        return await vkResult(await vkApi("ad_groups.json", params), name, "list");
      }
      if (args.action === "create") {
        const body = { name: args.name, ad_plan_id: args.campaign_id };
        if (args.package_id) body.package_id = args.package_id;
        if (args.targetings) body.targetings = args.targetings;
        if (args.budget_limit) body.budget_limit = args.budget_limit;
        if (args.budget_limit_day) body.budget_limit_day = args.budget_limit_day;
        if (args.enable_utm !== undefined) body.enable_utm = args.enable_utm;
        if (args.conversion_event_id) body.conversion_event_id = args.conversion_event_id;
        return await vkResult(await vkApiPost("ad_groups.json", body), name, "create");
      }
      if (args.action === "update") {
        const body = {};
        if (args.name) body.name = args.name;
        if (args.targetings) body.targetings = args.targetings;
        if (args.budget_limit) body.budget_limit = args.budget_limit;
        if (args.budget_limit_day) body.budget_limit_day = args.budget_limit_day;
        if (args.conversion_event_id) body.conversion_event_id = args.conversion_event_id;
        if (args.status) body.status = args.status;
        return await vkResult(await vkApiPatch(`ad_groups/${args.id}.json`, body), name, "update");
      }
      if (args.action === "delete") {
        return await vkResult(await vkApiPatch(`ad_groups/${args.id}.json`, { status: "deleted" }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "vk_manage_ad") {
      if (args.action === "list") {
        const params = { limit: "100", fields: "id,ad_group_id,name,status,moderation_status,content,urls,textblocks,call_to_action" };
        if (args.ad_group_id) params._ad_group_id = args.ad_group_id;
        return await vkResult(await vkApi("banners.json", params), name, "list");
      }
      if (args.action === "create") {
        let urlId = args.url_id;
        if (!urlId && args.url) {
          const urlRes = await vkApiPost("urls.json", { url: args.url });
          if (urlRes.status >= 400) {
            const msg = `⚠️ vk_manage_ad [create]: не удалось создать URL "${args.url}" (HTTP ${urlRes.status}): ${JSON.stringify(urlRes.body)}`;
            await log("error", name, msg, { status: urlRes.status, body: urlRes.body });
            return { content: [{ type: "text", text: msg }], isError: true };
          }
          urlId = urlRes.body?.id;
        }
        const body = {};
        if (urlId) body.urls = { primary: { id: urlId } };

        // Textblocks: произвольные ИЛИ из шорткатов title/text/call_to_action
        const tb = args.textblocks ? { ...args.textblocks } : {};
        if (args.title && !tb.title_40_vkads) tb.title_40_vkads = { text: args.title };
        if (args.text && !tb.text_90) tb.text_90 = { text: args.text };
        if (args.call_to_action && !tb.cta_sites_full) tb.cta_sites_full = { text: args.call_to_action };
        if (Object.keys(tb).length) body.textblocks = tb;

        // Content: произвольный ИЛИ из шорткатов
        const ct = args.content ? { ...args.content } : {};
        if (args.content_image_id && !ct.image_1080x607) ct.image_1080x607 = { id: args.content_image_id };
        if (args.content_icon_id && !ct.icon_256x256) ct.icon_256x256 = { id: args.content_icon_id };
        if (Object.keys(ct).length) body.content = ct;

        // Settings
        if (args.settings) body.settings = args.settings;

        return await vkResult(await vkApiPost(`ad_groups/${args.ad_group_id}/banners.json`, body), name, "create");
      }
      if (args.action === "update") {
        const body = {};
        const tb = args.textblocks ? { ...args.textblocks } : {};
        if (args.title && !tb.title_40_vkads) tb.title_40_vkads = { text: args.title };
        if (args.text && !tb.text_90) tb.text_90 = { text: args.text };
        if (args.call_to_action && !tb.cta_sites_full) tb.cta_sites_full = { text: args.call_to_action };
        if (Object.keys(tb).length) body.textblocks = tb;
        if (args.content) body.content = args.content;
        if (args.settings) body.settings = args.settings;
        if (args.status) body.status = args.status;
        const gid = args.ad_group_id || "_";
        return await vkResult(await vkApiPatch(`ad_groups/${gid}/banners/${args.id}.json`, body), name, "update");
      }
      if (args.action === "delete") {
        const gid = args.ad_group_id || "_";
        return await vkResult(await vkApiPatch(`ad_groups/${gid}/banners/${args.id}.json`, { status: "deleted" }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "vk_ads_stats") {
      const d = calcDates(args.period || "week");
      const levelMap = { campaign: "ad_plans", group: "ad_groups", banner: "banners" };
      const endpoint = levelMap[args.level] || "ad_plans";
      return await vkResult(await vkApi(`statistics/${endpoint}/day.json`, { date_from: d.from, date_to: d.to, metrics: "all" }), name, "stats");
    }

    // --- VK Ads: справочники и вспомогательные ---
    if (name === "vk_urls") {
      if (args.action === "list") {
        return await vkResult(await vkApi("urls.json", { limit: "100" }), name, "list");
      }
      if (args.action === "create") {
        return await vkResult(await vkApiPost("urls.json", { url: args.url }), name, "create");
      }
      return ok("Unknown action");
    }

    if (name === "vk_content") {
      if (args.action === "list") {
        return await vkResult(await vkApi("content.json", { limit: "100" }), name, "list");
      }
      if (args.action === "upload") {
        const body = { url: args.image_url };
        if (args.content_type) body.content_type = args.content_type;
        return await vkResult(await vkApiPost("content.json", body), name, "upload");
      }
      return ok("Unknown action");
    }

    if (name === "vk_packages") {
      return await vkResult(await vkApi("packages.json", { limit: "200" }), name, "list");
    }

    if (name === "vk_pads") {
      return await vkResult(await vkApi("pads.json", { limit: "200" }), name, "list");
    }

    if (name === "vk_regions") {
      const params = { limit: "500" };
      if (args.country) params.country = args.country;
      return await vkResult(await vkApi("regions.json", params), name, "list");
    }

    if (name === "vk_interests") {
      return await vkResult(await vkApi("interests.json", { limit: "500" }), name, "list");
    }

    if (name === "vk_demographics") {
      return await vkResult(await vkApi("demographics.json", { limit: "200" }), name, "list");
    }

    if (name === "vk_pixels") {
      return await vkResult(await vkApi("pixels.json", { limit: "50" }), name, "list");
    }

    if (name === "vk_pixel_events") {
      const params = { limit: "200" };
      if (args.pixel_id) params.pixel_id = args.pixel_id;
      return await vkResult(await vkApi("pixel_events.json", params), name, "list");
    }

    if (name === "vk_audiences") {
      if (args.action === "list") {
        return await vkResult(await vkApi("audiences.json", { limit: "100" }), name, "list");
      }
      if (args.action === "create") {
        const body = { name: args.name };
        if (args.source_id) body.source_id = args.source_id;
        return await vkResult(await vkApiPost("audiences.json", body), name, "create");
      }
      if (args.action === "delete") {
        return await vkResult(await vkApiDelete(`audiences/${args.id}.json`), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "vk_audience_sources") {
      if (args.action === "list") {
        return await vkResult(await vkApi("audience_sources.json", { limit: "100" }), name, "list");
      }
      if (args.action === "create") {
        const body = { name: args.name };
        if (args.type) body.type = args.type;
        return await vkResult(await vkApiPost("audience_sources.json", body), name, "create");
      }
      return ok("Unknown action");
    }

    if (name === "vk_lookalike") {
      const body = { source_audience_id: args.source_audience_id };
      if (args.name) body.name = args.name;
      return await vkResult(await vkApiPost("lookalike.json", body), name, "create");
    }

    if (name === "vk_remarketing_rules") {
      if (args.action === "list") {
        const params = { limit: "100" };
        if (args.pixel_id) params.pixel_id = args.pixel_id;
        return await vkResult(await vkApi("remarketing/rules.json", params), name, "list");
      }
      if (args.action === "create") {
        const body = {};
        if (args.pixel_id) body.pixel_id = args.pixel_id;
        if (args.name) body.name = args.name;
        if (args.event_type) body.event_type = args.event_type;
        if (args.url_pattern) body.url_pattern = args.url_pattern;
        return await vkResult(await vkApiPost("remarketing/rules.json", body), name, "create");
      }
      return ok("Unknown action");
    }

    if (name === "vk_banner_preview") {
      return await vkResult(await vkApi(`banner_preview/${args.banner_id}.json`), name, "preview");
    }

    if (name === "vk_stats_summary") {
      const d = calcDates(args.period || "week");
      const levelMap = { campaign: "ad_plans", group: "ad_groups", banner: "banners" };
      const endpoint = levelMap[args.level] || "ad_plans";
      return await vkResult(await vkApi(`statistics/${endpoint}/summary.json`, { date_from: d.from, date_to: d.to, metrics: "all" }), name, "stats");
    }

    if (name === "vk_mass_action") {
      const statusMap = { activate: "active", block: "blocked", delete: "deleted" };
      const status = statusMap[args.action];
      const results = [];
      for (const id of args.ids) {
        const res = await vkApiPatch(`ad_plans/${id}.json`, { status });
        results.push({ id, status: res.status, ok: res.status < 400 });
      }
      await log("info", name, `mass ${args.action}: ${results.filter(r => r.ok).length}/${results.length} OK`);
      return ok(results);
    }

    if (name === "vk_lead_forms") {
      if (args.action === "list") {
        return await vkResult(await vkApi("lead_forms.json", { limit: "100" }), name, "list");
      }
      if (args.action === "create") {
        const body = { name: args.name };
        if (args.fields) body.fields = args.fields;
        return await vkResult(await vkApiPost("lead_forms.json", body), name, "create");
      }
      return ok("Unknown action");
    }

    // --- Яндекс Директ ---
    if (name === "direct_campaigns") {
      const criteria = {};
      if (args.status === "active") criteria.States = ["ON"];
      else if (args.status === "suspended") criteria.States = ["SUSPENDED"];
      else if (args.status === "archived") criteria.States = ["ARCHIVED"];
      return await directResult(await directApi("campaigns", "get", {
        SelectionCriteria: criteria,
        FieldNames: ["Id", "Name", "State", "Status", "DailyBudget", "StartDate", "Statistics"],
      }), name, "list");
    }

    if (name === "direct_manage_campaign") {
      const a = args.action;
      if (["resume", "suspend", "archive", "unarchive", "delete"].includes(a)) {
        return await directResult(await directApi("campaigns", a, { SelectionCriteria: { Ids: [args.id] } }), name, a);
      }
      if (a === "create") {
        const campaign = {
          Name: args.name,
          StartDate: args.start_date || new Date().toISOString().slice(0, 10),
          TextCampaign: { BiddingStrategy: {
            Search: { BiddingStrategyType: args.strategy || "WB_MAXIMUM_CLICKS", WbMaximumClicks: {} },
            Network: { BiddingStrategyType: "SERVING_OFF" },
          }},
        };
        if (args.daily_budget) campaign.DailyBudget = { Amount: args.daily_budget * 1_000_000, Mode: "STANDARD" };
        return await directResult(await directApi("campaigns", "add", { Campaigns: [campaign] }), name, "create");
      }
      if (a === "update") {
        const changes = { Id: args.id };
        if (args.name) changes.Name = args.name;
        if (args.daily_budget) changes.DailyBudget = { Amount: args.daily_budget * 1_000_000, Mode: "STANDARD" };
        return await directResult(await directApi("campaigns", "update", { Campaigns: [changes] }), name, "update");
      }
      return ok("Unknown action");
    }

    if (name === "direct_manage_adgroup") {
      if (args.action === "list") {
        return await directResult(await directApi("adgroups", "get", {
          SelectionCriteria: { CampaignIds: [args.campaign_id] },
          FieldNames: ["Id", "Name", "CampaignId", "Status", "RegionIds"],
        }), name, "list");
      }
      if (args.action === "create") {
        const group = {
          Name: args.name,
          CampaignId: args.campaign_id,
          RegionIds: (args.region_ids || "0").split(",").map(Number),
        };
        return await directResult(await directApi("adgroups", "add", { AdGroups: [group] }), name, "create");
      }
      if (args.action === "update") {
        const changes = { Id: args.id };
        if (args.name) changes.Name = args.name;
        if (args.region_ids) changes.RegionIds = args.region_ids.split(",").map(Number);
        return await directResult(await directApi("adgroups", "update", { AdGroups: [changes] }), name, "update");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("adgroups", "delete", { SelectionCriteria: { Ids: [args.id] } }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_manage_ad") {
      if (args.action === "list") {
        return await directResult(await directApi("ads", "get", {
          SelectionCriteria: { AdGroupIds: [args.ad_group_id] },
          FieldNames: ["Id", "AdGroupId", "CampaignId", "State", "Status"],
          TextAdFieldNames: ["Title", "Title2", "Text", "Href", "DisplayDomain"],
        }), name, "list");
      }
      if (args.action === "create") {
        return await directResult(await directApi("ads", "add", { Ads: [{
          AdGroupId: args.ad_group_id,
          TextAd: { Title: args.title, Title2: args.title2 || "", Text: args.text, Href: args.href },
        }] }), name, "create");
      }
      if (args.action === "update") {
        const changes = { Id: args.id, TextAd: {} };
        if (args.title) changes.TextAd.Title = args.title;
        if (args.title2) changes.TextAd.Title2 = args.title2;
        if (args.text) changes.TextAd.Text = args.text;
        if (args.href) changes.TextAd.Href = args.href;
        return await directResult(await directApi("ads", "update", { Ads: [changes] }), name, "update");
      }
      if (["suspend", "resume"].includes(args.action)) {
        return await directResult(await directApi("ads", args.action, { SelectionCriteria: { Ids: [args.id] } }), name, args.action);
      }
      if (args.action === "delete") {
        return await directResult(await directApi("ads", "delete", { SelectionCriteria: { Ids: [args.id] } }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_manage_keywords") {
      if (args.action === "list") {
        const groups = await directApi("adgroups", "get", {
          SelectionCriteria: { CampaignIds: [args.campaign_id] }, FieldNames: ["Id"],
        });
        const dirErr = classifyDirectError(name, groups, "list_groups");
        if (dirErr) {
          await log("error", name, dirErr, { body: groups.body });
          return { content: [{ type: "text", text: dirErr }], isError: true };
        }
        const ids = (groups.body?.result?.AdGroups || []).map(g => g.Id);
        if (!ids.length) return ok("Нет групп в кампании");
        return await directResult(await directApi("keywords", "get", {
          SelectionCriteria: { AdGroupIds: ids },
          FieldNames: ["Id", "Keyword", "AdGroupId", "State", "Status", "Bid"],
        }), name, "list");
      }
      if (args.action === "add") {
        const words = args.keywords ? args.keywords.split(";").map(w => w.trim()) : [args.keyword];
        const kws = words.map(w => {
          const kw = { Keyword: w, AdGroupId: args.ad_group_id };
          if (args.bid) kw.Bid = args.bid * 1_000_000;
          return kw;
        });
        return await directResult(await directApi("keywords", "add", { Keywords: kws }), name, "add");
      }
      if (args.action === "update") {
        const kw = { Id: args.id };
        if (args.keyword) kw.Keyword = args.keyword;
        if (args.bid) kw.Bid = args.bid * 1_000_000;
        return await directResult(await directApi("keywords", "update", { Keywords: [kw] }), name, "update");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("keywords", "delete", { SelectionCriteria: { Ids: [args.id] } }), name, "delete");
      }
      return ok("Unknown action");
    }

    // --- Яндекс Директ: дополнительные сервисы ---
    if (name === "direct_sitelinks") {
      if (args.action === "list") {
        return await directResult(await directApi("sitelinks", "get", {
          SelectionCriteria: { Ids: args.ids || [] },
          FieldNames: ["Id", "Sitelinks"],
        }), name, "list");
      }
      if (args.action === "create") {
        return await directResult(await directApi("sitelinks", "add", {
          SitelinksSets: [{ Sitelinks: args.sitelinks }],
        }), name, "create");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("sitelinks", "delete", {
          SelectionCriteria: { Ids: args.ids },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_vcards") {
      if (args.action === "list") {
        const criteria = {};
        if (args.ids) criteria.Ids = args.ids;
        if (args.campaign_id) criteria.CampaignIds = [args.campaign_id];
        return await directResult(await directApi("vcards", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["Id", "CampaignId", "CompanyName", "Phone", "WorkTime", "Country", "City", "Street"],
        }), name, "list");
      }
      if (args.action === "create") {
        const vcard = { CampaignId: args.campaign_id, ...args.vcard };
        return await directResult(await directApi("vcards", "add", { VCards: [vcard] }), name, "create");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("vcards", "delete", {
          SelectionCriteria: { Ids: args.ids },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_adimages") {
      if (args.action === "list") {
        return await directResult(await directApi("adimages", "get", {
          SelectionCriteria: {},
          FieldNames: ["AdImageHash", "Name", "OriginalUrl", "Associated"],
        }), name, "list");
      }
      if (args.action === "upload_url") {
        return await directResult(await directApi("adimages", "add", {
          AdImages: [{ ImageData: undefined, Name: args.name || "image", Url: args.image_url }],
        }), name, "upload_url");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("adimages", "delete", {
          SelectionCriteria: { AdImageHashes: args.hashes },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_adextensions") {
      if (args.action === "list") {
        const criteria = args.ids ? { Ids: args.ids } : {};
        return await directResult(await directApi("adextensions", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["Id", "Type", "Callout", "Status", "StatusClarification"],
        }), name, "list");
      }
      if (args.action === "create") {
        const texts = args.callouts || [args.callout];
        const extensions = texts.map(t => ({ Callout: { CalloutText: t } }));
        return await directResult(await directApi("adextensions", "add", {
          AdExtensions: extensions,
        }), name, "create");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("adextensions", "delete", {
          SelectionCriteria: { Ids: args.ids },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_audience_targets") {
      if (args.action === "list") {
        const criteria = {};
        if (args.ad_group_id) criteria.AdGroupIds = [args.ad_group_id];
        if (args.campaign_id) criteria.CampaignIds = [args.campaign_id];
        return await directResult(await directApi("audiencetargets", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["Id", "AdGroupId", "CampaignId", "RetargetingListId", "InterestId", "ContextBid", "State"],
        }), name, "list");
      }
      if (args.action === "create") {
        const target = { AdGroupId: args.ad_group_id };
        if (args.retargeting_list_id) target.RetargetingListId = args.retargeting_list_id;
        if (args.interest_id) target.InterestId = args.interest_id;
        if (args.context_bid) target.ContextBid = args.context_bid * 1_000_000;
        return await directResult(await directApi("audiencetargets", "add", {
          AudienceTargets: [target],
        }), name, "create");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("audiencetargets", "delete", {
          SelectionCriteria: { Ids: args.ids },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_retargeting_lists") {
      if (args.action === "list") {
        const criteria = args.ids ? { Ids: args.ids } : {};
        return await directResult(await directApi("retargetinglists", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["Id", "Name", "Type", "IsAvailable", "Conditions"],
        }), name, "list");
      }
      if (args.action === "create") {
        return await directResult(await directApi("retargetinglists", "add", {
          RetargetingLists: [{ Name: args.name, Conditions: args.conditions }],
        }), name, "create");
      }
      if (args.action === "update") {
        const list = { Id: args.id };
        if (args.name) list.Name = args.name;
        if (args.conditions) list.Conditions = args.conditions;
        return await directResult(await directApi("retargetinglists", "update", {
          RetargetingLists: [list],
        }), name, "update");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("retargetinglists", "delete", {
          SelectionCriteria: { Ids: args.ids },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_bid_modifiers") {
      if (args.action === "list") {
        const criteria = {};
        if (args.campaign_id) criteria.CampaignIds = [args.campaign_id];
        if (args.ad_group_id) criteria.AdGroupIds = [args.ad_group_id];
        if (args.ids) criteria.Ids = args.ids;
        return await directResult(await directApi("bidmodifiers", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["Id", "CampaignId", "AdGroupId", "Type", "Level"],
          MobileAdjustmentFieldNames: ["BidModifier"],
          DemographicsAdjustmentFieldNames: ["Gender", "Age", "BidModifier"],
          RegionalAdjustmentFieldNames: ["RegionId", "BidModifier"],
        }), name, "list");
      }
      if (args.action === "create") {
        return await directResult(await directApi("bidmodifiers", "add", {
          BidModifiers: [args.modifier],
        }), name, "create");
      }
      if (args.action === "update") {
        return await directResult(await directApi("bidmodifiers", "set", {
          BidModifiers: [args.modifier],
        }), name, "update");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("bidmodifiers", "delete", {
          SelectionCriteria: { Ids: args.ids },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_bids") {
      if (args.action === "get") {
        const criteria = {};
        if (args.keyword_ids) criteria.KeywordIds = args.keyword_ids;
        if (args.campaign_id) criteria.CampaignIds = [args.campaign_id];
        if (args.ad_group_id) criteria.AdGroupIds = [args.ad_group_id];
        return await directResult(await directApi("keywordbids", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["KeywordId", "AdGroupId", "CampaignId", "Bid", "ContextBid"],
        }), name, "get");
      }
      if (args.action === "set") {
        const bids = args.keyword_ids.map(id => {
          const b = { KeywordId: id };
          if (args.bid) b.SearchBid = args.bid * 1_000_000;
          if (args.context_bid) b.NetworkBid = args.context_bid * 1_000_000;
          return b;
        });
        return await directResult(await directApi("keywordbids", "set", {
          KeywordBids: bids,
        }), name, "set");
      }
      if (args.action === "set_auto") {
        const bids = args.keyword_ids.map(id => ({ KeywordId: id }));
        return await directResult(await directApi("keywordbids", "setAuto", {
          KeywordBids: bids,
        }), name, "set_auto");
      }
      return ok("Unknown action");
    }

    if (name === "direct_changes") {
      const params = {
        Timestamp: args.since,
        FieldNames: args.field_names || ["CampaignIds", "AdGroupIds", "AdIds"],
      };
      if (args.campaign_ids) params.CampaignIds = args.campaign_ids;
      return await directResult(await directApi("changes", "check", params), name, "check");
    }

    if (name === "direct_dictionaries") {
      return await directResult(await directApi("dictionaries", "get", {
        DictionaryNames: args.names,
      }), name, "get");
    }

    if (name === "direct_dynamic_targets") {
      if (args.action === "list") {
        const criteria = {};
        if (args.campaign_id) criteria.CampaignIds = [args.campaign_id];
        if (args.ad_group_id) criteria.AdGroupIds = [args.ad_group_id];
        return await directResult(await directApi("dynamictextadtargets", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["Id", "AdGroupId", "Bid", "ConditionType", "Conditions"],
        }), name, "list");
      }
      if (args.action === "create") {
        const target = { AdGroupId: args.ad_group_id, Conditions: args.conditions };
        if (args.bid) target.Bid = args.bid * 1_000_000;
        return await directResult(await directApi("dynamictextadtargets", "add", {
          Webpages: [target],
        }), name, "create");
      }
      if (args.action === "update") {
        const target = { Id: args.id };
        if (args.conditions) target.Conditions = args.conditions;
        if (args.bid) target.Bid = args.bid * 1_000_000;
        return await directResult(await directApi("dynamictextadtargets", "update", {
          Webpages: [target],
        }), name, "update");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("dynamictextadtargets", "delete", {
          SelectionCriteria: { Ids: [args.id] },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_negative_keywords") {
      if (args.action === "list") {
        const criteria = args.ids ? { Ids: args.ids } : {};
        return await directResult(await directApi("negativekeywordsharedsets", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["Id", "Name", "NegativeKeywords"],
        }), name, "list");
      }
      if (args.action === "create") {
        return await directResult(await directApi("negativekeywordsharedsets", "add", {
          NegativeKeywordSharedSets: [{ Name: args.name, NegativeKeywords: args.negative_keywords }],
        }), name, "create");
      }
      if (args.action === "update") {
        const set = { Id: args.id };
        if (args.name) set.Name = args.name;
        if (args.negative_keywords) set.NegativeKeywords = args.negative_keywords;
        return await directResult(await directApi("negativekeywordsharedsets", "update", {
          NegativeKeywordSharedSets: [set],
        }), name, "update");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("negativekeywordsharedsets", "delete", {
          SelectionCriteria: { Ids: args.ids },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_turbopages") {
      return await directResult(await directApi("turbopages", "get", {
        SelectionCriteria: args.ids ? { Ids: args.ids } : {},
        FieldNames: ["Id", "Href", "Name", "TurboPageModeration"],
      }), name, "list");
    }

    if (name === "direct_leads") {
      const criteria = {};
      if (args.turbo_page_ids) criteria.TurboPageIds = args.turbo_page_ids;
      if (args.since) criteria.DateTimeFrom = args.since + "T00:00:00Z";
      if (args.until) criteria.DateTimeTo = args.until + "T23:59:59Z";
      return await directResult(await directApi("leads", "get", {
        SelectionCriteria: criteria,
        FieldNames: ["Id", "TurboPageId", "TurboPageName", "SubmitDateTime", "LeadData"],
      }), name, "list");
    }

    if (name === "direct_reports") {
      const token = getToken("YANDEX_ACCESS_TOKEN") || getToken("YANDEX_DIRECT_TOKEN");
      const login = getToken("YANDEX_DIRECT_CLIENT_LOGIN") || getToken("YANDEX_DIRECT_LOGIN") || "kv145";
      const fields = args.field_names || ["CampaignName", "Impressions", "Clicks", "Cost"];
      const reportName = args.report_name || `report_${Date.now()}`;
      const body = JSON.stringify({
        params: {
          SelectionCriteria: {
            DateFrom: args.date_from,
            DateTo: args.date_to,
            ...(args.filter ? { Filter: args.filter } : {}),
          },
          FieldNames: fields,
          ReportName: reportName,
          ReportType: args.report_type || "CAMPAIGN_PERFORMANCE_REPORT",
          DateRangeType: "CUSTOM_DATE",
          Format: "TSV",
          IncludeVAT: "YES",
        },
      });
      const res = await apiRequest("https://api.direct.yandex.com/json/v5/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Login": login,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          processingMode: "auto",
          returnMoneyInMicros: "false",
        },
        body,
      });
      if (res.status === 200) {
        await log("info", name, `Report OK: ${reportName}`);
        return ok(typeof res.body === "string" ? res.body : JSON.stringify(res.body));
      }
      if (res.status === 201 || res.status === 202) {
        await log("info", name, `Report queued (${res.status}): ${reportName}`);
        return ok(`Отчёт поставлен в очередь (HTTP ${res.status}). Повторите запрос через 10–30 секунд.`);
      }
      await log("error", name, `Report error: HTTP ${res.status}`, { body: res.body });
      return { content: [{ type: "text", text: `❌ Отчёт: ошибка HTTP ${res.status}: ${JSON.stringify(res.body)}` }], isError: true };
    }

    if (name === "direct_agency_clients") {
      return await directResult(await directApi("agencyclients", "get", {
        SelectionCriteria: {},
        FieldNames: ["Login", "ClientId", "Grants", "Representatives"],
      }), name, "list");
    }

    if (name === "direct_creatives") {
      const criteria = {};
      if (args.ids) criteria.Ids = args.ids;
      if (args.types) criteria.Types = args.types;
      return await directResult(await directApi("creatives", "get", {
        SelectionCriteria: criteria,
        FieldNames: ["Id", "Type", "Name", "PreviewUrl", "ThumbnailUrl"],
      }), name, "list");
    }

    if (name === "direct_feeds") {
      if (args.action === "list") {
        const criteria = args.ids ? { Ids: args.ids } : {};
        return await directResult(await directApi("feeds", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["Id", "Name", "Status", "SourceType", "UrlFeed", "NumberOfItems"],
        }), name, "list");
      }
      if (args.action === "create") {
        return await directResult(await directApi("feeds", "add", {
          Feeds: [{ Name: args.name, UrlFeed: { Url: args.url } }],
        }), name, "create");
      }
      if (args.action === "update") {
        const feed = { Id: args.id };
        if (args.name) feed.Name = args.name;
        if (args.url) feed.UrlFeed = { Url: args.url };
        return await directResult(await directApi("feeds", "update", { Feeds: [feed] }), name, "update");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("feeds", "delete", {
          SelectionCriteria: { Ids: args.ids },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    if (name === "direct_businesses") {
      const criteria = args.ids ? { Ids: args.ids } : {};
      return await directResult(await directApi("businesses", "get", {
        SelectionCriteria: criteria,
        FieldNames: ["Id", "Name", "Address", "Phone", "Urls"],
      }), name, "list");
    }

    if (name === "direct_smart_targets") {
      if (args.action === "list") {
        const criteria = {};
        if (args.campaign_id) criteria.CampaignIds = [args.campaign_id];
        if (args.ad_group_id) criteria.AdGroupIds = [args.ad_group_id];
        return await directResult(await directApi("smartadtargets", "get", {
          SelectionCriteria: criteria,
          FieldNames: ["Id", "AdGroupId", "Audience", "Conditions"],
        }), name, "list");
      }
      if (args.action === "create") {
        const target = { AdGroupId: args.ad_group_id };
        if (args.conditions) target.Conditions = args.conditions;
        return await directResult(await directApi("smartadtargets", "add", {
          SmartAdTargets: [target],
        }), name, "create");
      }
      if (args.action === "update") {
        const target = { Id: args.id };
        if (args.conditions) target.Conditions = args.conditions;
        return await directResult(await directApi("smartadtargets", "update", {
          SmartAdTargets: [target],
        }), name, "update");
      }
      if (args.action === "delete") {
        return await directResult(await directApi("smartadtargets", "delete", {
          SelectionCriteria: { Ids: [args.id] },
        }), name, "delete");
      }
      return ok("Unknown action");
    }

    // --- Google PageSpeed ---
    if (name === "pagespeed") {
      const strategy = args.strategy || "mobile";
      const cats = (args.categories || "performance,seo,accessibility,best-practices").split(",").map(c => `&category=${c.trim()}`).join("");
      const apiKey = getToken("PAGESPEED_KEY") || "AIzaSyCE7C7dbSY67d4SDnB1eGSqjOuMi3TjPKU";
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(args.url)}&strategy=${strategy}${cats}&key=${apiKey}`;
      const res = await apiRequest(apiUrl);
      if (res.status >= 400) {
        const msg = `⚠️ pagespeed: Google API вернул ошибку (HTTP ${res.status}): ${typeof res.body === "string" ? res.body : JSON.stringify(res.body?.error?.message || res.body)}`;
        await log("error", name, msg, { status: res.status, url: args.url });
        return { content: [{ type: "text", text: msg }], isError: true };
      }
      if (res.body?.lighthouseResult) {
        const lh = res.body.lighthouseResult;
        const scores = {};
        for (const [k, v] of Object.entries(lh.categories || {})) {
          scores[k] = Math.round((v.score || 0) * 100);
        }
        const audits = {};
        for (const [k, v] of Object.entries(lh.audits || {})) {
          if (v.score !== null && v.score < 0.9 && v.title) {
            audits[k] = { score: Math.round(v.score * 100), title: v.title, description: v.displayValue || "" };
          }
        }
        await log("info", name, `OK: ${args.url} (${strategy})`, { scores });
        return ok({ url: args.url, strategy, scores, issues: Object.values(audits).sort((a, b) => a.score - b.score).slice(0, 15) });
      }
      return ok(res.body);
    }

    // --- Обработка изображений ---
    if (name === "image_edit") {
      const input = args.input;
      const output = args.output || input;
      const magickArgs = [input];

      // Cinematic preset
      if (args.cinematic) {
        args.warmth = args.warmth ?? 15;
        args.contrast = args.contrast ?? 10;
        args.saturation = args.saturation ?? 115;
        args.vignette = args.vignette ?? true;
      }

      if (args.brightness !== undefined || args.contrast !== undefined) {
        magickArgs.push("-brightness-contrast", `${args.brightness || 0}x${args.contrast || 0}`);
      }
      if (args.saturation !== undefined) {
        magickArgs.push("-modulate", `100,${args.saturation},100`);
      }
      if (args.gamma !== undefined) {
        magickArgs.push("-gamma", String(args.gamma));
      }
      if (args.warmth !== undefined && args.warmth !== 0) {
        if (args.warmth > 0) {
          magickArgs.push("-fill", `rgba(255,140,0,${args.warmth / 100})`, "-tint", String(args.warmth));
        } else {
          magickArgs.push("-fill", `rgba(0,100,255,${Math.abs(args.warmth) / 100})`, "-tint", String(Math.abs(args.warmth)));
        }
      }
      if (args.sharpen) {
        magickArgs.push("-unsharp", `0x${args.sharpen}+${args.sharpen}+0`);
      }
      if (args.vignette) {
        magickArgs.push("-vignette", "0x150");
      }
      if (args.resize) {
        magickArgs.push("-resize", args.resize);
      }
      if (args.quality) {
        magickArgs.push("-quality", String(args.quality));
      }

      magickArgs.push(output);
      const result = await run("magick", magickArgs, 60_000);
      const fstat = await readFile(output).catch(() => null);
      const size = fstat ? Buffer.byteLength(fstat) : 0;
      await log("info", name, `OK: ${input} → ${output} (${Math.round(size / 1024)}KB)`);
      return ok({ input, output, size: `${Math.round(size / 1024)}KB`, applied: Object.keys(args).filter(k => !["input", "output"].includes(k)) });
    }

    // --- Microsoft Clarity ---
    if (name === "clarity") {
      const report = args.report || "summary";
      const lim = args.limit || 20;
      const period = args.period || "week";
      let dateFilter;
      if (period === "yesterday") dateFilter = "date = CURRENT_DATE - 1";
      else if (period === "week") dateFilter = "date >= CURRENT_DATE - 7";
      else if (period === "month") dateFilter = "date >= CURRENT_DATE - 30";
      else dateFilter = `date >= '${period}'`;

      let sql;
      if (report === "summary") {
        sql = `SELECT date, total_sessions, distinct_users, pages_per_session, avg_scroll_depth, dead_click_pct, rage_click_pct, quickback_pct, total_time_sec, active_time_sec FROM clarity_daily WHERE ${dateFilter} ORDER BY date DESC LIMIT ${lim}`;
      } else if (report === "pages") {
        sql = `SELECT date, url, sessions, scroll_depth_pct, dead_clicks, rage_clicks, quickbacks, avg_duration_sec FROM clarity_pages WHERE ${dateFilter} ORDER BY sessions DESC LIMIT ${lim}`;
      } else if (report === "daily") {
        sql = `SELECT date, total_sessions, distinct_users, avg_scroll_depth, dead_click_pct, rage_click_pct, quickback_pct FROM clarity_daily WHERE ${dateFilter} ORDER BY date LIMIT ${lim}`;
      }
      const result = await run(STATS_SH, ["query", sql]);
      await log("info", name, `${report} OK`);
      return ok(result);
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  } catch (err) {
    const classified = classifyError(name, err, args);
    await log("error", name, classified.agent_message, { category: classified.category, args, stack: err.stack?.split("\n").slice(0, 3) });
    return { content: [{ type: "text", text: classified.agent_message }], isError: true };
  }
});

function ok(data) {
  return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

// Обёртка для VK API ответов — ловит ошибки и логирует
async function vkResult(res, tool, action) {
  const errMsg = classifyVkError(tool, res, action);
  if (errMsg) {
    await log("error", tool, errMsg, { status: res.status, body: res.body, action });
    return { content: [{ type: "text", text: errMsg }], isError: true };
  }
  await log("info", tool, `${action} OK`, { status: res.status });
  return ok(res.body);
}

// Обёртка для Direct API ответов
async function directResult(res, tool, action) {
  const errMsg = classifyDirectError(tool, res, action);
  if (errMsg) {
    await log("error", tool, errMsg, { body: res.body, action });
    return { content: [{ type: "text", text: errMsg }], isError: true };
  }
  await log("info", tool, `${action} OK`);
  return ok(res.body);
}

async function vkApiPatch(path, body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await vkGetOAuthToken();
    const data = JSON.stringify(body);
    const res = await apiRequest(`https://ads.vk.com/api/v2/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      body: data,
    });
    if (res.status === 401 && attempt === 0) { _vkInvalidateToken(); continue; }
    return res;
  }
}

async function vkApiDelete(path) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await vkGetOAuthToken();
    const res = await apiRequest(`https://ads.vk.com/api/v2/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 && attempt === 0) { _vkInvalidateToken(); continue; }
    return res;
  }
}

function calcDates(period = "week") {
  const fmt = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
  const map = {
    today: { from: fmt(today), to: fmt(today) },
    yesterday: { from: fmt(daysAgo(1)), to: fmt(daysAgo(1)) },
    week: { from: fmt(daysAgo(7)), to: fmt(today) },
    month: { from: fmt(daysAgo(30)), to: fmt(today) },
  };
  return map[period] || map.week;
}

function run(cmd, args, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && !stdout && !stderr) return reject(err);
      resolve((stdout || "") + (stderr ? "\n--- stderr ---\n" + stderr : ""));
    });
  });
}

// --- Crash protection ---
process.on("uncaughtException", (err) => {
  const msg = `💥 uncaughtException: ${err.message}\n${err.stack || ""}`;
  process.stderr.write(msg + "\n");
  log("error", "server", msg).catch(() => {});
  // НЕ завершаем процесс — продолжаем работу
});

process.on("unhandledRejection", (reason) => {
  const msg = `💥 unhandledRejection: ${reason?.message || reason}`;
  process.stderr.write(msg + "\n");
  log("error", "server", msg).catch(() => {});
  // НЕ завершаем процесс
});

// Keepalive — не даём Node.js завершиться, если stdio idle
const keepAlive = setInterval(() => {}, 30_000);
process.on("SIGINT", () => { clearInterval(keepAlive); process.exit(0); });
process.on("SIGTERM", () => { clearInterval(keepAlive); process.exit(0); });

// --- Start ---

// Создать папку для логов
await mkdir(resolve(__dirname, "../logs"), { recursive: true }).catch(() => {});
process.stderr.write(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.stderr.write(`  🟢 АйДаКемп MCP Server\n`);
process.stderr.write(`  Инструментов: ${TOOLS.length}\n`);
process.stderr.write(`  PID: ${process.pid}\n`);
process.stderr.write(`  Время: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК\n`);
process.stderr.write(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.stderr.write(`Ожидаю вызовы...\n\n`);
await log("info", "server", `MCP-сервер запущен (${TOOLS.length} инструментов)`);

const transport = new StdioServerTransport();
await server.connect(transport);
