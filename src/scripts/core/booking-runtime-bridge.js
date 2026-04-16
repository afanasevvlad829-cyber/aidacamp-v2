/* src/scripts/core/booking-runtime-bridge.js */
(function initBookingRuntimeBridge(windowObj){
  'use strict';

  if(!windowObj || windowObj.AC_RUNTIME_BOOKING_BRIDGE){
    return;
  }

  function createBridge(context){
    var ctx = context || {};

    function resolveState(overrides){
      var source = ctx.getState;
      var direct = (typeof source === 'function') ? source() : null;
      var override = overrides && typeof overrides.state === 'object' ? overrides.state : null;
      return override || (direct && typeof direct === 'object' ? direct : {});
    }

    function getBookingRuntime(){
      return windowObj.AC_FEATURES && windowObj.AC_FEATURES.bookingRuntime;
    }

    function invoke(methodName, payload, fallback){
      var runtime = getBookingRuntime();
      var handler = runtime && runtime[methodName];
      if(typeof handler === 'function'){
        return handler(payload);
      }
      if(typeof fallback === 'function'){
        return fallback();
      }
      return undefined;
    }

    function selectedShiftPayload(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      var getSelectedShift = options.getSelectedShift || ctx.getSelectedShift || function(){ return null; };
      var shiftDaysLabel = options.shiftDaysLabel || ctx.shiftDaysLabel || function(){ return ''; };
      return invoke('selectedShiftPayload', {
        state,
        getSelectedShift,
        shiftDaysLabel
      }, function(){ return invoke('buildSelectedShiftPayload', {
        state,
        getSelectedShift,
        shiftDaysLabel
      }, function(){ return {}; }); });
    }

    function clearOfferTimeout(overrides){
      var options = overrides || {};
      var getTimeoutIds = options.getTimeoutIds || ctx.getTimeoutIds || function(){ return []; };
      var setTimeoutIds = options.setTimeoutIds || ctx.setTimeoutIds || function(){};
      var clearTimeoutFn = options.clearTimeoutFn || ctx.clearTimeoutFn || windowObj.clearTimeout;
      return invoke('clearOfferTimeout', {
        getTimeoutIds,
        setTimeoutIds,
        clearTimeoutFn
      });
    }

    function resetOfferState(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      return invoke('resetOfferState', {
        preserveShift: options.preserveShift !== false,
        state,
        getTimeoutIds: options.getTimeoutIds || ctx.getTimeoutIds || function(){ return []; },
        setTimeoutIds: options.setTimeoutIds || ctx.setTimeoutIds || function(){},
        clearTimeoutFn: options.clearTimeoutFn || ctx.clearTimeoutFn || windowObj.clearTimeout
      }, function(){
        return;
      });
    }

    function buildBookingSummaryHtml(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      var getSelectedShift = options.getSelectedShift || ctx.getSelectedShift || function(){ return null; };
      return invoke('buildBookingSummaryHtml', {
        state,
        showTimer: !!options.showTimer,
        getSelectedShift,
        isOfferActive: options.isOfferActive || ctx.isOfferActive || function(){ return false; },
        formatPrice: options.formatPrice || ctx.formatPrice || function(value){ return String(value || ''); },
        ageLabel: options.ageLabel || ctx.ageLabel || function(){ return ''; },
        bookingText: options.bookingText || ctx.bookingText || function(){ return ''; },
        stripRemainingPrefix: options.stripRemainingPrefix || ctx.stripRemainingPrefix || function(value){ return String(value || ''); },
        formatRemainingCompact: options.formatRemainingCompact || ctx.formatRemainingCompact || function(value){ return String(value || ''); }
      }, function(){ return ''; });
    }

    function generateCode(){
      return invoke('generateCode', {}, function(){
        return 'AC-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      });
    }

    function selectShift(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      return invoke('selectShift', {
        state,
        shiftId: options.shiftId || '',
        getShifts: options.getShifts || ctx.getShifts || function(){ return []; },
        clearShiftOptionPanels: options.clearShiftOptionPanels || ctx.clearShiftOptionPanels || function(){},
        applyStatePatch: options.applyStatePatch || ctx.applyStatePatch || function(patch){
          if(!state || typeof state !== 'object') return;
          Object.assign(state, patch);
        },
        renderAll: options.renderAll || ctx.renderAll || function(){},
        persist: options.persist || ctx.persist || function(){}
      }, function(){ return false; });
    }

    function resetAgeSelection(overrides){
      var options = overrides || {};
      return invoke('resetAgeSelection', {
        state: resolveState(options),
        clearShiftOptionPanels: options.clearShiftOptionPanels || ctx.clearShiftOptionPanels || function(){},
        renderAll: options.renderAll || ctx.renderAll || function(){},
        persist: options.persist || ctx.persist || function(){}
      }, function(){ return undefined; });
    }

    function resetShiftSelection(overrides){
      var options = overrides || {};
      return invoke('resetShiftSelection', {
        state: resolveState(options),
        clearShiftOptionPanels: options.clearShiftOptionPanels || ctx.clearShiftOptionPanels || function(){},
        renderAll: options.renderAll || ctx.renderAll || function(){},
        persist: options.persist || ctx.persist || function(){},
        showHint: options.showHint || ctx.showHint || function(){}
      }, function(){ return undefined; });
    }

    function handlePrimaryCTA(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      return invoke('handlePrimaryCTA', {
        state,
        heroVariantState: options.heroVariantState || windowObj.heroVariantState || null,
        resolveHeroVariantFromUtm: options.resolveHeroVariantFromUtm || ctx.resolveHeroVariantFromUtm || function(){ return null; },
        HERO_VARIANT_COPY: options.HERO_VARIANT_COPY || ctx.HERO_VARIANT_COPY || {},
        HERO_VARIANT_DEFAULT_TIER: options.HERO_VARIANT_DEFAULT_TIER || ctx.HERO_VARIANT_DEFAULT_TIER || 'broad',
        hasSelectedAge: options.hasSelectedAge || ctx.hasSelectedAge || function(){ return false; },
        bookingText: options.bookingText || ctx.bookingText || function(){ return ''; },
        track: options.track || ctx.track || function(){},
        buildHeroVariantMeta: options.buildHeroVariantMeta || ctx.buildHeroVariantMeta || function(){ return {}; },
        showHint: options.showHint || ctx.showHint || function(){},
        nudgeUserToNextStep: options.nudgeUserToNextStep || ctx.nudgeUserToNextStep || function(){},
        formatVariantHint: options.formatVariantHint || ctx.formatVariantHint || function(v){ return String(v || ''); },
        getPrimaryActionState: options.getPrimaryActionState || ctx.getPrimaryActionState || function(){ return {disabled:true}; },
        runOfferSearch: options.runOfferSearch || function(){ return null; },
        isOfferActive: options.isOfferActive || ctx.isOfferActive || function(){ return false; },
        startTimer: options.startTimer || ctx.startTimer || function(){},
        syncGuidedState: options.syncGuidedState || ctx.syncGuidedState || function(){},
        getSelectedShift: options.getSelectedShift || ctx.getSelectedShift || function(){ return null; },
        shiftDaysLabel: options.shiftDaysLabel || ctx.shiftDaysLabel || function(){ return ''; },
        formatPrice: options.formatPrice || ctx.formatPrice || function(){ return ''; },
        ageLabel: options.ageLabel || ctx.ageLabel || function(){ return ''; },
        stripRemainingPrefix: options.stripRemainingPrefix || ctx.stripRemainingPrefix || function(v){ return String(v || ''); },
        formatRemainingCompact: options.formatRemainingCompact || ctx.formatRemainingCompact || function(v){ return String(v || ''); },
        selectedShiftPayload: options.selectedShiftPayload || selectedShiftPayload,
        simpleModeEnabled: !!options.simpleModeEnabled,
        getSimpleScope: options.getSimpleScope || function(){ return ''; },
        openInlineLead: options.openInlineLead || function(){ return null; }
      }, function(){
        return false;
      });
    }

    function getPrimaryActionState(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      return invoke('getPrimaryActionState', {
        state,
        heroVariantState: options.heroVariantState || windowObj.heroVariantState || null,
        resolveHeroVariantFromUtm: options.resolveHeroVariantFromUtm || ctx.resolveHeroVariantFromUtm || function(){ return null; },
        HERO_VARIANT_COPY: options.HERO_VARIANT_COPY || ctx.HERO_VARIANT_COPY || {},
        HERO_VARIANT_DEFAULT_TIER: options.HERO_VARIANT_DEFAULT_TIER || ctx.HERO_VARIANT_DEFAULT_TIER || 'broad',
        hasSelectedAge: options.hasSelectedAge || ctx.hasSelectedAge || function(){ return false; },
        getSelectedShift: options.getSelectedShift || ctx.getSelectedShift || function(){ return null; },
        simpleModeEnabled: !!options.simpleModeEnabled
      }, function(){
        return { text:'', disabled:true, hint:'' };
      });
    }

    function getStepState(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      return invoke('getStepState', {
        state,
        hasSelectedAge: options.hasSelectedAge || ctx.hasSelectedAge || function(){ return false; },
        simpleModeEnabled: !!options.simpleModeEnabled
      }, function(){ return 1; });
    }

    function getResolvedPrimaryActionText(overrides){
      var options = overrides || {};
      return invoke('getResolvedPrimaryActionText', {
        state: resolveState(options),
        actionState: options.actionState || null,
        shift: options.shift || null,
        formatPrice: options.formatPrice || ctx.formatPrice || function(value){ return String(value || ''); }
      }, function(){ return ''; });
    }

    function normalizeInitialState(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      return invoke('normalizeInitialState', {
        state,
        useDesktopBaseForMobile: !!options.useDesktopBaseForMobile
      }, function(){ return { changed: false }; });
    }

function runOfferSearch(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      return invoke('runOfferSearch', {
        state,
        document: options.document || ctx.document || windowObj.document,
        getSelectedShift: options.getSelectedShift || ctx.getSelectedShift || function(){ return null; },
        nudgeUserToNextStep: options.nudgeUserToNextStep || ctx.nudgeUserToNextStep || function(){},
        bookingText: options.bookingText || ctx.bookingText || function(){ return ''; },
        clearOfferTimeout: options.clearOfferTimeout || clearOfferTimeout,
        track: options.track || ctx.track || function(){},
        selectedShiftPayload: options.selectedShiftPayload || selectedShiftPayload,
        applyOfferModalTheme: options.applyOfferModalTheme || ctx.applyOfferModalTheme || function(){},
        normalizeCloseIconButtons: options.normalizeCloseIconButtons || ctx.normalizeCloseIconButtons || function(){},
        showOffer: options.showOffer || options.parentShowOffer || showOffer,
        bumpOfferRunId: options.bumpOfferRunId || ctx.bumpOfferRunId || function(){ return 1; },
        isOfferRunCurrent: options.isOfferRunCurrent || function(){ return true; },
        pushOfferTimeout: options.pushOfferTimeout || function(){},
      }, function(){ return false; });
    }

    function openOfferCheck(overrides){
      var options = overrides || {};
      return invoke('openOfferCheck', {
        runOfferSearch: options.runOfferSearch || function(){ return false; }
      });
    }

    function showOffer(overrides){
      var options = overrides || {};
      var state = resolveState(options);
      return invoke('showOffer', {
        state,
        document: options.document || ctx.document || windowObj.document,
        getSelectedShift: options.getSelectedShift || ctx.getSelectedShift || function(){ return null; },
        featureOfferUtils: options.featureOfferUtils || (windowObj.AC_FEATURES && windowObj.AC_FEATURES.offerUtils) || null,
        discountFactor: options.discountFactor || ctx.discountFactor || 0.95,
        ttlHours: options.ttlHours || ctx.ttlHours || 72,
        generateCode: options.generateCode || generateCode,
        persist: options.persist || ctx.persist || function(){},
        track: options.track || ctx.track || function(){},
        selectedShiftPayload: options.selectedShiftPayload || selectedShiftPayload,
        applyOfferModalTheme: options.applyOfferModalTheme || ctx.applyOfferModalTheme || function(){},
        formatPrice: options.formatPrice || ctx.formatPrice || function(){ return ''; },
        normalizeCloseIconButtons: options.normalizeCloseIconButtons || ctx.normalizeCloseIconButtons || function(){},
        startTimer: options.startTimer || ctx.startTimer || function(){},
        renderSummary: options.renderSummary || ctx.renderSummary || function(){},
        renderBookingPanels: options.renderBookingPanels || ctx.renderBookingPanels || function(){}
      }, function(){ return false; });
    }

    function saveOfferAndClose(overrides){
      var options = overrides || {};
      return invoke('saveOfferAndClose', {
        syncGuidedState: options.syncGuidedState || ctx.syncGuidedState || function(){},
        clearOfferTimeout: options.clearOfferTimeout || clearOfferTimeout,
        document: options.document || ctx.document || windowObj.document,
        renderSummary: options.renderSummary || ctx.renderSummary || function(){},
        renderBookingPanels: options.renderBookingPanels || ctx.renderBookingPanels || function(){}
      });
    }

    function resetOfferProgressUI(overrides){
      var options = overrides || {};
      return invoke('resetOfferProgressUI', {
        clearOfferTimeout: options.clearOfferTimeout || clearOfferTimeout,
        state: resolveState(options)
      }, function(){
        clearOfferTimeout(options);
      });
    }

    function submitLead(overrides){
      var options = overrides || {};
      return invoke('submitLead', {
        scope: options.scope || 'drawer',
        state: resolveState(options),
        shifts: options.shifts || (Array.isArray(windowObj.AIDACAMP_CONTENT?.shifts) ? windowObj.AIDACAMP_CONTENT.shifts : []),
        document: options.document || ctx.document || windowObj.document,
        getInProgress: options.getInProgress || function(){ return false; },
        setInProgress: options.setInProgress || function(){},
        syncGuidedState: options.syncGuidedState || ctx.syncGuidedState || function(){},
        setLeadPhoneError: options.setLeadPhoneError || function(){},
        setLeadSubmitState: options.setLeadSubmitState || function(){},
        openNoticeModal: options.openNoticeModal || function(){},
        persist: options.persist || ctx.persist || function(){},
        labelAge: options.labelAge || ctx.labelAge || function(){ return ''; },
        formatPrice: options.formatPrice || ctx.formatPrice || function(){ return ''; },
        buildAbMeta: options.buildAbMeta || ctx.buildAbMeta || function(){ return {}; },
        track: options.track || ctx.track || function(){},
        selectedShiftPayload: options.selectedShiftPayload || selectedShiftPayload,
        buildHeroVariantMeta: options.buildHeroVariantMeta || ctx.buildHeroVariantMeta || function(){ return {}; },
        notifyLead: options.notifyLead || ctx.notifyLead || function(){},
        closeForm: options.closeForm || function(){},
        closeInlineLead: options.closeInlineLead || function(){},
        renderSummary: options.renderSummary || ctx.renderSummary || function(){},
        renderBookingPanels: options.renderBookingPanels || ctx.renderBookingPanels || function(){},
        updateSummaryBarVisibility: options.updateSummaryBarVisibility || ctx.updateSummaryBarVisibility || function(){},
        isAdminDebugSession: options.isAdminDebugSession || ctx.isAdminDebugSession || function(){ return false; }
      }, function(){ return undefined; });
    }

    return {
      selectedShiftPayload,
      clearOfferTimeout,
      resetOfferState,
      buildBookingSummaryHtml,
      generateCode,
      selectShift,
      resetAgeSelection,
      resetShiftSelection,
      getPrimaryActionState,
      getStepState,
      getResolvedPrimaryActionText,
      normalizeInitialState,
      handlePrimaryCTA,
      runOfferSearch,
      openOfferCheck,
      showOffer,
      saveOfferAndClose,
      resetOfferProgressUI,
      submitLead
    };
  }

  windowObj.AC_RUNTIME_BOOKING_BRIDGE = {
    createBridge
  };
})(window);
