(function registerRuntimeUiModesConfig(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_RUNTIME_CONFIG = windowObj.AC_RUNTIME_CONFIG || {};

  windowObj.AC_RUNTIME_CONFIG.uiModes = Object.freeze({
    heroContrastModes: Object.freeze(['before', 'after', 'after-soft']),
    heroMicroModes: Object.freeze(['on', 'demo']),
    offerModalThemes: Object.freeze(['light', 'dark']),
    offerLayoutModes: Object.freeze(['current']),
    compactModalSections: Object.freeze([
      'section-about',
      'section-journey',
      'section-programs',
      'section-photos',
      'section-videos',
      'section-reviews',
      'section-faq',
      'section-team',
      'section-stay',
      'section-contacts'
    ])
  });
})(window);
