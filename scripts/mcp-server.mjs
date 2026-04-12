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
  if (level === "error") process.stderr.write(`[${ts}] ${tool}: ${message}\n`);
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
    return `🔑 ${tool} [${action}]: ошибка авторизации VK (HTTP ${status}). Токен протух или нет прав. Повтори — токен обновится автоматически. Детали: ${errMsg}`;
  }
  if (status === 400 || status === 422) {
    return `⚠️ ${tool} [${action}]: VK отклонил запрос (HTTP ${status}). Проверь параметры. Ошибка: ${errMsg}`;
  }
  if (status === 404) {
    return `🔍 ${tool} [${action}]: объект не найден в VK (HTTP 404). Проверь ID. Ошибка: ${errMsg}`;
  }
  if (status >= 500) {
    return `🔧 ${tool} [${action}]: ошибка на стороне VK (HTTP ${status}). MCP работает — проблема у VK. Попробуй повторить.`;
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
      return `🔑 ${tool} [${action}]: ошибка авторизации Директа (код ${code}). Проверь YANDEX_ACCESS_TOKEN. Ошибка: ${msg}`;
    }
    return `⚠️ ${tool} [${action}]: Директ отклонил запрос (код ${code}). Ошибка: ${msg}`;
  }
  return null;
}

// --- HTTP helpers for APIs ---
function apiRequest(url, options = {}) {
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

async function vkApi(path, params = {}) {
  const token = await vkGetOAuthToken();
  const query = new URLSearchParams(params).toString();
  const sep = query ? "?" : "";
  return apiRequest(`https://ads.vk.com/api/v2/${path}${sep}${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function vkApiPost(path, body) {
  const token = await vkGetOAuthToken();
  const data = JSON.stringify(body);
  return apiRequest(`https://ads.vk.com/api/v2/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
    body: data,
  });
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
      status: { type: "string", enum: ["active", "blocked", "deleted"], description: "Статус (для update)" },
    }, required: ["action"]},
  },
  {
    name: "vk_manage_ad",
    description: "VK Ads: CRUD баннеров (banners). Создание: POST /ad_groups/{id}/banners.json. Требует: urls (id из POST /urls.json), textblocks (title_40_vkads, text_90), content (image_1080x607, icon_256x256 — id из POST /content.json).",
    inputSchema: { type: "object", properties: {
      action: { type: "string", enum: ["list", "create", "update", "delete"], description: "Действие" },
      ad_group_id: { type: "number", description: "ID группы объявлений" },
      id: { type: "number", description: "ID баннера (для update/delete)" },
      title: { type: "string", description: "Заголовок (до 40 символов, слот title_40_vkads)" },
      text: { type: "string", description: "Описание (до 90 символов, слот text_90)" },
      url: { type: "string", description: "Ссылка (создаст URL через /urls.json)" },
      url_id: { type: "number", description: "ID готовой ссылки (из /urls.json)" },
      content_image_id: { type: "number", description: "ID изображения 1080x607 (из /content.json)" },
      content_icon_id: { type: "number", description: "ID иконки 256x256 (из /content.json)" },
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

  try {
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
        const params = { limit: "100", fields: "id,name,ad_plan_id,status,package_id,targetings,budget_limit,budget_limit_day,autobidding_mode" };
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
        return await vkResult(await vkApiPost("ad_groups.json", body), name, "create");
      }
      if (args.action === "update") {
        const body = {};
        if (args.name) body.name = args.name;
        if (args.targetings) body.targetings = args.targetings;
        if (args.budget_limit) body.budget_limit = args.budget_limit;
        if (args.budget_limit_day) body.budget_limit_day = args.budget_limit_day;
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
        const tb = {};
        if (args.title) tb.title_40_vkads = { text: args.title };
        if (args.text) tb.text_90 = { text: args.text };
        if (Object.keys(tb).length) body.textblocks = tb;
        const content = {};
        if (args.content_image_id) content.image_1080x607 = { id: args.content_image_id };
        if (args.content_icon_id) content.icon_256x256 = { id: args.content_icon_id };
        if (Object.keys(content).length) body.content = content;
        return await vkResult(await vkApiPost(`ad_groups/${args.ad_group_id}/banners.json`, body), name, "create");
      }
      if (args.action === "update") {
        const body = {};
        const tb = {};
        if (args.title) tb.title_40_vkads = { text: args.title };
        if (args.text) tb.text_90 = { text: args.text };
        if (Object.keys(tb).length) body.textblocks = tb;
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
  const token = await vkGetOAuthToken();
  const data = JSON.stringify(body);
  return apiRequest(`https://ads.vk.com/api/v2/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    body: data,
  });
}

async function vkApiDelete(path) {
  const token = await vkGetOAuthToken();
  return apiRequest(`https://ads.vk.com/api/v2/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
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

// --- Start ---

// Создать папку для логов
await mkdir(resolve(__dirname, "../logs"), { recursive: true }).catch(() => {});
await log("info", "server", `MCP-сервер запущен (${TOOLS.length} инструментов)`);

const transport = new StdioServerTransport();
await server.connect(transport);
