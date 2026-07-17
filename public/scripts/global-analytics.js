  (function () {
    var YM_ID = 96499295;
    var _fired = new Set(JSON.parse(sessionStorage.getItem('ym_fired') || '[]'));
    function _persist() { try { sessionStorage.setItem('ym_fired', JSON.stringify([..._fired])); } catch(e){} }
    window.trackGoal = function (id, params) {
      if (_fired.has(id)) return;
      _fired.add(id);
      _persist();
      try { if (typeof window.ym !== 'undefined') window.ym(YM_ID, 'reachGoal', id, params || {}); } catch(e){}
      // Своя аналитика — параметрированные события в PostgreSQL
      if (params && Object.keys(params).length > 0) {
        try {
          var payload = JSON.stringify({ goal: id, params: params, url: location.href,
            referrer: document.referrer || undefined,
            client_id: (document.cookie.match(/_ym_uid=(\d+)/) || [])[1] || undefined });
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
          } else {
            fetch('/api/track', { method: 'POST', body: payload,
              headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function(){});
          }
        } catch(e) {}
      }
    };
    window.initScrollTracking = function () {
      var goals = [{p:25,id:'scroll_25'},{p:50,id:'scroll_50'},{p:75,id:'scroll_75'},{p:90,id:'scroll_90'}];
      window.addEventListener('scroll', function () {
        var h = document.documentElement.scrollHeight - (window.visualViewport ? window.visualViewport.height : window.innerHeight);
        if (!h) return;
        var pct = Math.round(window.scrollY / h * 100);
        goals.forEach(function (g) { if (pct >= g.p) window.trackGoal(g.id); });
      }, { passive: true });
    };
    window.initContactTracking = function (scope) {
      document.querySelectorAll(scope + ' a[href^="tel:"]').forEach(function (a) {
        a.addEventListener('click', function () { window.trackGoal('phone_click'); });
      });
      document.querySelectorAll(scope + ' a[href*="wa.me"]').forEach(function (a) {
        a.addEventListener('click', function () { window.trackGoal('whatsapp_click'); });
      });
      document.querySelectorAll(scope + ' a[href*="t.me"]').forEach(function (a) {
        a.addEventListener('click', function () { window.trackGoal('telegram_click'); });
      });
    };
    // Яндекс.Карты: клик по любой ссылке на карты и «Построить маршрут» (rtext=) —
    // горячий intent-сигнал («собирается ехать»). Делегирование: ловит все страницы
    // и все места (hero-чип, контакты, сезонные карточки) без scope-инициализации.
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href*="yandex.ru/maps"]') : null;
      if (!a) return;
      var goal = a.href.indexOf('rtext=') !== -1 ? 'maps_route_click' : 'maps_click';
      window.trackGoal(goal, { href: a.href.slice(0, 150), page: location.pathname });
    });
    // Число свободных мест скрыто блюром до клика «узнать места» — единый
    // глобальный обработчик (05.07.2026), работает на любой странице для любого
    // числа смен сразу: разметка [data-spots-num]/[data-spots-bar]/[data-spots-reveal-btn]
    // с общим [data-spots-shift=<id>]. Раскрытие — на сессию (sessionStorage),
    // синхронно между всеми страницами/карточками одной смены.
    var SPOTS_KEY = 'ac:occ_revealed';
    function spotsRevealed() {
      try { return JSON.parse(sessionStorage.getItem(SPOTS_KEY) || '[]'); } catch (e) { return []; }
    }
    function spotsReveal(shiftId) {
      document.querySelectorAll('[data-spots-num][data-spots-shift="' + shiftId + '"]').forEach(function (el) {
        el.classList.remove('blur-[6px]');
      });
      document.querySelectorAll('[data-spots-bar][data-spots-shift="' + shiftId + '"]').forEach(function (el) {
        el.style.width = el.dataset.spotsWidth || '0%';
      });
      document.querySelectorAll('[data-spots-reveal-btn][data-spots-shift="' + shiftId + '"]').forEach(function (el) {
        el.classList.add('hidden');
      });
    }
    function spotsInit() {
      var revealed = spotsRevealed();
      revealed.forEach(spotsReveal);
    }
    document.addEventListener('click', function (e) {
      // Клик работает и по кнопке «узнать», и по самому блюру (data-spots-num) —
      // раньше раскрывало только кнопку, замыленное число было некликабельным.
      var btn = e.target && e.target.closest ? e.target.closest('[data-spots-reveal-btn], [data-spots-num]') : null;
      if (!btn) return;
      var shiftId = btn.dataset.spotsShift;
      if (!shiftId) return;
      var revealed = spotsRevealed();
      if (!revealed.includes(shiftId)) {
        revealed.push(shiftId);
        try { sessionStorage.setItem(SPOTS_KEY, JSON.stringify(revealed)); } catch (e2) {}
      }
      spotsReveal(shiftId);
      window.trackGoal('available_spots', { shift: shiftId });
      var isLow = btn.dataset.spotsLow === '1' ||
        !!document.querySelector('[data-spots-reveal-btn][data-spots-shift="' + shiftId + '"][data-spots-low="1"]');
      if (isLow) window.trackGoal('viewed_low_availability', { shift: shiftId });
    });
    document.addEventListener('astro:page-load', spotsInit);
    if (document.readyState !== 'loading') spotsInit();

    // Иконка «?» рядом с кнопкой «Лист ожидания» — тултип по клику (не hover,
    // чтобы работало на мобильных). Разметка — WaitlistInfoIcon.astro, единый
    // глобальный обработчик для любого числа иконок на странице.
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-waitlist-info-btn]') : null;
      if (btn) {
        var tip = btn.parentElement && btn.parentElement.querySelector('[data-waitlist-info-tooltip]');
        document.querySelectorAll('[data-waitlist-info-tooltip]').forEach(function (el) {
          if (el !== tip) el.classList.add('hidden');
        });
        if (tip) tip.classList.toggle('hidden');
        return;
      }
      if (!e.target.closest || !e.target.closest('[data-waitlist-info]')) {
        document.querySelectorAll('[data-waitlist-info-tooltip]').forEach(function (el) { el.classList.add('hidden'); });
      }
    });
  })();
