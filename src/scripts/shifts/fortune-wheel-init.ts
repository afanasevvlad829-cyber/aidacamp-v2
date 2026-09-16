import {
  computeFortunePrice,
  computeDeposit,
  formatRub,
  formatTimerTick,
  MS_PER_DAY,
  TIMER_SECONDS,
} from './fortune';
import { YM_COUNTER } from '../../data/tracking';
// Тот же сбор контекста, что у обычной формы: UTM, yclid, страница, устройство,
// время в сессии, Яндекс-ID. Без этого заявка Фортуны приходила почти пустой.
import { collectContext, getYmClientId } from '../form-submit';

function initFortuneCard(cardEl: HTMLElement) {
  const SHIFT_ID = cardEl.dataset.shiftId ?? '';
  const cfg = SHIFT_ID ? (window as any).__fsc?.[SHIFT_ID] : null;
  if (!cfg) return;

  // id элементов уникальны по смене: на странице бывает несколько карточек
  // (Shifts.astro рендерит колесо для ВСЕХ предстоящих смен со свободными местами),
  // и глобальный getElementById('fsc-…') брал бы элементы чужой карточки.
  const byId = (name: string) => document.getElementById('fsc-' + name + '-' + SHIFT_ID);

  const segs: Array<{ label: string; d: number; w: number; color: string }> = cfg.segs;
  const PRICE: number = cfg.price;
  const fortuneMode: string = cfg.mode;

  let isSpinning = false;
  let currentRot = 0;
  let timerInterval: number | null = null;

  // ── Cookie helpers ─────────────────────────────────────────────────────
  const COOKIE_KEY = 'fortune_' + SHIFT_ID + '_played';
  function getCookie(name: string): string | null {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setCookie(name: string, value: string, days: number) {
    const exp = new Date(Date.now() + days * MS_PER_DAY).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + exp + '; path=/; SameSite=Lax';
  }

  // Restore state from sessionStorage so page refresh doesn't reset spins.
  // Дублируем в куку: sessionStorage умирает вместе с вкладкой, и раньше
  // выигранная скидка терялась безвозвратно — человек возвращался в пустоту.
  const SS_KEY = 'fortune_' + SHIFT_ID + '_2026';
  const STATE_COOKIE = 'fortune_' + SHIFT_ID + '_state';
  const WIN_TTL_DAYS = 30;
  let saved: { attempts: number; wonDiscount: number; wonToken: string; spinsDone: number } | null = null;
  try { saved = JSON.parse(sessionStorage.getItem(SS_KEY) || 'null'); } catch (_) {}
  if (!saved) {
    try { saved = JSON.parse(getCookie(STATE_COOKIE) || 'null'); } catch (_) {}
  }

  let attempts    = saved ? saved.attempts    : 3;
  let wonDiscount = saved ? saved.wonDiscount : 0;
  let wonToken    = saved ? saved.wonToken    : '';
  let spinsDone   = (saved && typeof saved.spinsDone === 'number') ? saved.spinsDone : 0;

  // ТЕСТ-РЕЖИМ: ?wheeltest — сброс состояния + 99 попыток (для проверки колеса)
  let FSC_TEST = false;
  try { FSC_TEST = new URLSearchParams(location.search).has('wheeltest'); } catch (_) {}
  if (FSC_TEST) {
    try { sessionStorage.removeItem(SS_KEY); } catch (_) {}
    document.cookie = COOKIE_KEY + '=;path=/;max-age=0;SameSite=Lax';
    document.cookie = STATE_COOKIE + '=;path=/;max-age=0;SameSite=Lax';
    saved = null; attempts = 99; wonDiscount = 0; wonToken = ''; spinsDone = 0;
  }

  function saveState() {
    const st = JSON.stringify({ attempts, wonDiscount, wonToken, spinsDone });
    try { sessionStorage.setItem(SS_KEY, st); } catch (_) {}
    // В куку пишем только когда есть что беречь — саму выигранную скидку.
    if (wonDiscount > 0) { try { setCookie(STATE_COOKIE, st, WIN_TTL_DAYS); } catch (_) {} }
  }

  const wheel        = byId('wheel') as SVGSVGElement | null;
  const spinBtn      = byId('spin-btn') as HTMLButtonElement | null;
  const spinLabel    = byId('spin-label');
  const attemptsEl   = byId('attempts');
  const winBlock     = byId('win-block')!;
  const fallback     = byId('fallback');
  const wheelArea    = byId('wheel-area');
  const discPctEl    = byId('disc-pct');
  const finalPriceEl = byId('final-price');
  const depPriceEl   = byId('dep-price');
  const bookBtn      = byId('book-btn');
  const modal        = byId('modal')!;
  const modalDisc    = byId('modal-disc');
  const modalFinal   = byId('modal-final');
  const modalDep     = byId('modal-dep');
  const timerEl      = byId('timer');
  const nameInput    = byId('name') as HTMLInputElement | null;
  const phoneInput   = byId('phone') as HTMLInputElement | null;
  const consentBox   = byId('consent') as HTMLInputElement | null;
  const formError    = byId('form-error');
  const payBtn       = byId('pay-btn') as HTMLButtonElement | null;
  const payLabel     = byId('pay-label');
  const modalClose   = byId('modal-close');

  if (!wheel || !spinBtn || !modal) return; // guard
  const spinButton = spinBtn;

  // Портал: выносим модалку в <body>, чтобы position:fixed считался от вьюпорта,
  // а не от трансформируемого/скроллящегося предка (карусель) — иначе панель
  // прижимается влево и обрезается сверху на десктопе.
  if (modal.parentElement !== document.body) document.body.appendChild(modal);

  // ── Lead-режим: обновляем блок «что будет» ─────────────────────────────
  if (fortuneMode === 'lead') {
    const stepsBlock = byId('next-steps');
    if (stepsBlock) stepsBlock.innerHTML = [
      '<p class="font-semibold text-gray-700 text-base mb-2">Что будет дальше:</p>',
      '<p><span class="inline-block w-4 text-orange-500 font-bold">1.</span> Менеджер свяжется с вами и ответит на вопросы</p>',
      '<p><span class="inline-block w-4 text-orange-500 font-bold">2.</span> Поможем оформить договор — спокойно, без спешки</p>',
      '<p><span class="inline-block w-4 text-orange-500 font-bold">3.</span> Счёт выставим позже, без предоплаты сейчас</p>',
      '<p class="text-gray-400 pt-1">Скидка действует по реальному остатку мест — если место не успеют оформить, оно может уйти другому.</p>',
    ].join('');
  }

  // ── Вернувшийся посетитель (кука есть, активной сессии нет) ────────────
  // Условие: кука = "уже крутил", sessionStorage = нет (вкладка была закрыта)
  // → скидка утеряна, показываем стандартную карточку без колеса
  if (!saved && getCookie(COOKIE_KEY) === '1') {
    if (wheelArea) wheelArea.classList.add('hidden');
    winBlock.classList.add('hidden'); winBlock.classList.remove('flex');
    if (fallback) { fallback.classList.remove('hidden'); fallback.classList.add('flex'); }
    return; // дальше ничего не инициализируем
  }

  // ── Аналитика: колесо появилось на экране ──────────────────────────────
  let _wheelViewed = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting && !_wheelViewed) {
        _wheelViewed = true;
        try { (window as any).ym && (window as any).ym(YM_COUNTER, 'reachGoal', 'fortune_wheel_view'); } catch (_e) {}
        obs.disconnect();
      }
    }, { threshold: 0.4 }).observe(wheelArea || wheel);
  }

  // Restore UI from saved session state
  if (saved) {
    updateDots();
    if (saved.wonDiscount > 0) {
      // Токен подписан часовым слотом и живёт ~час (см. api/fortune/init.ts).
      // При возврате через день сохранённый токен уже недействителен —
      // запрашиваем свежий под ту же скидку, иначе бронь упадёт с 403.
      fetch('/api/fortune/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount: saved.wonDiscount }),
      })
        .then(r => r.json())
        .then(data => { if (data && data.token) { wonToken = data.token; saveState(); } })
        .catch(() => {});
      const _fp  = computeFortunePrice(PRICE, saved.wonDiscount);
      const _dep = computeDeposit(_fp);
      if (discPctEl)    discPctEl.textContent    = saved.wonDiscount + '%';
      if (finalPriceEl) finalPriceEl.textContent = formatRub(_fp);
      if (depPriceEl)   depPriceEl.textContent   = formatRub(_dep);
      winBlock.classList.remove('hidden');
      winBlock.classList.add('flex');
      if (saved.attempts <= 0) {
        spinBtn.disabled = true;
        if (spinLabel) spinLabel.textContent = 'Попытки исчерпаны';
      }
    } else if (saved.attempts <= 0) {
      showFallback();
    }
  }

  function updateDots() {
    if (!attemptsEl) return;
    const dots = attemptsEl.querySelectorAll<HTMLElement>('[data-dot]');
    dots.forEach((dot, i) => {
      dot.style.background = i < attempts
        ? 'var(--color-primary, #f97316)'
        : '#e2e8f0';
    });
  }

  function showWin(segIdx: number) {
    const d = segs[segIdx].d;
    wonDiscount = d;

    // Логируем кручение в БД (fire-and-forget)
    fetch('/api/fortune/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discount: d, shiftId: SHIFT_ID }),
    }).catch(() => {});

    const fp  = computeFortunePrice(PRICE, d);
    const dep = computeDeposit(fp);

    if (discPctEl)    discPctEl.textContent    = d + '%';
    if (finalPriceEl) finalPriceEl.textContent = formatRub(fp);
    if (depPriceEl)   depPriceEl.textContent   = formatRub(dep);

    winBlock.classList.remove('hidden');
    winBlock.classList.add('flex');

    // Получаем подписанный токен для этой скидки с сервера
    fetch('/api/fortune/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discount: d }),
    })
      .then(r => r.json())
      .then(data => { wonToken = data.token || ''; saveState(); })
      .catch(() => { wonToken = ''; });

    // Metrika: выиграл скидку
    try {
      (window as any).ym && (window as any).ym(YM_COUNTER, 'reachGoal', 'fortune_win', {
        discount:      d,
        price_full:    PRICE,
        price_final:   fp,
        attempts_left: attempts,
      });
    } catch (_e) {}

    // Re-enable spin button if attempts remain
    if (attempts > 0) {
      spinButton.disabled = false;
      if (spinLabel) spinLabel.textContent = 'Попробовать ещё раз';
    } else {
      spinButton.disabled = true;
      if (spinLabel) spinLabel.textContent = 'Попытки исчерпаны';
    }
  }

  function showFallback() {
    if (wheelArea) wheelArea.classList.add('hidden');
    winBlock.classList.add('hidden');
    winBlock.classList.remove('flex');
    if (fallback) {
      fallback.classList.remove('hidden');
      fallback.classList.add('flex');
    }
    try { (window as any).ym && (window as any).ym(YM_COUNTER, 'reachGoal', 'fortune_fallback_shown'); } catch (_) {}
  }

  // Weighted random from a subset of segment indices
  function pickFrom(indices: number[]): number {
    let total = 0;
    for (let i = 0; i < indices.length; i++) total += segs[indices[i]].w;
    let r = Math.random() * total;
    let cum = 0;
    for (let j = 0; j < indices.length; j++) {
      cum += segs[indices[j]].w;
      if (r < cum) return indices[j];
    }
    return indices[indices.length - 1];
  }

  // Индексы считаются от ЗНАЧЕНИЯ сегмента, а не от позиции в массиве —
  // раньше (до фикса) тут были захардкожены позиции 0–5, и когда SEGMENTS
  // сократили до 4 элементов, индексы 4/5 стали undefined и колесо падало
  // на 2–3 прокруте. Не хардкодить индексы заново.
  const GUARANTEED_PCT = 30; // 1-й прокрут — гарантированный процент
  function pickWinner(spinNumber: number): number {
    const allIdx = segs.map((_s, i) => i);
    if (spinNumber === 1) {
      const idx = segs.findIndex((s) => s.d === GUARANTEED_PCT);
      return idx >= 0 ? idx : 0;
    }
    if (spinNumber === 3) {
      // Всё, кроме самого маленького значения на колесе (как в исходном дизайне)
      let minIdx = 0;
      for (let i = 1; i < segs.length; i++) if (segs[i].d < segs[minIdx].d) minIdx = i;
      return pickFrom(allIdx.filter((i) => i !== minIdx));
    }
    return pickFrom(allIdx);
  }

  // Target rotation so segment i lands at top pointer (0° position)
  function targetRotation(segIdx: number): number {
    const segDeg = 360 / segs.length; // делит круг поровну на все сегменты
    const segCenterDeg = (segIdx + 0.5) * segDeg; // 0° = top
    const naturalStop  = (360 - segCenterDeg + 360) % 360;
    const jitter = (Math.random() - 0.5) * 30; // ±15°
    // 5+ full spins from current position
    const base = Math.ceil(currentRot / 360) * 360;
    return base + 5 * 360 + naturalStop + jitter;
  }

  // ── Spin ──
  spinBtn.addEventListener('click', () => {
    if (isSpinning || attempts <= 0) return;
    isSpinning = true;
    setCookie(COOKIE_KEY, '1', 90); // помечаем: этот браузер уже крутил (90 дней)
    attempts--;
    updateDots();
    spinBtn.disabled = true;
    if (spinLabel) spinLabel.textContent = 'Крутим...';

    spinsDone++;
    const spinNumber = spinsDone; // 1 = первое кручение (всегда 30%), далее рандом

    // Metrika: спин (номер попытки 1–3)
    try { (window as any).ym && (window as any).ym(YM_COUNTER, 'reachGoal', 'fortune_spin', { attempt: spinNumber }); } catch (_) {}

    // Hide previous win block while spinning
    winBlock.classList.add('hidden');
    winBlock.classList.remove('flex');

    const winner = pickWinner(spinNumber);
    const target = targetRotation(winner);

    wheel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 1.0)';
    wheel.style.transform  = 'rotate(' + target + 'deg)';
    currentRot = target;

    setTimeout(() => {
      isSpinning = false;
      saveState();
      showWin(winner);
    }, 3150);
  });

  // ── Open booking modal ──
  bookBtn?.addEventListener('click', () => {
    const d   = wonDiscount;
    const fp  = computeFortunePrice(PRICE, d);
    const dep = computeDeposit(fp);

    if (modalDisc)  modalDisc.textContent  = d + '%';
    if (modalFinal) modalFinal.textContent = formatRub(fp);
    if (modalDep)   modalDep.textContent   = formatRub(dep);

    // Кнопка: текст и бейдж скидки
    const discBadge    = byId('pay-disc');
    const discBadgeVal = byId('pay-disc-val');
    if (fortuneMode === 'lead') {
      if (payLabel)    payLabel.textContent    = 'Отправить заявку';
      if (discBadgeVal) discBadgeVal.textContent = String(d);
      if (discBadge)    discBadge.classList.remove('hidden');
    } else {
      if (payLabel) payLabel.textContent = 'Оплатить ' + formatRub(dep) + ' через Т-банк';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    startTimer();
    setTimeout(() => { nameInput?.focus(); }, 50);

    // Metrika: открыл форму бронирования
    try { (window as any).ym && (window as any).ym(YM_COUNTER, 'reachGoal', 'fortune_modal_open', { discount: d }); } catch (_e) {}
  });

  // ── Timer ──
  function startTimer() {
    if (!timerEl) return; // таймер убран — ничего не делаем
    if (timerInterval !== null) clearInterval(timerInterval);
    let secs = TIMER_SECONDS;
    function tick() {
      timerEl!.textContent = formatTimerTick(secs);
      if (secs <= 0) {
        clearInterval(timerInterval!);
        timerEl!.style.color = '#dc2626';
      }
      secs--;
    }
    tick();
    timerInterval = window.setInterval(tick, 1000);
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (timerInterval !== null) clearInterval(timerInterval);
    try { (window as any).ym && (window as any).ym(YM_COUNTER, 'reachGoal', 'fortune_modal_close', { discount: wonDiscount }); } catch (_e) {}
  }

  modalClose?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    // закрыть если клик по подложке, но не по карточке
    if (e.target === modal || (e.target instanceof Element && e.target.closest(`[id="${modal.id}"]`) && !e.target.closest('[role="dialog"] .bg-white'))) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  // ── Pay button ──
  payBtn?.addEventListener('click', () => {
    if (formError) {
      formError.classList.add('hidden');
      formError.textContent = '';
    }

    const name  = nameInput?.value.trim() ?? '';
    const phone = phoneInput?.value.replace(/\D/g, '') ?? '';

    if (!name || name.split(' ').length < 2) {
      if (formError) { formError.textContent = 'Введите фамилию и имя'; formError.classList.remove('hidden'); }
      nameInput?.focus();
      return;
    }
    if (phone.length < 10) {
      if (formError) { formError.textContent = 'Введите корректный номер телефона'; formError.classList.remove('hidden'); }
      phoneInput?.focus();
      return;
    }
    if (consentBox && !consentBox.checked) {
      if (formError) { formError.textContent = 'Подтвердите согласие на обработку персональных данных'; formError.classList.remove('hidden'); }
      consentBox.focus();
      return;
    }

    // Metrika: перехватываем лид до отправки в банк
    try {
      (window as any).ym && (window as any).ym(YM_COUNTER, 'reachGoal', 'fortune_lead_capture', {
        discount: wonDiscount,
        name,
        phone: phoneInput?.value.trim(),
      });
    } catch (_) {}

    if (payBtn) payBtn.disabled = true;
    if (payLabel) payLabel.textContent = fortuneMode === 'lead' ? 'Отправляем…' : 'Переходим в банк…';

    const isTest = new URLSearchParams(window.location.search).get('ft') === '1';

    Promise.all([getYmClientId().catch(() => ''), Promise.resolve(collectContext())])
      .then(([ymClientId, ctx]) => fetch('/api/fortune/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftId:  SHIFT_ID,
        discount: wonDiscount,
        token:    wonToken,
        name,
        phone: phoneInput?.value.trim(),
        test:  isTest,
        ymClientId,
        ctx,
      }),
    }))
      .then(r => r.json())
      .then(data => {
        if (data.leadMode) {
          if (timerInterval !== null) clearInterval(timerInterval);
          try {
            (window as any).ym && (window as any).ym(YM_COUNTER, 'reachGoal', 'fortune_lead', {
              discount: wonDiscount,
              order_id: data.orderId,
            });
          } catch (_e) {}
          // Прячем форму, показываем экран благодарности
          const formWrap = byId('form-wrap');
          if (formWrap) formWrap.innerHTML = [
            '<div class="flex flex-col items-center gap-4 py-6 text-center">',
            '  <div class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">',
            '    <i class="bi bi-check-lg text-[28px] text-emerald-600" aria-hidden="true"></i>',
            '  </div>',
            '  <p class="text-[18px] font-bold text-body">Заявка принята!</p>',
            '  <p class="text-base text-body-muted leading-[1.5]">Менеджер свяжется с вами, ответит на вопросы<br>и поможет оформить договор — спокойно, без спешки.</p>',
            '  <div class="rounded-xl bg-primary/8 px-4 py-3 text-center">',
            '    <p class="text-[12px] text-body-faint uppercase tracking-wider mb-0.5">Ваша скидка</p>',
            '    <p class="text-[22px] font-extrabold text-primary">' + wonDiscount + '%</p>',
            '    <p class="text-base text-body-muted">Итоговая цена: <b>' + (data.finalPrice || '').toLocaleString('ru-RU') + ' ₽</b></p>',
            '  </div>',
            '</div>',
          ].join('');
          // Кнопка и «Что будет после оплаты» больше не нужны — заявка уже принята,
          // без этого кнопка так и висела на "Отправляем…" (баг, найден 26.07.2026).
          byId('pay-btn-wrap')?.classList.add('hidden');
          byId('next-steps')?.classList.add('hidden');
        } else if (data.paymentUrl) {
          if (timerInterval !== null) clearInterval(timerInterval);
          try {
            (window as any).ym && (window as any).ym(YM_COUNTER, 'reachGoal', 'fortune_payment_start', {
              discount:   wonDiscount,
              deposit:    data.deposit,
              order_id:   data.orderId,
              payment_id: data.paymentId,
            });
          } catch (_e) {}
          window.location.href = data.paymentUrl;
        } else {
          if (formError) { formError.textContent = data.error || 'Ошибка оплаты. Попробуйте ещё раз.'; formError.classList.remove('hidden'); }
          if (payBtn) payBtn.disabled = false;
          if (payLabel) payLabel.textContent = fortuneMode === 'lead' ? 'Отправить заявку' : 'Оплатить через Т-банк';
        }
      })
      .catch(() => {
        if (formError) { formError.textContent = 'Ошибка соединения. Проверьте интернет и попробуйте снова.'; formError.classList.remove('hidden'); }
        if (payBtn) payBtn.disabled = false;
        if (payLabel) payLabel.textContent = fortuneMode === 'lead' ? 'Отправить заявку' : 'Оплатить через Т-банк';
      });
  });

  // ── Phone mask ──
  phoneInput?.addEventListener('input', () => {
    if (!phoneInput) return;
    let raw = phoneInput.value.replace(/\D/g, '');
    if (!raw.length) return;
    if (raw[0] === '8') raw = '7' + raw.slice(1);
    if (raw[0] === '9') raw = '7' + raw; // пользователь ввёл без 7 в начале
    let out = '+' + raw[0];
    if (raw.length > 1) out += ' (' + raw.slice(1, 4);
    if (raw.length >= 4) out += ') ' + raw.slice(4, 7);
    if (raw.length >= 7) out += '-' + raw.slice(7, 9);
    if (raw.length >= 9) out += '-' + raw.slice(9, 11);
    phoneInput.value = out;
  });
}

// Вызывается динамическим import() только когда колесо реально активировано
// (Shifts.astro apply()) — раньше этот код грузился на КАЖДОЙ загрузке главной,
// даже когда колесо скрыто (что почти всегда). PageSpeed: критический путь
// тянул этот чанк ради виджета, который 9 из 10 посетителей не видят.
export function initFortuneCards() {
  document.querySelectorAll<HTMLElement>('[data-fortune-card]').forEach(initFortuneCard);
}
