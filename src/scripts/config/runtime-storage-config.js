(function registerRuntimeStorageConfig(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_RUNTIME_CONFIG = windowObj.AC_RUNTIME_CONFIG || {};

  windowObj.AC_RUNTIME_CONFIG.storage = Object.freeze({
    stateKey: 'aidacamp_proto_state_v3',
    bookingScarcityKey: 'aidacamp_booking_scarcity_v1',
    bookingScarcityBase: 63,
    bookingScarcityStep: 7,
    bookingScarcityMax: 98,
    versionMonotonicKey: 'aidacamp_build_version_last_v1',
    qualityBaselineKey: 'aidacamp_quality_baseline_v1',
    debtRegisterKey: 'aidacamp_debt_register_v1',
    versionBadgeHiddenKey: 'aidacamp_version_badge_hidden_v1',
    videoMetaCacheKey: 'aidacamp_video_meta_cache_v2',
    videoMetaCacheTtlMs: 1000 * 60 * 60 * 4,
    videoMetaRefreshIntervalMs: 1000 * 60 * 60 * 4,
    adminDebugKey: 'aidacamp_admin_debug',
    leadFallbackMetaKey: 'aidacamp_lead_fallback_meta',
    offerStageStateKey: 'offerStage',
    offerLayoutStateKey: 'offerLayout',
    offerLayoutDatasetKey: 'offerLayout'
  });
})(window);
