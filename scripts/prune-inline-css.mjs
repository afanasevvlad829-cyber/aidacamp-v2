/**
 * prune-inline-css.mjs — Astro-интеграция: вырезает из встроенного <style> каждой
 * страницы правила, которым на этой странице нечего стилизовать.
 *
 * Зачем. build.inlineStylesheets: 'always' (см. astro.config.mjs — при 'auto' прод
 * однажды остался без стилей) вшивает в КАЖДЫЙ HTML весь Tailwind-CSS сайта (~250 КБ),
 * а странице нужно ~13% классов. На мобильном Lighthouse (CPU ×4) разбор этого CSS —
 * причина того, что первый кадр рисуется через ~2 с после загрузки сети.
 * CSS остаётся встроенным (страница самодостаточна, общий чанк не нужен) — только без
 * чужих правил.
 *
 * Инструмент — PurgeCSS, а не beasties: у beasties нет списка «классы, которые ставит
 * JS» (safelist), а состояния вида [aria-expanded=true] он сверяет со статичным DOM и
 * вырезает. У PurgeCSS safelist есть, а правила без классов он не трогает.
 *
 * Что считается «используемым» для страницы:
 *   1. любой токен из её HTML (без самих <style>-блоков) — классы, data-/aria-атрибуты,
 *      inline-скрипты, JSON, тексты;
 *   2. любой токен из JS-модулей, которые страница подключает (включая их импорты) —
 *      это классы, которые скрипты ставят на лету: classList.add('open'), className=…,
 *      шаблонные строки с разметкой (меню, модалки, карусели, поиск, cookie-баннер…);
 *   3. SAFELIST ниже — то, что токенами не поймать (класс собирается конкатенацией).
 * Токены берутся с запасом (любое слово, в т.ч. из прозы): лишний токен оставит
 * лишнее правило, а не сломает вёрстку. Не трогаем @font-face, @keyframes, @property,
 * CSS-переменные — только правила с селекторами.
 *
 * Порядок в цепочке: ДО html-minify-cached (тот минифицирует уже урезанный CSS) и
 * до @playform/compress. Первый проход build.sh (SKIP_COMPRESS=1) пропускаем — его
 * dist выбрасывается. Любая ошибка на странице → страница остаётся как есть.
 *
 * Выключить: PRUNE_CSS=0.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PurgeCSS } from 'purgecss';

const EXCLUDE = [/metodichki\//, /demo\//];

// Классы, которые JS собирает конкатенацией (`'bg-' + color`) — токенами их не поймать.
// Заполняется по результатам аудита скриптов (см. отчёт report-css-aidacamp.md).
export const SAFELIST_STANDARD = [];
export const SAFELIST_PATTERNS = [];

// Два экстрактора вместе: «tailwind-токен» (ловит md:flex, w-[calc(100%-2rem)], bg-red-500/50)
// и просто слова (ловит 'open' в classList.add(open), foo,bar и т.п.).
function extractor(content) {
  const a = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
  const b = content.match(/[A-Za-z0-9_-]+/g) || [];
  return a.concat(b);
}

async function* walkHtml(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_pagefind' || entry.name === '_astro') continue;
      yield* walkHtml(full);
    } else if (entry.name.endsWith('.html')) yield full;
  }
}

const STYLE_RE = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
const MIN_STYLE = 8000; // мелкие блоки (font-face, scoped) не трогаем

export default function pruneInlineCss() {
  return {
    name: 'prune-inline-css',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (process.env.SKIP_COMPRESS === '1') {
          logger.info('SKIP_COMPRESS=1 — сокращение CSS пропущено');
          return;
        }
        if (process.env.PRUNE_CSS === '0') {
          logger.info('PRUNE_CSS=0 — сокращение CSS выключено');
          return;
        }

        const root = new URL('./', dir).pathname;
        const started = Date.now();

        // JS-модули: текст + граф статических/динамических импортов.
        const jsCache = new Map(); // abs path -> { text, deps: [abs] }
        async function loadJs(abs) {
          if (jsCache.has(abs)) return jsCache.get(abs);
          let text = '';
          try { text = await fs.readFile(abs, 'utf8'); } catch { /* нет файла */ }
          const entry = { text, deps: [] };
          jsCache.set(abs, entry);
          const re = /(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+\.js)["']/g;
          let m;
          while ((m = re.exec(text))) entry.deps.push(path.resolve(path.dirname(abs), m[1]));
          return entry;
        }
        async function closureText(entries) {
          const seen = new Set();
          const out = [];
          const stack = [...entries];
          while (stack.length) {
            const abs = stack.pop();
            if (seen.has(abs)) continue;
            seen.add(abs);
            const e = await loadJs(abs);
            out.push(e.text);
            stack.push(...e.deps);
          }
          return out.join('\n');
        }

        let pages = 0, pruned = 0, failed = 0, before = 0, after = 0;

        for await (const file of walkHtml(root)) {
          if (EXCLUDE.some((re) => re.test(file))) continue;
          const html = await fs.readFile(file, 'utf8');

          // Крупные style-блоки — кандидаты на сокращение.
          const blocks = [];
          for (const m of html.matchAll(STYLE_RE)) {
            if (m[1].length >= MIN_STYLE) blocks.push({ full: m[0], css: m[1] });
          }
          if (!blocks.length) continue;
          pages++;

          try {
            const contentHtml = html.replace(STYLE_RE, '');
            const scriptSrcs = [...contentHtml.matchAll(/<script\b[^>]*\bsrc=["']?([^"'\s>]+)/g)]
              .map((m) => m[1])
              .filter((s) => s.startsWith('/') && s.endsWith('.js'))
              .map((s) => path.join(root, decodeURIComponent(s)));
            const jsText = await closureText(scriptSrcs);

            let outHtml = html;
            for (const b of blocks) {
              const res = await new PurgeCSS().purge({
                content: [{ raw: contentHtml + '\n' + jsText, extension: 'html' }],
                css: [{ raw: b.css }],
                extractors: [{ extractor, extensions: ['html'] }],
                fontFace: false,
                keyframes: false,
                variables: false,
                safelist: { standard: SAFELIST_STANDARD, greedy: SAFELIST_PATTERNS },
              });
              const next = res[0]?.css;
              // Страховка: пустой/подозрительно маленький результат — оставляем оригинал.
              if (!next || next.length < b.css.length * 0.03 || !next.includes('@layer')) {
                logger.warn(`${path.relative(root, file)}: результат подозрительный, CSS не тронут`);
                continue;
              }
              before += b.css.length;
              after += next.length;
              outHtml = outHtml.replace(b.full, () => b.full.replace(b.css, () => next));
            }
            if (outHtml !== html) {
              await fs.writeFile(file, outHtml);
              pruned++;
            }
          } catch (e) {
            failed++;
            logger.warn(`${path.relative(root, file)}: не удалось сократить CSS (${e.message}) — оставлен как есть`);
          }
        }

        const secs = ((Date.now() - started) / 1000).toFixed(1);
        logger.info(
          `CSS: ${pruned}/${pages} страниц сокращено${failed ? `, ${failed} с ошибкой` : ''} — ` +
          `${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB за ${secs}с`
        );
      },
    },
  };
}
