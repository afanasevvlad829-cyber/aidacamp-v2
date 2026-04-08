#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const baselinePath = path.join(root, 'docs/quality/legacy-baseline.env');
const cssPath = path.join(root, 'src/styles/main.css');
const files = [
  path.join(root, 'src/scripts/main.js'),
  path.join(root, 'src/scripts/features/action-dispatcher.js')
];

function read(file){
  return fs.readFileSync(file, 'utf8');
}

function countPattern(src, rx){
  const matches = src.match(rx);
  return matches ? matches.length : 0;
}

function readEnv(file){
  if(!fs.existsSync(file)) return {};
  const out = {};
  for(const line of read(file).split('\n')){
    const trimmed = line.trim();
    if(!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const value = Number(trimmed.slice(idx + 1).trim());
    if(Number.isFinite(value)) out[key] = value;
  }
  return out;
}

const baseline = readEnv(baselinePath);
const jsJoined = files.map(read).join('\n');
const css = read(cssPath);

const metrics = {
  LEGACY_MAIN_DEBUG_ACTION_REFS: countPattern(jsJoined, /debug-booking/g),
  LEGACY_CSS_BOOKING_STAGE2_REFS: countPattern(css, /booking-stage-2/g),
  LEGACY_CSS_BOOKING_STAGE3_REFS: countPattern(css, /booking-stage-3/g),
  LEGACY_CSS_BOOKING_STAGE4_REFS: countPattern(css, /booking-stage-4/g)
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
  checked: ['src/scripts/main.js', 'src/scripts/features/action-dispatcher.js', 'src/styles/main.css'],
  metrics,
  regressions
};

console.log(JSON.stringify(result, null, 2));
if(!result.ok){
  process.exit(1);
}
