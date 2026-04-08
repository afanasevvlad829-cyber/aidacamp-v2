(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.offerFlow = window.AC_FEATURES.offerFlow || {};

  function buildSearchMarkup(useLegacyLayout) {
    if (useLegacyLayout) {
      return '\n'
        + '  <div class="offer-state-shell offer-state-shell--search offer-state-shell--search-legacy">\n'
        + '    <div class="offer-headline">\n'
        + "      <h3>Ищем лучшую цену</h3>\n"
        + '      <button class="form-close offer-close-btn offer-close-placeholder" type="button" aria-hidden="true" tabindex="-1">\n'
        + '        <img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">\n'
        + "      </button>\n"
        + "    </div>\n"
        + '    <div class="offer-legacy-search-icon" aria-hidden="true">\n'
        + '      <img class="offer-legacy-search-icon__asset" src="/assets/icons/search.svg" alt="">\n'
        + "    </div>\n"
        + '    <div class="offer-legacy-status" id="offerProgressLead">Смотрим текущие бронирования...</div>\n'
        + '    <div class="offer-progress-track offer-progress-track--legacy">\n'
        + '      <div class="offer-progress-fill" id="offerProgressFillLine"></div>\n'
        + "    </div>\n"
        + '    <p class="offer-legacy-note">Проверяем доступные условия по выбранной смене.</p>\n'
        + "  </div>\n";
    }

    return '\n'
      + '  <div class="offer-state-shell offer-state-shell--search">\n'
      + '    <div class="offer-headline">\n'
      + "      <h3>Ищем лучшую цену</h3>\n"
      + '      <button class="form-close offer-close-btn offer-close-placeholder" type="button" aria-hidden="true" tabindex="-1">\n'
      + '        <img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">\n'
      + "      </button>\n"
      + "    </div>\n"
      + '    <p id="offerProgressLead">Проверяем остаток мест и доступные условия для выбранной смены.</p>\n'
      + '    <div class="offer-progress-track">\n'
      + '      <div class="offer-progress-fill" id="offerProgressFillLine"></div>\n'
      + "    </div>\n"
      + '    <div class="offer-progress-steps">\n'
      + '      <div class="offer-progress-step active" id="offerStepA">Проверяем смену</div>\n'
      + '      <div class="offer-progress-step" id="offerStepB">Сверяем цену</div>\n'
      + '      <div class="offer-progress-step" id="offerStepC">Генерируем код</div>\n'
      + "    </div>\n"
      + "  </div>\n";
  }

  function getSearchProgressSteps(options) {
    var opts = options || {};
    if (opts.useLegacyLayout) {
      return [
        { delay: 900, lead: "Смотрим текущие бронирования..." },
        { delay: 2700, lead: "Ищем свободные места..." },
        { delay: 4700, lead: "Проверяем отказы и неоплаты..." },
        { delay: 6400, lead: "Считаем максимально доступную цену..." }
      ];
    }
    return [
      {
        delay: 2300,
        lead: "Сверяем цену и проверяем, можно ли зафиксировать условия.",
        from: opts.stepA || null,
        to: opts.stepB || null
      },
      {
        delay: 4700,
        lead: "Готовим персональный код бронирования и закрепляем цену.",
        from: opts.stepB || null,
        to: opts.stepC || null
      }
    ];
  }

  function computeOfferState(options) {
    var opts = options || {};
    var basePrice = Number(opts.basePrice || 0);
    if (!basePrice) return null;

    var offerUtils = opts.featureOfferUtils;
    if (offerUtils && typeof offerUtils.buildOfferState === "function") {
      return offerUtils.buildOfferState({
        basePrice: basePrice,
        discountFactor: Number(opts.discountFactor || 0.95),
        now: Number(opts.now || Date.now()),
        ttlHours: Number(opts.ttlHours || 72)
      });
    }

    return {
      offerPrice: Math.round(basePrice * Number(opts.discountFactor || 0.95)),
      expiresAt: Number(opts.now || Date.now()) + Number(opts.ttlHours || 72) * 60 * 60 * 1000,
      offerStage: 1
    };
  }

  function buildResultMarkup(options) {
    var opts = options || {};
    var codeMarkup = opts.code
      ? '<span class="offer-benefit-chip"><strong>Код бронирования:</strong> ' + opts.code + "</span>"
      : "";
    if (opts.useLegacyLayout) {
      return '\n'
        + '  <div class="offer-state-shell offer-state-shell--result offer-state-shell--result-legacy">\n'
        + '    <div class="offer-headline">\n'
        + "      <h3>Нашли лучшие условия</h3>\n"
        + '      <button class="form-close offer-close-btn" type="button" data-action="close-offer" aria-label="Закрыть">\n'
        + '        <img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">\n'
        + "      </button>\n"
        + "    </div>\n"
        + '    <div class="offer-legacy-result-banner">\n'
        + '      <div class="offer-legacy-result-banner__icon" aria-hidden="true">\n'
        + '        <img class="offer-legacy-result-banner__asset" src="/assets/icons/search.svg" alt="">\n'
        + "      </div>\n"
        + '      <div class="offer-legacy-result-banner__text">\n'
        + "        <strong>Цена закреплена за вами</strong>\n"
        + "        <span>На ограниченное время</span>\n"
        + "      </div>\n"
        + "    </div>\n"
        + '    <div class="offer-legacy-price-box">\n'
        + "      <small>Ваша цена</small>\n"
        + "      <strong>" + opts.newPriceText + "</strong>\n"
        + "      <span>Вместо " + opts.oldPriceText + "</span>\n"
        + "    </div>\n"
        + '    <div class="offer-price-compare__benefits">\n'
        + "      <span class=\"offer-benefit-chip\"><strong>Выгода:</strong> " + opts.savingsText + "</span>\n"
        + "      <span class=\"offer-benefit-chip\"><strong>Разница:</strong> " + opts.savingsPercent + "</span>\n"
        + codeMarkup + "\n"
        + "    </div>\n"
        + '    <div class="offer-booking-block">\n'
        + '      <p class="offer-booking-note">Действует 72 часа. Вы можете спокойно подумать и вернуться.</p>\n'
        + "    </div>\n"
        + '    <div class="overlay-actions">\n'
        + '      <button class="cta-main" id="offerApplyBtn" data-action="apply-offer" type="button">Забронировать</button>\n'
        + "    </div>\n"
        + '    <div class="inline-lead-host hidden" id="offerInlineLeadHost"></div>\n'
        + "  </div>\n";
    }

    return '\n'
      + '  <div class="offer-state-shell offer-state-shell--result">\n'
      + '    <div class="offer-headline">\n'
      + "      <h3>Нашли лучшие условия</h3>\n"
      + '      <button class="form-close offer-close-btn" type="button" data-action="close-offer" aria-label="Закрыть">\n'
      + '        <img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">\n'
      + "      </button>\n"
      + "    </div>\n"
      + '    <div class="offer-price-compare">\n'
      + '      <div class="offer-price-compare__new">\n'
      + "        <small>Новая цена после проверки</small>\n"
      + "        <strong>" + opts.newPriceText + "</strong>\n"
      + "      </div>\n"
      + '      <div class="offer-price-compare__old">\n'
      + "        <small>Старая цена</small>\n"
      + "        <span>" + opts.oldPriceText + "</span>\n"
      + "      </div>\n"
      + '      <div class="offer-price-compare__benefits">\n'
      + "        <span class=\"offer-benefit-chip\"><strong>Выгода:</strong> " + opts.savingsText + "</span>\n"
      + "        <span class=\"offer-benefit-chip\"><strong>Разница:</strong> " + opts.savingsPercent + "</span>\n"
      + codeMarkup + "\n"
      + "      </div>\n"
      + "    </div>\n"
      + '    <div class="offer-booking-block">\n'
      + '      <p class="offer-booking-note">Действует 72 часа. Вы можете спокойно подумать и вернуться.</p>\n'
      + "    </div>\n"
      + '    <div class="overlay-actions">\n'
      + '      <button class="cta-main" id="offerApplyBtn" data-action="apply-offer" type="button">Забронировать</button>\n'
      + "    </div>\n"
      + '    <div class="inline-lead-host hidden" id="offerInlineLeadHost"></div>\n'
      + "  </div>\n";
  }

  function buildBookingSummaryHtml(options) {
    var opts = options || {};
    var state = opts.state || {};
    var getSelectedShift = opts.getSelectedShift || function () { return null; };
    var isOfferActive = opts.isOfferActive || function () { return false; };
    var formatPrice = opts.formatPrice || function (value) { return String(value || "—"); };
    var shift = getSelectedShift();
    if (!shift) return "";
    var ageLabel = opts.ageLabel || function () { return ""; };
    var bookingText = opts.bookingText || function () { return ""; };
    var stripRemainingPrefix = opts.stripRemainingPrefix || function (value) { return String(value || ""); };
    var formatRemainingCompact = opts.formatRemainingCompact || function (value) { return "" + Math.max(0, Number(value || 0)); };
    var showTimer = !!opts.showTimer;
    var shouldShowTimer = showTimer && isOfferActive();
    var timeLeft = shouldShowTimer ? stripRemainingPrefix(formatRemainingCompact(Number(state.expiresAt || 0) - Date.now())) : "";

    return "\n"
      + '  <div class="booking-summary-line">'
      + '    <span class="booking-summary-line__segment booking-summary-line__segment--price"><span class="booking-summary-price">' + formatPrice(state.offerPrice || state.basePrice || shift.price) + "</span></span>"
      + '    <span class="booking-summary-sep" aria-hidden="true">•</span>'
      + '    <span class="booking-summary-line__segment">'
      + '      <span class="booking-summary-selection">' + ageLabel(state.age) + "</span>"
      + "    </span>"
      + '    <span class="booking-summary-sep" aria-hidden="true">•</span>'
      + '    <span class="booking-summary-line__segment booking-summary-line__segment--date">'
      + '      <span class="booking-summary-selection booking-summary-selection--date">' + shift.dates + "</span>"
      + "    </span>"
      + "  </div>"
      + (timeLeft ? "\n"
      + '        <div class="booking-summary-timer">' +
      '        <div class="booking-summary-timer-title">' + bookingText("bookingTimerPinnedTitle") + "</div>" +
      '        <div class="booking-timer-line booking-timer-line--summary" data-live-timer="true">' + timeLeft + "</div>" +
      '      </div>'
      : "");
  }

  function openOfferCheck(options) {
    var opts = options || {};
    var runOfferSearch = opts.runOfferSearch;
    if (typeof runOfferSearch === "function") {
      runOfferSearch();
    }
  }

  function saveOfferAndClose(options) {
    var opts = options || {};
    var syncGuidedState = opts.syncGuidedState || function () {};
    var clearOfferTimeout = opts.clearOfferTimeout || function () {};
    var renderSummary = opts.renderSummary || function () {};
    var renderBookingPanels = opts.renderBookingPanels || function () {};
    var document = opts.document || window.document;

    syncGuidedState();
    clearOfferTimeout();
    var overlay = document.getElementById("offerOverlay");
    if (overlay) overlay.classList.add("hidden");
    renderSummary();
    renderBookingPanels();
  }

  function resetOfferProgressUI(options) {
    var opts = options || {};
    var clearOfferTimeout = opts.clearOfferTimeout || function () {};
    var state = opts.state || null;
    clearOfferTimeout();
    if (state) {
      state.offerSearching = false;
    }
  }

  function buildSelectedShiftPayload(options) {
    var opts = options || {};
    var state = opts.state || {};
    var getSelectedShift = opts.getSelectedShift || function () { return null; };
    var shiftDaysLabel = opts.shiftDaysLabel || function () { return ""; };
    var shift = getSelectedShift();
    return {
      shift_id: state.shiftId || "",
      shift_title: shift ? shift.title : "",
      shift_dates: shift ? shift.dates : "",
      shift_days: shift ? shiftDaysLabel(shift) : "",
      age: state.age || "",
      price: state.offerPrice || state.basePrice || (shift ? shift.price : "")
    };
  }

  function clearOfferTimeout(options) {
    var opts = options || {};
    var getTimeoutIds = opts.getTimeoutIds || function () { return []; };
    var setTimeoutIds = opts.setTimeoutIds || function () {};
    var clearTimeoutFn = opts.clearTimeoutFn || window.clearTimeout;
    var ids = getTimeoutIds();
    if (!Array.isArray(ids) || !ids.length) return;
    ids.forEach(function (id) {
      clearTimeoutFn(id);
    });
    setTimeoutIds([]);
  }

  function resetOfferState(options) {
    var opts = options || {};
    var state = opts.state || {};
    clearOfferTimeout({
      getTimeoutIds: opts.getTimeoutIds,
      setTimeoutIds: opts.setTimeoutIds,
      clearTimeoutFn: opts.clearTimeoutFn
    });
    state.offerStage = 0;
    state.offerPrice = null;
    state.code = null;
    state.expiresAt = null;
    state.offerSearching = false;
    state.bookingCompleted = false;
    if (!opts.preserveShift) {
      state.shiftId = null;
      state.basePrice = null;
    }
  }

  function runOfferSearch(options) {
    var opts = options || {};
    var state = opts.state || {};
    var shift = opts.getSelectedShift ? opts.getSelectedShift() : null;
    if (!shift) {
      if (typeof opts.nudgeUserToNextStep === "function" && typeof opts.bookingText === "function") {
        opts.nudgeUserToNextStep(opts.bookingText("selectShiftForPrice"));
      }
      return true;
    }

    var document = opts.document || window.document;
    var wrap = document.getElementById("offerOverlay");
    var card = document.getElementById("offerCard");
    if (!card) return true;

    card.classList.add("offer-card-stable");
    var currentRunId = typeof opts.bumpOfferRunId === "function" ? opts.bumpOfferRunId() : 0;
    state.offerSearching = true;
    if (typeof opts.clearOfferTimeout === "function") opts.clearOfferTimeout();

    if (typeof opts.track === "function" && typeof opts.selectedShiftPayload === "function") {
      opts.track("offer_open", opts.selectedShiftPayload());
      opts.track("offer_start", opts.selectedShiftPayload());
    }

    if (wrap) wrap.classList.remove("hidden");
    if (typeof opts.applyOfferModalTheme === "function") {
      opts.applyOfferModalTheme(card);
    }

    var useLegacyLayout = false;
    card.innerHTML = buildSearchMarkup(useLegacyLayout);

    if (typeof opts.normalizeCloseIconButtons === "function") {
      opts.normalizeCloseIconButtons(card);
    }
    card.querySelectorAll('[data-action="close-offer"]').forEach(function (btn) {
      btn.remove();
    });

    var fillEl = document.getElementById("offerProgressFillLine");
    var leadEl = document.getElementById("offerProgressLead");
    var stepA = document.getElementById("offerStepA");
    var stepB = document.getElementById("offerStepB");
    var stepC = document.getElementById("offerStepC");
    var progressDurationMs = 7000;

    if (fillEl) {
      fillEl.style.transition = "none";
      fillEl.style.width = "0%";
      window.requestAnimationFrame(function () {
        if (typeof opts.isOfferRunCurrent === "function" && !opts.isOfferRunCurrent(currentRunId)) return;
        fillEl.style.transition = "width " + progressDurationMs + "ms linear";
        fillEl.style.width = "100%";
      });
    }

    var progressSteps = getSearchProgressSteps({
      useLegacyLayout: useLegacyLayout,
      stepA: stepA,
      stepB: stepB,
      stepC: stepC
    });

    progressSteps.forEach(function (step) {
      var timeoutId = window.setTimeout(function () {
        if (typeof opts.isOfferRunCurrent === "function" && !opts.isOfferRunCurrent(currentRunId)) return;
        if (leadEl && step.lead) leadEl.textContent = step.lead;
        if (step.from && step.from.classList) step.from.classList.remove("active");
        if (step.to && step.to.classList) step.to.classList.add("active");
      }, step.delay);
      if (typeof opts.pushOfferTimeout === "function") {
        opts.pushOfferTimeout(timeoutId);
      }
    });

    var finalTimeoutId = window.setTimeout(function () {
      if (typeof opts.isOfferRunCurrent === "function" && !opts.isOfferRunCurrent(currentRunId)) return;
      if (typeof opts.clearOfferTimeout === "function") opts.clearOfferTimeout();
      if (typeof opts.showOffer === "function") opts.showOffer();
    }, progressDurationMs + 160);
    if (typeof opts.pushOfferTimeout === "function") {
      opts.pushOfferTimeout(finalTimeoutId);
    }
    return true;
  }

  function showOffer(options) {
    var opts = options || {};
    var state = opts.state || {};
    var document = opts.document || window.document;
    var card = document.getElementById("offerCard");
    var selectedShift = opts.getSelectedShift ? opts.getSelectedShift() : null;
    var basePrice = state.basePrice || (selectedShift ? selectedShift.price : null);
    var featureOfferUtils = opts.featureOfferUtils || (window.AC_FEATURES && window.AC_FEATURES.offerUtils) || null;

    if (basePrice) {
      var nextOfferState = computeOfferState({
        basePrice: basePrice,
        discountFactor: Number(opts.discountFactor || 0.95),
        now: Date.now(),
        ttlHours: Number(opts.ttlHours || 72),
        featureOfferUtils: featureOfferUtils
      });
      if (nextOfferState) {
        state.offerPrice = nextOfferState.offerPrice;
        state.expiresAt = nextOfferState.expiresAt;
        state.offerStage = nextOfferState.offerStage;
      }
    }

    if (state.code) state.previousCode = state.code;
    if (typeof opts.generateCode === "function") {
      state.code = opts.generateCode();
    }
    state.nextCodePreview = null;
    state.offerSearching = false;

    if (typeof opts.persist === "function") opts.persist();
    if (typeof opts.track === "function" && typeof opts.selectedShiftPayload === "function") {
      opts.track("offer_complete", opts.selectedShiftPayload());
    }

    if (card) {
      card.classList.add("offer-card-stable");
      if (typeof opts.applyOfferModalTheme === "function") {
        opts.applyOfferModalTheme(card);
      }
      var formatPrice = opts.formatPrice || function (v) { return String(v || "—"); };
      var oldPriceText = basePrice ? formatPrice(basePrice) : "—";
      var newPriceText = formatPrice(state.offerPrice);
      var appliedPrice = state.offerPrice || basePrice || 0;
      var savingsValue = Math.max(0, (basePrice || 0) - appliedPrice);
      var savingsText = formatPrice(savingsValue);
      var savingsPercent = basePrice ? String(Math.max(0, Math.round((savingsValue / basePrice) * 100))) + "%" : "0%";

      card.innerHTML = buildResultMarkup({
        useLegacyLayout: false,
        newPriceText: newPriceText,
        oldPriceText: oldPriceText,
        savingsText: savingsText,
        savingsPercent: savingsPercent,
        code: state.code || ""
      });
      if (typeof opts.normalizeCloseIconButtons === "function") {
        opts.normalizeCloseIconButtons(card);
      }
    }

    if (typeof opts.startTimer === "function") opts.startTimer();
    if (typeof opts.renderSummary === "function") opts.renderSummary();
    if (typeof opts.renderBookingPanels === "function") opts.renderBookingPanels();
    return true;
  }

  function applyOfferModalTheme(options) {
    var opts = options || {};
    var state = opts.state || {};
    var normalizeMode = opts.normalizeMode || function (value) { return value; };
    var themes = opts.themes || ["light", "dark"];
    var mode = normalizeMode(state.offerModalTheme, themes, "light");
    var document = opts.document || window.document;
    var lightBtn = document.getElementById("offerThemeLightBtn");
    var darkBtn = document.getElementById("offerThemeDarkBtn");
    if (lightBtn) lightBtn.classList.toggle("active", mode === "light");
    if (darkBtn) darkBtn.classList.toggle("active", mode === "dark");
    var card = opts.cardEl || document.getElementById("offerCard");
    if (card) card.classList.toggle("dark", mode === "dark");
  }

  function switchOfferModalTheme(options) {
    var opts = options || {};
    var state = opts.state || {};
    var normalizeMode = opts.normalizeMode || function (value) { return value; };
    var themes = opts.themes || ["light", "dark"];
    state.offerModalTheme = normalizeMode(opts.mode, themes, "light");
    applyOfferModalTheme({
      state: state,
      normalizeMode: normalizeMode,
      themes: themes,
      document: opts.document
    });
    var persist = opts.persist || function () {};
    persist();
  }

  function applyOfferLayoutMode(options) {
    var opts = options || {};
    var state = opts.state || {};
    var normalizeMode = opts.normalizeMode || function (value) { return value; };
    var modes = opts.modes || ["current"];
    var mode = normalizeMode(state.offerLayout, modes, "current");
    var document = opts.document || window.document;
    var currentBtn = document.getElementById("offerLayoutCurrentBtn");
    var legacyBtn = document.getElementById("offerLayoutLegacyBtn");
    if (currentBtn) currentBtn.classList.toggle("active", mode === "current");
    if (legacyBtn) legacyBtn.classList.toggle("active", false);
    var card = document.getElementById("offerCard");
    if (card) card.dataset.offerLayout = mode;
  }

  function switchOfferLayout(options) {
    var opts = options || {};
    var state = opts.state || {};
    var normalizeMode = opts.normalizeMode || function (value) { return value; };
    var modes = opts.modes || ["current"];
    var normalizedMode = normalizeMode(opts.mode, modes, "current");
    state.offerLayout = normalizedMode;
    applyOfferLayoutMode({
      state: state,
      normalizeMode: normalizeMode,
      modes: modes,
      document: opts.document
    });
    var persist = opts.persist || function () {};
    persist();
    var document = opts.document || window.document;
    var overlay = document.getElementById("offerOverlay");
    if (overlay && !overlay.classList.contains("hidden") && !state.offerSearching && state.offerStage > 0) {
      var showOffer = opts.showOffer || function () {};
      showOffer();
    }
  }

  window.AC_FEATURES.offerFlow.buildSearchMarkup = buildSearchMarkup;
  window.AC_FEATURES.offerFlow.getSearchProgressSteps = getSearchProgressSteps;
  window.AC_FEATURES.offerFlow.computeOfferState = computeOfferState;
  window.AC_FEATURES.offerFlow.buildResultMarkup = buildResultMarkup;
  window.AC_FEATURES.offerFlow.buildBookingSummaryHtml = buildBookingSummaryHtml;
  window.AC_FEATURES.offerFlow.openOfferCheck = openOfferCheck;
  window.AC_FEATURES.offerFlow.saveOfferAndClose = saveOfferAndClose;
  window.AC_FEATURES.offerFlow.resetOfferProgressUI = resetOfferProgressUI;
  window.AC_FEATURES.offerFlow.applyOfferModalTheme = applyOfferModalTheme;
  window.AC_FEATURES.offerFlow.switchOfferModalTheme = switchOfferModalTheme;
  window.AC_FEATURES.offerFlow.applyOfferLayoutMode = applyOfferLayoutMode;
  window.AC_FEATURES.offerFlow.switchOfferLayout = switchOfferLayout;
  window.AC_FEATURES.offerFlow.runOfferSearch = runOfferSearch;
  window.AC_FEATURES.offerFlow.showOffer = showOffer;
  window.AC_FEATURES.offerFlow.clearOfferTimeout = clearOfferTimeout;
  window.AC_FEATURES.offerFlow.resetOfferState = resetOfferState;
  window.AC_FEATURES.offerFlow.buildSelectedShiftPayload = buildSelectedShiftPayload;
})();
