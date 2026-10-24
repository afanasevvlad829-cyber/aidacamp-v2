/**
 * Логика оверлея поиска по сайту (Pagefind). Грузится лениво: eager-бутстрап
 * в SiteSearch.astro дёргает dynamic import по первому обращению (клик по
 * [data-search-trigger] / Ctrl+K), поэтому этот чанк не входит в начальный
 * граф страницы (цепочка критических запросов PageSpeed).
 * Разметка оверлея серверная и всегда в DOM; visualViewport-синхронизация
 * (--kbd-offset, глобальная, для всех полей ввода) осталась в бутстрапе.
 */
import { lockScroll, unlockScroll } from './scrollLock';

let pagefindInstance: any = null;
let initPromise: Promise<any> | null = null;

async function initPagefind() {
  if (pagefindInstance) return pagefindInstance;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      // Pagefind is generated at build time AFTER vite. Obfuscate import so
      // Rollup doesn't try to resolve it during build.
      const pfUrl = '/_pagefind/' + 'pagefind.js';
      // @ts-ignore
      const pf = await import(/* @vite-ignore */ /* webpackIgnore: true */ pfUrl);
      await pf.options({ ranking: { termFrequency: 0.8 } });
      pagefindInstance = pf;
      return pf;
    } catch (e) {
      console.error('[SiteSearch] Pagefind not available:', e);
      return null;
    }
  })();
  return initPromise;
}

export function openOverlay() {
  const overlay = document.getElementById('site-search-overlay');
  const input = document.getElementById('site-search-input') as HTMLInputElement;
  if (!overlay || !input) return;
  overlay.classList.remove('hidden');
  lockScroll();
  setTimeout(() => input.focus(), 50);
  void initPagefind();
}

export function closeOverlay() {
  const overlay = document.getElementById('site-search-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  unlockScroll();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function runSearch(query: string) {
  const resultsEl = document.getElementById('site-search-results');
  if (!resultsEl) return;
  if (!query || query.length < 2) {
    resultsEl.innerHTML = '<div class="px-4 py-8 text-center text-base text-slate-500">Начните вводить запрос…</div>';
    return;
  }
  const pf = await initPagefind();
  if (!pf) {
    resultsEl.innerHTML = '<div class="px-4 py-8 text-center text-base text-red-600">Поиск временно недоступен.</div>';
    return;
  }
  resultsEl.innerHTML = '<div class="px-4 py-8 text-center text-base text-slate-500">Ищем…</div>';
  try {
    const search = await pf.search(query);
    if (!search.results.length) {
      resultsEl.innerHTML = `<div class="px-4 py-8 text-center text-base text-slate-500">Ничего не найдено по «${escapeHtml(query)}». <a href="/ask/" class="text-primary underline">Спросите анонимно</a>.</div>`;
      return;
    }
    const top = search.results.slice(0, 8);
    const data = await Promise.all(top.map((r: any) => r.data()));
    resultsEl.innerHTML = data
      .map((d: any) => {
        const title = escapeHtml(d.meta?.title || d.url || 'Без названия');
        const excerpt = d.excerpt || '';
        return `<a href="${d.url}" class="block rounded-xl px-4 py-3 transition hover:bg-slate-50">
          <div class="text-base font-semibold text-slate-900">${title}</div>
          <div class="mt-1 text-base leading-[1.5] text-slate-600">${excerpt}</div>
        </a>`;
      })
      .join('');
  } catch (e) {
    console.error('[SiteSearch] Search failed:', e);
    resultsEl.innerHTML = '<div class="px-4 py-8 text-center text-base text-red-600">Ошибка поиска.</div>';
  }
}

let initialized = false;

export function initSiteSearch() {
  if (initialized) return;
  initialized = true;
  document.querySelectorAll<HTMLButtonElement>('[data-search-trigger]').forEach((btn) => {
    btn.addEventListener('click', openOverlay);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-search-close]').forEach((btn) => {
    btn.addEventListener('click', closeOverlay);
  });
  const overlay = document.getElementById('site-search-overlay');
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openOverlay();
    }
  });
  const input = document.getElementById('site-search-input') as HTMLInputElement | null;
  let debounce: any = null;
  input?.addEventListener('input', () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => runSearch(input.value.trim()), 200);
  });
}
