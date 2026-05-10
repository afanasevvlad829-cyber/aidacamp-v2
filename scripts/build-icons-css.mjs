#!/usr/bin/env node
/**
 * Generates src/styles/icons.css from src/data/icons-manifest.json
 * using SVGs from the bootstrap-icons npm package.
 *
 * Usage: node scripts/build-icons-css.mjs
 * Or:    npm run icons
 *
 * To add an icon: add its name to icons-manifest.json, run `npm run icons`.
 * NEVER edit icons.css manually — it is AUTO-GENERATED.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const manifestPath = join(ROOT, 'src/data/icons-manifest.json');
const outputPath = join(ROOT, 'src/styles/icons.css');
const iconsDir = join(ROOT, 'node_modules/bootstrap-icons/icons');
const customIconsDir = join(ROOT, 'src/styles/custom-icons');

// Support --out <file> flag (used by guard-icons-fresh.sh for diff check)
const outFlagIdx = process.argv.indexOf('--out');
const outPath = outFlagIdx !== -1 ? process.argv[outFlagIdx + 1] : null;
const effectiveOutput = outPath || outputPath;

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// Encode SVG for use as a CSS url() value
function svgToUrl(svg) {
  // Minimise whitespace, encode characters unsafe in url()
  const min = svg
    .replace(/\r?\n\s*/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  return (
    "url(\"data:image/svg+xml," +
    min
      .replace(/%/g, '%25')
      .replace(/#/g, '%23')
      .replace(/"/g, "'")
      .replace(/</g, '%3C')
      .replace(/>/g, '%3E')
      .replace(/\s{2,}/g, ' ') +
    "\")"
  );
}

const missing = [];
const lines = [];

for (const name of manifest) {
  // Check bootstrap-icons first, then fall back to custom-icons/
  const svgPath = existsSync(join(iconsDir, `${name}.svg`))
    ? join(iconsDir, `${name}.svg`)
    : join(customIconsDir, `${name}.svg`);
  if (!existsSync(svgPath)) {
    missing.push(name);
    continue;
  }
  const svg = readFileSync(svgPath, 'utf8');
  lines.push(`.bi-${name} { --i: ${svgToUrl(svg)}; }`);
}

if (missing.length > 0) {
  console.error(`[build-icons-css] ERROR: missing icons in bootstrap-icons package:`);
  missing.forEach(n => console.error(`  - ${n}`));
  process.exit(1);
}

const css = `/* AUTO-GENERATED — DO NOT EDIT */
/* Source: src/data/icons-manifest.json + node_modules/bootstrap-icons/icons/ */
/* To add/remove icons: edit icons-manifest.json, then run \`npm run icons\` */

.bi {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: -0.125em;
  background-color: currentColor;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-image: var(--i);
  mask-image: var(--i);
}

${lines.join('\n')}
`;

writeFileSync(effectiveOutput, css, 'utf8');
if (!outPath) {
  // Также копируем в public/styles/icons.css — там файл грузится async (не инлайнится в HTML)
  const publicStylesDir = join(ROOT, 'public/styles');
  mkdirSync(publicStylesDir, { recursive: true });
  writeFileSync(join(publicStylesDir, 'icons.css'), css, 'utf8');
  console.log(`[build-icons-css] wrote ${manifest.length} icons → src/styles/icons.css + public/styles/icons.css (${(css.length / 1024).toFixed(1)} KB)`);
}
