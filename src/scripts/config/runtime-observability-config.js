(function registerRuntimeObservabilityConfig(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_RUNTIME_CONFIG = windowObj.AC_RUNTIME_CONFIG || {};

  windowObj.AC_RUNTIME_CONFIG.observability = Object.freeze({
    metrikaId: 96499295,
    useDesktopBaseForMobile: true,
    prodDebuglessDomains: Object.freeze(['aidacamp.ru']),
    qualityScoreSnapshotDefaults: Object.freeze({
      css: 8.8,
      js: 8.6,
      techDebt: 1.5,
      debtScale: '0 best .. 10 worst'
    })
  });
})(window);
