(function registerBookingRuntime() {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.bookingRuntime = window.AC_FEATURES.bookingRuntime || {};

  function buildSelectedShiftPayload(options) {
    var offerFlow = window.AC_FEATURES && window.AC_FEATURES.offerFlow;
    if (!offerFlow || typeof offerFlow.buildSelectedShiftPayload !== "function") {
      return {};
    }

    return offerFlow.buildSelectedShiftPayload({
      state: options.state || {},
      getSelectedShift: options.getSelectedShift || function () { return null; },
      shiftDaysLabel: options.shiftDaysLabel || function () { return ""; }
    });
  }

  function selectedShiftPayload(options) {
    return buildSelectedShiftPayload(options);
  }

  function clearOfferTimeout(options) {
    var offerFlow = window.AC_FEATURES && window.AC_FEATURES.offerFlow;
    if (!offerFlow || typeof offerFlow.clearOfferTimeout !== "function") return;
    return offerFlow.clearOfferTimeout({
      getTimeoutIds: options.getTimeoutIds || function () { return []; },
      setTimeoutIds: options.setTimeoutIds || function () {},
      clearTimeoutFn: options.clearTimeoutFn || window.clearTimeout
    });
  }

  function resetOfferState(options) {
    var offerFlow = window.AC_FEATURES && window.AC_FEATURES.offerFlow;
    if (!offerFlow || typeof offerFlow.resetOfferState !== "function") return;
    return offerFlow.resetOfferState({
      preserveShift: options.preserveShift !== false,
      state: options.state || {},
      getTimeoutIds: options.getTimeoutIds || function () { return []; },
      setTimeoutIds: options.setTimeoutIds || function () {},
      clearTimeoutFn: options.clearTimeoutFn || window.clearTimeout
    });
  }

  function buildBookingSummaryHtml(options) {
    var offerFlow = window.AC_FEATURES && window.AC_FEATURES.offerFlow;
    if (!offerFlow || typeof offerFlow.buildBookingSummaryHtml !== "function") return "";
    return offerFlow.buildBookingSummaryHtml({
      state: options.state || {},
      getSelectedShift: options.getSelectedShift || function () { return null; },
      isOfferActive: options.isOfferActive || function () { return false; },
      formatPrice: options.formatPrice || function (value) { return String(value || "—"); },
      ageLabel: options.ageLabel || function () { return ""; },
      bookingText: options.bookingText || function () { return ""; },
      stripRemainingPrefix: options.stripRemainingPrefix || function (value) { return String(value || ""); },
      formatRemainingCompact: options.formatRemainingCompact || function (value) { return "" + Math.max(0, Number(value || 0)); },
      showTimer: options.showTimer || false
    });
  }

  function selectShift(options) {
    var opts = options || {};
    var state = opts.state || {};
    var getShifts = opts.getShifts || function () { return []; };
    var shiftId = opts.shiftId;
    var shift = getShifts().find(function findShift(item) {
      return item && item.id === shiftId;
    });
    if (!shiftId) return false;

    if (typeof opts.clearShiftOptionPanels === "function") {
      opts.clearShiftOptionPanels();
    }
    if (typeof opts.applyStatePatch === "function") {
      opts.applyStatePatch({
        shiftId: shiftId,
        basePrice: shift ? shift.price : null,
        offerPrice: null,
        code: null,
        expiresAt: null,
        offerStage: 0
      });
    } else {
      state.shiftId = shiftId;
      state.basePrice = shift ? shift.price : null;
      state.offerPrice = null;
      state.code = null;
      state.expiresAt = null;
      state.offerStage = 0;
    }
    if (typeof opts.renderAll === "function") {
      opts.renderAll();
    }
    if (typeof opts.persist === "function") {
      opts.persist();
    }
    return true;
  }

  function resetAgeSelection(options){
    var opts = options || {};
    var state = opts.state || {};
    var clearShiftOptionPanels = opts.clearShiftOptionPanels || function(){};
    var renderAll = opts.renderAll || function(){};
    var persist = opts.persist || function(){};
    clearShiftOptionPanels();
    Object.assign(state, {
      age: null,
      ageSelected: false,
      shiftId: null,
      basePrice: null,
      offerPrice: null,
      code: null,
      expiresAt: null,
      offerStage: 0,
      bookingCompleted: false
    });
    ['desktopAgeTabs','mobileAgeTabs'].forEach(function(id){
      var root = document.getElementById(id);
      if(!root) return;
      root.querySelectorAll('[data-age]').forEach(function(node){
        node.classList.remove('active');
      });
    });
    renderAll();
    persist();
  }

  function resetShiftSelection(options){
    var opts = options || {};
    var state = opts.state || {};
    var clearShiftOptionPanels = opts.clearShiftOptionPanels || function(){};
    var renderAll = opts.renderAll || function(){};
    var persist = opts.persist || function(){};
    var showHint = opts.showHint || function(){};
    clearShiftOptionPanels();
    Object.assign(state, {
      shiftId: null,
      basePrice: null,
      offerPrice: null,
      code: null,
      expiresAt: null,
      offerStage: 0,
      offerSearching: false,
      bookingCompleted: false
    });
    showHint('Смена сброшена. Выберите подходящий вариант.', 'shift');
    renderAll();
    persist();
  }

  function getPrimaryActionState(options) {
    var opts = options || {};
    var state = opts.state || {};
    var hasSelectedAge = opts.hasSelectedAge || function () { return false; };
    var getSelectedShift = opts.getSelectedShift || function () { return null; };
    var resolveHeroVariantFromUtm = opts.resolveHeroVariantFromUtm || function () { return null; };
    var variantDefaultTier = opts.HERO_VARIANT_DEFAULT_TIER || "broad";
    var variantCopyMap = opts.HERO_VARIANT_COPY || {};
    var variant = opts.heroVariantState || resolveHeroVariantFromUtm() || {};
    var tierCopy = variantCopyMap[variantDefaultTier] || {};
    var copy = variant.copy || tierCopy;
    var shift = getSelectedShift();

    if (!hasSelectedAge()) {
      return {
        text: copy.cta || "",
        disabled: true,
        hint: ""
      };
    }

    if (state.bookingCompleted) {
      return {
        text: "Заявка принята",
        disabled: true,
        hint: ""
      };
    }

    if (!shift) {
      return opts.simpleModeEnabled
        ? { text: "Оставить заявку", disabled: false, hint: "" }
        : { text: "Выберите смену", disabled: true, hint: "" };
    }

    if (Number(state.offerStage || 0) === 0) {
      return {
        text: "Уточнить цену",
        disabled: false,
        hint: ""
      };
    }

    return {
      text: "Забронировать",
      disabled: false,
      hint: ""
    };
  }

  function getStepState(options) {
    var opts = options || {};
    var state = opts.state || {};
    var hasSelectedAge = opts.hasSelectedAge || function () { return false; };
    if (opts.simpleModeEnabled) {
      return 1;
    }

    if (state.bookingCompleted) {
      return 4;
    }
    if (!hasSelectedAge()) {
      return 1;
    }
    if (hasSelectedAge() && !state.shiftId) {
      return opts.simpleModeEnabled ? 3 : 2;
    }
    if (state.shiftId && Number(state.offerStage || 0) === 0) {
      return 3;
    }
    if (Number(state.offerStage || 0) >= 1 && !state.code) {
      return 4;
    }
    if (Number(state.offerStage || 0) >= 1) {
      return 4;
    }
    return 1;
  }

  function getResolvedPrimaryActionText(options){
    var opts = options || {};
    var state = opts.state || {};
    var actionState = opts.actionState || null;
    var shift = opts.shift || null;
    if(!actionState){
      return "";
    }
    if(!shift || Number(state.offerStage || 0) < 1){
      return actionState.text || "";
    }
    var formatPrice = opts.formatPrice || function(value){ return String(value || ""); };
    var baseForGain = state.basePrice || shift.price || 0;
    var gainValue = Math.max(0, baseForGain - (state.offerPrice || baseForGain));
    if(gainValue > 0){
      return "Завершить бронирование · выгода " + formatPrice(gainValue);
    }
    return "Завершить бронирование";
  }

  function normalizeInitialState(options) {
    var opts = options || {};
    var state = opts.state || {};
    var useDesktopBaseForMobile = !!opts.useDesktopBaseForMobile;
    var changed = false;
    var normalizedPreviewView = state.previewView || state.view || "desktop";
    var normalizedView = (useDesktopBaseForMobile && normalizedPreviewView === "mobile")
      ? "desktop"
      : (state.view || normalizedPreviewView);
    var normalized = {
      previewView: normalizedPreviewView,
      view: normalizedView,
      desktopMode: "full",
      mobileMode: "full",
      heroContrastMode: "after-soft",
      heroMicroMode: "off",
      offerModalTheme: "light",
      offerLayout: "current",
      ageSelected: typeof state.ageSelected === "boolean" ? state.ageSelected : false,
      bookingCompleted: !!state.bookingCompleted
    };

    Object.keys(normalized).forEach(function(key){
      if(state[key] !== normalized[key]) changed = true;
    });
    Object.assign(state, normalized);

    if(!state.age){
      if(state.ageSelected || state.shiftId || state.basePrice || state.offerPrice || state.code || state.expiresAt || state.offerStage || state.bookingCompleted){
        changed = true;
      }
      Object.assign(state, {
        ageSelected: false,
        shiftId: null,
        basePrice: null,
        offerPrice: null,
        code: null,
        expiresAt: null,
        offerStage: 0,
        bookingCompleted: false
      });
    } else {
      if(!state.ageSelected){
        changed = true;
      }
      Object.assign(state, { ageSelected: true });
      if(!state.shiftId){
        if(state.basePrice || state.offerPrice || state.code || state.expiresAt || state.offerStage || state.bookingCompleted){
          changed = true;
        }
        Object.assign(state, {
          basePrice: null,
          offerPrice: null,
          code: null,
          expiresAt: null,
          offerStage: 0,
          bookingCompleted: false
        });
      }
    }

    var normalizedOfferStage = Number(state.offerStage);
    if(!Number.isFinite(normalizedOfferStage) || normalizedOfferStage < 0){
      Object.assign(state, { offerStage: 0 });
      changed = true;
    } else if(normalizedOfferStage > 4){
      Object.assign(state, { offerStage: 4 });
      changed = true;
    }

    return { changed: !!changed };
  }

  function handlePrimaryCTA(options) {
    var opts = options || {};
    var state = opts.state || {};
    var hasSelectedAge = opts.hasSelectedAge || function () { return false; };
    var getPrimaryActionState = opts.getPrimaryActionState || function () { return { disabled: true }; };
    var runOfferSearch = opts.runOfferSearch || function () { return false; };
    var isOfferStageZero = Number(state.offerStage || 0) === 0;
    var variant = opts.heroVariantState || (typeof opts.resolveHeroVariantFromUtm === "function" ? opts.resolveHeroVariantFromUtm() : null) || {};
    var copy = variant.copy || opts.HERO_VARIANT_COPY || {};

    if (!hasSelectedAge()) {
      if (typeof opts.track === "function" && typeof opts.buildHeroVariantMeta === "function") {
        opts.track("hero_variant_click_new", opts.buildHeroVariantMeta({ cta: copy.cta || "" }));
      }
      if (opts.simpleModeEnabled) {
        return;
      }
      var ageHint = opts.bookingText("selectAge");
      if (copy.hintStage1) {
        ageHint = copy.hintStage1;
      }
      if (typeof opts.showHint === "function") {
        opts.showHint(ageHint, "age");
      }
      if (typeof opts.nudgeUserToNextStep === "function") {
        opts.nudgeUserToNextStep(ageHint);
      }
      return;
    }

    if (!state.shiftId || opts.simpleModeEnabled) {
      if (opts.simpleModeEnabled && typeof opts.openInlineLead === "function") {
        var simpleScope = typeof opts.getSimpleScope === "function"
          ? opts.getSimpleScope()
          : String(opts.simpleScope || "");
        if (simpleScope) {
          return opts.openInlineLead(simpleScope);
        }
      }
      var shiftHint = opts.bookingText("selectShift");
      if (copy.hintStage2) {
        shiftHint = opts.formatVariantHint ? opts.formatVariantHint(copy.hintStage2) : shiftHint;
      }
      if (typeof opts.showHint === "function") {
        opts.showHint(shiftHint, "shift");
      }
      if (typeof opts.nudgeUserToNextStep === "function") {
        opts.nudgeUserToNextStep(shiftHint);
      }
      return;
    }

    var action = getPrimaryActionState();
    if (action && action.disabled) return;

    if (isOfferStageZero) {
      return runOfferSearch();
    }

    var lead = window.AC_FEATURES && window.AC_FEATURES.bookingInlineLead;
    if (lead && typeof lead.openForm === "function") {
      lead.openForm({
        state: state,
        document: opts.document || window.document,
        syncGuidedState: opts.syncGuidedState || function () {},
        buildBookingSummaryHtml: function () {
          return buildBookingSummaryHtml({
            state: state,
            getSelectedShift: opts.getSelectedShift || function () { return null; },
            isOfferActive: opts.isOfferActive || function () { return false; },
            formatPrice: opts.formatPrice || function (value) { return String(value || ""); },
            ageLabel: opts.ageLabel || function () { return ""; },
            bookingText: opts.bookingText || function () { return ""; },
            stripRemainingPrefix: opts.stripRemainingPrefix || function (value) { return String(value || ""); },
            formatRemainingCompact: opts.formatRemainingCompact || function (value) { return "" + Math.max(0, Number(value || 0)); }
          });
        },
        isOfferActive: opts.isOfferActive || function () { return false; },
        startTimer: opts.startTimer || function () {},
        track: opts.track || function () {},
        selectedShiftPayload: function () {
          return buildSelectedShiftPayload({
            state: state,
            getSelectedShift: opts.getSelectedShift || function () { return null; },
            shiftDaysLabel: opts.shiftDaysLabel || function () { return ""; }
          });
        },
        buildHeroVariantMeta: opts.buildHeroVariantMeta || function () {}
      });
    }
  }

  function runOfferSearch(options) {
    var opts = options || {};
    var offerFlow = window.AC_FEATURES && window.AC_FEATURES.offerFlow;
    if (!offerFlow || typeof offerFlow.runOfferSearch !== "function") return;
    return offerFlow.runOfferSearch({
      state: opts.state || {},
      document: opts.document || window.document,
      getSelectedShift: opts.getSelectedShift || function () { return null; },
      nudgeUserToNextStep: opts.nudgeUserToNextStep || function () {},
      bookingText: opts.bookingText || function () { return ""; },
      clearOfferTimeout: opts.clearOfferTimeout || function () {},
      track: opts.track || function () {},
      selectedShiftPayload: opts.selectedShiftPayload || function () { return {}; },
      applyOfferModalTheme: opts.applyOfferModalTheme || function () {},
      normalizeCloseIconButtons: opts.normalizeCloseIconButtons || function () {},
      showOffer: opts.showOffer || function () {},
      bumpOfferRunId: opts.bumpOfferRunId || function () {},
      isOfferRunCurrent: opts.isOfferRunCurrent || function () { return true; },
      pushOfferTimeout: opts.pushOfferTimeout || function () {}
    });
  }

  function openOfferCheck(options) {
    var offerFlow = window.AC_FEATURES && window.AC_FEATURES.offerFlow;
    if (!offerFlow || typeof offerFlow.openOfferCheck !== "function") return;
    return offerFlow.openOfferCheck({ runOfferSearch: options.runOfferSearch });
  }

  function showOffer(options) {
    var opts = options || {};
    var offerFlow = window.AC_FEATURES && window.AC_FEATURES.offerFlow;
    if (!offerFlow || typeof offerFlow.showOffer !== "function") return;
    return offerFlow.showOffer({
      state: opts.state || {},
      document: opts.document || window.document,
      getSelectedShift: opts.getSelectedShift || function () { return null; },
      featureOfferUtils: opts.featureOfferUtils || (window.AC_FEATURES && window.AC_FEATURES.offerUtils) || null,
      discountFactor: opts.discountFactor || 0.95,
      ttlHours: opts.ttlHours || 72,
      generateCode: opts.generateCode || function () { return "AC-TEMP"; },
      persist: opts.persist || function () {},
      track: opts.track || function () {},
      selectedShiftPayload: opts.selectedShiftPayload || function () { return {}; },
      applyOfferModalTheme: opts.applyOfferModalTheme || function () {},
      normalizeCloseIconButtons: opts.normalizeCloseIconButtons || function () {},
      startTimer: opts.startTimer || function () {},
      renderSummary: opts.renderSummary || function () {},
      renderBookingPanels: opts.renderBookingPanels || function () {}
    });
  }

  function saveOfferAndClose(options) {
    var offerFlow = window.AC_FEATURES && window.AC_FEATURES.offerFlow;
    if (!offerFlow || typeof offerFlow.saveOfferAndClose !== "function") return;
    return offerFlow.saveOfferAndClose({
      syncGuidedState: options.syncGuidedState || function () {},
      clearOfferTimeout: options.clearOfferTimeout || function () {},
      renderSummary: options.renderSummary || function () {},
      renderBookingPanels: options.renderBookingPanels || function () {}
    });
  }

  function resetOfferProgressUI(options) {
    var offerFlow = window.AC_FEATURES && window.AC_FEATURES.offerFlow;
    if (!offerFlow || typeof offerFlow.resetOfferProgressUI !== "function") return;
    return offerFlow.resetOfferProgressUI({
      clearOfferTimeout: options.clearOfferTimeout || function () {},
      state: options.state || {}
    });
  }

  function generateCode() {
    return "AC-" + Math.random().toString(36).slice(2,6).toUpperCase();
  }

  function submitLead(options) {
    var lead = window.AC_FEATURES && window.AC_FEATURES.bookingInlineLead;
    if (!lead || typeof lead.submitLeadFromScope !== "function") return;
    return lead.submitLeadFromScope(options);
  }

  window.AC_FEATURES.bookingRuntime = {
    selectedShiftPayload: selectedShiftPayload,
    buildSelectedShiftPayload: buildSelectedShiftPayload,
    clearOfferTimeout: clearOfferTimeout,
    resetOfferState: resetOfferState,
    buildBookingSummaryHtml: buildBookingSummaryHtml,
    selectShift: selectShift,
    resetAgeSelection: resetAgeSelection,
    resetShiftSelection: resetShiftSelection,
    getPrimaryActionState: getPrimaryActionState,
    getStepState: getStepState,
    getResolvedPrimaryActionText: getResolvedPrimaryActionText,
    normalizeInitialState: normalizeInitialState,
    handlePrimaryCTA: handlePrimaryCTA,
    runOfferSearch: runOfferSearch,
    openOfferCheck: openOfferCheck,
    showOffer: showOffer,
    saveOfferAndClose: saveOfferAndClose,
    resetOfferProgressUI: resetOfferProgressUI,
    generateCode: generateCode,
    submitLead: submitLead
  };
})();
