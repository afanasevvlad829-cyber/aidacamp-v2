#!/usr/bin/env node
/**
 * Post-build: Astro emits <link rel="stylesheet" href="/_astro/global.XXX.css">
 * — это блокирует первый paint до загрузки 107 KB CSS. После этого скрипта:
 *   <link rel="preload" href="..." as="style" onload="this.onload=null;this.rel='stylesheet'">
 *   <noscript><link rel="stylesheet" href="..."></noscript>
 *
 * Критический CSS для иконок уже inlined через Base.astro (iconsCSS ?raw).
 * Hero-картинка имеет preload fetchpriority=high и рендерится независимо от CSS.
 * FOUC ~100ms на первый визит приемлем.
 *
 * Эффект: LCP mobile ≈ −1s, Speed Index ≈ −2s, Performance score +5–10.
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'dist/client';

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const linkRegex = /<link\s+rel="stylesheet"\s+href="(\/_astro\/[^"]+\.css)"\s*\/?>/g;

let filesProcessed = 0;
let linksSwapped = 0;

for (const file of walk(ROOT)) {
  const original = readFileSync(file, 'utf8');
  let swapped = 0;
  const next = original.replace(linkRegex, (m, href) => {
    swapped++;
    return (
      `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'">` +
      `<noscript><link rel="stylesheet" href="${href}"></noscript>`
    );
  });
  if (swapped > 0) {
    writeFileSync(file, next);
    filesProcessed++;
    linksSwapped += swapped;
  }
}

console.log(`[inline-critical-css] swapped ${linksSwapped} <link> tags in ${filesProcessed} HTML files`);
