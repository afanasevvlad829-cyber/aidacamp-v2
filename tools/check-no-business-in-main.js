#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mainPath = path.join(root, 'src/scripts/main.js');
const baselinePath = path.join(root, 'docs/quality/legacy-baseline.env');

function read(file){
  return fs.readFileSync(file, 'utf8');
}

function countPattern(src, rx){
  const matches = src.match(rx);
  return matches ? matches.length : 0;
}

function readEnv(file){
  if(!fs.existsSync(file)) return {};
  const lines = read(file).split('\n');
  const out = {};
  for(const line of lines){
    const trimmed = line.trim();
    if(!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const value = Number(trimmed.slice(idx + 1).trim());
    if(Number.isFinite(value)) out[key] = value;
  }
  return out;
}

const main = read(mainPath);
const baseline = readEnv(baselinePath);

const metrics = {
  LEGACY_MAIN_OFFER_STAGE_REFS: countPattern(main, /\bofferStage\b/g),
  LEGACY_MAIN_OFFER_LAYOUT_REFS: countPattern(main, /\bofferLayout\b/g),
  LEGACY_MAIN_LEGACY_WORD_REFS: countPattern(main, /\blegacy\b/g),
  LEGACY_MAIN_DEBUG_ACTION_REFS: countPattern(main, /debug-booking/g),
  LEGACY_MAIN_INNERHTML_ASSIGNMENTS: countPattern(main, /innerHTML\s*=/g),
  LEGACY_MAIN_MOBILE_DOCS_COPY_REFS: countPattern(main, /\bMOBILE_DOCS_COPY\b/g),
  LEGACY_MAIN_DESKTOP_MOBILE_TEMPLATES_REFS: countPattern(main, /\bDESKTOP_MOBILE_SECTION_TEMPLATES\b/g),
  LEGACY_MAIN_BOOKING_VIEWS_CONFIG_REFS: countPattern(main, /\bBOOKING_VIEWS\b/g),
  LEGACY_MAIN_BOOKING_ALIGN_CONFIG_REFS: countPattern(main, /\bBOOKING_STAGE2_(VERTICAL|HORIZONTAL)_ALIGN\b/g),
  LEGACY_MAIN_HERO_AB_ASSETS_CONFIG_REFS: countPattern(main, /\bHERO_AB_ASSETS\b/g),
  LEGACY_MAIN_HERO_AB_LABELS_CONFIG_REFS: countPattern(main, /\bHERO_AB_VARIANT_LABELS\b/g),
  LEGACY_MAIN_AB_ALLOWLIST_REFS: countPattern(main, /\bAB_TEST_EVENT_ALLOWLIST\b/g),
  LEGACY_MAIN_UI_MODES_CONFIG_REFS: countPattern(main, /\b(HERO_CONTRAST_MODES|HERO_MICRO_MODES|OFFER_MODAL_THEMES|OFFER_LAYOUT_MODES|COMPACT_MODAL_SECTIONS)\b/g),
  LEGACY_MAIN_STORAGE_CONFIG_REFS: countPattern(main, /\b(STORAGE_KEY|BOOKING_SCARCITY_KEY|VERSION_MONOTONIC_KEY|QUALITY_BASELINE_KEY|DEBT_REGISTER_KEY|VERSION_BADGE_HIDDEN_KEY|VIDEO_META_CACHE_KEY)\b/g),
  LEGACY_MAIN_OBSERVABILITY_CONFIG_REFS: countPattern(main, /\b(METRIKA_ID|USE_DESKTOP_BASE_FOR_MOBILE|PROD_DEBUGLESS_DOMAINS)\b/g),
  LEGACY_MAIN_TELEMETRY_CONFIG_REFS: countPattern(main, /\b(AB_EVENT_ENDPOINT_DEFAULT|AB_VISITOR_ID_KEY|AB_SESSION_ID_KEY|HERO_AB_TEST_KEY|HERO_AB_TEST_ID)\b/g),
  LEGACY_MAIN_INLINE_SHIFTS_BLOB_REFS: countPattern(main, /\bconst\s+shifts\s*=\s*\[/g),
  LEGACY_MAIN_INLINE_MEDIA_BLOB_REFS: countPattern(main, /\bconst\s+mediaContent\s*=\s*\{/g),
  LEGACY_MAIN_INLINE_CALENDAR_LOCALE_ARRAYS_REFS: countPattern(main, /\[(?:'Вс'|'Пн'|'Вт'|'Ср'|'Чт'|'Пт'|'Сб'|'январь'|'февраль'|'март'|'апрель'|'май'|'июнь'|'июль'|'август'|'сентябрь'|'октябрь'|'ноябрь'|'декабрь')/g)
};

const regressions = [];
for(const [key, value] of Object.entries(metrics)){
  const cap = baseline[key];
  if(Number.isFinite(cap) && value > cap){
    regressions.push({ key, value, cap });
  }
}

const result = {
  ok: regressions.length === 0,
  checked: 'src/scripts/main.js',
  metrics,
  regressions
};

console.log(JSON.stringify(result, null, 2));

if(!result.ok){
  process.exit(1);
}
