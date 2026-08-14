#!/usr/bin/env bash
# build.sh — прод-сборка. Два прохода `astro build`, не один — обязательно, не для
# перестраховки:
#
# scripts/gen-articles.mjs читает contentHtml/title/description статей из УЖЕ СОБРАННЫХ
# страниц (dist/client/stati/<slug>/index.html), потому что там Astro-выражения
# ({PRICE_MIN}, {item.question}, `${SEASON_YEAR}`) уже отрендерены в реальные значения —
# regex по сырому src/pages/stati/*.astro отдаёт их как есть, буквально в скобках (баг,
# из-за которого 100/150 статей несли нерезолвленные токены в RSS/VK-репост). Значит,
# articles.json нельзя актуализировать ДО первой сборки.
#
# Но RSS (src/pages/rss.xml.ts) и llms-full.txt.ts — SSR-маршруты (prerender=false), а
# Astro Content Layer синхронизирует articles.json в SSR-бандл ОДИН РАЗ, в самом начале
# `astro build` ("[content] Syncing content") — это статичный снапшот
# (dist/server/chunks/_astro_data-layer-content.mjs), не живое чтение файла. Если
# переписать articles.json ПОСЛЕ первого прохода и не пересобрать — уже собранный SSR-
# бандл всё равно будет отдавать СТАРЫЕ данные до следующего build. Второй проход
# пересинхронизирует SSR-бандл с актуальным articles.json.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run guard
npm run icons

# Первый проход — SKIP_COMPRESS=1. Его dist/ никуда не едет: он нужен ровно затем,
# чтобы gen-articles.mjs прочитал отрендеренный HTML статей, после чего всё
# пересобирается вторым проходом. Минифицировать то, что будет выброшено, — чистая
# трата: замер по логу CI 14.08.2026 (run 31770755865) — compress занимал 74с на
# проход при ~30с самого astro build, то есть 148с из 210с двухпроходной сборки.
echo "==> astro build (проход 1, без минификации — рендерит статьи, чтобы вытащить резолвленный contentHtml)"
SKIP_COMPRESS=1 npx astro build

node scripts/gen-articles.mjs
node scripts/check-articles.mjs

echo "==> astro build (проход 2 — пересобирает SSR-бандл с актуальным articles.json)"
npx astro build

node -e "
const fs = require('fs');
const p = 'dist/client/';
if (!fs.existsSync(p + 'sitemap-0.xml')) {
  console.error('FATAL: sitemap-0.xml не сгенерирован — проверь @astrojs/sitemap');
  process.exit(1);
}
fs.copyFileSync(p + 'sitemap-0.xml', p + 'sitemap.xml');
fs.unlinkSync(p + 'sitemap-0.xml');
fs.unlinkSync(p + 'sitemap-index.xml');
console.log('sitemap.xml ready');
"

node scripts/check-faq-schema.mjs
node scripts/check-breadcrumb-schema.mjs

node scripts/inject-modulepreload.mjs
npm run pagefind
