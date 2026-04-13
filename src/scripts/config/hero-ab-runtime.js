(function registerHeroAbRuntimeConfig(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_RUNTIME_CONFIG = windowObj.AC_RUNTIME_CONFIG || {};

  windowObj.AC_RUNTIME_CONFIG.heroAb = Object.freeze({
    assets: Object.freeze({
      A: Object.freeze({
        images: Object.freeze(['/assets/images/hero-camp-sunset-20260328.png']),
        mobile: '/assets/images/hero-camp-sunset-20260328.png'
      }),
      B: Object.freeze({
        images: Object.freeze(['/assets/images/hero-ab-pool-20260401.jpeg']),
        mobile: '/assets/images/hero-ab-pool-20260401.jpeg'
      })
    }),
    variantLabels: Object.freeze({
      A: 'Control',
      B: 'Pool Motion'
    }),
    timings: Object.freeze({
      shiftUpMs: 7000,
      benefitRevealDelayMs: 7600,
      benefitStepMs: 4000,
      desktopShiftUpMs: 5000,
      desktopBenefitRevealDelayMs: 5000
    }),
    desktopBgOnly: false,
    mobileEffectsEnabled: false,
    benefitsLayoutExperiment: true,
    benefitsItems: Object.freeze([
      Object.freeze({
        title:'AI-проект за смену',
        icon:'/assets/icons/ai-svgrepo-com.svg',
        iconClass:''
      }),
      Object.freeze({
        title:'Без телефонов',
        icon:'/assets/icons/mobile-off-svgrepo-com.svg',
        iconClass:''
      }),
      Object.freeze({
        title:'Бассейн и спорт',
        icon:'/assets/icons/swim-svgrepo-com.svg',
        iconClass:''
      })
    ])
  });
})(window);
