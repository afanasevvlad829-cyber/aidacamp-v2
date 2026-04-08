(function registerBookingCalendarRuntimeFlow(windowObj){
  'use strict';

  if(!windowObj){
    return;
  }

  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  const root = windowObj.AC_FEATURES.bookingCalendarRuntimeFlow = windowObj.AC_FEATURES.bookingCalendarRuntimeFlow || {};

  if(root.create){
    return;
  }

  function defaultSafeInvoke(target, methodName, args = [], fallback = null){
    const list = Array.isArray(args) ? args : [];
    if(target && typeof target[methodName] === 'function'){
      return target[methodName](...list);
    }
    return typeof fallback === 'function' ? fallback(...list) : fallback;
  }

  function create(ctx = {}){
    const safeInvoke = typeof ctx.safeInvoke === 'function' ? ctx.safeInvoke : defaultSafeInvoke;
    const getCalendarFlow = typeof ctx.getCalendarFlow === 'function' ? ctx.getCalendarFlow : (() => null);
    const getBookingRuntimeBridge = typeof ctx.getBookingRuntimeBridge === 'function' ? ctx.getBookingRuntimeBridge : (() => null);
    const getShiftOptionsFlow = typeof ctx.getShiftOptionsFlow === 'function' ? ctx.getShiftOptionsFlow : (() => null);
    const state = ctx.state || {};
    const documentRef = ctx.document || document;
    const getSelectedShift = typeof ctx.getSelectedShift === 'function' ? ctx.getSelectedShift : (() => null);
    const shiftDaysLabel = typeof ctx.shiftDaysLabel === 'function' ? ctx.shiftDaysLabel : (() => '');
    const isOfferActive = typeof ctx.isOfferActive === 'function' ? ctx.isOfferActive : (() => false);
    const formatPrice = typeof ctx.formatPrice === 'function' ? ctx.formatPrice : ((value) => String(value || ''));
    const ageLabel = typeof ctx.ageLabel === 'function' ? ctx.ageLabel : ((value) => String(value || ''));
    const bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : (() => '');
    const stripRemainingPrefix = typeof ctx.stripRemainingPrefix === 'function' ? ctx.stripRemainingPrefix : ((value) => String(value || ''));
    const formatRemainingCompact = typeof ctx.formatRemainingCompact === 'function' ? ctx.formatRemainingCompact : (() => '');
    const renderAll = typeof ctx.renderAll === 'function' ? ctx.renderAll : (() => {});
    const persist = typeof ctx.persist === 'function' ? ctx.persist : (() => {});
    const showHint = typeof ctx.showHint === 'function' ? ctx.showHint : (() => {});
    const openInlineLead = typeof ctx.openInlineLead === 'function' ? ctx.openInlineLead : (() => {});
    const getShiftOptionPanels = typeof ctx.getShiftOptionPanels === 'function' ? ctx.getShiftOptionPanels : (() => ({
      desktop:{aboutId:null, calendarId:null},
      mobile:{aboutId:null, calendarId:null}
    }));
    const setShiftOptionPanels = typeof ctx.setShiftOptionPanels === 'function' ? ctx.setShiftOptionPanels : (() => {});
    const renderShiftOptions = typeof ctx.renderShiftOptions === 'function' ? ctx.renderShiftOptions : (() => {});
    const getOfferTimeoutIds = typeof ctx.getOfferTimeoutIds === 'function' ? ctx.getOfferTimeoutIds : (() => []);
    const setOfferTimeoutIds = typeof ctx.setOfferTimeoutIds === 'function' ? ctx.setOfferTimeoutIds : (() => {});
    const useDesktopBaseForMobile = !!ctx.useDesktopBaseForMobile;
    const simpleModeEnabled = !!ctx.simpleModeEnabled;
    const offerStageKey = String(ctx.offerStageKey || 'offerStage');

    function resolveViewKey(viewKey){
      return viewKey === 'mobile' ? 'mobile' : 'desktop';
    }

    function toggleShiftOptionPanel(viewKey, panelType, shiftId){
      const safeView = resolveViewKey(viewKey);
      return safeInvoke(getCalendarFlow(), 'toggleShiftOptionPanel', [safeView, panelType, shiftId], () => {
        const panels = getShiftOptionPanels();
        const current = panels[safeView] && panels[safeView][panelType] || null;
        const nextPanels = {
          desktop: Object.assign({aboutId:null, calendarId:null}, panels.desktop || {}),
          mobile: Object.assign({aboutId:null, calendarId:null}, panels.mobile || {})
        };
        nextPanels[safeView][panelType] = current !== shiftId ? shiftId : null;
        setShiftOptionPanels(nextPanels);
        renderShiftOptions(safeView);
      });
    }

    function clearShiftOptionPanels(){
      return safeInvoke(getCalendarFlow(), 'clearShiftOptionPanels', [], () => {
        setShiftOptionPanels({
          desktop:{aboutId:null, calendarId:null},
          mobile:{aboutId:null, calendarId:null}
        });
      });
    }

    function openCalendar(shiftId){
      return safeInvoke(getCalendarFlow(), 'openCalendar', [shiftId], null);
    }

    function openSeasonCalendar(){
      return safeInvoke(getCalendarFlow(), 'openSeasonCalendar', [], null);
    }

    function closeCalendar(){
      return safeInvoke(getCalendarFlow(), 'closeCalendar', [], null);
    }

    function selectedShiftPayload(){
      return safeInvoke(getBookingRuntimeBridge(), 'selectedShiftPayload', [{
        state,
        getSelectedShift,
        shiftDaysLabel
      }], () => ({}));
    }

    function clearOfferTimeout(){
      return safeInvoke(getBookingRuntimeBridge(), 'clearOfferTimeout', [{
        getTimeoutIds: getOfferTimeoutIds,
        setTimeoutIds: setOfferTimeoutIds,
        clearTimeoutFn: clearTimeout
      }], null);
    }

    function resetOfferState({preserveShift = true} = {}){
      return safeInvoke(getBookingRuntimeBridge(), 'resetOfferState', [{
        preserveShift,
        state,
        getTimeoutIds: getOfferTimeoutIds,
        setTimeoutIds: setOfferTimeoutIds,
        clearTimeoutFn: clearTimeout
      }], null);
    }

    function buildBookingSummaryHtml({showTimer = false} = {}){
      return safeInvoke(getBookingRuntimeBridge(), 'buildBookingSummaryHtml', [{
        showTimer,
        state,
        getSelectedShift,
        isOfferActive,
        formatPrice,
        ageLabel,
        bookingText,
        stripRemainingPrefix,
        formatRemainingCompact
      }], '');
    }

    function resetAgeSelection(){
      return safeInvoke(getBookingRuntimeBridge(), 'resetAgeSelection', [{
        state,
        clearShiftOptionPanels,
        renderAll,
        persist
      }], null);
    }

    function resetShiftSelection(){
      return safeInvoke(getBookingRuntimeBridge(), 'resetShiftSelection', [{
        state,
        clearShiftOptionPanels,
        renderAll,
        persist,
        showHint
      }], null);
    }

    function openShiftAboutModal(shiftId){
      return safeInvoke(getShiftOptionsFlow(), 'openShiftAboutModal', [shiftId], false);
    }

    function bindAgeTabs(rootId){
      const rootEl = documentRef.getElementById(rootId);
      if(!rootEl) return;
      rootEl.querySelectorAll('[data-age]').forEach((btn) => {
        btn.addEventListener('click', () => {
          rootEl.querySelectorAll('[data-age]').forEach((node) => node.classList.remove('active'));
          btn.classList.add('active');
          Object.assign(state, {
            age: btn.dataset.age,
            ageSelected: true,
            shiftId: null,
            basePrice: null,
            offerPrice: null,
            code: null,
            expiresAt: null,
            [offerStageKey]: 0,
            bookingCompleted: false
          });
          renderAll();
          persist();
          const scope = state.previewView === 'mobile' ? 'booking-mobile' : 'booking-desktop';
          if(simpleModeEnabled){
            window.setTimeout(() => openInlineLead(scope), 0);
          }
        });
      });
    }

    function focusMobileAgeGate(){
      let gate = null;
      if(useDesktopBaseForMobile){
        gate = documentRef.getElementById('desktopAgeTabs');
      }else{
        gate = documentRef.getElementById('mobileAgeGateCard') || documentRef.getElementById('mobileAgeTabs');
      }
      if(!gate) return;
      gate.scrollIntoView({behavior:'smooth', block:'center'});
      gate.classList.add('guided-pulse');
      setTimeout(() => gate.classList.remove('guided-pulse'), 1100);
    }

    return Object.freeze({
      toggleShiftOptionPanel,
      clearShiftOptionPanels,
      openCalendar,
      openSeasonCalendar,
      closeCalendar,
      selectedShiftPayload,
      clearOfferTimeout,
      resetOfferState,
      buildBookingSummaryHtml,
      resetAgeSelection,
      resetShiftSelection,
      openShiftAboutModal,
      bindAgeTabs,
      focusMobileAgeGate
    });
  }

  root.create = create;
})(window);
