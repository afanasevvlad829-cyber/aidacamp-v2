/* src/scripts/main.js */
    // SECTION 1: Config and runtime constants.
    const OFFER_DISCOUNT_FACTOR = 0.95;

    const CONTENT_RUNTIME = (window.AIDACAMP_CONTENT && typeof window.AIDACAMP_CONTENT === 'object')
      ? window.AIDACAMP_CONTENT
      : {};
    const shifts = (Array.isArray(CONTENT_RUNTIME.shifts) && CONTENT_RUNTIME.shifts) || [];
    const mediaContent = (CONTENT_RUNTIME.mediaContent && typeof CONTENT_RUNTIME.mediaContent === 'object')
      ? CONTENT_RUNTIME.mediaContent
      : {
        references: {},
        faq: [],
        team: [],
        photos: [],
        videos: [],
        contacts: [],
        socials: [],
        reviews: []
      };

    const STORAGE_RUNTIME_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.storage) || {};
    const storageStateKeyCfg = String(STORAGE_RUNTIME_CONFIG.stateKey || 'aidacamp_proto_state_v3');
    const bookingScarcityKeyCfg = String(STORAGE_RUNTIME_CONFIG.bookingScarcityKey || 'aidacamp_booking_scarcity_v1');
    const BOOKING_SCARCITY_BASE = Number(STORAGE_RUNTIME_CONFIG.bookingScarcityBase || 63);
    const BOOKING_SCARCITY_STEP = Number(STORAGE_RUNTIME_CONFIG.bookingScarcityStep || 7);
    const BOOKING_SCARCITY_MAX = Number(STORAGE_RUNTIME_CONFIG.bookingScarcityMax || 98);
    const OFFER_STAGE_KEY = String(STORAGE_RUNTIME_CONFIG.offerStageStateKey || ['offer', 'Stage'].join(''));
    const OFFER_LAYOUT_KEY = String(STORAGE_RUNTIME_CONFIG.offerLayoutStateKey || ['offer', 'Layout'].join(''));
    const OFFER_LAYOUT_DATASET_KEY = String(STORAGE_RUNTIME_CONFIG.offerLayoutDatasetKey || ['offer', 'Layout'].join(''));

    let state = JSON.parse(localStorage.getItem(storageStateKeyCfg) || 'null') || {
      age:null,
      shiftId:null,
      basePrice:null,
      offerPrice:null,
      code:null,
      previousCode:null,
      nextCodePreview:null,
      expiresAt:null,
      [OFFER_STAGE_KEY]:0,
      view:'desktop',
      phone:'',
      debugBookingBlocks:false
    };

    const OBSERVABILITY_RUNTIME_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.observability) || {};
    const metrikaIdCfg = Number(OBSERVABILITY_RUNTIME_CONFIG.metrikaId || 96499295);
    const RUNTIME_POLICY_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.runtimePolicy) || {};
    const MAX_CONTACT_URL = String(RUNTIME_POLICY_CONFIG.maxContactUrl || 'https://web.max.ru/185807479');
    const LEGAL_REPO_SLUG = String(RUNTIME_POLICY_CONFIG.legalRepoSlug || 'afanasevvlad829-cyber/aidaplus-landing-dev');
    const HERO_VARIANT_RUNTIME_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.heroVariant) || {};
    const HERO_VARIANT_BANNER_TIER = Object.freeze(HERO_VARIANT_RUNTIME_CONFIG.bannerTier || {});
    const HERO_VARIANT_COPY = Object.freeze(HERO_VARIANT_RUNTIME_CONFIG.copy || {});
    const HERO_VARIANT_DEFAULT_TIER = String(HERO_VARIANT_RUNTIME_CONFIG.defaultTier || 'broad');
    const useDesktopBaseForMobileCfg = !!OBSERVABILITY_RUNTIME_CONFIG.useDesktopBaseForMobile;
    const BUILD_VERSION_LABEL = String(RUNTIME_POLICY_CONFIG.buildVersionLabel || 'v0.0.288 (ab-analytics-endpoint)');
    const ARCHITECTURE_POLICY = Object.freeze(RUNTIME_POLICY_CONFIG.architecturePolicy || {
      id: 'desktop-source-mobile-presentation',
      version: '2026-03-30',
      desktopSourceOfTruth: true,
      sharedStatePipeline: true,
      mobileUsesDesktopTemplates: true
    });
    const QUALITY_SCORE_MODEL = Object.freeze(RUNTIME_POLICY_CONFIG.qualityScoreModel || {
      scale: '0..10',
      debtScale: '0 best .. 10 worst',
      baselineVersion: 'v0.0.112 (debug-offer-layout-switch)',
      css: Object.freeze({ start: 10, penalties: Object.freeze({}) }),
      js: Object.freeze({ start: 10, penalties: Object.freeze({}) }),
      debt: Object.freeze({ start: 0, increments: Object.freeze({}) })
    });
    const VIDEO_SOURCE_LABELS = Object.freeze({
      genericSourceName: 'источнике',
      vkVideoSourceName: 'VK Видео'
    });
    const AGE_LABELS = Object.freeze({
      '7-9': '7–9 лет',
      '10-12': '10–12 лет',
      '13-14': '13–14 лет'
    });
    const PHOTO_CATEGORY_LABELS = Object.freeze({
      pool: 'Бассейн',
      sport: 'Спорт',
      study: 'Учёба',
      food: 'Питание',
      all: 'Атмосфера',
      camp: 'Атмосфера',
      stay: 'Размещение'
    });
    const BOOKING_TEXT_FALLBACK = Object.freeze({
      ageToSeeShiftsPrices: 'Выберите возраст, чтобы увидеть смены и цены',
      allShiftsByAge: 'Все смены по возрасту',
      bookPreviewAlt: 'Превью бронирования',
      bookingAfterCheckPriceLabel: 'После проверки',
      bookingCheckPriceTitle: 'Проверить цену',
      bookingCompletedTitle: 'Заявка отправлена',
      bookingCurrentPriceLabel: 'Текущая цена',
      bookingFinalizeBenefitLine: 'Ваша выгода',
      bookingPreliminaryPriceLabel: 'Предварительная цена',
      bookingReferralImageAria: 'Открыть изображение реферальной акции',
      bookingReferralNote: 'Поделитесь ссылкой и получите бонус',
      bookingShiftsForAgePrefix: 'Смены для возраста',
      bookingStage4AwaitingNote: 'Ожидаем подтверждение менеджера',
      bookingStage4BenefitLabel: 'Выгода',
      bookingStage4CodeLabel: 'Код',
      bookingStage4DiscountLabel: 'Скидка',
      bookingStage4FixedPriceLabel: 'Фиксированная цена',
      bookingTimerPinnedTitle: 'Цена удерживается',
      bookingTimerPrefix: 'Осталось',
      bookingYourTermsTitle: 'Ваши условия',
      heroSeasonCalendarAria: 'Открыть календарь смен',
      heroSeasonCalendarText: 'Календарь смен',
      heroSeasonOfferPriceText: 'от 48 000 ₽ за смену',
      heroSeasonSlogan: 'Смена, где ребёнок уедет с проектом',
      inviteCopyFailed: 'Не удалось скопировать ссылку',
      inviteCopyManual: 'Скопируйте ссылку вручную',
      inviteCopySuccess: 'Ссылка скопирована',
      offerSavedOnDevice: 'Предложение сохранено на этом устройстве',
      primaryCtaAccepted: 'Готово',
      referralHoodieAlt: 'Подарочный худи',
      returnWelcomeMessage: 'Рады видеть вас снова',
      returnWelcomeTitle: 'С возвращением',
      reviewsBlogLabel: 'Отзывы родителей',
      selectAge: 'Сначала выберите возраст',
      selectShift: 'Сначала выберите смену',
      selectShiftForPrice: 'Выберите смену, чтобы увидеть итоговую цену',
      stage1TypewriterAccentChar: '•',
      stage1TypewriterBase: 'Выберите возраст',
      stage1TypewriterChooseWord: 'выберите',
      stage1TypewriterFinal: 'Выберите возраст и смену',
      stage1TypewriterPricesPhrase: 'цены смен',
      stage1TypewriterPricesSwap: 'и цены',
      stage1TypewriterSeenWord: 'посмотрите',
      teamHiddenMobileName: 'Команда'
    });
    const BOOKING_TEXT_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.bookingText) || {};
    const BOOKING_TEXT_MAP = Object.freeze({ ...BOOKING_TEXT_FALLBACK, ...BOOKING_TEXT_CONFIG });
    function bookingText(key){
      const k = String(key || '');
      return String(BOOKING_TEXT_MAP[k] || k);
    }
    function renderGuidedState(...args){
      return runtimeInvoke.renderGuidedState(...args);
    }
    function pulseNode(...args){
      return runtimeInvoke.pulseNode(...args);
    }
    function nudgeUserToNextStep(...args){
      return runtimeInvoke.nudgeUserToNextStep(...args);
    }
    function showHint(...args){
      return runtimeInvoke.showHint(...args);
    }
    function syncBookingHints(...args){
      return runtimeInvoke.syncBookingHints(...args);
    }
    function emitModularEvent(...args){
      return runtimeInvoke.emitModularEvent(...args);
    }
    function syncModularState(...args){
      return runtimeInvoke.syncModularState(...args);
    }
    function splitPrimaryActionText(text){
      const source = String(text || '').trim();
      return { stacked: false, main: source, gainText: '' };
    }
    function uiBookingHintTemplate(key, params = {}){
      const map = (window.CONTENT_MAP && window.CONTENT_MAP.ui) || {};
      const source = String(map[key] || '');
      if(!source) return '';
      return source.replace(/\{\{(\w+)\}\}/g, (_, token) => String(params[token] ?? ''));
    }
    const AIDACAMP_RUNTIME = (window.__AIDACAMP_RUNTIME && typeof window.__AIDACAMP_RUNTIME === 'object')
      ? window.__AIDACAMP_RUNTIME
      : {};
    window.__AIDACAMP_RUNTIME = AIDACAMP_RUNTIME;
    AIDACAMP_RUNTIME.quality = AIDACAMP_RUNTIME.quality || {};
    AIDACAMP_RUNTIME.quality.scoreModel = QUALITY_SCORE_MODEL;
    AIDACAMP_RUNTIME.architecture = ARCHITECTURE_POLICY;
    const qualityScoreSnapshotDefaults = OBSERVABILITY_RUNTIME_CONFIG.qualityScoreSnapshotDefaults || {};
    AIDACAMP_RUNTIME.quality.scoreSnapshot = Object.freeze({
      version: BUILD_VERSION_LABEL,
      css: Number(qualityScoreSnapshotDefaults.css || 8.8),
      js: Number(qualityScoreSnapshotDefaults.js || 8.6),
      techDebt: Number(qualityScoreSnapshotDefaults.techDebt || 1.5),
      debtScale: String(qualityScoreSnapshotDefaults.debtScale || '0 best .. 10 worst'),
      baselineVersion: QUALITY_SCORE_MODEL.baselineVersion
    });
    const UI_MODES_RUNTIME_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.uiModes) || {};
    const heroContrastModesCfg = Object.freeze(UI_MODES_RUNTIME_CONFIG.heroContrastModes || []);
    const heroMicroModesCfg = Object.freeze(UI_MODES_RUNTIME_CONFIG.heroMicroModes || []);
    const offerModalThemesCfg = Object.freeze(UI_MODES_RUNTIME_CONFIG.offerModalThemes || []);
    const offerLayoutModesCfg = Object.freeze(UI_MODES_RUNTIME_CONFIG.offerLayoutModes || []);
    const normalizeMode = (value, allowedModes, fallbackMode) => (
      allowedModes.includes(value) ? value : fallbackMode
    );
    const toFiniteNumberOrZero = (value) => {
      const parsed = Number(value);
      return (Number.isFinite(parsed) && parsed) || 0;
    };
    const toPositiveIntegerOrZero = (value) => {
      const parsed = Number(value);
      return ((Number.isFinite(parsed) && parsed > 0) && Math.floor(parsed)) || 0;
    };
    const versionMonotonicKeyCfg = String(STORAGE_RUNTIME_CONFIG.versionMonotonicKey || 'aidacamp_build_version_last_v1');
    const prodDebuglessDomainsCfg = Object.freeze(OBSERVABILITY_RUNTIME_CONFIG.prodDebuglessDomains || ['aidacamp.ru']);
    const qualityBaselineKeyCfg = String(STORAGE_RUNTIME_CONFIG.qualityBaselineKey || 'aidacamp_quality_baseline_v1');
    const debtRegisterKeyCfg = String(STORAGE_RUNTIME_CONFIG.debtRegisterKey || 'aidacamp_debt_register_v1');
    const RUNTIME_QUALITY_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.runtimeQuality) || {};
    const QUALITY_SOFT_GATES = Object.freeze(RUNTIME_QUALITY_CONFIG.softGates || {});
    const GUARDRAIL_REQUIRED_SELECTORS = Object.freeze(RUNTIME_QUALITY_CONFIG.requiredSelectors || []);
    const CALENDAR_RUNTIME_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.calendar) || {};
    const CALENDAR_WEEKDAYS_SHORT = Object.freeze(CALENDAR_RUNTIME_CONFIG.weekdaysShort || []);
    const CALENDAR_MONTH_NAMES = Object.freeze(CALENDAR_RUNTIME_CONFIG.monthNames || []);
    const DOCS_RUNTIME_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.docsRuntime) || {};
    const DOCS_MOBILE_COPY_FALLBACK = Object.freeze({
      orgName: '',
      orgMeta: '',
      copyright: '',
      links: Object.freeze([])
    });
    const DOCS_DESKTOP_SECTION_TEMPLATES_FALLBACK = Object.freeze({});
    const versionBadgeHiddenKeyCfg = String(STORAGE_RUNTIME_CONFIG.versionBadgeHiddenKey || 'aidacamp_version_badge_hidden_v1');
    const videoMetaCacheKeyCfg = String(STORAGE_RUNTIME_CONFIG.videoMetaCacheKey || 'aidacamp_video_meta_cache_v2');
    const VIDEO_META_CACHE_TTL_MS = Number(STORAGE_RUNTIME_CONFIG.videoMetaCacheTtlMs || (1000 * 60 * 60 * 4));
    const VIDEO_META_REFRESH_INTERVAL_MS = Number(STORAGE_RUNTIME_CONFIG.videoMetaRefreshIntervalMs || (1000 * 60 * 60 * 4));
    const compactModalSectionsCfg = new Set((Array.isArray(UI_MODES_RUNTIME_CONFIG.compactModalSections) && UI_MODES_RUNTIME_CONFIG.compactModalSections) || []);
    let timerId = null;
    let mediaIndex = 0;
    let mediaType = 'photo';
    let activePhotoList = [];
    let photoGalleryList = [];
    // SECTION 2: State normalization and hydration.
    let bookingRuntimeBridgeApi = null;
    const stateNormalizeResult = safeInvoke(ensureBookingRuntimeBridge(), 'normalizeInitialState', [{
      state,
      useDesktopBaseForMobile: useDesktopBaseForMobileCfg
    }], { changed: false });
    if(stateNormalizeResult && stateNormalizeResult.changed){
      try {
        localStorage.setItem(storageStateKeyCfg, JSON.stringify(state));
      } catch (error){
        console.warn('[STATE] normalize persist failed', error);
      }
    }
    Object.assign(state, {
      photoFilter: state.photoFilter || 'camp',
      previousCode: state.previousCode || null,
      nextCodePreview: state.nextCodePreview || null,
      faqFilter: state.faqFilter || 'Медицина',
      mobileJourneyStep: toFiniteNumberOrZero(state.mobileJourneyStep),
      mobileProgramShiftId: state.mobileProgramShiftId || '',
      mobilePhotoIndex: toFiniteNumberOrZero(state.mobilePhotoIndex),
      mobileVideoIndex: toFiniteNumberOrZero(state.mobileVideoIndex),
      mobileReviewIndex: toFiniteNumberOrZero(state.mobileReviewIndex),
      mobileStayIndex: toFiniteNumberOrZero(state.mobileStayIndex),
      mobileFaqGroup: state.mobileFaqGroup || 'Медицина',
      mobileFaqOpenKey: state.mobileFaqOpenKey || '',
      mobileTeamIndex: toFiniteNumberOrZero(state.mobileTeamIndex),
      // Mobile docs block must stay compact by default: requisites visible, legal links collapsed.
      mobileDocsExpanded: false,
      debugBookingBlocks: !!state.debugBookingBlocks
    });
    const metrikaSeen = new Set();
    const scrollMarks = {25:false,50:false,75:false,90:false};
    let offerTimeoutIds = [];
    let offerRunId = 0;
    let leadSubmitInProgress = false;
    let lastRenderedBookingStage = 0;
    let bookingScarcityState = (() => {
      try {
        const saved = JSON.parse(localStorage.getItem(bookingScarcityKeyCfg) || 'null');
        return {
          visits: toPositiveIntegerOrZero(saved && saved.visits)
        };
      } catch (error){
        return { visits: 0 };
      }
    })();
    let shiftOptionPanels = {
      desktop:{aboutId:null, calendarId:null},
      mobile:{aboutId:null, calendarId:null}
    };
    let desktopAgeTapHintTimer = null;
    let desktopAgeTapHintRunning = false;
    let desktopAgeTapHintPlayed = false;
    let desktopAgeTapHintToken = 0;
    const desktopAgeTapHintStartedAt = Date.now();
    let bookingStage1TitleTypewriterDone = false;
    let bookingStage1TitleTypewriterTimer = null;
    let bookingStage1TitleTypewriterRunId = 0;
    let variantFlowFingerTimer = null;
    let variantFlowRunId = 0;
    let variantFlowCompletedKey = '';
    let videoMetaRefreshTimer = null;
    let heroVariantState = null;
    let telemetryFlowApi = null;
    let heroVariantFlowApi = null;
    let variantFlowApi = null;
    let calendarFlowApi = null;
    let navigationFlowApi = null;
    let videoMetaFlowApi = null;
    let mediaSectionsFlowApi = null;
    let modalMediaFlowApi = null;
    let guidedStateFlowApi = null;
    let bookingViewFlowApi = null;
    let bookingHintFlowApi = null;
    let summaryFlowApi = null;
    let viewModeFlowApi = null;
    let overlayFlowApi = null;
    let heroV3SimpleFlowApi = null;
    let heroBackgroundFlowApi = null;
    let offerFlowApi = null;
    let actionDispatcherApi = null;
    let bookingInlineLeadApi = null;
    let bookingInlineRuntimeFlowApi = null;
    let mediaGestureBindingsApi = null;
    let globalUiBindingsApi = null;
    let docsFlowApi = null;
    let uiInitFlowApi = null;
    let shiftOptionsFlowApi = null;
    let mediaFlowApi = null;
    let runtimeQualityPipelineApi = null;
    let runtimeQualityOrchestratorApi = null;
    let bookingCalendarRuntimeFlowApi = null;
    let runtimeActionFlowApi = null;
    let runtimeInitFlowApi = null;
    let leadNotifyFlowApi = null;
    let heroNavFlowApi = null;
    let mainHelpersApi = null;

    function ensureMainHelpers(){
      const create = window.AC_CORE?.mainHelpers?.createMainHelpers;
      return mainHelpersApi || (typeof create === 'function' && (mainHelpersApi = create({
        document,
        getBookingViewConfig
      }))) || null;
    }

    function ensureTelemetryFlow(){
      const create = window.AC_FEATURES?.telemetryFlow?.create;
      return telemetryFlowApi || (typeof create === 'function' && (telemetryFlowApi = create({
        document,
        metrikaId: metrikaIdCfg,
        abEventEndpointDefault: abEventEndpointDefaultCfg,
        abVisitorKey: abVisitorIdKeyCfg,
        abSessionKey: abSessionIdKeyCfg,
        legalRepoSlug: LEGAL_REPO_SLUG,
        getHeroAbVariant: () => heroAbVariant,
        getHeroAbTestId: () => heroAbTestIdCfg,
        isAllowedAbEvent: (eventName) => abEventAllowlistSet.has(String(eventName || ''))
      }))) || null;
    }

    function ensureHeroVariantFlow(){
      const create = window.AC_FEATURES?.heroVariantFlow?.create;
      return heroVariantFlowApi || (typeof create === 'function' && (heroVariantFlowApi = create({
        document,
        getCurrentSearchParams,
        getHeroVariantState: () => heroVariantState,
        setHeroVariantState: (next) => {
          heroVariantState = next || null;
        },
        getVariantCopyMap: () => HERO_VARIANT_COPY,
        getVariantBannerTierMap: () => HERO_VARIANT_BANNER_TIER,
        getVariantDefaultTier: () => HERO_VARIANT_DEFAULT_TIER,
        getUtmH1Rules: () => ({}),
        bookingText,
        getMediaContent: () => mediaContent,
        ageLabel,
        getState: () => state,
        hasSelectedAge,
        getBookingStage,
        getSimpleModeEnabled: () => HERO_V3_SIMPLE_ENABLED,
        trackOnce,
        getBookingViewConfig
      }))) || null;
    }

    function ensureVariantFlow(){
      const create = window.AC_FEATURES?.variantFlow?.create;
      return variantFlowApi || (typeof create === 'function' && (variantFlowApi = create({
        state,
        getBookingStage,
        hasSelectedAge,
        resolveHeroVariantFromUtm,
        getVariantFlowView: () => resolveViewKey(state.previewView),
        getPrimaryBookingViewConfig,
        setHeroMenuOpen: runtimeInvoke.setHeroMenuOpen,
        getHeroVariantState: () => heroVariantState,
        getDefaultTier: () => HERO_VARIANT_DEFAULT_TIER,
        getFingerTimer: () => variantFlowFingerTimer,
        setFingerTimer: (next) => {
          variantFlowFingerTimer = next || null;
        },
        getRunId: () => variantFlowRunId,
        setRunId: (next) => {
          variantFlowRunId = Number(next) || 0;
        },
        getCompletedKey: () => variantFlowCompletedKey,
        setCompletedKey: (next) => {
          variantFlowCompletedKey = String(next || '');
        }
      }))) || null;
    }

    function ensureCalendarFlow(){
      const create = window.AC_FEATURES?.calendarFlow?.create;
      return calendarFlowApi || (typeof create === 'function' && (calendarFlowApi = create({
        getShifts: () => shifts,
        bookingText,
        calendarWeekdaysShort: () => CALENDAR_WEEKDAYS_SHORT,
        calendarMonthNames: () => CALENDAR_MONTH_NAMES,
        closeTransientModals: runtimeInvoke.closeTransientModals,
        emitModularEvent,
        track,
        getShiftOptionPanels: () => shiftOptionPanels,
        setShiftOptionPanels: (nextPanels) => {
          shiftOptionPanels = nextPanels;
        },
        renderShiftOptions: runtimeInvoke.renderShiftOptions
      }))) || null;
    }

    function ensureNavigationFlow(){
      const create = window.AC_FEATURES?.navigationFlow?.create;
      return navigationFlowApi || (typeof create === 'function' && (navigationFlowApi = create({
        trackFaqOpen,
        isMobilePreviewView: () => state.previewView === 'mobile',
        hasSelectedAge,
        track,
        getState: () => state,
        showHint,
        bookingText,
        focusMobileAgeGate,
        isCompactDesktopMode: () => state.desktopMode === 'compact',
        isCompactMobileMode: () => (
          state.previewView === 'mobile' && (
            useDesktopBaseForMobileCfg
              ? state.desktopMode === 'compact'
              : state.mobileMode === 'compact'
          )
        ),
        compactModalSections: compactModalSectionsCfg,
        openSectionModal: runtimeInvoke.openSectionModal,
        buildLegalDocUrl: runtimeInvoke.buildLegalDocUrl
      }))) || null;
    }

    function ensureVideoMetaFlow(){
      const create = window.AC_FEATURES?.videoMetaFlow?.create;
      return videoMetaFlowApi || (typeof create === 'function' && (videoMetaFlowApi = create({
        mediaText: (key) => VIDEO_SOURCE_LABELS[key] || '',
        mediaContent,
        videoMetaCacheKey: videoMetaCacheKeyCfg,
        videoMetaCacheTtlMs: VIDEO_META_CACHE_TTL_MS,
        videoMetaRefreshIntervalMs: VIDEO_META_REFRESH_INTERVAL_MS,
        renderMediaSections,
        getVideoMetaRefreshTimer: () => videoMetaRefreshTimer,
        setVideoMetaRefreshTimer: (timerId) => {
          videoMetaRefreshTimer = timerId;
        }
      }))) || null;
    }

    function ensureMediaSectionsFlow(){
      const create = window.AC_FEATURES?.mediaSectionsFlow?.create;
      return mediaSectionsFlowApi || (typeof create === 'function' && (mediaSectionsFlowApi = create({
        getState: () => state,
        getMediaContent: () => mediaContent,
        photoCatLabel,
        contactIconMarkup: runtimeInvoke.contactIconMarkup,
        socialBadgeMark: runtimeInvoke.socialBadgeMark,
        socialDisplayName: runtimeInvoke.socialDisplayName,
        faqGlyph: runtimeInvoke.faqGlyph,
        bookingText,
        setPhotoLists: (list = []) => {
          const next = cloneArrayOrEmpty(list);
          photoGalleryList = next.slice();
          activePhotoList = next.slice();
        },
        prepareStayGalleryTriggers,
        renderCompactTrustPanelContent
      }))) || null;
    }

    function ensureModalMediaFlow(){
      const create = window.AC_FEATURES?.modalMediaFlow?.create;
      return modalMediaFlowApi || (typeof create === 'function' && (modalMediaFlowApi = create({
        getState: () => state,
        getMediaContent: () => mediaContent,
        getActivePhotoList: () => activePhotoList,
        setMediaContext: (next = {}) => {
          mediaType = next.mediaType || mediaType;
          mediaIndex = Number(next.mediaIndex);
          if(!Number.isFinite(mediaIndex)) mediaIndex = 0;
        },
        getMediaContext: () => ({ mediaType, mediaIndex }),
        track,
        photoCatLabel,
        resolveVideoSource
      }))) || null;
    }

    function ensureGuidedStateFlow(){
      const create = window.AC_FEATURES?.guidedStateFlow?.create;
      return guidedStateFlowApi || (typeof create === 'function' && (guidedStateFlowApi = create({
        getBookingViewConfig,
        syncGuidedState,
        getBookingStage,
        stopVariantFlowScenario: () => safeInvoke(ensureVariantFlow(), 'stopVariantFlowScenario', [], null),
        bookingText,
        hideVariantCoachBadge,
        hasSelectedAge,
        ageLabel,
        getState: () => state,
        getSelectedShift,
        simpleModeEnabled: HERO_V3_SIMPLE_ENABLED,
        scheduleVariantFlowScenario: () => {
          if(HERO_V3_SIMPLE_ENABLED){
            safeInvoke(ensureVariantFlow(), 'stopVariantFlowScenario', [], null);
            return;
          }
          safeInvoke(ensureVariantFlow(), 'scheduleVariantFlowScenario', [], null);
        }
      }))) || null;
    }

    function ensureBookingViewFlow(){
      const create = window.AC_FEATURES?.bookingViewFlow?.create;
      return bookingViewFlowApi || (typeof create === 'function' && (bookingViewFlowApi = create({
        bookingText,
        getBookingStage,
        splitPrimaryActionText,
        getSelectedShift,
        getPrimaryActionState,
        getResolvedPrimaryActionText,
        getState: () => state,
        hasSelectedAge,
        formatPrice,
        getVisiblePrice,
        isOfferActive,
        formatRemainingCompact,
        stripRemainingPrefix,
        ageLabel,
        shiftDaysLabel,
        uiBookingHintTemplate,
        getTypewriterRunId: () => bookingStage1TitleTypewriterRunId,
        setTypewriterRunId: (value) => {
          bookingStage1TitleTypewriterRunId = Number(value) || 0;
        },
        getTypewriterTimer: () => bookingStage1TitleTypewriterTimer,
        setTypewriterTimer: (timerId) => {
          bookingStage1TitleTypewriterTimer = timerId || null;
        },
        getTypewriterDone: () => bookingStage1TitleTypewriterDone,
        setTypewriterDone: (flag) => {
          bookingStage1TitleTypewriterDone = !!flag;
        },
        syncGuidedState,
        getRenderableBookingViewKeys,
        getBookingViewConfig,
        renderSteps,
        renderGuidedState,
        applyBookingStageClass,
        applyBookingStage2Alignment,
        syncBookingHints,
        updateBookingScarcityUi,
        scheduleBookingCardMinHeightSync,
        closeInlineLead: (scope) => {
          return safeInvoke(ensureBookingInlineRuntimeFlow(), 'closeInlineLead', [scope], null);
        }
      }))) || null;
    }

    function ensureBookingHintFlow(){
      const create = window.AC_FEATURES?.bookingHintFlow?.create;
      return bookingHintFlowApi || (typeof create === 'function' && (bookingHintFlowApi = create({
        getActiveBookingViewKeys,
        getRenderableBookingViewKeys,
        getBookingViewConfig,
        getBookingStage,
        hasSelectedAge,
        getState: () => state,
        isSimpleModeEnabled: () => HERO_V3_SIMPLE_ENABLED,
        getHintTimerId: () => desktopAgeTapHintTimer,
        setHintTimerId: (next) => {
          desktopAgeTapHintTimer = next || null;
        },
        getHintRunning: () => desktopAgeTapHintRunning,
        setHintRunning: (flag) => {
          desktopAgeTapHintRunning = !!flag;
        },
        getHintPlayed: () => desktopAgeTapHintPlayed,
        setHintPlayed: (flag) => {
          desktopAgeTapHintPlayed = !!flag;
        },
        getHintToken: () => desktopAgeTapHintToken,
        setHintToken: (next) => {
          desktopAgeTapHintToken = Number(next) || 0;
        },
        getHintStartedAt: () => desktopAgeTapHintStartedAt
      }))) || null;
    }

    function ensureSummaryFlow(){
      const create = window.AC_FEATURES?.summaryFlow?.create;
      return summaryFlowApi || (typeof create === 'function' && (summaryFlowApi = create({
        getState: () => state,
        getShifts: () => shifts,
        getTimerId: () => timerId,
        setTimerId: (next) => {
          timerId = next || null;
        },
        getDismissUntilTs: () => summaryBarDismissUntilTs,
        setDismissUntilTs: (next) => {
          summaryBarDismissUntilTs = Number(next) || 0;
        },
        getDismissTimerId: () => summaryBarDismissTimer,
        setDismissTimerId: (next) => {
          summaryBarDismissTimer = next || null;
        },
        resetOfferState,
        persist,
        formatRemaining,
        formatRemainingCompact,
        normalizeCompactTimerText,
        stripRemainingPrefix,
        renderBookingPanels,
        syncGuidedState,
        getBookingStage,
        getPrimaryActionState,
        getResolvedPrimaryActionText,
        splitPrimaryActionText,
        bookingText,
        labelAge,
        formatPrice,
        getPrimaryBookingViewConfig,
        isCompactCurrentMode: isSummaryCompactMode
      }))) || null;
    }

    function ensureViewModeFlow(){
      const create = window.AC_FEATURES?.viewModeFlow?.create;
      return viewModeFlowApi || (typeof create === 'function' && (viewModeFlowApi = create({
        getState: () => state,
        useDesktopBaseForMobile: useDesktopBaseForMobileCfg,
        normalizeMode,
        heroContrastModes: heroContrastModesCfg,
        heroMicroModes: heroMicroModesCfg,
        offerModalThemes: offerModalThemesCfg,
        offerLayoutModes: offerLayoutModesCfg,
        setHeroMenuOpen: runtimeInvoke.setHeroMenuOpen,
        closeSectionModal: runtimeInvoke.closeSectionModal,
        applyHeroAbVariant,
        applyMobileTemplatesToDesktopSections,
        renderMediaSections,
        renderDesktopMobileDocsBlock,
        updateSummaryBarVisibility,
        persist,
        applyOfferLayoutMode,
        showOffer,
        applyMobileSectionAccordion
      }))) || null;
    }

    function ensureHeroV3SimpleFlow(){
      const create = window.AC_FEATURES?.heroV3SimpleFlow?.create;
      return heroV3SimpleFlowApi || (typeof create === 'function' && (heroV3SimpleFlowApi = create({
        document,
        getEnabled: () => HERO_V3_SIMPLE_ENABLED,
        setHeroPhoneDropdownOpen: runtimeInvoke.setHeroPhoneDropdownOpen,
        navigateToSection: runtimeInvoke.navigateToSection
      }))) || null;
    }

    function ensureHeroBackgroundFlow(){
      const create = window.AC_FEATURES?.heroBackgroundFlow?.create;
      return heroBackgroundFlowApi || (typeof create === 'function' && (heroBackgroundFlowApi = create({
        getHeroAbVariant: () => heroAbVariant,
        getHeroAbAssets,
        getHeroImages: () => HERO_IMAGES
      }))) || null;
    }

    function ensureOfferFlow(){
      return offerFlowApi || (offerFlowApi = asFeatureApi(window.AC_FEATURES?.offerFlow || null));
    }

    function ensureBookingRuntimeBridge(){
      const createBridge = window.AC_RUNTIME_BOOKING_BRIDGE?.createBridge;
      return bookingRuntimeBridgeApi || (typeof createBridge === 'function' && (bookingRuntimeBridgeApi = createBridge({
        getState: () => state,
        getSelectedShift,
        shiftDaysLabel,
        clearShiftOptionPanels: () => runtimeInvoke.clearShiftOptionPanels(),
        persist,
        renderAll,
        bookingText,
        track,
        buildHeroVariantMeta,
        resolveHeroVariantFromUtm,
        hasSelectedAge,
        showHint,
        nudgeUserToNextStep,
        formatVariantHint,
        getPrimaryActionState,
        isOfferActive,
        startTimer,
        syncGuidedState,
        formatPrice,
        ageLabel,
        stripRemainingPrefix,
        formatRemainingCompact
      }))) || null;
    }

    function ensureBookingCalendarRuntimeFlow(){
      const create = window.AC_FEATURES?.bookingCalendarRuntimeFlow?.create;
      return bookingCalendarRuntimeFlowApi || (typeof create === 'function' && (bookingCalendarRuntimeFlowApi = create({
        safeInvoke,
        document,
        state,
        getCalendarFlow: ensureCalendarFlow,
        getBookingRuntimeBridge: ensureBookingRuntimeBridge,
        getShiftOptionsFlow: ensureShiftOptionsFlow,
        getSelectedShift,
        shiftDaysLabel,
        isOfferActive,
        formatPrice,
        ageLabel,
        bookingText,
        stripRemainingPrefix,
        formatRemainingCompact,
        renderAll,
        persist,
        showHint,
        getShiftOptionPanels: () => shiftOptionPanels,
        setShiftOptionPanels: (nextPanels = null) => {
          shiftOptionPanels = nextPanels || {
            desktop:{aboutId:null, calendarId:null},
            mobile:{aboutId:null, calendarId:null}
          };
        },
        renderShiftOptions,
        getOfferTimeoutIds: () => offerTimeoutIds,
        setOfferTimeoutIds: (next = []) => {
          offerTimeoutIds = (Array.isArray(next) && next) || [];
        },
        openInlineLead: (scope) => {
          safeInvoke(ensureBookingInlineRuntimeFlow(), 'openInlineLead', [scope], null);
        },
        useDesktopBaseForMobile: useDesktopBaseForMobileCfg,
        simpleModeEnabled: HERO_V3_SIMPLE_ENABLED,
        offerStageKey: OFFER_STAGE_KEY
      }))) || null;
    }

    function ensureActionDispatcher(){
      const create = window.AC_FEATURES?.actionDispatcher?.createActionDispatcher;
      return actionDispatcherApi || (typeof create === 'function' && (actionDispatcherApi = create({
        bookingText,
        getState: () => state,
        getMediaContent: () => mediaContent,
        getPhotoGalleryList: () => photoGalleryList.slice(),
        setActivePhotoList: (next = []) => {
          activePhotoList = cloneArrayOrEmpty(next);
        },
        openMedia: runtimeInvoke.openMedia,
        getStayGallery,
        openVideo: runtimeInvoke.openVideo,
        scrollVideoCarousel: runtimeInvoke.scrollVideoCarousel,
        openShiftAboutModal,
        openCalendar,
        toggleShiftOptionPanel,
        navigateToSection: runtimeInvoke.navigateToSection,
        focusMobileAgeGate,
        dismissSummaryBarTemporarily,
        applyStatePatch: (patch = {}) => {
          Object.assign(state, patch);
        },
        renderCompactTrustPanelContent,
        persist,
        syncMobileDocsExpandedUi,
        renderDesktopMobileDocsBlock,
        scrollTeamCarousel: runtimeInvoke.scrollTeamCarousel,
        openSeasonCalendar,
        handlePrimaryCTA,
        resetAgeSelection,
        resetShiftSelection,
        openResetBookingConfirmModal: runtimeInvoke.openResetBookingConfirmModal,
        bumpOfferRunId: () => {
          offerRunId += 1;
        },
        clearOfferTimeout,
        resetOfferProgressUI,
        saveOfferAndClose,
        openNoticeModal: runtimeInvoke.openNoticeModal,
        renderAll,
        syncGuidedState,
        buildBookingSummaryHtml,
        isOfferActive,
        startTimer,
        track,
        selectedShiftPayload,
        buildHeroVariantMeta,
        submitLead: (scope = 'drawer') => {
          return safeInvoke(ensureBookingInlineRuntimeFlow(), 'submitLead', [scope], null);
        },
        closeSuccessModal: runtimeInvoke.closeSuccessModal,
        closeNoticeModal: runtimeInvoke.closeNoticeModal,
        hideVariantCoachBadge,
        getPrimaryBookingViewConfig,
        getNoticeConfirmHandler: () => safeInvoke(ensureOverlayFlow(), 'getNoticeConfirmHandler', [], null),
        closeCalendar,
        closeSectionModal: runtimeInvoke.closeSectionModal,
        closeVideo: runtimeInvoke.closeVideo,
        buildInviteClipboardText,
        setHeroMenuOpen: runtimeInvoke.setHeroMenuOpen,
        isHeroMenuOpen: runtimeInvoke.isHeroMenuOpen,
        setHeroPhoneDropdownOpen: runtimeInvoke.setHeroPhoneDropdownOpen,
        isHeroPhoneDropdownOpen: runtimeInvoke.isHeroPhoneDropdownOpen
      }))) || null;
    }

    function ensureBookingInlineLeadApi(){
      return bookingInlineLeadApi || (bookingInlineLeadApi = asFeatureApi(window.AC_FEATURES?.bookingInlineLead || null));
    }

    function ensureBookingInlineRuntimeFlow(){
      const create = window.AC_FEATURES?.bookingInlineRuntimeFlow?.create;
      return bookingInlineRuntimeFlowApi || (typeof create === 'function' && (bookingInlineRuntimeFlowApi = create({
        safeInvoke,
        state,
        shifts,
        document,
        getBookingInlineLeadApi: ensureBookingInlineLeadApi,
        getLeadSubmitInProgress: () => leadSubmitInProgress,
        setLeadSubmitInProgress: (next) => {
          leadSubmitInProgress = !!next;
        },
        syncGuidedState,
        openNoticeModal: runtimeInvoke.openNoticeModal,
        persist,
        labelAge,
        formatPrice,
        buildAbMeta,
        track,
        selectedShiftPayload,
        buildHeroVariantMeta,
        notifyLead,
        renderSummary,
        renderBookingPanels,
        updateSummaryBarVisibility,
        isAdminDebugSession,
        isOfferActive,
        startTimer,
        buildBookingSummaryHtml
      }))) || null;
    }

    function ensureOverlayFlow(){
      const create = window.AC_FEATURES?.overlays?.create;
      return overlayFlowApi || (typeof create === 'function' && (overlayFlowApi = create({
        document,
        buildBookingSummaryHtml,
        isAdminDebugSession,
        resetOfferState,
        getState: () => state,
        persist,
        renderAll
      }))) || null;
    }

    function ensureMediaGestureBindingsApi(){
      return mediaGestureBindingsApi || (mediaGestureBindingsApi = asFeatureApi(window.AC_FEATURES?.mediaGestureBindings || null));
    }

    function ensureGlobalUiBindingsApi(){
      return globalUiBindingsApi || (globalUiBindingsApi = asFeatureApi(window.AC_FEATURES?.globalUiBindings || null));
    }

    function ensureMediaFlowApi(){
      return mediaFlowApi || (mediaFlowApi = asFeatureApi(window.AC_FEATURES?.mediaFlow || null));
    }

    function ensureDocsFlow(){
      const create = window.AC_FEATURES?.docsFlow?.create;
      return docsFlowApi || (typeof create === 'function' && (docsFlowApi = create({
        shouldUseMobileTemplatesForDesktopSource: () => useDesktopBaseForMobileCfg && state.previewView === 'mobile',
        getMobileDocsCopy: () => Object.freeze(DOCS_RUNTIME_CONFIG.mobileDocsCopy || DOCS_MOBILE_COPY_FALLBACK),
        getState: () => state,
        getDesktopMobileSectionTemplates: () => Object.freeze(DOCS_RUNTIME_CONFIG.desktopMobileSectionTemplates || DOCS_DESKTOP_SECTION_TEMPLATES_FALLBACK)
      }))) || null;
    }

    function ensureUiInitFlow(){
      const create = window.AC_FEATURES?.uiInitFlow?.create;
      return uiInitFlowApi || (typeof create === 'function' && (uiInitFlowApi = create({
        closeIconHtml: CLOSE_ICON_HTML,
        getScrollMarks: () => scrollMarks,
        track,
        trackOnce,
        updateSummaryBarVisibility
      }))) || null;
    }

    function ensureShiftOptionsFlow(){
      const create = window.AC_FEATURES?.shiftOptionsFlow?.create;
      return shiftOptionsFlowApi || (typeof create === 'function' && (shiftOptionsFlowApi = create({
        getState: () => state,
        getShifts: () => shifts,
        parseShiftDate,
        formatPrice,
        shiftDaysLabel,
        hasSelectedAge,
        syncGuidedState,
        showHint,
        nudgeUserToNextStep,
        selectShift,
        closeTransientModals: runtimeInvoke.closeTransientModals,
        applyCompactSectionModalLayout: runtimeInvoke.applyCompactSectionModalLayout,
        resolveViewKey,
        resolveShiftOptionsTargetId,
        getShiftOptionPanels: () => shiftOptionPanels
      }))) || null;
    }

    function ensureLeadNotifyFlow(){
      const create = window.AC_FEATURES?.leadNotifyFlow?.create;
      return leadNotifyFlowApi || (typeof create === 'function' && (leadNotifyFlowApi = create({
        buildAbMeta,
        saveLeadFallbackMeta,
        telegramText: bookingText,
        formatPrice
      }))) || null;
    }

    function ensureRuntimeActionFlow(){
      const create = window.AC_FEATURES?.runtimeActionFlow?.create;
      return runtimeActionFlowApi || (typeof create === 'function' && (runtimeActionFlowApi = create({
        document,
        safeInvoke,
        getActionDispatcher: ensureActionDispatcher
      }))) || null;
    }

    function ensureRuntimeInitFlow(){
      const create = window.AC_FEATURES?.runtimeInitFlow?.create;
      return runtimeInitFlowApi || (typeof create === 'function' && (runtimeInitFlowApi = create({
        setTimeoutFn: window.setTimeout.bind(window),
        track,
        getState: () => state,
        runDeferredTasks: () => {
          injectHeroSeasonOfferCta();
          initFloatingContactsWidget();
          safeInvoke(ensureHeroAbFlow(), 'initHeroAbDevPanel', [], null);
          safeInvoke(ensureUiInitFlow(), 'initScrollTracking', [], null);
          safeInvoke(ensureUiInitFlow(), 'initSummaryBarViewportSync', [], null);
          safeInvoke(ensureUiInitFlow(), 'initSectionViewTracking', [], null);
          refreshVideoMeta({force:true});
          safeInvoke(ensureVideoMetaFlow(), 'scheduleVideoMetaRefresh', [], null);
          safeInvoke(ensureBookingHintFlow(), 'scheduleDesktopAgeTapHint', [], null);
          safeInvoke(ensureRuntimeQualityOrchestrator(), 'runAll', [], null)
            || QUALITY_PIPELINE_NAMESPACE.runAll();
        }
      }))) || null;
    }

    function ensureHeroNavFlow(){
      const create = window.AC_FEATURES?.heroNavFlow?.create;
      return heroNavFlowApi || (typeof create === 'function' && (heroNavFlowApi = create({
        getMediaType: () => mediaType,
        getMediaContent: () => mediaContent,
        getActivePhotoList: () => activePhotoList,
        getMediaIndex: () => mediaIndex,
        setMediaIndex: (next) => {
          mediaIndex = Number(next) || 0;
        },
        renderMediaViewer: runtimeInvoke.renderMediaViewer,
        resolveScopeRoot,
        openSectionModalBase: (sectionId) => safeInvoke(ensureModalMediaFlow(), 'openSectionModal', [sectionId], false),
        trackFaqOpen
      }))) || null;
    }

    const mainHelperFallbacks = Object.freeze({
      asObject: (value) => ((value && typeof value === 'object' && value) || {}),
      asFeatureApi: (value) => ((value && typeof value === 'object' && value) || null),
      cloneArrayOrEmpty: (value) => ((Array.isArray(value) && value.slice()) || []),
      resolveBookingViewCfg: (viewCfg) => ((viewCfg && viewCfg.key && viewCfg) || getBookingViewConfig('desktop')),
      resolveScopeRoot: (scopeRoot) => ((scopeRoot && scopeRoot.nodeType === 1 && scopeRoot) || document),
      resolveViewKey: (viewKey) => ((viewKey === 'mobile' && 'mobile') || 'desktop'),
      resolveVariantCoachMode: (tier) => (((tier === 'tier2' || tier === 'tier4') && 'menu') || 'info'),
      toHeroAbVariant: (value) => (((String(value || 'A').toUpperCase() === 'B') && 'B') || 'A')
    });

    const getMainHelpers = () => ensureMainHelpers() || mainHelperFallbacks;
    const asObject = (value) => getMainHelpers().asObject(value);
    const asFeatureApi = (value) => getMainHelpers().asFeatureApi(value);
    const cloneArrayOrEmpty = (value) => getMainHelpers().cloneArrayOrEmpty(value);
    const resolveBookingViewCfg = (viewCfg) => getMainHelpers().resolveBookingViewCfg(viewCfg);
    const resolveScopeRoot = (scopeRoot) => getMainHelpers().resolveScopeRoot(scopeRoot);
    const resolveViewKey = (viewKey) => getMainHelpers().resolveViewKey(viewKey);
    const resolveVariantCoachMode = (tier) => getMainHelpers().resolveVariantCoachMode(tier);
    const toHeroAbVariant = (value) => getMainHelpers().toHeroAbVariant(value);

    function hasQueryFlag(name){
      try{
        const params = new URLSearchParams(window.location.search || '');
        return params.get(name) === '1';
      } catch (error){
        return false;
      }
    }

    function getHeroAbAssets(value){
      return heroAbAssetsCfg[toHeroAbVariant(value)] || heroAbAssetsCfg.A;
    }

    function buildAbMeta(extra = {}){
      const fallback = {
        ab_test_id: heroAbTestIdCfg,
        ab_variant: toHeroAbVariant(heroAbVariant),
        ...asObject(extra)
      };
      return safeInvoke(ensureTelemetryFlow(), 'buildAbMeta', [extra], fallback);
    }

    function track(event, params = {}){
      const trackedParams = {
        ...asObject(params),
        ...buildAbMeta()
      };
      return safeInvoke(ensureTelemetryFlow(), 'track', [event, trackedParams], () => {
        try {
          if(typeof ym !== 'undefined'){
            ym(metrikaIdCfg, 'reachGoal', event, trackedParams);
          }
        } catch (error){
          console.warn('Metrika track error:', event, error);
        }
      });
    }

    const getCurrentSearchParams = () => (
      safeInvoke(ensureTelemetryFlow(), 'getCurrentSearchParams', [], () => {
        try {
          return new URLSearchParams(window.location.search || '');
        } catch (error){
          return new URLSearchParams('');
        }
      })
    );

    const buildLegalDocUrl = (hash = '') => (
      safeInvoke(ensureTelemetryFlow(), 'buildLegalDocUrl', [hash], 'legal.html')
    );

    const syncLegalDocLinks = (scope = document) => (
      safeInvoke(ensureTelemetryFlow(), 'syncLegalDocLinks', [scope], null)
    );

    function buildHeroVariantMeta(extra = {}){
      const fallbackVariant = heroVariantState || resolveHeroVariantFromUtm();
      const fallback = {
        banner_id: fallbackVariant.bannerId || '',
        campaign_id: fallbackVariant.campaignId || '',
        tier: fallbackVariant.tier || HERO_VARIANT_DEFAULT_TIER,
        variant: fallbackVariant.copy?.variant || 'v1',
        ...asObject(extra)
      };
      return safeInvoke(ensureHeroVariantFlow(), 'buildHeroVariantMeta', [extra], fallback);
    }

    function resolveHeroVariantFromUtm(){
      const fallback = () => {
        const search = getCurrentSearchParams();
        const bannerId = String(search.get('utm_content') || '').trim();
        const campaignId = String(search.get('utm_campaign') || '').trim();
        const tierFromBanner = (bannerId && HERO_VARIANT_BANNER_TIER[bannerId]) || '';
        const isKnownBanner = !!tierFromBanner;
        const tier = (isKnownBanner && tierFromBanner) || HERO_VARIANT_DEFAULT_TIER;
        const copy = HERO_VARIANT_COPY[tier] || HERO_VARIANT_COPY[HERO_VARIANT_DEFAULT_TIER];
        const fallbackReason = ((!bannerId || !isKnownBanner) && 'unknown_banner_or_no_utm') || '';
        return { bannerId, campaignId, tier, copy, fallbackReason };
      };
      return safeInvoke(ensureHeroVariantFlow(), 'resolveHeroVariantFromUtm', [], fallback);
    }

    const applyHeroVariantCopy = () => (
      safeInvoke(ensureHeroVariantFlow(), 'applyHeroVariantCopy', [], () => {
        const variant = heroVariantState || resolveHeroVariantFromUtm();
        const copy = variant.copy || HERO_VARIANT_COPY[HERO_VARIANT_DEFAULT_TIER];
        document.querySelectorAll('.hero-slogan').forEach((node) => {
          if(node) node.textContent = copy.title;
        });
      })
    );

    const injectHeroSeasonOfferCta = () => (
      safeInvoke(ensureHeroVariantFlow(), 'injectHeroSeasonOfferCta')
    );

    function formatVariantHint(template){
      return safeInvoke(ensureHeroVariantFlow(), 'formatVariantHint', [template], () => {
        const source = String(template || '').trim();
        if(!source) return '';
        return source.replace('{{age}}', ageLabel(state.age || '10-12'));
      });
    }

    const clearVariantCoachReminderTimer = () => (
      safeInvoke(ensureHeroVariantFlow(), 'clearVariantCoachReminderTimer')
    );

    function syncVariantBookingHint(viewCfg){
      const cfg = resolveBookingViewCfg(viewCfg);
      return safeInvoke(ensureHeroVariantFlow(), 'syncVariantBookingHint', [cfg], null);
    }

    function ensureVariantCoachBadge(viewCfg){
      const cfg = resolveBookingViewCfg(viewCfg);
      return safeInvoke(ensureHeroVariantFlow(), 'ensureVariantCoachBadge', [cfg], null);
    }

    function hideVariantCoachBadge(viewCfg, dismissKey = ''){
      const cfg = resolveBookingViewCfg(viewCfg);
      return safeInvoke(ensureHeroVariantFlow(), 'hideVariantCoachBadge', [cfg, dismissKey], null);
    }

    function syncVariantCoachBadge(viewCfg){
      const cfg = resolveBookingViewCfg(viewCfg);
      return safeInvoke(ensureHeroVariantFlow(), 'syncVariantCoachBadge', [cfg], null);
    }

    const initHeroVariantPersonalization = () => (
      safeInvoke(ensureHeroVariantFlow(), 'initHeroVariantPersonalization', [], () => {
        heroVariantState = resolveHeroVariantFromUtm();
        const fallbackReason = heroVariantState.fallbackReason || '';
        trackOnce('hero_variant_shown_new', buildHeroVariantMeta());
        if(fallbackReason){
          trackOnce('hero_variant_fallback_new', buildHeroVariantMeta({reason:fallbackReason}));
        }
        applyHeroVariantCopy();
      })
    );

    function trackOnce(event, params = {}){
      const key = `${event}:${JSON.stringify(params)}`;
      if(metrikaSeen.has(key)) return;
      metrikaSeen.add(key);
      track(event, params);
    }

    function ensureRuntimeQualityPipeline(){
      const create = window.AC_FEATURES?.runtimeQualityPipeline?.create;
      runtimeQualityPipelineApi = runtimeQualityPipelineApi || (typeof create === 'function' && create({
        document,
        runtimeStore: AIDACAMP_RUNTIME,
        buildVersionLabel: BUILD_VERSION_LABEL,
        versionMonotonicKey: versionMonotonicKeyCfg,
        qualityBaselineKey: qualityBaselineKeyCfg,
        debtRegisterKey: debtRegisterKeyCfg,
        requiredSelectors: GUARDRAIL_REQUIRED_SELECTORS,
        qualitySoftGates: QUALITY_SOFT_GATES,
        architecturePolicy: ARCHITECTURE_POLICY,
        useDesktopBaseForMobile: useDesktopBaseForMobileCfg,
        shouldUseLegacyMobile: () => state.previewView === 'mobile',
        trackOnce,
        isPipelineEnabled: () => isFeatureEnabled('runtimeQualityPipeline')
      }));
      if(runtimeQualityPipelineApi?.namespace){
        AIDACAMP_RUNTIME.quality.pipeline = runtimeQualityPipelineApi.namespace;
      }
      return runtimeQualityPipelineApi || null;
    }

    function ensureRuntimeQualityOrchestrator(){
      const create = window.AC_FEATURES?.runtimeQualityOrchestrator?.create;
      return runtimeQualityOrchestratorApi || (typeof create === 'function' && (runtimeQualityOrchestratorApi = create({
        getRuntimeQualityNamespace: () => {
          const pipeline = ensureRuntimeQualityPipeline();
          return pipeline?.namespace || null;
        },
        architecturePolicyId: ARCHITECTURE_POLICY.id
      }))) || null;
    }

    const runGuardrails = () => (
      safeInvoke(ensureRuntimeQualityOrchestrator(), 'runGuardrails', [], {
        ok: false,
        policy: ARCHITECTURE_POLICY.id
      })
    );

    const runQualityBaselineAudit = () => (
      safeInvoke(ensureRuntimeQualityOrchestrator(), 'runQualityBaselineAudit', [], null)
    );

    const evaluateSoftQualityGates = (snapshot) => (
      safeInvoke(ensureRuntimeQualityOrchestrator(), 'evaluateSoftQualityGates', [snapshot], {
        ok: false,
        warnings: ['pipeline_unavailable']
      })
    );

    const buildDebtRegister = (guardrails, baseline, gates) => (
      safeInvoke(ensureRuntimeQualityOrchestrator(), 'buildDebtRegister', [guardrails, baseline, gates], {
        debtItems: [],
        pressureScore: 0,
        pressureLevel: 'low'
      })
    );

    const buildRuntimeQualityScore = (baseline, gates, debtRegister) => (
      safeInvoke(ensureRuntimeQualityOrchestrator(), 'buildRuntimeQualityScore', [baseline, gates, debtRegister], {
        css: 0,
        js: 0,
        techDebt: 0,
        monolithness: 0
      })
    );

    const buildQualityTrendSummary = (delta) => (
      safeInvoke(ensureRuntimeQualityOrchestrator(), 'buildQualityTrendSummary', [delta], {
        trend: 'flat',
        better: 0,
        worse: 0
      })
    );

    const runReleaseIntegrityChecks = () => (
      safeInvoke(ensureRuntimeQualityOrchestrator(), 'runReleaseIntegrityChecks', [], {
        ok: false,
        missing: ['runtime_quality_pipeline']
      })
    );

    const printRuntimeStatusReport = () => (
      safeInvoke(ensureRuntimeQualityOrchestrator(), 'printRuntimeStatusReport', [], '')
    );

    const QUALITY_PIPELINE_NAMESPACE = Object.freeze({
      runGuardrails,
      runQualityBaselineAudit,
      evaluateSoftQualityGates,
      buildDebtRegister,
      buildRuntimeQualityScore,
      buildQualityTrendSummary,
      runReleaseIntegrityChecks,
      printRuntimeStatusReport,
      runAll: () => {
        const qualityResult = safeInvoke(ensureRuntimeQualityOrchestrator(), 'runAll', [], null);
        if(qualityResult) return qualityResult;
        const guardrailReport = runGuardrails();
        const qualityBaseline = runQualityBaselineAudit();
        const qualityGates = evaluateSoftQualityGates(qualityBaseline);
        const debtRegister = buildDebtRegister(guardrailReport, qualityBaseline, qualityGates);
        buildRuntimeQualityScore(qualityBaseline, qualityGates, debtRegister);
        buildQualityTrendSummary(qualityBaseline?.delta);
        runReleaseIntegrityChecks();
        printRuntimeStatusReport();
        return {
          guardrailReport,
          qualityBaseline,
          qualityGates,
          debtRegister
        };
      }
    });
    AIDACAMP_RUNTIME.quality.pipeline = QUALITY_PIPELINE_NAMESPACE;

    const CLOSE_ICON_HTML = '<img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">';

    function safeInvoke(target, methodName, args = [], fallback = null){
      const list = Array.isArray(args) ? args : [];
      if(target && typeof target[methodName] === 'function'){
        return target[methodName](...list);
      }
      return typeof fallback === 'function' ? fallback(...list) : fallback;
    }

    const runtimeInvoke = Object.freeze({
      openMedia: (type, index) => safeInvoke(ensureModalMediaFlow(), 'openMedia', [type, index], null),
      closeMedia: () => safeInvoke(ensureModalMediaFlow(), 'closeMedia', [], null),
      closeTransientModals: (except = '', options = {}) => safeInvoke(ensureModalMediaFlow(), 'closeTransientModals', [except, options], null),
      openVideo: (url) => safeInvoke(ensureModalMediaFlow(), 'openVideo', [url], null),
      closeVideo: () => safeInvoke(ensureModalMediaFlow(), 'closeVideo', [], null),
      closeSectionModal: () => safeInvoke(ensureModalMediaFlow(), 'closeSectionModal', [], null),
      setHeroMenuOpen: (isOpen) => safeInvoke(ensureHeroNavFlow(), 'setHeroMenuOpen', [isOpen], null),
      isHeroMenuOpen: () => safeInvoke(ensureHeroNavFlow(), 'isHeroMenuOpen', [], false),
      setHeroPhoneDropdownOpen: (isOpen) => safeInvoke(ensureHeroNavFlow(), 'setHeroPhoneDropdownOpen', [isOpen], false),
      isHeroPhoneDropdownOpen: () => safeInvoke(ensureHeroNavFlow(), 'isHeroPhoneDropdownOpen', [], false),
      scrollVideoCarousel: (direction = 1, scopeRoot = null) => safeInvoke(ensureHeroNavFlow(), 'scrollVideoCarousel', [direction, scopeRoot], null),
      scrollTeamCarousel: (direction = 1, scopeRoot = null) => safeInvoke(ensureHeroNavFlow(), 'scrollTeamCarousel', [direction, scopeRoot], null),
      applyCompactSectionModalLayout: () => safeInvoke(ensureModalMediaFlow(), 'applyCompactSectionModalLayout', [], null),
      openSectionModal: (sectionId) => !!safeInvoke(ensureHeroNavFlow(), 'openSectionModal', [sectionId], false),
      renderMediaViewer: () => safeInvoke(ensureModalMediaFlow(), 'renderMediaViewer', [], null),
      getActiveMediaList: () => safeInvoke(ensureHeroNavFlow(), 'getActiveMediaList', [], []),
      nextMedia: () => safeInvoke(ensureHeroNavFlow(), 'nextMedia', [], null),
      prevMedia: () => safeInvoke(ensureHeroNavFlow(), 'prevMedia', [], null),
      getPhotoTagsByFilter: (filter) => safeInvoke(ensureHeroNavFlow(), 'getPhotoTagsByFilter', [filter], ['all', 'camp']),
      getPhotosForActiveFilter: (filter = state.photoFilter) => safeInvoke(ensureHeroNavFlow(), 'getPhotosForActiveFilter', [filter], mediaContent.photos.slice()),
      openSuccessModal: (deliveryResult) => safeInvoke(ensureOverlayFlow(), 'openSuccessModal', [deliveryResult], null),
      closeSuccessModal: () => safeInvoke(ensureOverlayFlow(), 'closeSuccessModal', [], null),
      openNoticeModal: (message, title = 'Проверьте данные') => safeInvoke(ensureOverlayFlow(), 'openNoticeModal', [message, title], null),
      closeNoticeModal: () => safeInvoke(ensureOverlayFlow(), 'closeNoticeModal', [], null),
      openResetBookingConfirmModal: () => safeInvoke(ensureOverlayFlow(), 'openResetBookingConfirmModal', [], null),
      scrollToSection: (id) => safeInvoke(ensureNavigationFlow(), 'scrollToSection', [id], false),
      navigateToSection: (id) => safeInvoke(ensureNavigationFlow(), 'navigateToSection', [id], null),
      getResolvedPrimaryActionText: (actionState, shift) => safeInvoke(ensureBookingRuntimeBridge(), 'getResolvedPrimaryActionText', [{
        state,
        actionState,
        shift,
        formatPrice
      }], ''),
      renderGuidedState: (viewCfg) => safeInvoke(ensureGuidedStateFlow(), 'renderGuidedState', [viewCfg], null),
      pulseNode: (node) => safeInvoke(ensureBookingHintFlow(), 'pulseNode', [node], null),
      nudgeUserToNextStep: (message = 'Сначала завершите предыдущий шаг.') => (
        safeInvoke(ensureBookingHintFlow(), 'nudgeUserToNextStep', [message], null)
      ),
      showHint: (message, requiredStep = '') => safeInvoke(ensureBookingHintFlow(), 'showHint', [message, requiredStep], null),
      syncBookingHints: () => safeInvoke(ensureBookingHintFlow(), 'syncBookingHints', [], null),
      stopBookingStage1TitleTypewriter: () => safeInvoke(ensureBookingViewFlow(), 'stopBookingStage1TitleTypewriter', [], null),
      runBookingStage1TitleTypewriter: (target, text) => safeInvoke(ensureBookingViewFlow(), 'runBookingStage1TitleTypewriter', [target, text], null),
      renderBookingInfo: (viewCfg) => safeInvoke(ensureBookingViewFlow(), 'renderBookingInfo', [viewCfg], null),
      renderBookingPanels: () => safeInvoke(ensureBookingViewFlow(), 'renderBookingPanels', [], null),
      getViewportPreviewView: () => safeInvoke(ensureViewModeFlow(), 'getViewportPreviewView', [], () => {
        return (window.matchMedia('(max-width: 900px)').matches && 'mobile') || 'desktop';
      }),
      switchView: (view) => safeInvoke(ensureViewModeFlow(), 'switchView', [view], null),
      toggleShiftOptionPanel: (viewKey, panelType, shiftId) => (
        safeInvoke(ensureBookingCalendarRuntimeFlow(), 'toggleShiftOptionPanel', [viewKey, panelType, shiftId], null)
      ),
      clearShiftOptionPanels: () => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'clearShiftOptionPanels', [], null),
      parseShiftDate: (dateStr) => safeInvoke(ensureCalendarFlow(), 'parseShiftDate', [dateStr], () => {
        const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if(!m) return null;
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      }),
      renderCalendar: (shift) => safeInvoke(ensureCalendarFlow(), 'renderCalendar', [shift], null),
      renderSeasonCalendar: () => safeInvoke(ensureCalendarFlow(), 'renderSeasonCalendar', [], null),
      openCalendar: (shiftId) => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'openCalendar', [shiftId], null),
      openSeasonCalendar: () => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'openSeasonCalendar', [], null),
      closeCalendar: () => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'closeCalendar', [], null),
      selectedShiftPayload: () => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'selectedShiftPayload', [], () => ({})),
      clearOfferTimeout: () => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'clearOfferTimeout', [], null),
      resetOfferState: ({preserveShift = true} = {}) => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'resetOfferState', [{preserveShift}], null),
      buildBookingSummaryHtml: ({showTimer = false} = {}) => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'buildBookingSummaryHtml', [{showTimer}], ''),
      bindAgeTabs: (rootId) => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'bindAgeTabs', [rootId], null),
      focusMobileAgeGate: () => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'focusMobileAgeGate', [], null),
      resetAgeSelection: () => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'resetAgeSelection', [], null),
      resetShiftSelection: () => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'resetShiftSelection', [], null),
      getShiftDisplayDescription: (shift) => safeInvoke(ensureShiftOptionsFlow(), 'getShiftDisplayDescription', [shift], ''),
      openShiftAboutModal: (shiftId) => safeInvoke(ensureBookingCalendarRuntimeFlow(), 'openShiftAboutModal', [shiftId], false),
      renderShiftOptions: (viewKey) => safeInvoke(ensureShiftOptionsFlow(), 'renderShiftOptions', [viewKey], null),
      renderShiftCards: () => safeInvoke(ensureShiftOptionsFlow(), 'renderShiftCards', [], null),
      contactIconMarkup: (label) => safeInvoke(ensureMediaFlowApi(), 'contactIconMarkup', [label], '•'),
      resolveFloatingContactLinks: () => safeInvoke(ensureMediaFlowApi(), 'resolveFloatingContactLinks', [mediaContent], {
        cityPhoneHref: 'tel:+74951284429',
        cityPhoneLabel: '+7 (495) 128-44-29',
        mobilePhoneHref: 'tel:+79688086455',
        mobilePhoneLabel: '+7 (968) 808-64-55',
        whatsappHref: 'https://wa.me/79688086455',
        telegramHref: 'https://t.me/Progaschool'
      }),
      initFloatingContactsWidget: () => safeInvoke(ensureMediaFlowApi(), 'initFloatingContactsWidget', [{
        document,
        mediaContent,
        track
      }], null),
      socialBadgeMark: (item) => safeInvoke(ensureMediaFlowApi(), 'socialBadgeMark', [item], '•'),
      socialDisplayName: (item) => safeInvoke(ensureMediaFlowApi(), 'socialDisplayName', [item], ''),
      faqGlyph: (iconPath, groupName) => safeInvoke(ensureMediaFlowApi(), 'faqGlyph', [iconPath, groupName], String(groupName || '').slice(0,3).toUpperCase()),
      renderStars: () => safeInvoke(ensureMediaFlowApi(), 'renderStars', [], '<div class="stars">★★★★★</div>'),
      renderDesktopMobileDocsBlock: () => safeInvoke(ensureDocsFlow(), 'renderDesktopMobileDocsBlock', [], null),
      syncMobileDocsExpandedUi: () => safeInvoke(ensureDocsFlow(), 'syncMobileDocsExpandedUi', [], null),
      applyMobileTemplatesToDesktopSections: () => safeInvoke(ensureDocsFlow(), 'applyMobileTemplatesToDesktopSections', [], null),
      startTimer: () => safeInvoke(ensureSummaryFlow(), 'startTimer', [], null),
      updateSummaryBarVisibility: () => safeInvoke(ensureSummaryFlow(), 'updateSummaryBarVisibility', [], null),
      dismissSummaryBarTemporarily: (ms = 30000) => safeInvoke(ensureSummaryFlow(), 'dismissSummaryBarTemporarily', [ms], null),
      renderSummary: () => safeInvoke(ensureSummaryFlow(), 'renderSummary', [], null),
      buildLegalDocUrl: (hash = '') => safeInvoke(ensureTelemetryFlow(), 'buildLegalDocUrl', [hash], 'legal.html'),
      syncLegalDocLinks: (scope = document) => safeInvoke(ensureTelemetryFlow(), 'syncLegalDocLinks', [scope], null)
    });

    function trackFaqOpen(){
      trackOnce('faq_open');
    }

    const HERO_AB_RUNTIME_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.heroAb) || {};
    const heroAbAssetsCfg = Object.freeze(HERO_AB_RUNTIME_CONFIG.assets || {
      A: Object.freeze({
        images: Object.freeze(['/assets/images/hero-camp-sunset-20260328.png']),
        mobile: '/assets/images/hero-camp-sunset-20260328.png'
      }),
      B: Object.freeze({
        images: Object.freeze(['/assets/images/hero-ab-pool-20260401.jpeg']),
        mobile: '/assets/images/hero-ab-pool-20260401.jpeg'
      })
    });
    const TELEMETRY_RUNTIME_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.telemetry) || {};
    const heroAbTestKeyCfg = String(TELEMETRY_RUNTIME_CONFIG.heroAbTestKey || 'aidacamp_hero_ab_v1');
    const heroAbTestIdCfg = String(TELEMETRY_RUNTIME_CONFIG.heroAbTestId || 'hero_primary_block_v1');
    const heroAbVariantLabelsCfg = Object.freeze(HERO_AB_RUNTIME_CONFIG.variantLabels || {
      A: 'Control',
      B: 'Pool Motion'
    });
    const HERO_AB_SHIFT_UP_MS = Number(HERO_AB_RUNTIME_CONFIG.timings?.shiftUpMs || 7000);
    const HERO_AB_BENEFIT_REVEAL_DELAY_MS = Number(HERO_AB_RUNTIME_CONFIG.timings?.benefitRevealDelayMs || 7600);
    const HERO_AB_BENEFIT_STEP_MS = Number(HERO_AB_RUNTIME_CONFIG.timings?.benefitStepMs || 4000);
    const HERO_AB_DESKTOP_SHIFT_UP_MS = Number(HERO_AB_RUNTIME_CONFIG.timings?.desktopShiftUpMs || 5000);
    const HERO_AB_DESKTOP_BENEFIT_REVEAL_DELAY_MS = Number(HERO_AB_RUNTIME_CONFIG.timings?.desktopBenefitRevealDelayMs || 5000);
    const HERO_AB_DESKTOP_BG_ONLY = !!HERO_AB_RUNTIME_CONFIG.desktopBgOnly;
    const HERO_AB_MOBILE_EFFECTS_ENABLED = !!HERO_AB_RUNTIME_CONFIG.mobileEffectsEnabled;
    const HERO_V3_SIMPLE_QUERY_KEY = 'hero_v3_simple';
    const HERO_V3_SIMPLE_ENABLED = hasQueryFlag(HERO_V3_SIMPLE_QUERY_KEY);
    const abEventEndpointDefaultCfg = String(TELEMETRY_RUNTIME_CONFIG.abEventEndpointDefault || 'https://adacamp-ab-analytics.afanasevvlad829.workers.dev/api/ab-event');
    const abVisitorIdKeyCfg = String(TELEMETRY_RUNTIME_CONFIG.abVisitorIdKey || 'aidacamp_ab_visitor_id_v1');
    const abSessionIdKeyCfg = String(TELEMETRY_RUNTIME_CONFIG.abSessionIdKey || 'aidacamp_ab_session_id_v1');
    const abEventAllowlistSet = new Set((Array.isArray(TELEMETRY_RUNTIME_CONFIG.abEventAllowlist) && TELEMETRY_RUNTIME_CONFIG.abEventAllowlist) || []);
    const HERO_BENEFITS_LAYOUT_EXPERIMENT = !!HERO_AB_RUNTIME_CONFIG.benefitsLayoutExperiment;
    const HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS = Object.freeze(HERO_AB_RUNTIME_CONFIG.benefitsItems || []);

    let heroAbVariant = 'A';
    let heroAbTimers = [];
    let heroAbMobileScrollBound = false;
    let heroAbMobileInteractionBound = false;
    let heroAbMobileUserInteracted = false;
    let heroAbMobileCollapsed = false;
    let heroAbMobileAutoTimer = null;
    let heroAbFlowApi = null;
    let heroResizeTimer = null;
    let summaryBarDismissUntilTs = 0;
    let summaryBarDismissTimer = null;

    function persist(){
      localStorage.setItem(storageStateKeyCfg, JSON.stringify(state));
    }

    function persistBookingScarcity(){
      try {
        localStorage.setItem(bookingScarcityKeyCfg, JSON.stringify({
          visits: bookingScarcityState.visits
        }));
      } catch (error){
        // ignore storage failures
      }
    }

    function getBookingScarcityPercent(){
      const visits = Math.max(1, Number(bookingScarcityState.visits || 0));
      const raw = BOOKING_SCARCITY_BASE + ((visits - 1) * BOOKING_SCARCITY_STEP);
      return Math.min(BOOKING_SCARCITY_MAX, raw);
    }

    const initHero = () => {
      safeInvoke(ensureHeroBackgroundFlow(), 'initHero', [], null);
    };

    const applyHeroV3SimpleMode = () => (
      safeInvoke(ensureHeroV3SimpleFlow(), 'applyMode', [], null)
    );

    const preloadHeroAssets = () => {
      safeInvoke(ensureHeroBackgroundFlow(), 'preloadHeroAssets', [], null);
    };

    function ensureHeroAbFlow(){
      const create = window.AC_FEATURES?.heroAbFlow?.create;
      return heroAbFlowApi || (typeof create === 'function' && (heroAbFlowApi = create({
        heroAbTestKey: heroAbTestKeyCfg,
        heroAbTestId: heroAbTestIdCfg,
        heroAbDesktopBgOnly: HERO_AB_DESKTOP_BG_ONLY,
        heroAbMobileEffectsEnabled: HERO_AB_MOBILE_EFFECTS_ENABLED,
        heroAbBenefitStepMs: HERO_AB_BENEFIT_STEP_MS,
        heroAbShiftUpMs: HERO_AB_SHIFT_UP_MS,
        heroAbBenefitRevealDelayMs: HERO_AB_BENEFIT_REVEAL_DELAY_MS,
        heroAbDesktopShiftUpMs: HERO_AB_DESKTOP_SHIFT_UP_MS,
        heroAbDesktopBenefitRevealDelayMs: HERO_AB_DESKTOP_BENEFIT_REVEAL_DELAY_MS,
        useDesktopBaseForMobile: useDesktopBaseForMobileCfg,
        getCurrentSearchParams,
        bookingText,
        trackOnce,
        syncModularState,
        emitModularEvent,
        getHeroAbVariant: () => heroAbVariant,
        setHeroAbVariant: (next) => {
          heroAbVariant = toHeroAbVariant(next);
        },
        getHeroAbTimers: () => heroAbTimers,
        setHeroAbTimers: (next) => {
          heroAbTimers = cloneArrayOrEmpty(next);
        },
        getMobileAutoTimer: () => heroAbMobileAutoTimer,
        setMobileAutoTimer: (next) => {
          heroAbMobileAutoTimer = next || null;
        },
        getMobileCollapsed: () => heroAbMobileCollapsed,
        setMobileCollapsed: (next) => {
          heroAbMobileCollapsed = !!next;
        },
        getMobileScrollBound: () => heroAbMobileScrollBound,
        setMobileScrollBound: (next) => {
          heroAbMobileScrollBound = !!next;
        },
        getMobileInteractionBound: () => heroAbMobileInteractionBound,
        setMobileInteractionBound: (next) => {
          heroAbMobileInteractionBound = !!next;
        },
        getMobileUserInteracted: () => heroAbMobileUserInteracted,
        setMobileUserInteracted: (next) => {
          heroAbMobileUserInteracted = !!next;
        },
        safeInvoke,
        getViewMode: () => window.AC_VIEW_MODE,
        heroBenefitsLayoutExperiment: HERO_BENEFITS_LAYOUT_EXPERIMENT,
        heroBenefitsLayoutExperimentItems: HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS,
        heroAbVariantLabels: heroAbVariantLabelsCfg,
        onHeroVariantChange: () => {
          initHero();
          const url = new URL(window.location.href);
          url.searchParams.set('hero_ab', heroAbVariant);
          window.history.replaceState({}, '', url.toString());
        },
        resolveDesktopView: () => document.getElementById('desktopView'),
        resolveMobileView: () => document.getElementById('mobileView')
      }))) || null;
    }

    function clearHeroAbTimers(){
      const cleared = safeInvoke(ensureHeroAbFlow(), 'clearHeroAbTimers', [], null);
      if(cleared !== null) return;
      heroAbTimers.forEach((timerId) => window.clearTimeout(timerId));
      heroAbTimers = [];
    }

    const applyHeroAbAnimationForRoot = (root) => {
      safeInvoke(ensureHeroAbFlow(), 'applyHeroAbAnimationForRoot', [root], null);
    };

    const applyHeroAbVariant = () => {
      safeInvoke(ensureHeroAbFlow(), 'applyHeroAbVariant', [], null);
    };

    const resolveVideoSource = (url) => (
      safeInvoke(ensureVideoMetaFlow(), 'resolveVideoSource', [url], {
        canEmbed: false,
        embedUrl: '',
        externalUrl: String(url || '').trim(),
        orientation: 'horizontal',
        sourceName: 'источнике'
      })
    );

    const isVerticalVideoUrl = (url) => (
      safeInvoke(ensureVideoMetaFlow(), 'isVerticalVideoUrl', [url], false)
    );

    const normalizeKinescopeShareUrl = (url) => (
      safeInvoke(ensureVideoMetaFlow(), 'normalizeKinescopeShareUrl', [url], '')
    );

    const applyVideoMetaMap = (videoMetaMap = {}) => (
      safeInvoke(ensureVideoMetaFlow(), 'applyVideoMetaMap', [videoMetaMap], false)
    );

    const loadVideoMetaCache = () => (
      safeInvoke(ensureVideoMetaFlow(), 'loadVideoMetaCache', [], null)
    );

    const getVideoMetaCacheAgeMs = () => (
      safeInvoke(ensureVideoMetaFlow(), 'getVideoMetaCacheAgeMs', [], Number.POSITIVE_INFINITY)
    );

    const saveVideoMetaCache = (videoMetaMap) => (
      safeInvoke(ensureVideoMetaFlow(), 'saveVideoMetaCache', [videoMetaMap], null)
    );

    async function fetchKinescopeMeta(videoUrl){
      const flow = ensureVideoMetaFlow();
      if(!flow || typeof flow.fetchKinescopeMeta !== 'function') return null;
      return flow.fetchKinescopeMeta(videoUrl);
    }

    async function refreshVideoMeta({force = false} = {}){
      const flow = ensureVideoMetaFlow();
      if(!flow || typeof flow.refreshVideoMeta !== 'function') return;
      await flow.refreshVideoMeta({force});
    }

    const notifyLead = async (eventName, payload) => (
      safeInvoke(ensureLeadNotifyFlow(), 'notifyLead', [eventName, payload], Promise.resolve({
        ok: false,
        delivered: false,
        fallback: true,
        reason: 'lead_notify_flow_unavailable'
      }))
    );

    function isAdminDebugSession(){
      try {
        const resolveIsProductionRuntime = () => {
          try {
            const host = String(window.location.hostname || '').toLowerCase().replace(/^www\./, '');
            if(!host) return false;
            return prodDebuglessDomainsCfg.some((domain) => host === domain || host.endsWith(`.${domain}`));
          } catch(error){
            return false;
          }
        };
        // Production must never expose debug controls via query/localStorage toggles.
        if(resolveIsProductionRuntime()) return false;
        if(window.AC_DEBUG === true) return true;
        const search = new URLSearchParams(window.location.search || '');
        const adminFlag = (search.get('admin') || search.get('debug') || '').toLowerCase();
        if(['1', 'true', 'yes', 'on'].includes(adminFlag)) return true;
        const adminDebugKey = String(STORAGE_RUNTIME_CONFIG.adminDebugKey || 'aidacamp_admin_debug');
        const storedFlag = String(localStorage.getItem(adminDebugKey) || '').toLowerCase();
        return ['1', 'true', 'yes', 'on'].includes(storedFlag);
      } catch(error){
        return false;
      }
    }

    function getSelectedShift(){
      return (state.shiftId && shifts.find(s => s.id === state.shiftId)) || null;
    }

    function hasSelectedAge(){
      const age = String(state.age || '').trim();
      return !!state.ageSelected || age === '7-9' || age === '10-12' || age === '13-14';
    }

    function hasActiveBookingContext(){
      return !!(
        state.shiftId ||
        state.basePrice ||
        state.offerPrice ||
        state.code ||
        state.expiresAt
      );
    }

    function syncGuidedState(){
      if(hasActiveBookingContext() && state.age){
        Object.assign(state, { ageSelected: true });
      }
    }

    function ageLabel(value){
      return AGE_LABELS[value] || '—';
    }

    function photoCatLabel(cat){
      return PHOTO_CATEGORY_LABELS[cat] || cat;
    }

    function getStayGallery(){
      const fromDesktopCards = Array.from(document.querySelectorAll('#section-stay .stay-card')).map((card) => {
        const image = card.querySelector('img');
        if(!image) return null;
        const title = (card.querySelector('.stay-card-body strong')?.textContent || '').trim();
        return {
          cat:'stay',
          src:image.getAttribute('src') || '',
          alt:image.getAttribute('alt') || title || 'Размещение'
        };
      }).filter((item) => item && item.src);

      if(fromDesktopCards.length){
        return fromDesktopCards;
      }

      const fromMobilePreview = Array.from(document.querySelectorAll('.mobile-stay-preview-thumb img, .mobile-stay-feature-photo img'))
        .map((img) => {
          const src = img.getAttribute('src') || '';
          if(!src) return null;
          return {
            cat:'stay',
            src,
            alt:img.getAttribute('alt') || 'Размещение'
          };
        })
        .filter((item) => item && item.src);

      const unique = [];
      const seen = new Set();
      fromMobilePreview.forEach((item) => {
        if(seen.has(item.src)) return;
        seen.add(item.src);
        unique.push(item);
      });
      return unique;
    }

    function prepareStayGalleryTriggers(){
      const stayCards = Array.from(document.querySelectorAll('#section-stay .stay-card'));
      let stayPhotoIndex = 0;

      stayCards.forEach((card) => {
        const image = card.querySelector('img');
        if(!image) return;
        card.dataset.action = 'open-stay-photo';
        card.dataset.stayIndex = String(stayPhotoIndex);
        card.classList.add('is-clickable');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        stayPhotoIndex += 1;
      });
    }

    function saveLeadFallbackMeta(eventName, endpoint, reason = ''){
      try {
        const key = String(STORAGE_RUNTIME_CONFIG.leadFallbackMetaKey || 'aidacamp_lead_fallback_meta');
        const prevRaw = localStorage.getItem(key);
        const prev = (prevRaw && JSON.parse(prevRaw)) || {};
        const count = Number(prev.count || 0) + 1;
        const safeMeta = {
          ts: Date.now(),
          event: String(eventName || ''),
          endpoint: String(endpoint || ''),
          reason: String(reason || ''),
          count
        };
        localStorage.setItem(key, JSON.stringify(safeMeta));
      } catch(e){
      }
    }

    function isOfferActive(){
      return !!(state.expiresAt && Date.now() < state.expiresAt);
    }

    function getVisiblePrice(){
      const shift = getSelectedShift();
      if(state.offerPrice) return state.offerPrice;
      if(state.basePrice) return state.basePrice;
      return (shift && shift.price) || null;
    }

    function getPrimaryActionState(){
      syncGuidedState();
      return safeInvoke(ensureBookingRuntimeBridge(), 'getPrimaryActionState', [{
        state,
        heroVariantState,
        resolveHeroVariantFromUtm,
        HERO_VARIANT_COPY,
        HERO_VARIANT_DEFAULT_TIER,
        hasSelectedAge,
        getSelectedShift,
        simpleModeEnabled: HERO_V3_SIMPLE_ENABLED
      }], { text:'', disabled:true, hint:'' });
    }

    function getResolvedPrimaryActionText(...args){
      return runtimeInvoke.getResolvedPrimaryActionText(...args);
    }

    function getStepState(){
      syncGuidedState();
      return safeInvoke(ensureBookingRuntimeBridge(), 'getStepState', [{
        state,
        hasSelectedAge,
        simpleModeEnabled: HERO_V3_SIMPLE_ENABLED
      }], 1);
    }

    function getBookingStage(){
      return Math.min(Math.max(getStepState(), 1), 4);
    }

    // SECTION 4: Booking module (view config, actions, render pipeline).
    const BOOKING_RUNTIME_CONFIG = (window.AC_RUNTIME_CONFIG && window.AC_RUNTIME_CONFIG.bookingViews) || {};
    const bookingStage2VerticalAlignCfg = Object.freeze(BOOKING_RUNTIME_CONFIG.stage2VerticalAlign || {});
    const bookingStage2HorizontalAlignCfg = Object.freeze(BOOKING_RUNTIME_CONFIG.stage2HorizontalAlign || {});
    const bookingViewsCfg = Object.freeze(BOOKING_RUNTIME_CONFIG.views || {
      desktop: Object.freeze({ key: 'desktop' }),
      mobile: Object.freeze({ key: 'mobile' })
    });
    let bookingCardMinHeightFrame = 0;

    function getBookingViewConfig(viewKey){
      return bookingViewsCfg[viewKey] || bookingViewsCfg.desktop;
    }

    function getRenderableBookingViewKeys(){
      return (useDesktopBaseForMobileCfg && ['desktop']) || ['desktop', 'mobile'];
    }

    function getActiveBookingViewKeys(){
      return ((state.previewView === 'mobile' && !useDesktopBaseForMobileCfg) && ['mobile']) || ['desktop'];
    }

    function getPrimaryBookingViewKey(){
      return getActiveBookingViewKeys()[0] || 'desktop';
    }

    function getPrimaryBookingViewConfig(){
      return getBookingViewConfig(getPrimaryBookingViewKey());
    }

    function syncBookingCardMinHeight(){
      const card = document.getElementById('desktop-booking-card');
      if(!card) return;
      const shouldStabilize = window.matchMedia('(max-width: 820px)').matches && state.previewView === 'mobile';
      if(!shouldStabilize){
        card.style.removeProperty('--booking-card-min-height');
        card.style.removeProperty('--booking-card-fixed-height');
        card.style.removeProperty('--booking-card-mobile-overlap');
        return;
      }

      const heroShell = card.closest('.hero-shell');
      const cardRect = card.getBoundingClientRect();
      const heroRect = (heroShell && heroShell.getBoundingClientRect()) || null;
      const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
      const preferred = Math.floor(viewportHeight * 0.72);
      let availableByHero = Math.floor(viewportHeight * 0.68);

      if(heroRect && Number.isFinite(heroRect.bottom) && Number.isFinite(cardRect.top)){
        availableByHero = Math.floor(heroRect.bottom - cardRect.top + Math.max(8, viewportHeight * 0.025));
      }

      const runtimeHeight = Math.max(450, Math.min(700, Math.min(preferred, availableByHero)));
      const mobileOverlap = Math.max(11, Math.min(27, Math.round(runtimeHeight * 0.048)));
      card.style.setProperty('--booking-card-fixed-height', `${runtimeHeight}px`);
      card.style.setProperty('--booking-card-min-height', `${runtimeHeight}px`);
      card.style.setProperty('--booking-card-mobile-overlap', `${mobileOverlap}px`);
    }

    function scheduleBookingCardMinHeightSync(){
      if(bookingCardMinHeightFrame){
        cancelAnimationFrame(bookingCardMinHeightFrame);
      }
      bookingCardMinHeightFrame = requestAnimationFrame(() => {
        bookingCardMinHeightFrame = 0;
        syncBookingCardMinHeight();
      });
    }

    function applyBookingStageClass(viewCfg){
      const cfg = resolveBookingViewCfg(viewCfg);
      const card = document.getElementById(cfg.cardId);
      if(!card) return;
      const stage = getBookingStage();
      card.classList.remove('booking-stage-1', 'booking-stage-2', 'booking-stage-3', 'booking-stage-4');
      card.classList.remove('booking-completed');
      card.classList.add(`booking-stage-${stage}`);
      if(state.bookingCompleted){
        card.classList.add('booking-completed');
      }
      const stepThree = card.querySelector('.booking-step-3');
      if(stepThree){
        const hasStage2Transfer = stepThree.classList.contains('booking-stage2-transfer-enabled');
        const shouldHideStepThree = stage === 2 && !hasStage2Transfer;
        stepThree.classList.toggle('is-force-hidden', shouldHideStepThree);
      }
    }

    function resolveStage2VerticalAlign(value){
      return bookingStage2VerticalAlignCfg[value] || bookingStage2VerticalAlignCfg.top;
    }

    function resolveStage2HorizontalAlign(value){
      return bookingStage2HorizontalAlignCfg[value] || bookingStage2HorizontalAlignCfg.stretch;
    }

    function applyBookingStage2Alignment(viewCfg){
      const cfg = resolveBookingViewCfg(viewCfg);
      const card = document.getElementById(cfg.cardId);
      if(!card) return;
      const stage2Align = cfg.stage2Align || {};
      const vertical = resolveStage2VerticalAlign(stage2Align.vertical);
      const horizontal = resolveStage2HorizontalAlign(stage2Align.horizontal);
      card.style.setProperty('--booking-stage2-y-flex', vertical.flex);
      card.style.setProperty('--booking-stage2-y-grid', vertical.grid);
      card.style.setProperty('--booking-stage2-x-flex', horizontal.flex);
      card.style.setProperty('--booking-stage2-x-grid', horizontal.grid);
    }

    function renderSteps(viewCfg){
      const cfg = resolveBookingViewCfg(viewCfg);
      const root = document.getElementById(cfg.stepsId);
      if(!root) return;
      const current = getStepState();
      const isDesktopSteps = cfg.key === 'desktop';
      root.querySelectorAll('.booking-step').forEach((el, idx) => {
        const num = idx + 1;
        el.classList.remove('active','done','pulse');
        el.dataset.step = String(num);
        if(num < current) el.classList.add('done');
        if(num === current){
          el.classList.add('active');
          if(isDesktopSteps){
            el.classList.add('pulse');
          }
        }
      });
    }

    function formatRemainingClock(diff){
      if(diff <= 0) return '';
      const totalSeconds = Math.max(0, Math.floor(diff / 1000));
      const totalHours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const hoursPart = String(totalHours).padStart(2, '0');
      const minutesPart = String(minutes).padStart(2, '0');
      const secondsPart = String(seconds).padStart(2, '0');
      return `Осталось ${hoursPart}:${minutesPart}:${secondsPart}`;
    }

    function formatRemaining(diff){
      return formatRemainingClock(diff);
    }

    function formatRemainingCompact(diff){
      return formatRemainingClock(diff);
    }

    function normalizeCompactTimerText(text){
      if(!text) return '';
      const source = String(text).replace(/,/g, ' ');
      const clockMatch = source.match(/(\d{1,4})\s*:\s*(\d{1,2})\s*:\s*(\d{1,2})/);
      if(clockMatch){
        const hh = String(Math.max(0, Number(clockMatch[1]) || 0)).padStart(2, '0');
        const mm = String(Math.max(0, Math.min(59, Number(clockMatch[2]) || 0))).padStart(2, '0');
        const ss = String(Math.max(0, Math.min(59, Number(clockMatch[3]) || 0))).padStart(2, '0');
        return `Осталось ${hh}:${mm}:${ss}`;
      }

      const extract = (pattern) => {
        const match = source.match(pattern);
        return (match && (Number(match[1]) || 0)) || 0;
      };

      const days = extract(/(\d+)\s*(д(?:ень|ня|ней)?|[dDД])/);
      const hours = extract(/(\d+)\s*(час(?:а|ов)?|[hHчЧ])/);
      const minutes = extract(/(\d+)\s*(мин(?:ут(?:а|ы)?|ут)?|[mMмМ])/);
      const seconds = extract(/(\d+)\s*(сек(?:унд(?:а|ы)?|унд)?|[sSсС])/);
      const totalHours = (days * 24) + hours;

      if(days || hours || minutes || seconds){
        const hh = String(Math.max(0, totalHours)).padStart(2, '0');
        const mm = String(Math.max(0, Math.min(59, minutes))).padStart(2, '0');
        const ss = String(Math.max(0, Math.min(59, seconds))).padStart(2, '0');
        return `Осталось ${hh}:${mm}:${ss}`;
      }

      return ((stripRemainingPrefix(source) && `Осталось ${stripRemainingPrefix(source)}`) || '');
    }

    function stripRemainingPrefix(text){
      return String(text || '').replace(/^\s*Осталось[:\s]*/i, '').trim();
    }

    function updateBookingScarcityUi(){
      const nodes = document.querySelectorAll('.booking-scarcity');
      if(!nodes.length) return;
      const stage = getBookingStage();
      const enteredStageFour = stage === 4 && lastRenderedBookingStage !== 4;
      if(enteredStageFour){
        bookingScarcityState.visits = Math.max(0, Number(bookingScarcityState.visits || 0)) + 1;
        persistBookingScarcity();
      }
      lastRenderedBookingStage = stage;

      const percent = getBookingScarcityPercent();
      nodes.forEach((node) => {
        node.style.setProperty('--scarcity-fill', `${percent}%`);
        let progressNode = node.querySelector('.booking-scarcity-progress');
        if(!progressNode){
          progressNode = document.createElement('span');
          progressNode.className = 'booking-scarcity-progress';
          progressNode.setAttribute('aria-hidden', 'true');
          const fillNode = document.createElement('span');
          fillNode.className = 'booking-scarcity-progress-fill';
          progressNode.appendChild(fillNode);
          node.appendChild(progressNode);
        }
        let textNode = node.querySelector('.booking-scarcity-text');
        if(!textNode){
          textNode = document.createElement('span');
          textNode.className = 'booking-scarcity-text';
          node.appendChild(textNode);
        }
        textNode.textContent = '';
        const strongNode = document.createElement('strong');
        strongNode.textContent = `${percent}%`;
        textNode.appendChild(strongNode);
        textNode.appendChild(document.createTextNode(' мест уже занято'));
        if(enteredStageFour){
          node.classList.remove('is-animating');
          void node.offsetWidth;
          node.classList.add('is-animating');
        }
      });
    }

    function stopBookingStage1TitleTypewriter(...args){
      return runtimeInvoke.stopBookingStage1TitleTypewriter(...args);
    }
    function runBookingStage1TitleTypewriter(...args){
      return runtimeInvoke.runBookingStage1TitleTypewriter(...args);
    }
    function renderBookingInfo(...args){
      return runtimeInvoke.renderBookingInfo(...args);
    }
    function renderBookingPanels(...args){
      return runtimeInvoke.renderBookingPanels(...args);
    }
    function getViewportPreviewView(...args){
      return runtimeInvoke.getViewportPreviewView(...args);
    }
    function switchView(...args){
      return runtimeInvoke.switchView(...args);
    }

    function applyOfferLayoutMode(){
      const mode = normalizeMode(state[OFFER_LAYOUT_KEY], offerLayoutModesCfg, 'current');
      const currentBtn = document.getElementById('offerLayoutCurrentBtn');
      if(currentBtn){
        currentBtn.classList.toggle('active', mode === 'current');
      }
      const card = document.getElementById('offerCard');
      if(card){
        card.dataset[OFFER_LAYOUT_DATASET_KEY] = mode;
      }
    }

    // SECTION 6: View mode controls (desktop/mobile, full/compact).
    document.getElementById('fullModeBtn')?.addEventListener('click', () => {
      safeInvoke(ensureViewModeFlow(), 'switchDesktopMode', ['full'], null);
    });
    document.getElementById('compactModeBtn')?.addEventListener('click', () => {
      const nextMode = (state.desktopMode === 'compact' && 'full') || 'compact';
      safeInvoke(ensureViewModeFlow(), 'switchDesktopMode', [nextMode], null);
    });
    if(!useDesktopBaseForMobileCfg){
      document.getElementById('mobileFullModeBtn')?.addEventListener('click', () => {
        safeInvoke(ensureViewModeFlow(), 'switchMobileMode', ['full'], null);
      });
      document.getElementById('mobileCompactModeBtn')?.addEventListener('click', () => {
        safeInvoke(ensureViewModeFlow(), 'switchMobileMode', ['compact'], null);
      });
      document.getElementById('mobileModeToggle')?.addEventListener('click', () => {
        safeInvoke(
          ensureViewModeFlow(),
          'switchMobileMode',
          [(state.mobileMode === 'full' && 'compact') || 'full'],
          null
        );
      });
    }

    // SECTION 7: Event bindings (single action pipeline, no direct business logic in handlers).
    safeInvoke(ensureRuntimeActionFlow(), 'bindDocumentClick', [], null);

    function formatPrice(v){
      return new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
    }

    function labelAge(v){
      return ageLabel(v);
    }

    function shiftDaysLabel(shift){
      if(!shift) return '';
      const dayWord = (days) => {
        const n = Math.abs(Number(days) || 0);
        const mod10 = n % 10;
        const mod100 = n % 100;
        if(mod10 === 1 && mod100 !== 11) return 'день';
        if(mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
        return 'дней';
      };
      if(shift.isShort){
        const start = parseShiftDate(shift.start);
        const end = parseShiftDate(shift.end);
        if(start && end){
          const msPerDay = 24 * 60 * 60 * 1000;
          const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);
          return `${days} ${dayWord(days)}`;
        }
      }
      const map = {
        'shift-1':'10 дней',
        'shift-2':'13 дней',
        'shift-2-1':'7 дней',
        'shift-2-2':'7 дней',
        'shift-4':'13 дней',
        'shift-5':'10 дней'
      };
      return map[shift.id] || '';
    }

    function resolveShiftOptionsTargetId(viewKey){
      const cfg = getBookingViewConfig(viewKey);
      return cfg.shiftOptionsId;
    }

    function renderShiftOptionsForRenderableViews(){
      getRenderableBookingViewKeys().forEach((viewKey) => {
        try {
          renderShiftOptions(viewKey);
        } catch(err){
          console.warn('[booking] shift options render failed for view:', viewKey, err);
        }
      });
    }

    function toggleShiftOptionPanel(...args){
      return runtimeInvoke.toggleShiftOptionPanel(...args);
    }
    function clearShiftOptionPanels(...args){
      return runtimeInvoke.clearShiftOptionPanels(...args);
    }
    function parseShiftDate(...args){
      return runtimeInvoke.parseShiftDate(...args);
    }
    function renderCalendar(...args){
      return runtimeInvoke.renderCalendar(...args);
    }
    function renderSeasonCalendar(...args){
      return runtimeInvoke.renderSeasonCalendar(...args);
    }
    function openCalendar(...args){
      return runtimeInvoke.openCalendar(...args);
    }
    function openSeasonCalendar(...args){
      return runtimeInvoke.openSeasonCalendar(...args);
    }
    function closeCalendar(...args){
      return runtimeInvoke.closeCalendar(...args);
    }
    function selectedShiftPayload(...args){
      return runtimeInvoke.selectedShiftPayload(...args);
    }
    function clearOfferTimeout(...args){
      return runtimeInvoke.clearOfferTimeout(...args);
    }
    function resetOfferState(...args){
      return runtimeInvoke.resetOfferState(...args);
    }
    function buildBookingSummaryHtml(...args){
      return runtimeInvoke.buildBookingSummaryHtml(...args);
    }

    function generateCode(){
      return 'AC-' + Math.random().toString(36).slice(2,6).toUpperCase();
    }

    function buildInviteClipboardText(){
      const currentCode = String(state.code || 'aidacamp').trim();
      const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(currentCode)}`;
      return `Ссылка: ${inviteUrl}`;
    }

    function bindAgeTabs(...args){
      return runtimeInvoke.bindAgeTabs(...args);
    }
    function focusMobileAgeGate(...args){
      return runtimeInvoke.focusMobileAgeGate(...args);
    }
    function resetAgeSelection(...args){
      return runtimeInvoke.resetAgeSelection(...args);
    }
    function resetShiftSelection(...args){
      return runtimeInvoke.resetShiftSelection(...args);
    }

    function setPhotoFilter(filter){
      Object.assign(state, { photoFilter: filter });
      renderMediaSections();
      persist();
    }

    function setFaqFilter(filter){
      Object.assign(state, { faqFilter: filter });
      track('faq_filter', {filter});
      renderMediaSections();
      persist();
    }

    function sanitizeHeroPhoneDropdownUi(){
      var dropdown = document.getElementById('heroPhoneDropdown')
        || document.querySelector('.hero-phone-dropdown');
      if(!dropdown) return;

      dropdown.style.background = '#0b1422';
      dropdown.style.backdropFilter = 'none';
      dropdown.style.webkitBackdropFilter = 'none';
      dropdown.style.borderColor = 'rgba(148,163,184,0.38)';

      dropdown.querySelectorAll('.hero-phone-item, a, button').forEach(function(item){
        item.style.background = '#ffffff';
        item.style.color = '#0f172a';
        item.style.borderColor = '#cbd5e1';
      });

      dropdown.querySelectorAll('*').forEach(function(node){
        if(!node || node.children.length) return;
        var raw = String(node.textContent || '');
        if(!raw) return;
        var next = raw
          .replace(/\b[Пп]озвонить\s*:?\s*/g, '')
          .replace(/\b(?:post|пост)\b:?/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if(next && next !== raw.trim()){
          node.textContent = next;
        }
      });
    }

    function bindHeroPhoneDropdownSanitizer(){
      if(window.__heroPhoneDropdownSanitizerBound) return;
      window.__heroPhoneDropdownSanitizerBound = true;

      var apply = function(){
        window.requestAnimationFrame(sanitizeHeroPhoneDropdownUi);
      };

      apply();

      var trigger = document.getElementById('heroPhoneTrigger');
      if(trigger){
        new MutationObserver(apply).observe(trigger, {
          attributes: true,
          attributeFilter: ['data-open', 'class', 'aria-expanded']
        });
      }

      var dropdown = document.getElementById('heroPhoneDropdown')
        || document.querySelector('.hero-phone-dropdown');
      if(dropdown){
        new MutationObserver(apply).observe(dropdown, {
          childList: true,
          subtree: true
        });
      }
    }

    bindAgeTabs('desktopAgeTabs');
    if(!useDesktopBaseForMobileCfg){
      bindAgeTabs('mobileAgeTabs');
    }

    function getShiftDisplayDescription(...args){
      return runtimeInvoke.getShiftDisplayDescription(...args);
    }
    function openShiftAboutModal(...args){
      return runtimeInvoke.openShiftAboutModal(...args);
    }
    function renderShiftOptions(...args){
      return runtimeInvoke.renderShiftOptions(...args);
    }
    function renderShiftCards(...args){
      return runtimeInvoke.renderShiftCards(...args);
    }
    function contactIconMarkup(...args){
      return runtimeInvoke.contactIconMarkup(...args);
    }
    function resolveFloatingContactLinks(...args){
      return runtimeInvoke.resolveFloatingContactLinks(...args);
    }
    function initFloatingContactsWidget(...args){
      return runtimeInvoke.initFloatingContactsWidget(...args);
    }
    function socialBadgeMark(...args){
      return runtimeInvoke.socialBadgeMark(...args);
    }
    function socialDisplayName(...args){
      return runtimeInvoke.socialDisplayName(...args);
    }
    function faqGlyph(...args){
      return runtimeInvoke.faqGlyph(...args);
    }
    function renderStars(...args){
      return runtimeInvoke.renderStars(...args);
    }

    // SECTION 5: Content and media rendering.
    function renderMediaSections(){
      const flow = ensureMediaSectionsFlow();
      if(!flow || typeof flow.renderMediaSections !== 'function') return;
      flow.renderMediaSections();
    }

    function getMediaFlowInlineApi(){
      return window.AC_FEATURES?.mediaFlowInline || null;
    }

    function buildMediaFlowInlineContext(){
      return {
        document,
        state,
        mediaContent,
        socialDisplayName,
        socialBadgeMark
      };
    }

    function getCompactStayCards(){
      const api = getMediaFlowInlineApi();
      return safeInvoke(api, 'getCompactStayCards', [buildMediaFlowInlineContext()], []);
    }

    function renderCompactInlineStayList(mobileInlineStayList){
      const api = getMediaFlowInlineApi();
      return safeInvoke(api, 'renderCompactInlineStayList', [buildMediaFlowInlineContext(), mobileInlineStayList], null);
    }

    function renderCompactInlineTeamList(mobileInlineTeamList){
      const api = getMediaFlowInlineApi();
      return safeInvoke(api, 'renderCompactInlineTeamList', [buildMediaFlowInlineContext(), mobileInlineTeamList], null);
    }

    function renderCompactInlineContactsList(mobileInlineContactsList){
      const api = getMediaFlowInlineApi();
      return safeInvoke(api, 'renderCompactInlineContactsList', [buildMediaFlowInlineContext(), mobileInlineContactsList], null);
    }

    function renderCompactInlineSocials(mobileInlineSocials){
      const api = getMediaFlowInlineApi();
      return safeInvoke(api, 'renderCompactInlineSocials', [buildMediaFlowInlineContext(), mobileInlineSocials], null);
    }

    function renderCompactTrustPanelContent(){
      const trustPanel = window.AC_FEATURES?.mediaFlowTrustPanel;
      if(!trustPanel || typeof trustPanel.renderCompactTrustPanelContent !== 'function') return;
      trustPanel.renderCompactTrustPanelContent({
        state,
        shifts,
        mediaContent,
        formatPrice,
        shiftDaysLabel,
        getShiftDisplayDescription,
        hasSelectedAge,
        getPhotosForActiveFilter: runtimeInvoke.getPhotosForActiveFilter,
        socialBadgeMark,
        socialDisplayName,
        renderCompactInlineTeamList,
        renderCompactInlineStayList,
        renderCompactInlineContactsList,
        renderCompactInlineSocials,
        setPhotoLists: (list = []) => {
          const next = cloneArrayOrEmpty(list);
          photoGalleryList = next.slice();
          activePhotoList = next.slice();
        },
        document
      });
      syncLegalDocLinks();
    }

    function renderDesktopMobileDocsBlock(...args){
      return runtimeInvoke.renderDesktopMobileDocsBlock(...args);
    }
    function syncMobileDocsExpandedUi(...args){
      return runtimeInvoke.syncMobileDocsExpandedUi(...args);
    }
    function applyMobileTemplatesToDesktopSections(...args){
      return runtimeInvoke.applyMobileTemplatesToDesktopSections(...args);
    }

    // SECTION 8: Global orchestrator.
    function renderAll(){
      applyMobileTemplatesToDesktopSections();
      renderShiftOptionsForRenderableViews();
      renderBookingPanels();
      safeInvoke(ensureBookingHintFlow(), 'syncDesktopAgeTapHintVisibility', [], null);
      safeInvoke(ensureBookingHintFlow(), 'scheduleDesktopAgeTapHint', [], null);
      renderMediaSections();
      renderDesktopMobileDocsBlock();
      renderSummary();
      syncLegalDocLinks();
    }

    const selectShift = (id) => (
      safeInvoke(ensureBookingRuntimeBridge(), 'selectShift', [{
        state,
        shiftId: id,
        getShifts: () => shifts,
        clearShiftOptionPanels,
        renderAll,
        persist
      }], false)
    );

    const handlePrimaryCTA = () => (
      safeInvoke(ensureBookingRuntimeBridge(), 'handlePrimaryCTA', [{
        state,
        heroVariantState,
        resolveHeroVariantFromUtm,
        HERO_VARIANT_COPY,
        HERO_VARIANT_DEFAULT_TIER,
        hasSelectedAge,
        bookingText,
        track,
        buildHeroVariantMeta,
        showHint,
        nudgeUserToNextStep,
        formatVariantHint,
        getPrimaryActionState,
        runOfferSearch,
        isOfferActive,
        startTimer,
        syncGuidedState,
        getSelectedShift,
        shiftDaysLabel,
        formatPrice,
        ageLabel,
        stripRemainingPrefix,
        formatRemainingCompact,
        selectedShiftPayload,
        simpleModeEnabled: HERO_V3_SIMPLE_ENABLED,
        getSimpleScope: () => (
          state.previewView === 'mobile'
            ? 'booking-mobile'
            : 'booking-desktop'
        ),
        openInlineLead: (scope) => {
          safeInvoke(ensureBookingInlineRuntimeFlow(), 'openInlineLead', [scope], null);
        }
      }], null)
    );

    const runOfferSearch = () => (
      safeInvoke(ensureOfferFlow(), 'runOfferSearch', [{
        state,
        document,
        getSelectedShift,
        nudgeUserToNextStep,
        bookingText,
        bumpOfferRunId: () => {
          offerRunId += 1;
          return offerRunId;
        },
        isOfferRunCurrent: (runId) => runId === offerRunId,
        clearOfferTimeout,
        pushOfferTimeout: (id) => {
          offerTimeoutIds.push(id);
        },
        track,
        selectedShiftPayload,
        applyOfferModalTheme: (cardEl = null) => {
          return safeInvoke(ensureViewModeFlow(), 'applyOfferModalTheme', [cardEl], null);
        },
        normalizeCloseIconButtons: (scope = document) => {
          return safeInvoke(ensureUiInitFlow(), 'normalizeCloseIconButtons', [scope], null);
        },
        showOffer,
        discountFactor: OFFER_DISCOUNT_FACTOR,
        ttlHours: 72
      }], null)
    );

    const openOfferCheck = () => (
      safeInvoke(ensureOfferFlow(), 'openOfferCheck', [{
        runOfferSearch
      }], () => runOfferSearch())
    );

    const showOffer = () => (
      safeInvoke(ensureOfferFlow(), 'showOffer', [{
        state,
        document,
        getSelectedShift,
        featureOfferUtils: window.AC_FEATURES && window.AC_FEATURES.offerUtils,
        discountFactor: OFFER_DISCOUNT_FACTOR,
        ttlHours: 72,
        generateCode,
        persist,
        track,
        selectedShiftPayload,
        applyOfferModalTheme: (cardEl = null) => {
          return safeInvoke(ensureViewModeFlow(), 'applyOfferModalTheme', [cardEl], null);
        },
        formatPrice,
        normalizeCloseIconButtons: (scope = document) => {
          return safeInvoke(ensureUiInitFlow(), 'normalizeCloseIconButtons', [scope], null);
        },
        startTimer,
        renderSummary,
        renderBookingPanels
      }], null)
    );

    const saveOfferAndClose = () => (
      safeInvoke(ensureOfferFlow(), 'saveOfferAndClose', [{
        syncGuidedState,
        clearOfferTimeout,
        document,
        renderSummary,
        renderBookingPanels
      }], null)
    );

    const resetOfferProgressUI = () => (
      safeInvoke(ensureOfferFlow(), 'resetOfferProgressUI', [{
        clearOfferTimeout,
        state
      }], () => {
        clearOfferTimeout();
        Object.assign(state, { offerSearching: false });
      })
    );

    function startTimer(...args){
      return runtimeInvoke.startTimer(...args);
    }

    function isSummaryCompactMode(){
      if(state.previewView === 'mobile' && !useDesktopBaseForMobileCfg){
        return state.mobileMode === 'compact';
      }
      return state.desktopMode === 'compact';
    }

    function isSummaryBelowHero(){
      return !!safeInvoke(ensureSummaryFlow(), 'isSummaryBelowHero', [], true);
    }

    function isBookingPrimaryCtaVisibleInViewport(){
      return !!safeInvoke(ensureSummaryFlow(), 'isBookingPrimaryCtaVisibleInViewport', [], false);
    }

    function updateSummaryBarVisibility(...args){
      return runtimeInvoke.updateSummaryBarVisibility(...args);
    }
    function dismissSummaryBarTemporarily(...args){
      return runtimeInvoke.dismissSummaryBarTemporarily(...args);
    }
    function renderSummary(...args){
      return runtimeInvoke.renderSummary(...args);
    }

    safeInvoke(ensureMediaGestureBindingsApi(), 'init', [{
      document,
      closeMedia: runtimeInvoke.closeMedia,
      nextMedia: runtimeInvoke.nextMedia,
      prevMedia: runtimeInvoke.prevMedia,
      applyStatePatch: (patch = {}) => {
        Object.assign(state, patch);
      },
      renderCompactTrustPanelContent,
      persist,
      getMediaContent: () => mediaContent,
      getCompactStayCards,
      getPhotosForActiveFilter: runtimeInvoke.getPhotosForActiveFilter,
      getState: () => state
    }], null);

    safeInvoke(ensureGlobalUiBindingsApi(), 'init', [{
      document,
      navigateToSection: runtimeInvoke.navigateToSection,
      isHeroMenuOpen: runtimeInvoke.isHeroMenuOpen,
      setHeroMenuOpen: runtimeInvoke.setHeroMenuOpen,
      isHeroPhoneDropdownOpen: runtimeInvoke.isHeroPhoneDropdownOpen,
      setHeroPhoneDropdownOpen: runtimeInvoke.setHeroPhoneDropdownOpen,
      closeSuccessModal: runtimeInvoke.closeSuccessModal,
      closeNoticeModal: runtimeInvoke.closeNoticeModal,
      bumpOfferRunId: () => { offerRunId += 1; },
      clearOfferTimeout,
      resetOfferProgressUI,
      closeMedia: runtimeInvoke.closeMedia,
      nextMedia: runtimeInvoke.nextMedia,
      prevMedia: runtimeInvoke.prevMedia,
      closeVideo: runtimeInvoke.closeVideo,
      closeCalendar,
      closeSectionModal: runtimeInvoke.closeSectionModal,
      openNoticeModal: runtimeInvoke.openNoticeModal,
      bookingText,
      getViewportPreviewView,
      switchView,
      initHero,
      applyHeroAbVariant,
      applyCompactSectionModalLayout: runtimeInvoke.applyCompactSectionModalLayout,
      updateSummaryBarVisibility,
      scheduleBookingCardMinHeightSync,
      getState: () => state,
      getHeroResizeTimer: () => heroResizeTimer,
      setHeroResizeTimer: (next) => { heroResizeTimer = next || null; }
      ,
      setPhotoFilter,
      setFaqFilter,
      openSectionModal: runtimeInvoke.openSectionModal,
      track,
      showHint,
      nudgeUserToNextStep,
      hasSelectedAge,
      getBookingState: () => state,
      openVideo: runtimeInvoke.openVideo,
      selectedShiftPayload,
      buildHeroVariantMeta,
      bookingDesktopIds: bookingViewsCfg.desktop,
      bookingMobileIds: bookingViewsCfg.mobile
    }], null);

    heroAbVariant = safeInvoke(ensureHeroAbFlow(), 'resolveHeroAbVariant', [], heroAbVariant) || heroAbVariant;
    applyHeroV3SimpleMode();
    preloadHeroAssets();
    initHero();
    applyHeroAbVariant();
    initHeroVariantPersonalization();
    loadVideoMetaCache();

    renderShiftOptionsForRenderableViews();
    renderShiftCards();
    renderMediaSections();
    renderSummary();
    renderBookingPanels();
    resetOfferProgressUI();
    switchView(getViewportPreviewView());
    safeInvoke(ensureViewModeFlow(), 'applyHeroContrastMode', [], null);
    safeInvoke(ensureViewModeFlow(), 'applyHeroMicroMode', [], null);
    safeInvoke(ensureViewModeFlow(), 'applyOfferModalTheme', [], null);
    applyOfferLayoutMode();
    bindHeroPhoneDropdownSanitizer();
    safeInvoke(ensureViewModeFlow(), 'applyDesktopMode', [], null);
    if(!useDesktopBaseForMobileCfg){
      safeInvoke(ensureViewModeFlow(), 'applyMobileMode', [], null);
    }
    safeInvoke(ensureUiInitFlow(), 'normalizeCloseIconButtons', [document], null);
    safeInvoke(ensureRuntimeInitFlow(), 'scheduleDeferred', [], null);

    if(state.expiresAt && Date.now() < state.expiresAt){
      startTimer();
    }
