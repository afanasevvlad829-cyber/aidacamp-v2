(function registerTelemetryRuntimeConfig(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_RUNTIME_CONFIG = windowObj.AC_RUNTIME_CONFIG || {};

  windowObj.AC_RUNTIME_CONFIG.telemetry = Object.freeze({
    heroAbTestKey: 'aidacamp_hero_ab_v1',
    heroAbTestId: 'hero_primary_block_v1',
    abEventEndpointDefault: 'https://adacamp-ab-analytics.afanasevvlad829.workers.dev/api/ab-event',
    abVisitorIdKey: 'aidacamp_ab_visitor_id_v1',
    abSessionIdKey: 'aidacamp_ab_session_id_v1',
    abEventAllowlist: Object.freeze([
      'page_view',
      'hero_ab_assigned_v1',
      'hero_variant_shown_new',
      'hero_variant_fallback_new',
      'form_submit',
      'hero_variant_form_submit_new',
      'telegram_click',
      'hero_variant_telegram_click_new'
    ])
  });
})(window);
