#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/scripts/data/content-map.js");
const outDir = path.join(ROOT, "docs/content");
const outCsv = path.join(outDir, "content_matrix.csv");

function readContentMap() {
  const code = fs.readFileSync(sourcePath, "utf8");
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: sourcePath });
  if (!sandbox.window.AC_DATA) {
    throw new Error("AC_DATA was not initialized by content-map.js");
  }
  return sandbox.window.AC_DATA;
}

function normalizeText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function detectScreen(pathParts) {
  const p = pathParts.join(".");
  if (/mobile|phone|compact/i.test(p)) return "mobile";
  if (/desktop|hero|program|shift|team|faq|reviews|location/i.test(p)) return "desktop";
  return "global";
}

function detectBlock(pathParts) {
  const p = pathParts.join(".");
  const head = pathParts[0] || "content";
  const lookup = [
    ["menu", "menu"],
    ["sectionTitles", "section_titles"],
    ["ui", "ui_labels"],
    ["programCards", "program_cards"],
    ["formatCards", "format_cards"],
    ["aiStats", "ai_stats"],
    ["aiCopy", "ai_copy"],
    ["location", "location"],
    ["photoCategories", "photo_categories"],
    ["photos", "photos"],
    ["videos", "videos"],
    ["reviews", "reviews"],
    ["team", "team"],
    ["faqTabs", "faq_tabs"],
    ["faqItems", "faq_items"],
    ["AGE_PROFILES", "age_profiles"],
    ["SHIFTS", "shifts"],
    ["TABS", "tabs"],
    ["DIRECTIONS", "directions"]
  ];
  for (const [key, block] of lookup) {
    if (p.startsWith(key)) return block;
  }
  return head.toLowerCase();
}

function describeContext(block, pathString, source) {
  const p = `${source}.${pathString}`;
  const rules = [
    [/menu\./i, ["Навигация", "Пункты верхнего меню/якорей"]],
    [/sectionTitles\./i, ["Заголовки секций", "Названия основных разделов страницы"]],
    [/ui\./i, ["UI-лейблы", "Кнопки, подписи и служебные тексты интерфейса"]],
    [/programCards\./i, ["Блок программы", "Карточки возрастных программ"]],
    [/formatCards\./i, ["Блок формата", "Условия, безопасность, бронирование"]],
    [/aiStats\./i, ["AI-блок", "Статистические тезисы в блоке AI"]],
    [/aiCopy\./i, ["AI-блок", "Поясняющие абзацы в блоке AI"]],
    [/location\./i, ["Локация", "Адрес, ориентиры, карта и близлежащая инфраструктура"]],
    [/photoCategories\./i, ["Галерея", "Фильтры категорий фото"]],
    [/photos\./i, ["Галерея", "Подписи/alt для фото-контента"]],
    [/videos\./i, ["Видео", "Заголовки/ссылки/обложки видео"]],
    [/reviews\./i, ["Отзывы", "Карточки отзывов родителей"]],
    [/team\./i, ["Команда", "Карточки участников команды"]],
    [/faqTabs\./i, ["FAQ", "Вкладки категорий FAQ"]],
    [/faqItems\./i, ["FAQ", "Вопросы и ответы по категориям"]],
    [/AGE_PROFILES\./i, ["Возрастные профили", "Тексты hero/выгоды для возрастных сегментов"]],
    [/SHIFTS\./i, ["Смены", "Описания смен, benefits и CTA"]],
    [/DIRECTIONS\./i, ["Направления", "Справочник направлений смен"]],
    [/TABS\./i, ["Навигация", "Справочник табов/переходов"]],
    [/footer\./i, ["Футер", "Бренд, подпись и нижняя информация"]],
  ];
  for (const [rx, desc] of rules) {
    if (rx.test(p)) return desc;
  }
  const fallbackTitle = block.replace(/_/g, " ");
  return [fallbackTitle, "Контентный элемент без явной категории"];
}

function buildContentId(pathString, currentText) {
  const hash = crypto
    .createHash("sha1")
    .update(`${pathString}::${currentText}`)
    .digest("hex")
    .slice(0, 10);
  return `CNT_${hash}`;
}

function walk(value, pathParts, rows, rootName) {
  if (typeof value === "string") {
    const normalized = normalizeText(value);
    if (!normalized) return;
    const pathString = [rootName, ...pathParts].join(".");
    const block = detectBlock([rootName, ...pathParts]);
    const screen = detectScreen([rootName, ...pathParts]);
    const [context_block, context_note] = describeContext(block, pathString, rootName);
    rows.push({
      content_id: buildContentId(pathString, normalized),
      source: rootName,
      block,
      screen,
      context_block,
      context_note,
      content_path: pathString,
      current_text: normalized,
      new_text: "",
      status: "todo",
      note: ""
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, idx) => walk(item, [...pathParts, String(idx)], rows, rootName));
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => walk(v, [...pathParts, k], rows, rootName));
  }
}

function toCsv(rows) {
  const headers = [
    "content_id",
    "source",
    "block",
    "screen",
    "context_block",
    "context_note",
    "content_path",
    "current_text",
    "new_text",
    "status",
    "note"
  ];
  const escapeCell = (v) => {
    const s = String(v ?? "");
    const escaped = s.replace(/"/g, "\"\"");
    return `"${escaped}"`;
  };
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const AC = readContentMap();
  const rows = [];

  const groups = [
    ["CONTENT_MAP", AC.CONTENT_MAP || {}],
    ["AGE_PROFILES", AC.AGE_PROFILES || []],
    ["SHIFTS", AC.SHIFTS || []],
    ["TABS", AC.TABS || []],
    ["DIRECTIONS", AC.DIRECTIONS || []]
  ];

  for (const [rootName, payload] of groups) {
    walk(payload, [], rows, rootName);
  }

  rows.sort((a, b) => {
    if (a.block !== b.block) return a.block.localeCompare(b.block, "ru");
    return a.content_path.localeCompare(b.content_path, "ru");
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outCsv, toCsv(rows), "utf8");

  const meta = {
    generated_at: new Date().toISOString(),
    source_file: path.relative(ROOT, sourcePath),
    rows: rows.length,
    csv: path.relative(ROOT, outCsv)
  };
  fs.writeFileSync(
    path.join(outDir, "content_matrix.meta.json"),
    JSON.stringify(meta, null, 2) + "\n",
    "utf8"
  );

  console.log(`Exported ${rows.length} rows -> ${path.relative(ROOT, outCsv)}`);
}

main();
