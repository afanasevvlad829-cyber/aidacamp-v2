/**
 * style-crawler.js — автоматический обход CRM по уникальным типам страниц
 *
 * Логика дедупликации:
 *   - normPattern(url) → шаблон типа /customer/:id (для сравнения)
 *   - В очереди хранятся РЕАЛЬНЫЕ URL (для навигации)
 *   - Перед добавлением в очередь проверяем паттерн — уже видели такой?
 *   - Итого: /customer/1, /customer/2, /customer/999 → посещается ОДИН раз
 */
(function () {
  'use strict';

  const CRAWL_KEY    = 's20_crawl';
  const BASE_HOST    = location.hostname; // codim.s20.online
  const WAIT_MS      = 2000; // ждём style-collector (тот стартует через 1.2s)

  // Хосты которые полностью игнорируем (внешние сайты в ссылках CRM)
  const BLOCKED_HOSTS = new Set(['codims.ru', 'www.codims.ru']);

  // Паттерны URL которые не открываем (деструктивные / тяжёлые)
  const SKIP_RE = /\/(logout|delete|remove|export|print|download|ajax|api)\//i;

  // Нормализуем URL → паттерн для дедупликации (числа → :id)
  function normPattern(href) {
    try {
      const u = new URL(href, location.href);
      if (u.hostname !== BASE_HOST || BLOCKED_HOSTS.has(u.hostname)) return null;
      let p = u.pathname.replace(/\/$/, '') || '/';
      p = p.replace(/\/\d+/g, '/:id');
      if (SKIP_RE.test(p)) return null;
      return p;
    } catch (_) { return null; }
  }

  // Реальный путь для навигации (без query/hash, без нормализации ID)
  function realPath(href) {
    try {
      const u = new URL(href, location.href);
      if (u.hostname !== BASE_HOST || BLOCKED_HOSTS.has(u.hostname)) return null;
      return u.pathname.replace(/\/$/, '') || '/';
    } catch (_) { return null; }
  }

  // Собрать все уникальные ссылки с текущей страницы
  // Возвращает Map: паттерн → реальный путь
  function collectLinks() {
    const map = new Map(); // pattern → realUrl
    const selectors = [
      'nav.navbar-default.navbar-static-side .nav.metismenu a[href]', // sidebar (приоритет)
      'a[href]',
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(a => {
        const pat  = normPattern(a.href);
        const real = realPath(a.href);
        if (pat && real && !map.has(pat)) {
          map.set(pat, real);
        }
      });
    });
    return map;
  }

  function crawlStep() {
    chrome.storage.local.get([CRAWL_KEY], result => {
      const state = result[CRAWL_KEY];
      if (!state || !state.active) return;

      // Паттерн текущей страницы
      const curPattern = normPattern(location.href);
      const curReal    = realPath(location.href);

      if (!state.visitedPatterns) state.visitedPatterns = [];
      if (!state.visited)         state.visited = [];
      if (!state.queue)           state.queue = []; // [{real, pattern}]

      // Отметить текущую страницу посещённой
      if (curPattern && !state.visitedPatterns.includes(curPattern)) {
        state.visitedPatterns.push(curPattern);
        state.visited.push(curReal || curPattern);
      }

      // Собрать ссылки → добавить новые паттерны в очередь
      const found = collectLinks();
      const queuedPatterns = new Set(state.queue.map(x => x.pattern));

      found.forEach((real, pattern) => {
        if (
          !state.visitedPatterns.includes(pattern) &&
          !queuedPatterns.has(pattern)
        ) {
          state.queue.push({ real, pattern });
          queuedPatterns.add(pattern);
        }
      });

      state.lastPage     = curReal || curPattern;
      state.visitedCount = state.visited.length;
      state.queueCount   = state.queue.length;
      state.updatedAt    = Date.now();

      // Очередь пуста — готово
      if (state.queue.length === 0) {
        state.active     = false;
        state.finished   = true;
        state.finishedAt = Date.now();
        chrome.storage.local.set({ [CRAWL_KEY]: state });
        console.log('[s20-crawler] ✅ Готово! Посещено:', state.visited.length, 'уникальных типов страниц');
        return;
      }

      // Следующий URL из очереди — пропускаем пока не найдём безопасный
      let next = null;
      while (state.queue.length > 0) {
        const candidate = state.queue.shift();
        // Финальная проверка: только наш хост, только путь без домена
        if (
          candidate.real &&
          candidate.real.startsWith('/') &&
          !candidate.real.includes('//') &&
          !BLOCKED_HOSTS.has(candidate.pattern) &&
          candidate.pattern.startsWith('/')
        ) {
          next = candidate;
          break;
        }
        console.warn('[s20-crawler] пропущен небезопасный URL:', candidate);
      }

      if (!next) {
        state.active = false; state.finished = true; state.finishedAt = Date.now();
        chrome.storage.local.set({ [CRAWL_KEY]: state });
        console.log('[s20-crawler] ✅ Готово (очередь исчерпана после фильтрации)');
        return;
      }

      state.nextPage   = next.real;
      state.queueCount = state.queue.length;
      chrome.storage.local.set({ [CRAWL_KEY]: state });

      console.log(
        `[s20-crawler] ${state.visited.length} посещено · ${state.queue.length} в очереди → ${next.pattern}`
      );

      // Строим URL явно из BASE_HOST + путь — никакого внешнего домена попасть не может
      setTimeout(() => {
        location.href = 'https://' + BASE_HOST + next.real;
      }, WAIT_MS);
    });
  }

  // Запускаем после style-collector (1.2s) + небольшой буфер
  setTimeout(crawlStep, 1500);

})();
