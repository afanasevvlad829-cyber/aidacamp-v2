(function () {
  "use strict";

  var MODE_KEY = "ac:mode";
  var AGE_KEY = "ac:age";
  var TECH_BADGE_DISMISSED_KEY = "ac:tech-badge-dismissed";
  var techBadgeDismissedInSession = false;
  var BUILD_TAG = "TECH v2026.03.21-01";
  var HERO_SUBTITLE_STATIC = "Для детей 7–14 лет: свои IT‑проекты, бассейн и спорт каждый день, внутренняя экономика с лагерной валютой.";
  var ageSelectionConfirmed = false;
  var ageGateNudge = false;
  var heroSlideTimer = null;
  var heroSlideIndex = 0;
  var HERO_SLIDE_INTERVAL_MS = 5200;
  var CONTACT_AUTO_CLOSE_MS = 1000;
  var SHIFT_PROMO_STORAGE_KEY = "acPromoV1";
  var BOOKING_LEAD_STORAGE_KEY = "acBookingLeadV1";
  var GEO_CACHE_KEY = "acGeoSnapshotV1";
  var GEO_CACHE_TTL_MS = 24 * 3600 * 1000;
  var SHIFT_PRICE_CFG = {
    initialMarkup: 0.2,
    firstDiscMin: 0.04,
    firstDiscMax: 0.05,
    secondDiscMin: 0.02,
    secondDiscMax: 0.03,
    checkDurationMs: 6800,
    holdHours: 72
  };
  var SHIFT_PRICE_META = [
    { title: "1 смена", date: "30 мая - 8 июня", days: 8, seats: 12, finalPrice: 79000, oldPrice: 85000, badge: "ХИТ", monthLabel: "Июнь 2026", monthIndex: 5, year: 2026, startDay: 1, endDay: 8 },
    { title: "2 смена", date: "10 июня - 16 июня", days: 6, seats: 8, finalPrice: 48000, oldPrice: 58000, badge: "", monthLabel: "Июнь 2026", monthIndex: 5, year: 2026, startDay: 10, endDay: 16 },
    { title: "3 смена", date: "16 июня - 23 июня", days: 7, seats: 5, finalPrice: 65000, oldPrice: 69000, badge: "", monthLabel: "Июнь 2026", monthIndex: 5, year: 2026, startDay: 16, endDay: 23 },
    { title: "4 смена", date: "10 июня — 23 июня", days: 13, seats: 14, finalPrice: 95000, oldPrice: 111000, badge: "", monthLabel: "Июнь 2026", monthIndex: 5, year: 2026, startDay: 10, endDay: 23 },
    { title: "5 смена", date: "3 августа — 15 августа", days: 12, seats: 7, finalPrice: 89400, oldPrice: 98000, badge: "", monthLabel: "Август 2026", monthIndex: 7, year: 2026, startDay: 3, endDay: 15 },
    { title: "6 смена", date: "17 августа — 26 августа", days: 9, seats: 15, finalPrice: 69600, oldPrice: 79000, badge: "", monthLabel: "Август 2026", monthIndex: 7, year: 2026, startDay: 17, endDay: 26 }
  ];
  var shiftsShowAll = false;
  var shiftCalendar = { open: false, shiftId: "" };
  var promoTicker = null;
  var contactCloseTimer = null;
  var geoLookupPromise = null;
  var auditRuntime = (window.AC_FEATURES && window.AC_FEATURES.auditRuntime) || {
    active: false,
    allowUiActions: false,
    allowDrag: true,
    snapGrid: 4,
    normalizeToParent: true,
    lockUntilAge: true,
    ageSelected: false,
    stageSync: null
  };
  var coreState = (window.AC_CORE && window.AC_CORE.state) || {};
  var coreActions = (window.AC_CORE && window.AC_CORE.actions) || {};

  var data = window.AC_DATA || {};
  var ICON_MAP = data.ICON_MAP || {};
  var CONTENT_MAP = data.CONTENT_MAP || {};
  var TABS = data.TABS || CONTENT_MAP.menu || [];
  var AGE_PROFILES = data.AGE_PROFILES || [];
  var SHIFTS = data.SHIFTS || [];
  var DIRECTIONS = data.DIRECTIONS || [];
  var TAB_TO_SECTION = data.TAB_TO_SECTION || {};
  var AGE_SLIDER_POINTS = data.AGE_SLIDER_POINTS || [9, 11, 13];
  var FAQ_DATA = data.FAQ_DATA || [];
  var initialShift = SHIFTS[0] || { id: "shift-1", direction: "base" };
  var UI_ICON = {
    about: "/assets/aida-logo-small.png",
    ai: "/assets/icons/sparkles.svg",
    location: "/assets/icons/map-pinned.svg",
    photos: "/assets/icons/images.svg",
    video: "/assets/icons/circle-play.svg",
    faq: "/assets/icons/help-circle.svg",
    reviews: "/assets/icons/star.svg",
    team: "/assets/icons/users.svg",
    code: "/assets/icons/code-xml.svg",
    economy: "/assets/icons/coins.svg",
    pool: "/assets/icons/waves.svg"
  };


  var state = {
    mode: getInitialMode(),
    activeTab: "info",
    step: 0,
    direction: initialShift.direction,
    age: 11,
    shiftView: "list",
    selectedShiftId: initialShift.id,
    overlays: {
      contact: false,
      shifts: false
    },
    photoCategory: "all",
    photoPage: 0,
    photoLightboxIndex: -1,
    videoLightboxIndex: -1,
    videoPage: 0,
    reviewPage: 0,
    teamPage: 0,
    faqCategory: "medicine"
  };
  if (typeof coreState.validateMode === "function") {
    state.mode = coreState.validateMode(state.mode);
  }
  if (typeof coreState.validateAge === "function") {
    state.age = coreState.validateAge(state.age);
  }
  if (typeof coreState.validateShiftView === "function") {
    state.shiftView = coreState.validateShiftView(state.shiftView);
  }
  if (typeof coreState.validateOverlays === "function") {
    state.overlays = coreState.validateOverlays(state.overlays);
  }
  var mediaSwapDir = {
    photo: 0,
    video: 0,
    review: 0,
    team: 0
  };

  function getInitialMode() {
    try {
      var mode = localStorage.getItem(MODE_KEY) === "full" ? "full" : "compact";
      return typeof coreState.validateMode === "function" ? coreState.validateMode(mode) : mode;
    } catch (_err) {
      return "compact";
    }
  }

  function persistMode(mode) {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (_err) {
      // ignore storage errors
    }
  }

  function getStoredAgeValue() {
    try {
      var raw = localStorage.getItem(AGE_KEY);
      if (!raw) return null;
      var value = Number(raw);
      if (!Number.isFinite(value)) return null;
      return clamp(Math.round(value), 7, 14);
    } catch (_err) {
      return null;
    }
  }

  function persistAge(age) {
    try {
      var safeAge = typeof coreState.validateAge === "function"
        ? coreState.validateAge(age)
        : clamp(Number(age) || 11, 7, 14);
      localStorage.setItem(AGE_KEY, String(safeAge));
    } catch (_err) {
      // ignore storage errors
    }
  }

  function getStoredMode() {
    try {
      var storedMode = localStorage.getItem(MODE_KEY);
      if (storedMode === "full" || storedMode === "compact") {
        return storedMode;
      }
      return null;
    } catch (_err) {
      return null;
    }
  }

  function loadBookingLead() {
    try {
      var raw = localStorage.getItem(BOOKING_LEAD_STORAGE_KEY);
      if (!raw) return null;
      var lead = JSON.parse(raw);
      return lead && typeof lead === "object" ? lead : null;
    } catch (_err) {
      return null;
    }
  }

  function saveBookingLead(lead) {
    try {
      localStorage.setItem(BOOKING_LEAD_STORAGE_KEY, JSON.stringify(lead));
    } catch (_err) {
      // ignore storage errors
    }
  }

  function clearBookingStatus() {
    try {
      localStorage.removeItem(SHIFT_PROMO_STORAGE_KEY);
      localStorage.removeItem(BOOKING_LEAD_STORAGE_KEY);
    } catch (_err) {
      // ignore storage errors
    }
  }

  var track = (window.AC_FEATURES && window.AC_FEATURES.track) || function () {};
  var notifyLead = (window.AC_FEATURES && window.AC_FEATURES.notifyLead) || function () {
    return Promise.resolve(false);
  };

  function loadGeoCache() {
    try {
      var raw = localStorage.getItem(GEO_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (Number(parsed.ts || 0) + GEO_CACHE_TTL_MS <= Date.now()) return null;
      return parsed.data || null;
    } catch (_err) {
      return null;
    }
  }

  function saveGeoCache(data) {
    try {
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        data: data || null
      }));
    } catch (_err) {
      // ignore storage errors
    }
  }

  function fetchGeoSnapshot() {
    var cached = loadGeoCache();
    if (cached) {
      return Promise.resolve(cached);
    }

    if (geoLookupPromise) {
      return geoLookupPromise;
    }

    if (!window.fetch) {
      return Promise.resolve(null);
    }

    geoLookupPromise = window.fetch("https://ipapi.co/json/", {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    }).then(function (response) {
      if (!response || !response.ok) return null;
      return response.json();
    }).then(function (raw) {
      if (!raw || typeof raw !== "object") return null;
      var snapshot = {
        ip: String(raw.ip || ""),
        city: String(raw.city || ""),
        region: String(raw.region || ""),
        country: String(raw.country_name || raw.country || ""),
        timezone: String(raw.timezone || "")
      };
      saveGeoCache(snapshot);
      return snapshot;
    }).catch(function () {
      return null;
    }).then(function (data) {
      geoLookupPromise = null;
      return data;
    });

    return geoLookupPromise;
  }

  function sendLeadNotification(eventName, payload) {
    var safePayload = payload && typeof payload === "object" ? payload : {};
    var startedAt = Date.now();
    var base = {
      app: "aidacamp-landing",
      mode: state.mode,
      active_tab: state.activeTab,
      step: state.step + 1,
      sent_at_ts: startedAt,
      sent_at_iso: new Date(startedAt).toISOString(),
      sent_at_local: new Date(startedAt).toLocaleString("ru-RU"),
      user_agent: String((window.navigator && window.navigator.userAgent) || "")
    };
    var merged = {};
    var key;
    for (key in base) {
      if (hasOwn(base, key)) merged[key] = base[key];
    }
    for (key in safePayload) {
      if (hasOwn(safePayload, key)) merged[key] = safePayload[key];
    }

    fetchGeoSnapshot().then(function (geo) {
      if (geo) {
        merged.ip = geo.ip || "";
        merged.city = geo.city || "";
        merged.region = geo.region || "";
        merged.country = geo.country || "";
        merged.timezone = geo.timezone || "";
      }
      return notifyLead(eventName, merged);
    }).catch(function () {
      try {
        notifyLead(eventName, merged);
      } catch (_err) {
        // noop
      }
    });
  }

  function clamp(value, min, max) {
    if (typeof coreActions.clamp === "function") {
      return coreActions.clamp(value, min, max);
    }
    return Math.max(min, Math.min(max, value));
  }

  function hasOwn(obj, key) {
    if (typeof coreActions.hasOwn === "function") {
      return coreActions.hasOwn(obj, key);
    }
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function isAgeGateLocked() {
    return !ageSelectionConfirmed;
  }

  function nudgeAgeSelection() {
    if (!isAgeGateLocked()) return;
    ageGateNudge = true;
    renderInfoCard();
    renderFunnel();
    if (state.overlays.shifts) {
      renderOverlays();
    }
  }

  function findProfileByAge(age) {
    for (var i = 0; i < AGE_PROFILES.length; i += 1) {
      var profile = AGE_PROFILES[i];
      if (age >= profile.min && age <= profile.max) {
        return profile;
      }
    }
    return AGE_PROFILES[0];
  }

  function getShiftSummaryByAge(shift, age) {
    if (!shift) return "";
    var profile = findProfileByAge(clamp(Number(age) || 11, 7, 14));
    var ageId = profile && profile.id ? String(profile.id) : "10-12";
    var byAge = shift.descriptions_by_age || shift.descriptionsByAge;
    if (byAge && typeof byAge === "object") {
      var resolved = byAge[ageId] || byAge["10-12"] || byAge["default"] || "";
      if (resolved) return String(resolved);
    }
    return String(shift.summary || shift.line || "");
  }

  function sliderValueToAge(sliderValue) {
    var safeValue = clamp(Math.round(sliderValue), 0, AGE_SLIDER_POINTS.length);
    if (safeValue === 0) return null;
    var index = safeValue - 1;
    return AGE_SLIDER_POINTS[index];
  }

  function ageToSliderValue(age) {
    if (!ageSelectionConfirmed) return 0;
    if (age <= 9) return 1;
    if (age <= 12) return 2;
    return 3;
  }

  function findShiftById(shiftId) {
    for (var i = 0; i < SHIFTS.length; i += 1) {
      if (SHIFTS[i].id === shiftId) {
        return SHIFTS[i];
      }
    }
    return SHIFTS[0];
  }

  function findExactShiftById(shiftId) {
    for (var i = 0; i < SHIFTS.length; i += 1) {
      if (SHIFTS[i].id === shiftId) {
        return SHIFTS[i];
      }
    }
    return null;
  }

  function getCurrentShift() {
    var safeStep = clamp(state.step, 0, SHIFTS.length - 1);
    return SHIFTS[safeStep];
  }

  function getHeroBenefits() {
    var baseProfile = AGE_PROFILES[0] || findProfileByAge(state.age);
    if (baseProfile && baseProfile.benefits && baseProfile.benefits.length) {
      var normalized = [];
      for (var i = 0; i < baseProfile.benefits.length; i += 1) {
        var benefit = baseProfile.benefits[i] || {};
        var text = String(benefit.text || "");
        var icon = String(benefit.icon || "");
        if (i === 0 || /IT|проект|python|web|код/i.test(text)) icon = UI_ICON.code;
        if (i === 1 || /эконом|валют|бюджет|монет/i.test(text)) icon = UI_ICON.economy;
        if (i === 2 || /бассейн|вода|плав/i.test(text)) icon = UI_ICON.pool;
        normalized.push({ icon: icon, text: text });
      }
      return normalized;
    }
    return [];
  }

  function stripLeadingMarker(text) {
    return String(text || "").replace(/^[^A-Za-zА-Яа-я0-9]+(?:\s+)?/, "");
  }

  function getMenuIcon(tabKey, fallback) {
    if (tabKey === "info") return UI_ICON.about;
    if (tabKey === "aiprogram") return UI_ICON.ai;
    if (tabKey === "location") return UI_ICON.location;
    if (tabKey === "photo") return UI_ICON.photos;
    if (tabKey === "video") return UI_ICON.video;
    if (tabKey === "faq") return UI_ICON.faq;
    if (tabKey === "reviews") return UI_ICON.reviews;
    if (tabKey === "team") return UI_ICON.team;
    return fallback || UI_ICON.ai;
  }

  function getCompactTabModel(profile) {
    if (state.mode !== "compact") return null;
    if (state.activeTab === "info") return null;

    var sectionTitles = CONTENT_MAP.sectionTitles || {};
    var maxItems = 4;
    var model = null;
    var i;

    function pushBenefit(list, icon, text) {
      if (list.length >= maxItems) return;
      var safe = String(text || "").trim();
      if (!safe) return;
      list.push({
        icon: icon,
        text: safe
      });
    }

    if (state.activeTab === "aiprogram") {
      var aiStats = CONTENT_MAP.aiStats || [];
      var lead = aiStats[0] || {};
      var aiBenefits = [];
      var aiCopy = CONTENT_MAP.aiCopy || [];

      for (i = 1; i < aiStats.length && aiBenefits.length < maxItems; i += 1) {
        var stat = aiStats[i];
        if (!stat || !stat.value) continue;
        pushBenefit(aiBenefits, UI_ICON.ai, stat.value + " " + stripLeadingMarker(stat.label));
      }
      for (i = 0; i < aiCopy.length && aiBenefits.length < maxItems; i += 1) {
        pushBenefit(aiBenefits, UI_ICON.code, aiCopy[i]);
      }
      model = {
        title: sectionTitles.ai || "AI-программы",
        subtitle: lead.text || (aiCopy[0] || ""),
        progress: lead.value && lead.label ? lead.value + " " + stripLeadingMarker(lead.label) : "",
        benefits: aiBenefits
      };
    } else if (state.activeTab === "location") {
      var where = (CONTENT_MAP.location && CONTENT_MAP.location.where) || [];
      var nearby = (CONTENT_MAP.location && CONTENT_MAP.location.nearby) || [];
      var locationBenefits = [];
      for (i = 0; i < where.length && locationBenefits.length < maxItems; i += 1) {
        pushBenefit(locationBenefits, UI_ICON.location, stripLeadingMarker(where[i]));
      }
      for (i = 0; i < nearby.length && locationBenefits.length < maxItems; i += 1) {
        pushBenefit(locationBenefits, UI_ICON.pool, stripLeadingMarker(nearby[i]));
      }
      model = {
        title: sectionTitles.location || "Локация",
        subtitle: CONTENT_MAP.ui.locationWhereTitle || "Где проходит смена",
        progress: (where[0] ? stripLeadingMarker(where[0]) : ""),
        benefits: locationBenefits
      };
    } else if (state.activeTab === "photo") {
      var categories = CONTENT_MAP.photoCategories || [];
      var photoBenefits = [];
      for (i = 0; i < categories.length && photoBenefits.length < maxItems; i += 1) {
        pushBenefit(photoBenefits, UI_ICON.photos, categories[i].label);
      }
      model = {
        title: sectionTitles.photos || "Фото лагеря",
        subtitle: "Галерея по категориям",
        progress: (CONTENT_MAP.photos || []).length + " фото в галерее",
        benefits: photoBenefits
      };
    } else if (state.activeTab === "video") {
      var videos = CONTENT_MAP.videos || [];
      var videoBenefits = [];
      for (i = 0; i < videos.length && videoBenefits.length < maxItems; i += 1) {
        pushBenefit(videoBenefits, UI_ICON.video, videos[i].title);
      }
      model = {
        title: sectionTitles.video || "Видео",
        subtitle: videos[0] ? videos[0].title : "Видео из лагеря",
        progress: videos.length + " видео",
        benefits: videoBenefits
      };
    } else if (state.activeTab === "faq") {
      var faqItemsByCat = CONTENT_MAP.faqItems || {};
      var faqList = faqItemsByCat[state.faqCategory] || faqItemsByCat.medicine || [];
      var faqTabs = CONTENT_MAP.faqTabs || [];
      var activeFaqTabLabel = "";
      for (i = 0; i < faqTabs.length; i += 1) {
        if (faqTabs[i].id === state.faqCategory) {
          activeFaqTabLabel = faqTabs[i].label;
          break;
        }
      }
      var faqBenefits = [];
      for (i = 0; i < faqList.length && faqBenefits.length < maxItems; i += 1) {
        pushBenefit(faqBenefits, UI_ICON.faq, faqList[i]);
      }
      model = {
        title: sectionTitles.faq || "FAQ",
        subtitle: activeFaqTabLabel || "Частые вопросы",
        progress: faqList.length + " вопросов",
        benefits: faqBenefits
      };
    } else if (state.activeTab === "reviews") {
      var reviews = CONTENT_MAP.reviews || [];
      var reviewBenefits = [];
      for (i = 0; i < reviews.length && reviewBenefits.length < maxItems; i += 1) {
        pushBenefit(reviewBenefits, UI_ICON.reviews, reviews[i].name + " — " + reviews[i].meta);
      }
      model = {
        title: sectionTitles.reviews || "Отзывы родителей",
        subtitle: "Реальные отзывы родителей",
        progress: (CONTENT_MAP.ui && CONTENT_MAP.ui.yandexReviewsLabel) || "",
        progressLink: (CONTENT_MAP.ui && CONTENT_MAP.ui.yandexReviewsUrl) || "",
        benefits: reviewBenefits
      };
    } else if (state.activeTab === "team") {
      var team = CONTENT_MAP.team || [];
      var teamBenefits = [];
      for (i = 0; i < team.length && teamBenefits.length < maxItems; i += 1) {
        pushBenefit(teamBenefits, UI_ICON.team, team[i].name + " — " + team[i].role);
      }
      model = {
        title: sectionTitles.team || "Команда",
        subtitle: "Педагоги и наставники лагеря",
        progress: team.length + " человек в команде",
        benefits: teamBenefits
      };
    }

    return model;
  }

  function splitCompactBenefitText(text) {
    var safe = String(text || "").trim();
    if (!safe) return { title: "", desc: "" };
    var parts = safe.split(/\s+[—-]\s+/);
    if (parts.length > 1) {
      return {
        title: parts.shift(),
        desc: parts.join(" — ")
      };
    }
    return { title: safe, desc: "" };
  }

  function applyDefaultHeroGridContent(heroGrid) {
    if (!heroGrid) return;
    var items = heroGrid.querySelectorAll(".ac-hero-grid__item");
    var defaults = [
      { icon: "/assets/icons/heart-pulse.svg", title: CONTENT_MAP.ui.heroSafetyMedTitle, desc: CONTENT_MAP.ui.heroSafetyMedDesc },
      { icon: "/assets/icons/shield-check.svg", title: CONTENT_MAP.ui.heroSafetyLockTitle, desc: CONTENT_MAP.ui.heroSafetyLockDesc },
      { icon: "/assets/icons/utensils-crossed.svg", title: CONTENT_MAP.ui.heroSafetyFoodTitle, desc: CONTENT_MAP.ui.heroSafetyFoodDesc },
      { icon: UI_ICON.pool, title: CONTENT_MAP.ui.heroSafetyPoolTitle, desc: CONTENT_MAP.ui.heroSafetyPoolDesc }
    ];
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      var cfg = defaults[i] || defaults[defaults.length - 1];
      var icon = item.querySelector(".ac-icon");
      var strong = item.querySelector("strong");
      var small = item.querySelector("small");
      item.hidden = false;
      item.classList.remove("is-compact-single");
      if (icon && cfg.icon) icon.setAttribute("src", cfg.icon);
      if (strong) strong.textContent = String(cfg.title || "");
      if (small) {
        small.textContent = String(cfg.desc || "");
        small.style.display = "";
      }
    }
  }

  function applyCompactHeroGridContent(heroGrid, compactModel) {
    if (!heroGrid) return;
    var items = heroGrid.querySelectorAll(".ac-hero-grid__item");
    var benefits = (compactModel && compactModel.benefits) ? compactModel.benefits : [];
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      var benefit = benefits[i];
      if (!benefit) {
        item.hidden = true;
        continue;
      }
      var split = splitCompactBenefitText(benefit.text);
      var icon = item.querySelector(".ac-icon");
      var strong = item.querySelector("strong");
      var small = item.querySelector("small");
      item.hidden = false;
      item.classList.toggle("is-compact-single", !split.desc);
      if (icon && benefit.icon) icon.setAttribute("src", benefit.icon);
      if (strong) strong.textContent = split.title;
      if (small) {
        small.textContent = split.desc;
        small.style.display = split.desc ? "" : "none";
      }
    }
  }

  function getHeroSlides() {
    var fallback = "/assets/images/cdn-cache/6b2fa5d1_photo_2024-02-04_171.jpeg";
    var list = [fallback];
    var seen = {};
    seen[fallback] = true;
    var photos = CONTENT_MAP.photos || [];
    for (var i = 0; i < photos.length; i += 1) {
      var src = photos[i] && photos[i].src;
      if (!src || seen[src]) continue;
      seen[src] = true;
      list.push(src);
      if (list.length >= 8) break;
    }
    return list;
  }

  function randomFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  function formatPriceNumber(value) {
    return (Math.round(Number(value) || 0)).toLocaleString("ru-RU") + " ₽";
  }

  function parsePriceValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.round(value));
    }
    var digits = String(value || "").replace(/\D/g, "");
    if (!digits) return 0;
    var parsed = Number(digits);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  }

  function generatePromoCode() {
    return "AIDA-" + String(Math.floor(1000 + Math.random() * 9000));
  }

  function loadShiftPromo() {
    try {
      var raw = localStorage.getItem(SHIFT_PROMO_STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      if (data.status === "active" && Number(data.expiresAt || 0) > 0 && Number(data.expiresAt) <= Date.now()) {
        localStorage.removeItem(SHIFT_PROMO_STORAGE_KEY);
        return null;
      }
      return data;
    } catch (_err) {
      return null;
    }
  }

  function saveShiftPromo(promo) {
    try {
      localStorage.setItem(SHIFT_PROMO_STORAGE_KEY, JSON.stringify(promo));
    } catch (_err) {
      // ignore storage errors
    }
  }

  function getShiftPriceMeta(shift, idx) {
    var fallback = SHIFT_PRICE_META[idx] || SHIFT_PRICE_META[0];
    var finalPrice = fallback.finalPrice;
    var basePrice = Number(fallback.oldPrice || 0);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      basePrice = Math.round(finalPrice * (1 + SHIFT_PRICE_CFG.initialMarkup));
    }
    var totalSeats = 45;
    var seatsLeft = Math.max(0, Number(fallback.seats || 0));
    var reserved = Math.max(0, totalSeats - seatsLeft);
    return {
      date: fallback.date,
      title: fallback.title || "",
      days: fallback.days,
      seats: fallback.seats,
      badge: fallback.badge,
      finalPrice: finalPrice,
      basePrice: basePrice,
      shiftName: getShiftSummaryByAge(shift, state.age),
      monthLabel: fallback.monthLabel || "",
      monthIndex: Number(fallback.monthIndex || 0),
      year: Number(fallback.year || 2026),
      startDay: Number(fallback.startDay || 1),
      endDay: Number(fallback.endDay || 1),
      occupancyPercent: Math.round((reserved / totalSeats) * 100),
      occupancyLine: reserved + " из " + totalSeats + " мест"
    };
  }

  function buildShiftCalendarMarkup(meta, shiftId) {
    var weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    var firstDate = new Date(meta.year, meta.monthIndex, 1);
    var monthWeekday = (firstDate.getDay() + 6) % 7;
    var daysInMonth = new Date(meta.year, meta.monthIndex + 1, 0).getDate();
    var dayCells = "";
    var i;

    for (i = 0; i < monthWeekday; i += 1) {
      dayCells += '<span class="ac-shift-calendar__day ac-shift-calendar__day--empty"></span>';
    }

    for (i = 1; i <= daysInMonth; i += 1) {
      var isInRange = i >= meta.startDay && i <= meta.endDay;
      var isEdge = i === meta.startDay || i === meta.endDay;
      var dayClass = "ac-shift-calendar__day";
      if (isInRange) {
        dayClass += " is-range";
      }
      if (isEdge) {
        dayClass += " is-edge";
      }
      dayCells += '<span class="' + dayClass + '">' + i + "</span>";
    }

    var weekdayCells = "";
    for (i = 0; i < weekdays.length; i += 1) {
      weekdayCells += "<span>" + weekdays[i] + "</span>";
    }

    return (
      '<div class="ac-shift-calendar" data-shift-calendar-root="' + shiftId + '">' +
      '<div class="ac-shift-calendar__head">' +
      '<strong>Календарь смены</strong>' +
      '<button class="ac-shift-calendar__close" type="button" data-action="shift-calendar-close" aria-label="Закрыть календарь">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.close + '" alt="" aria-hidden="true">' +
      "</button>" +
      "</div>" +
      '<div class="ac-shift-calendar__month">' + meta.monthLabel + "</div>" +
      '<div class="ac-shift-calendar__weekdays">' + weekdayCells + "</div>" +
      '<div class="ac-shift-calendar__grid">' + dayCells + "</div>" +
      "</div>"
    );
  }

  function formatPromoTtl(expiresAt) {
    var leftMs = Math.max(0, Number(expiresAt || 0) - Date.now());
    var totalSeconds = Math.floor(leftMs / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function formatPromoDeadline(expiresAt) {
    var ts = Number(expiresAt || 0);
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_err) {
      return "";
    }
  }

  function formatPromoDeadlineLine(expiresAt) {
    return "Действует до " + formatPromoDeadline(expiresAt) + " · осталось " + formatPromoTtl(expiresAt);
  }

  function buildBookingFixedCardMarkup(options) {
    var shiftMeta = options && options.shiftMeta ? options.shiftMeta : null;
    var shiftSummary = options && options.shiftSummary ? String(options.shiftSummary) : "";
    var promo = options && options.promo ? options.promo : null;
    var age = clamp(Number(options && options.age), 7, 14);
    var profile = findProfileByAge(age);
    var ageLabel = profile.min + "-" + profile.max;
    var priceBase = Math.max(0, Number(options && options.priceBase));
    var priceFinal = Math.max(0, Number(options && options.priceFinal));
    var discount = Math.max(0, priceBase - priceFinal);
    var shiftLine = shiftMeta
      ? (shiftMeta.date + " • " + shiftMeta.days + " дн. • " + shiftSummary)
      : shiftSummary;
    var promoCode = promo && promo.code ? String(promo.code) : "—";
    var deadline = promo && promo.expiresAt ? formatPromoDeadlineLine(promo.expiresAt) : "";
    var hidePricing = !!(options && options.hidePricing);

    return (
      '<article class="ac-booking-fixed__card' + (hidePricing ? " is-consent-accepted" : "") + '">' +
      '<button class="ac-booking-fixed__close" type="button" data-action="promo-reset" aria-label="Отказаться от брони">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.close + '" alt="" aria-hidden="true">' +
      "</button>" +
      '<p class="ac-booking-fixed__title">Цена зафиксирована для вас</p>' +
      '<p class="ac-booking-fixed__meta">' + shiftLine + "</p>" +
      '<div class="ac-booking-fixed__grid">' +
      '<div class="ac-booking-fixed__age"><span>Возраст</span><strong>' + ageLabel + "</strong></div>" +
      '<div class="ac-booking-fixed__prices">' +
      '<div class="ac-booking-fixed__price-row"><span>Полная стоимость</span><strong class="is-old">' + formatPriceNumber(priceBase) + "</strong></div>" +
      '<div class="ac-booking-fixed__price-row"><span>Стоимость со скидкой</span><strong>' + formatPriceNumber(priceFinal) + "</strong></div>" +
      '<div class="ac-booking-fixed__price-row"><span>Ваша скидка</span><strong class="is-discount">' + (discount > 0 ? ("− " + formatPriceNumber(discount)) : "—") + "</strong></div>" +
      "</div>" +
      "</div>" +
      '<p class="ac-booking-fixed__promo">Промокод: ' + promoCode + "</p>" +
      (deadline ? ('<p class="ac-booking-fixed__ttl">' + deadline + "</p>") : "") +
      "</article>"
    );
  }

  function syncBookingFixedCardConsentState(consentAccepted) {
    var fixedCard = document.querySelector("#acBookingFixedCard .ac-booking-fixed__card");
    if (!fixedCard) return;
    fixedCard.classList.toggle("is-consent-accepted", !!consentAccepted);
  }

  function getResumePromoContext() {
    var lead = loadBookingLead();
    var leadSubmitted = !!(lead && lead.submitted);

    var promo = loadShiftPromo();
    if (promo && promo.shiftId) {
      var status = String(promo.status || "draft");
      var stage = Number(promo.priceStage || 0);
      if (status !== "active" && stage < 1) {
        promo = null;
      }
    } else {
      promo = null;
    }

    if (promo) {
      var shift = findExactShiftById(promo.shiftId);
      if (shift) {
        var shiftIdx = SHIFTS.indexOf(shift);
        if (shiftIdx >= 0) {
          var meta = getShiftPriceMeta(shift, shiftIdx);
          var basePrice = Number(promo.basePrice || meta.basePrice || 0);
          var finalPrice = Number(promo.finalPrice || basePrice || 0);
          if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
            finalPrice = basePrice;
          }

          var discount = Math.max(0, basePrice - finalPrice);
          var ageValue = clamp(Number(promo.age || state.age || 11), 7, 14);
          var ageProfile = findProfileByAge(ageValue);
          var isActive = String(promo.status || "draft") === "active" && getPromoRemainingMs(promo) > 0;

          return {
            shiftId: shift.id,
            shiftLine: meta.date + " • " + meta.days + " дн. • " + getShiftSummaryByAge(shift, ageValue),
            ageLabel: ageProfile.min + "-" + ageProfile.max,
            basePrice: basePrice,
            finalPrice: finalPrice,
            discount: discount,
            code: String(promo.code || ""),
            isActive: isActive,
            ttlText: isActive ? formatPromoDeadlineLine(promo.expiresAt || 0) : "",
            ctaMode: leadSubmitted ? "" : (isActive ? "booking" : "shift"),
            ctaText: leadSubmitted ? "" : "Продолжить бронирование",
            hintText: leadSubmitted
              ? "Заявка уже отправлена. Ожидайте подтверждение менеджера."
              : (isActive
                  ? "Цена сохранена за вами."
                  : "Вы остановились на подборе цены. Можно продолжить и завершить бронирование."),
            submitted: leadSubmitted
          };
        }
      }
    }

    if (!lead || !lead.shiftId) return null;

    var leadShift = findExactShiftById(String(lead.shiftId));
    if (!leadShift) return null;

    var leadIdx = SHIFTS.indexOf(leadShift);
    if (leadIdx < 0) return null;

    var leadMeta = getShiftPriceMeta(leadShift, leadIdx);
    var leadBasePrice = parsePriceValue(lead.priceBase || leadMeta.basePrice || 0);
    if (!leadBasePrice) leadBasePrice = Number(leadMeta.basePrice || 0);
    var leadFinalPrice = parsePriceValue(lead.priceFinal || lead.priceText || leadBasePrice);
    if (!leadFinalPrice) leadFinalPrice = leadBasePrice;
    if (leadBasePrice > 0 && leadFinalPrice > leadBasePrice) {
      leadFinalPrice = leadBasePrice;
    }
    var leadDiscount = Math.max(0, leadBasePrice - leadFinalPrice);
    var leadAge = clamp(Number(lead.age || state.age || 11), 7, 14);
    var leadProfile = findProfileByAge(leadAge);
    return {
      shiftId: leadShift.id,
      shiftLine: String(lead.shiftText || (leadMeta.date + " • " + leadMeta.days + " дн. • " + getShiftSummaryByAge(leadShift, leadAge))),
      ageLabel: leadProfile.min + "-" + leadProfile.max,
      basePrice: leadBasePrice,
      finalPrice: leadFinalPrice,
      discount: leadDiscount,
      code: String(lead.promoCode || ""),
      isActive: false,
      ttlText: "",
      ctaMode: leadSubmitted ? "" : "booking",
      ctaText: leadSubmitted ? "" : "Продолжить бронирование",
      hintText: leadSubmitted
        ? "Заявка уже отправлена. Ожидайте подтверждение менеджера."
        : "Бронь сохранена. Можно продолжить и завершить оформление.",
      submitted: leadSubmitted
    };
  }

  function buildHeroResumeCardMarkup(context) {
    var basePrice = Number(context && context.basePrice || 0);
    var finalPrice = Number(context && context.finalPrice || 0);
    var discount = Math.max(0, Number(context && context.discount || 0));
    var showPriceGrid = finalPrice > 0;
    var showCta = !context.submitted && !!String(context.ctaText || "");
    return (
      '<article class="ac-booking-fixed__card ac-booking-fixed__card--resume-only">' +
      '<button class="ac-booking-fixed__close" type="button" data-action="promo-reset" aria-label="Сбросить выбранную бронь">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.close + '" alt="" aria-hidden="true">' +
      "</button>" +
      '<p class="ac-booking-fixed__title">' + (context.submitted ? "Ваша бронь сохранена" : "Продолжить бронирование") + "</p>" +
      '<p class="ac-booking-fixed__meta">' + String(context.shiftLine || "") + "</p>" +
      '<div class="ac-booking-fixed__grid ac-booking-fixed__grid--resume">' +
      '<div class="ac-booking-fixed__age"><span>Возраст</span><strong>' + String(context.ageLabel || "") + "</strong></div>" +
      (
        showPriceGrid
          ? (
              '<div class="ac-booking-fixed__prices">' +
              '<div class="ac-booking-fixed__price-row"><span>Полная стоимость</span><strong class="is-old">' + (basePrice > 0 ? formatPriceNumber(basePrice) : "—") + "</strong></div>" +
              '<div class="ac-booking-fixed__price-row"><span>Стоимость со скидкой</span><strong>' + formatPriceNumber(finalPrice) + "</strong></div>" +
              '<div class="ac-booking-fixed__price-row"><span>Ваша скидка</span><strong class="is-discount">' + (discount > 0 ? ("− " + formatPriceNumber(discount)) : "—") + "</strong></div>" +
              "</div>"
            )
          : ""
      ) +
      "</div>" +
      (context.code ? ('<p class="ac-booking-fixed__promo">Промокод: ' + context.code + "</p>") : "") +
      (context.hintText ? ('<p class="ac-booking-fixed__ttl">' + context.hintText + "</p>") : "") +
      (
        showCta
          ? (
              '<button class="ac-primary-btn ac-booking-fixed__cta" type="button" data-action="resume-booking" data-resume-mode="' + context.ctaMode + '">' +
              String(context.ctaText || "Продолжить бронирование") +
              "</button>"
            )
          : ""
      ) +
      "</article>"
    );
  }

  function formatPhoneInput(raw) {
    return String(raw || "").replace(/\D/g, "").slice(0, 11);
  }

  function normalizePhone(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.charAt(0) === "8") {
      digits = "7" + digits.slice(1);
    }
    if (digits.length === 10) {
      digits = "7" + digits;
    }
    return digits.slice(0, 11);
  }

  function isValidPhone(raw) {
    var digits = normalizePhone(raw);
    return digits.length === 11 && digits.charAt(0) === "7";
  }

  function dismissTechBadge() {
    var techBadge = document.getElementById("acTechBadge");
    if (techBadge) {
      techBadge.hidden = true;
    }
    techBadgeDismissedInSession = true;
    try {
      localStorage.setItem(TECH_BADGE_DISMISSED_KEY, "1");
    } catch (_errTechBadge) {
      // ignore storage errors
    }
  }

  function canSubmitBooking(phoneValue, consentChecked, submitted) {
    if (submitted) return false;
    return isValidPhone(phoneValue);
  }

  function getPromoRemainingMs(promo) {
    if (!promo || promo.status !== "active") return 0;
    return Math.max(0, Number(promo.expiresAt || 0) - Date.now());
  }

  function getPriceSearchProgress(promo) {
    if (!promo || promo.status !== "checking_first") return 100;
    var startedAt = Number(promo.checkStartedAt || 0);
    var duration = Math.max(1200, Number(promo.checkDurationMs || SHIFT_PRICE_CFG.checkDurationMs || 4200));
    if (!startedAt) return 0;
    var elapsed = Math.max(0, Date.now() - startedAt);
    return clamp(Math.round((elapsed / duration) * 100), 0, 100);
  }

  function getPriceSearchStatusLine(progress) {
    var safe = clamp(Number(progress) || 0, 0, 100);
    if (safe < 30) return "Проверяем наличие мест";
    if (safe < 65) return "Проверяем предварительное бронирование";
    return "Ищем отказы";
  }

  function stopPromoTicker() {
    if (!promoTicker) return;
    clearInterval(promoTicker);
    promoTicker = null;
  }

  function startPromoTicker() {
    if (promoTicker) return;
    promoTicker = setInterval(function () {
      var promo = loadShiftPromo();
      if (!promo) {
        stopPromoTicker();
        return;
      }
      if (promo.status === "checking_first") {
        if (!state.overlays.shifts) {
          stopPromoTicker();
          return;
        }
        renderOverlays();
        return;
      }
      if (promo.status !== "active") {
        stopPromoTicker();
        return;
      }
      if (getPromoRemainingMs(promo) <= 0) {
        try {
          localStorage.removeItem(SHIFT_PROMO_STORAGE_KEY);
        } catch (_err) {
          // ignore storage errors
        }
        stopPromoTicker();
        renderInfoCard();
        renderOverlays();
        return;
      }
      if (state.overlays.shifts) {
        var ttlText = "Действует: " + formatPromoTtl(promo.expiresAt || 0);
        var ttlNodes = document.querySelectorAll(".ac-shift-item__promo-ttl");
        for (var i = 0; i < ttlNodes.length; i += 1) {
          var node = ttlNodes[i];
          if (!node) continue;
          if (String(node.textContent || "").indexOf("Действует:") !== 0) continue;
          node.textContent = ttlText;
        }
      }

      var pinnedTtlNodes = document.querySelectorAll(".ac-promo-pinned__ttl");
      for (var j = 0; j < pinnedTtlNodes.length; j += 1) {
        var pinnedNode = pinnedTtlNodes[j];
        if (!pinnedNode) continue;
        pinnedNode.textContent = formatPromoDeadlineLine(promo.expiresAt || 0);
      }

      var bookingTtlNodes = document.querySelectorAll(".ac-booking-fixed__ttl");
      for (var k = 0; k < bookingTtlNodes.length; k += 1) {
        var bookingNode = bookingTtlNodes[k];
        if (!bookingNode) continue;
        if (String(bookingNode.textContent || "").indexOf("Действует до") !== 0) continue;
        bookingNode.textContent = formatPromoDeadlineLine(promo.expiresAt || 0);
      }
    }, 250);
  }

  function getShiftPromoView(shiftId, meta) {
    var promo = loadShiftPromo();
    if (!promo || promo.shiftId !== shiftId) {
      return {
        stage: 0,
        status: "draft",
        price: meta.basePrice,
        oldPrice: "",
        code: "",
        actionText: "Показать мою цену",
        metaText: "Нажмите — найдём персональную цену",
        pendingPhone: ""
      };
    }

    var stage = Number(promo.priceStage || 0);
    var status = String(promo.status || "draft");
    var price = Number(promo.finalPrice || meta.basePrice);
    var oldPrice = stage > 0 ? formatPriceNumber(meta.basePrice) : "";

    if (status === "checking_first") {
      var searchProgress = getPriceSearchProgress(promo);
      if (searchProgress >= 100) {
        promo.status = "draft";
        promo.priceStage = Math.max(1, Number(promo.priceStage || 1));
        promo.finalPrice = Number(promo.nextPrice || promo.finalPrice || meta.basePrice);
        promo.code = String(promo.code || generatePromoCode());
        promo.checkStartedAt = 0;
        promo.checkDurationMs = 0;
        promo.nextPrice = 0;
        saveShiftPromo(promo);

        var shiftForSnapshot = findShiftById(shiftId);
        var leadAfterSearch = loadBookingLead() || {};
        if (shiftForSnapshot && !leadAfterSearch.submitted) {
          var baseAfterSearch = Number(meta.basePrice || 0);
          var finalAfterSearch = Number(promo.finalPrice || baseAfterSearch);
          if (!Number.isFinite(finalAfterSearch) || finalAfterSearch <= 0) {
            finalAfterSearch = baseAfterSearch;
          }
          if (finalAfterSearch > baseAfterSearch && baseAfterSearch > 0) {
            finalAfterSearch = baseAfterSearch;
          }
          var discountAfterSearch = Math.max(0, baseAfterSearch - finalAfterSearch);
          saveBookingLead({
            name: String(leadAfterSearch.name || ""),
            phone: String(leadAfterSearch.phone || ""),
            shiftId: shiftForSnapshot.id,
            shiftText: meta.date + " • " + meta.days + " дн. • " + getShiftSummaryByAge(shiftForSnapshot, state.age),
            priceText: formatPriceNumber(finalAfterSearch),
            priceBase: baseAfterSearch,
            priceFinal: finalAfterSearch,
            discountText: discountAfterSearch > 0 ? ("− " + formatPriceNumber(discountAfterSearch)) : "—",
            discountValue: discountAfterSearch,
            promoCode: String(promo.code || ""),
            consent: !!leadAfterSearch.consent,
            submitted: false,
            submittedAt: 0,
            age: state.age,
            expiresAt: Number(leadAfterSearch.expiresAt || 0)
          });
        }

        stage = Number(promo.priceStage || 1);
        status = String(promo.status || "draft");
        price = Number(promo.finalPrice || meta.basePrice);
        oldPrice = stage > 0 ? formatPriceNumber(meta.basePrice) : "";
      } else {
        return {
          stage: 0,
          status: status,
          price: Number(meta.basePrice || 0),
          oldPrice: "",
          code: String(promo.code || ""),
          actionText: "Ищем лучшую цену...",
          actionDisabled: true,
          metaText: "",
          searchProgress: searchProgress,
          pendingPhone: ""
        };
      }
    }

    if (status === "phone_gate") {
      return {
        stage: stage,
        status: status,
        price: price,
        oldPrice: oldPrice,
        code: String(promo.code || ""),
        actionText: "Зафиксировать цену",
        metaText: "Введите телефон и зафиксируйте, пожалуйста, цену.",
        pendingPhone: String(promo.pendingPhone || ""),
        promoTtl: "Будет рассчитано после фиксации"
      };
    }

    if (status === "active") {
      return {
        stage: stage,
        status: status,
        price: price,
        oldPrice: oldPrice,
        code: String(promo.code || ""),
        actionText: "Получить новую цену",
        metaText: "Текущая цена зафиксирована. Можно пересчитать заново.",
        promoTtl: formatPromoTtl(promo.expiresAt || 0),
        deadlineText: formatPromoDeadlineLine(promo.expiresAt || 0),
        pendingPhone: String(promo.phone || "")
      };
    }

    if (stage >= 2) {
      return {
        stage: stage,
        status: status,
        price: price,
        oldPrice: oldPrice,
        code: String(promo.code || ""),
        actionText: "Зафиксировать цену на 72 ч",
        metaText: "Найдена лучшая цена",
        promoTtl: "Активируется после фиксации",
        pendingPhone: String(promo.pendingPhone || "")
      };
    }

    if (stage === 1) {
      return {
        stage: stage,
        status: status,
        price: price,
        oldPrice: oldPrice,
        code: String(promo.code || ""),
        actionText: "Ой! Можно улучшить цену ещё раз",
        metaText: "Найдена персональная цена",
        pendingPhone: ""
      };
    }

    return {
      stage: 0,
      status: "draft",
      price: meta.basePrice,
      oldPrice: "",
      code: "",
      actionText: "Показать мою цену",
      metaText: "Нажмите — найдём персональную цену",
      pendingPhone: ""
    };
  }

  function applyShiftPriceStep(shiftId) {
    var shift = findShiftById(shiftId);
    var idx = SHIFTS.indexOf(shift);
    if (!shift || idx < 0) return;

    var meta = getShiftPriceMeta(shift, idx);
    var promo = loadShiftPromo();
    var same = promo && promo.shiftId === shiftId;
    var stage = same ? Number(promo.priceStage || 0) : 0;
    var status = same ? String(promo.status || "draft") : "draft";
    var isRestartingFromActive = same && status === "active";

    if (status === "phone_gate" || status === "checking_first") {
      renderOverlays();
      return;
    }

    if (isRestartingFromActive) {
      same = false;
      stage = 0;
      status = "draft";
      try {
        localStorage.removeItem(BOOKING_LEAD_STORAGE_KEY);
      } catch (_errBookingReset) {
        // ignore storage errors
      }
    }

    var nextPromo = {
      shiftId: shift.id,
      shiftName: getShiftSummaryByAge(shift, state.age),
      age: clamp(Number((same && promo && promo.age) || state.age || 11), 7, 14),
      basePrice: meta.basePrice,
      finalPrice: same ? Number(promo.finalPrice || meta.basePrice) : meta.basePrice,
      code: same && promo.code ? String(promo.code) : generatePromoCode(),
      priceStage: same ? stage : 0,
      status: "draft",
      pendingPhone: same && promo.pendingPhone ? String(promo.pendingPhone) : "",
      phone: same && promo.phone ? String(promo.phone) : "",
      createdAt: same && promo.createdAt ? Number(promo.createdAt) : Date.now(),
      activatedAt: null,
      expiresAt: null
    };

    if (stage <= 0) {
      var firstDisc = randomFloat(SHIFT_PRICE_CFG.firstDiscMin, SHIFT_PRICE_CFG.firstDiscMax);
      nextPromo.finalPrice = meta.basePrice;
      nextPromo.nextPrice = Math.round(meta.finalPrice * (1 - firstDisc));
      nextPromo.priceStage = 0;
      nextPromo.status = "checking_first";
      nextPromo.checkStartedAt = Date.now();
      nextPromo.checkDurationMs = Number(SHIFT_PRICE_CFG.checkDurationMs || 4200);
    } else if (stage === 1) {
      var secondDisc = randomFloat(SHIFT_PRICE_CFG.secondDiscMin, SHIFT_PRICE_CFG.secondDiscMax);
      nextPromo.finalPrice = Math.max(
        Math.round(Number(nextPromo.finalPrice) * (1 - secondDisc)),
        Math.round(meta.finalPrice * 0.88)
      );
      nextPromo.priceStage = 2;
      nextPromo.status = "phone_gate";
      nextPromo.activatedAt = null;
      nextPromo.expiresAt = null;
    } else {
      // Legacy fallback for older saved states.
      nextPromo.priceStage = 2;
      nextPromo.status = "phone_gate";
      nextPromo.activatedAt = null;
      nextPromo.expiresAt = null;
    }

    saveShiftPromo(nextPromo);
    state.selectedShiftId = shift.id;
    state.direction = shift.direction;
    renderOverlays();
    if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
      auditRuntime.stageSync();
    }
  }

  function finalizeShiftPromo(shiftId, rawPhone) {
    var shift = findShiftById(shiftId);
    var idx = SHIFTS.indexOf(shift);
    if (!shift || idx < 0) return false;

    var promo = loadShiftPromo();
    if (!promo || promo.shiftId !== shiftId) return false;

    var normalizedPhone = normalizePhone(rawPhone);
    if (!isValidPhone(normalizedPhone)) return false;

    var meta = getShiftPriceMeta(shift, idx);
    var nowTs = Date.now();
    promo.status = "active";
    promo.priceStage = Math.max(2, Number(promo.priceStage || 2));
    promo.pendingPhone = normalizedPhone;
    promo.phone = normalizedPhone;
    promo.activatedAt = nowTs;
    promo.expiresAt = nowTs + SHIFT_PRICE_CFG.holdHours * 3600000;
    promo.finalPrice = Number(promo.finalPrice || meta.finalPrice || meta.basePrice);
    saveShiftPromo(promo);

    saveBookingLead({
      name: "",
      phone: normalizedPhone,
      shiftId: shift.id,
      shiftText: meta.date + " • " + meta.days + " дн. • " + getShiftSummaryByAge(shift, state.age),
      promoCode: String(promo.code || ""),
      submitted: false,
      submittedAt: 0
    });

    sendLeadNotification("promo_fixed", {
      lead_type: "pre_fixation_72h",
      status: "preliminary",
      phone: normalizedPhone,
      shift_id: shift.id,
      shift_name: getShiftSummaryByAge(shift, state.age),
      shift_direction: shift.direction || "",
      shift_date: meta.date,
      shift_days: meta.days,
      price_final: promo.finalPrice,
      promo_code: String(promo.code || ""),
      promo_expires_at_ts: Number(promo.expiresAt || 0),
      promo_expires_at_local: formatPromoDeadline(promo.expiresAt || 0)
    });

    state.selectedShiftId = shift.id;
    state.direction = shift.direction;
    setOverlay("shifts", false);
    setStep(SHIFTS.length - 1);
    return true;
  }

  function persistShiftSelectionSnapshot() {
    if (!ageSelectionConfirmed) return null;

    var shift = findShiftById(state.selectedShiftId);
    var idx = SHIFTS.indexOf(shift);
    if (!shift || idx < 0) return null;

    var lead = loadBookingLead() || {};
    if (lead.submitted) return null;

    var meta = getShiftPriceMeta(shift, idx);
    var promo = loadShiftPromo();
    var samePromo = !!(promo && promo.shiftId === shift.id);

    var basePrice = Number(meta.basePrice || 0);
    var finalPrice = samePromo ? Number(promo.finalPrice || basePrice) : basePrice;
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      finalPrice = basePrice;
    }
    if (finalPrice > basePrice && basePrice > 0) {
      finalPrice = basePrice;
    }
    var discount = Math.max(0, basePrice - finalPrice);

    var snapshot = {
      name: String(lead.name || ""),
      phone: String(lead.phone || ""),
      shiftId: shift.id,
      shiftText: meta.date + " • " + meta.days + " дн. • " + getShiftSummaryByAge(shift, state.age),
      priceText: formatPriceNumber(finalPrice),
      priceBase: basePrice,
      priceFinal: finalPrice,
      discountText: discount > 0 ? ("− " + formatPriceNumber(discount)) : "—",
      discountValue: discount,
      promoCode: samePromo && promo.code ? String(promo.code) : "",
      consent: !!lead.consent,
      submitted: false,
      submittedAt: 0,
      age: state.age,
      expiresAt: samePromo ? Number(promo.expiresAt || 0) : 0
    };
    saveBookingLead(snapshot);
    return snapshot;
  }

  function stopHeroSlideshow() {
    if (!heroSlideTimer) return;
    clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }

  function startHeroSlideshow() {
    var baseLayer = document.querySelector(".ac-hero-right__bg--base");
    var fadeLayer = document.querySelector(".ac-hero-right__bg--fade");
    var singleLayer = document.querySelector(".ac-hero-right__bg");
    if ((!baseLayer || !fadeLayer) && !singleLayer) return;

    var slides = getHeroSlides();
    if (!slides.length) return;

    heroSlideIndex = clamp(heroSlideIndex, 0, slides.length - 1);
    if (baseLayer && fadeLayer) {
      baseLayer.style.backgroundImage = 'url("' + slides[heroSlideIndex] + '")';
      fadeLayer.style.backgroundImage = "";
      fadeLayer.classList.remove("is-active");
    } else if (singleLayer) {
      singleLayer.style.backgroundImage = 'url("' + slides[heroSlideIndex] + '")';
    }

    if (slides.length < 2) return;
    stopHeroSlideshow();

    if (baseLayer && fadeLayer) {
      if (!fadeLayer.dataset.crossfadeBound) {
        fadeLayer.addEventListener("transitionend", function (event) {
          if (event.propertyName !== "opacity") return;
          if (!fadeLayer.classList.contains("is-active")) return;
          baseLayer.style.backgroundImage = fadeLayer.style.backgroundImage;
          fadeLayer.classList.remove("is-active");
        });
        fadeLayer.dataset.crossfadeBound = "1";
      }

      heroSlideTimer = window.setInterval(function () {
        var nextIndex = (heroSlideIndex + 1) % slides.length;
        fadeLayer.style.backgroundImage = 'url("' + slides[nextIndex] + '")';
        fadeLayer.classList.add("is-active");
        heroSlideIndex = nextIndex;
      }, HERO_SLIDE_INTERVAL_MS);
      return;
    }

    heroSlideTimer = window.setInterval(function () {
      var nextIndex = (heroSlideIndex + 1) % slides.length;
      if (singleLayer) {
        singleLayer.style.backgroundImage = 'url("' + slides[nextIndex] + '")';
      }
      heroSlideIndex = nextIndex;
    }, HERO_SLIDE_INTERVAL_MS);
  }
  function hasTab(tabKey) {
    for (var i = 0; i < TABS.length; i += 1) {
      if (TABS[i].key === tabKey) {
        return true;
      }
    }
    return false;
  }

  function setMode(mode) {
    var safeMode = typeof coreState.validateMode === "function" ? coreState.validateMode(mode) : mode;
    if (safeMode !== "compact" && safeMode !== "full") return;
    if (state.mode === safeMode) return;

    state.mode = safeMode;
    persistMode(safeMode);

    renderLayout();
    renderMenu();
    renderInfoCard();
    renderFunnel();
    renderSections();

    track("mode_changed", {
      mode: state.mode
    });

    if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
      auditRuntime.stageSync();
    }
  }

  function setActiveTab(tabKey) {
    if (!hasTab(tabKey) || tabKey === state.activeTab) return;

    state.activeTab = tabKey;

    renderMenu();
    renderInfoCard();
    renderFunnel();
    renderSections();

    track("tab_changed", {
      tab: state.activeTab,
      mode: state.mode
    });

    if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
      auditRuntime.stageSync();
    }
  }

  function applyStepTransition(nextStep, withFunnelStartTracking) {
    var prevStep = state.step;
    var safeStep = clamp(nextStep, 0, SHIFTS.length - 1);
    if (safeStep === state.step) return false;

    state.step = safeStep;
    var shift = getCurrentShift();
    if (safeStep === SHIFTS.length - 1) {
      var promoForBooking = loadShiftPromo();
      if (promoForBooking && promoForBooking.status === "active") {
        var promoShift = findShiftById(promoForBooking.shiftId);
        if (promoShift) {
          shift = promoShift;
        }
      } else {
        var selectedForBooking = findShiftById(state.selectedShiftId);
        var selectedIdx = SHIFTS.indexOf(selectedForBooking);
        if (selectedForBooking && selectedIdx >= 0 && selectedIdx < SHIFT_PRICE_META.length) {
          shift = selectedForBooking;
        } else {
          var leadForBooking = loadBookingLead();
          if (leadForBooking && leadForBooking.shiftId) {
            var leadShift = findExactShiftById(String(leadForBooking.shiftId));
            var leadIdx = SHIFTS.indexOf(leadShift);
            if (leadShift && leadIdx >= 0 && leadIdx < SHIFT_PRICE_META.length) {
              shift = leadShift;
            }
          }
        }
      }
    }
    state.selectedShiftId = shift.id;
    state.direction = shift.direction;

    renderInfoCard();
    renderFunnel();

    if (withFunnelStartTracking && prevStep === 0 && safeStep > 0) {
      track("funnel_started", {
        from_step: prevStep + 1,
        to_step: safeStep + 1,
        mode: state.mode
      });
    }

    track("step_changed", {
      step: state.step + 1,
      total_steps: SHIFTS.length,
      direction: state.direction,
      shift_id: state.selectedShiftId
    });

    return true;
  }

  function setStep(nextStep) {
    var changed = applyStepTransition(nextStep, true);
    if (changed && auditRuntime.active && typeof auditRuntime.stageSync === "function") {
      auditRuntime.stageSync();
    }
  }

  function setAge(nextAge) {
    if (!Number.isFinite(nextAge) || nextAge < 7) {
      resetAgeSelection();
      return;
    }

    var wasLocked = isAgeGateLocked();
    var safeAge = typeof coreState.validateAge === "function"
      ? coreState.validateAge(nextAge)
      : clamp(nextAge, 7, 14);
    if (safeAge === state.age && !wasLocked) return;

    state.age = safeAge;
    ageSelectionConfirmed = true;
    ageGateNudge = false;
    persistAge(safeAge);
    if (auditRuntime.active) {
      auditRuntime.ageSelected = true;
    }

    renderInfoCard();
    renderFunnel();
    if (state.overlays.shifts) {
      renderOverlays();
    }

    track("age_selected", {
      age: state.age,
      profile_id: findProfileByAge(state.age).id
    });

    if (wasLocked && state.step === 0) {
      applyStepTransition(1, true);
    }

    if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
      auditRuntime.stageSync();
    }
  }

  function resetAgeSelection() {
    ageSelectionConfirmed = false;
    ageGateNudge = false;
    state.age = 11;
    state.step = 0;
    state.selectedShiftId = initialShift.id;
    state.direction = initialShift.direction;
    shiftsShowAll = false;
    shiftCalendar.open = false;
    shiftCalendar.shiftId = "";

    try {
      localStorage.removeItem(AGE_KEY);
    } catch (_errAgeReset) {
      // ignore storage errors
    }

    if (auditRuntime.active) {
      auditRuntime.ageSelected = false;
    }

    closeAllOverlays();
    renderInfoCard();
    renderFunnel();

    if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
      auditRuntime.stageSync();
    }
  }

  function setShiftView(view) {
    if (view !== "list" && view !== "grid") return;
    if (state.shiftView === view) return;

    state.shiftView = view;

    renderOverlays();

    track("shift_view_changed", {
      shift_view: state.shiftView
    });
  }

  function setSelectedShift(shiftId) {
    var shift = findShiftById(shiftId);
    var targetStep = SHIFTS.indexOf(shift);
    var changed = false;

    if (state.selectedShiftId !== shift.id) {
      state.selectedShiftId = shift.id;
      state.direction = shift.direction;
      shiftCalendar.open = false;
      shiftCalendar.shiftId = "";
      changed = true;
    }

    if (targetStep !== state.step) {
      applyStepTransition(targetStep, false);
      changed = true;
    }

    if (!changed) return;

    renderOverlays();

    track("shift_selected", {
      shift_id: state.selectedShiftId,
      direction: state.direction,
      step: state.step + 1
    });

    if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
      auditRuntime.stageSync();
    }
  }

  function setDirection(directionId) {
    if (state.direction === directionId) return;

    state.direction = directionId;
    shiftsShowAll = false;

    renderOverlays();

    track("direction_selected", {
      direction: state.direction
    });

    if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
      auditRuntime.stageSync();
    }
  }

  function setOverlay(name, isOpen) {
    if (!hasOwn(state.overlays, name)) return;

    var changed = false;

    if (isOpen) {
      if (name === "shifts") {
        shiftsShowAll = false;
        var promo = loadShiftPromo();
        if (promo && promo.shiftId) {
          var promoShift = findExactShiftById(promo.shiftId);
          if (promoShift) {
            state.selectedShiftId = promoShift.id;
            state.direction = promoShift.direction;
          }
        }
        if (state.direction !== "all") {
          state.direction = "all";
        }
      }
      if (state.photoLightboxIndex >= 0) {
        state.photoLightboxIndex = -1;
        changed = true;
      }
      if (state.videoLightboxIndex >= 0) {
        state.videoLightboxIndex = -1;
        changed = true;
      }
      for (var key in state.overlays) {
        if (!hasOwn(state.overlays, key)) continue;
        if (state.overlays[key]) {
          state.overlays[key] = false;
          changed = true;
        }
      }
    }

    if (state.overlays[name] !== isOpen) {
      state.overlays[name] = isOpen;
      changed = true;
    }

    if (changed) {
      if (name === "contact") {
        if (!isOpen) {
          clearContactCloseTimer();
        }
        renderLayout();
      }

      renderOverlays();

      if (name === "shifts" && isOpen) {
        track("booking_opened", {
          step: state.step + 1,
          shift_id: state.selectedShiftId,
          direction: state.direction
        });
      }

      if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
        auditRuntime.stageSync();
      }
    }
  }

  function closeAllOverlays() {
    var changed = false;
    var hadShiftsOverlay = !!state.overlays.shifts;
    var draftLead = null;
    shiftCalendar.open = false;
    shiftCalendar.shiftId = "";

    if (state.photoLightboxIndex >= 0) {
      state.photoLightboxIndex = -1;
      changed = true;
    }
    if (state.videoLightboxIndex >= 0) {
      state.videoLightboxIndex = -1;
      changed = true;
    }

    for (var key in state.overlays) {
      if (!hasOwn(state.overlays, key)) continue;
      if (state.overlays[key]) {
        state.overlays[key] = false;
        changed = true;
      }
    }

    if (changed) {
      if (hadShiftsOverlay) {
        draftLead = persistShiftSelectionSnapshot();
      }
      clearContactCloseTimer();
      renderLayout();
      renderOverlays();
      if (hadShiftsOverlay && draftLead && !draftLead.submitted) {
        var draftShift = draftLead.shiftId ? findExactShiftById(String(draftLead.shiftId)) : null;
        var draftShiftIdx = draftShift ? SHIFTS.indexOf(draftShift) : -1;
        var draftShiftMeta = draftShiftIdx >= 0 ? getShiftPriceMeta(draftShift, draftShiftIdx) : null;
        sendLeadNotification("booking_draft_saved", {
          lead_type: "booking_draft",
          status: "draft",
          phone: String(draftLead.phone || ""),
          name: String(draftLead.name || ""),
          shift_id: String(draftLead.shiftId || ""),
          shift_text: String(draftLead.shiftText || ""),
          shift_date: draftShiftMeta ? String(draftShiftMeta.date || "") : "",
          shift_days: draftShiftMeta ? Number(draftShiftMeta.days || 0) : 0,
          price_text: String(draftLead.priceText || ""),
          price_base: Number(draftLead.priceBase || 0),
          price_final: Number(draftLead.priceFinal || 0),
          discount_value: Number(draftLead.discountValue || 0),
          promo_code: String(draftLead.promoCode || ""),
          age: Number(draftLead.age || state.age || 0),
          source: "overlay_close"
        });
      }
      if (hadShiftsOverlay && ageSelectionConfirmed) {
        applyStepTransition(SHIFTS.length - 1, false);
        return;
      }
      renderFunnel();

      if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
        auditRuntime.stageSync();
      }
    }
  }

  function clearContactCloseTimer() {
    if (!contactCloseTimer) return;
    clearTimeout(contactCloseTimer);
    contactCloseTimer = null;
  }

  function scheduleContactCloseTimer() {
    clearContactCloseTimer();
    contactCloseTimer = setTimeout(function () {
      contactCloseTimer = null;
      if (!state.overlays.contact) return;
      state.overlays.contact = false;
      renderLayout();
    }, CONTACT_AUTO_CLOSE_MS);
  }

  function setupContactDropdown() {
    var panel = document.getElementById("acContactPanel");
    if (!panel || panel.dataset.bound === "1") return;
    panel.dataset.bound = "1";

    panel.addEventListener("mouseenter", function () {
      clearContactCloseTimer();
    });

    panel.addEventListener("mouseleave", function () {
      if (!state.overlays.contact) return;
      scheduleContactCloseTimer();
    });
  }

  function setPhotoCategory(categoryId) {
    var exists = false;
    for (var i = 0; i < CONTENT_MAP.photoCategories.length; i += 1) {
      if (CONTENT_MAP.photoCategories[i].id === categoryId) {
        exists = true;
        break;
      }
    }
    if (!exists || state.photoCategory === categoryId) return;

    state.photoCategory = categoryId;
    state.photoPage = 0;
    renderSections();
    renderInfoCard();
  }

  function setPhotoPage(nextPage) {
    var items = getFilteredPhotos();
    var maxPage = Math.max(0, Math.ceil(items.length / getMediaPageSize("photo")) - 1);
    var safePage = clamp(nextPage, 0, maxPage);
    if (safePage === state.photoPage) return;

    mediaSwapDir.photo = safePage > state.photoPage ? 1 : -1;
    state.photoPage = safePage;
    renderSections();
    mediaSwapDir.photo = 0;
  }

  function setPhotoLightbox(index) {
    if (index < 0) {
      state.photoLightboxIndex = -1;
      renderOverlays();
      return;
    }

    var items = getFilteredPhotos();
    if (!items.length) return;

    var safeIndex = clamp(index, 0, items.length - 1);
    if (state.photoLightboxIndex === safeIndex) return;
    state.photoLightboxIndex = safeIndex;
    renderOverlays();
  }

  function setVideoLightbox(index) {
    if (index < 0) {
      state.videoLightboxIndex = -1;
      renderOverlays();
      return;
    }

    var items = CONTENT_MAP.videos || [];
    if (!items.length) return;

    var safeIndex = clamp(index, 0, items.length - 1);
    if (state.videoLightboxIndex === safeIndex) return;
    state.videoLightboxIndex = safeIndex;
    renderOverlays();
  }

  function isMobileMediaLayout() {
    return window.innerWidth <= 980;
  }

  function getMediaPageSize(kind) {
    if (!isMobileMediaLayout()) {
      if (kind === "photo") return 4;
      if (kind === "video") return 3;
      if (kind === "review") return 4;
      if (kind === "team") return 4;
      return 4;
    }
    return 1;
  }

  function getCompactVideoPageSize() {
    return window.innerWidth <= 980 ? 1 : 2;
  }

  function getCompactReviewPageSize() {
    return window.innerWidth <= 980 ? 1 : 3;
  }

  function getCompactTeamPageSize() {
    return window.innerWidth <= 980 ? 1 : 3;
  }

  function setVideoPage(nextPage) {
    var perPage = (state.mode === "compact" && state.activeTab === "video")
      ? getCompactVideoPageSize()
      : getMediaPageSize("video");
    var maxPage = Math.max(0, Math.ceil(CONTENT_MAP.videos.length / perPage) - 1);
    var safePage = clamp(nextPage, 0, maxPage);
    if (safePage === state.videoPage) return;

    mediaSwapDir.video = safePage > state.videoPage ? 1 : -1;
    state.videoPage = safePage;
    renderSections();
    renderInfoCard();
    mediaSwapDir.video = 0;
  }

  function setReviewPage(nextPage) {
    var perPage = (state.mode === "compact" && state.activeTab === "reviews")
      ? getCompactReviewPageSize()
      : getMediaPageSize("review");
    var maxPage = Math.max(0, Math.ceil(CONTENT_MAP.reviews.length / perPage) - 1);
    var safePage = clamp(nextPage, 0, maxPage);
    if (safePage === state.reviewPage) return;

    mediaSwapDir.review = safePage > state.reviewPage ? 1 : -1;
    state.reviewPage = safePage;
    renderSections();
    renderInfoCard();
    mediaSwapDir.review = 0;
  }

  function setTeamPage(nextPage) {
    var perPage = (state.mode === "compact" && state.activeTab === "team")
      ? getCompactTeamPageSize()
      : getMediaPageSize("team");
    var maxPage = Math.max(0, Math.ceil(CONTENT_MAP.team.length / perPage) - 1);
    var safePage = clamp(nextPage, 0, maxPage);
    if (safePage === state.teamPage) return;

    mediaSwapDir.team = safePage > state.teamPage ? 1 : -1;
    state.teamPage = safePage;
    renderSections();
    renderInfoCard();
    mediaSwapDir.team = 0;
  }

  function mediaSwapClass(kind) {
    var dir = Number(mediaSwapDir[kind] || 0);
    if (!dir) return "";
    var className = " ac-page-swap " + (dir > 0 ? "ac-page-swap--next" : "ac-page-swap--prev");
    if (kind === "review") {
      className += " ac-page-swap--reviews";
    }
    return className;
  }

  function setFaqCategory(categoryId) {
    var faqItems = CONTENT_MAP.faqItems || {};
    if (!hasOwn(faqItems, categoryId) || state.faqCategory === categoryId) return;

    state.faqCategory = categoryId;
    renderSections();
    renderInfoCard();
  }

  function renderLayout() {
    var body = document.body;
    var toggle = document.getElementById("acViewToggle");
    var contactPanel = document.getElementById("acContactPanel");
    var contactButton = document.getElementById("acContactButton");
    var contactMenu = document.getElementById("acContactMenu");
    var isContactOpen = !!state.overlays.contact;

    if (body) {
      body.setAttribute("data-mode", state.mode);
    }

    if (toggle) {
      toggle.setAttribute("aria-pressed", String(state.mode === "full"));
    }

    if (contactPanel) {
      contactPanel.classList.toggle("is-open", isContactOpen);
    }
    if (contactButton) {
      contactButton.setAttribute("aria-expanded", String(isContactOpen));
    }
    if (contactMenu) {
      contactMenu.hidden = !isContactOpen;
    }
  }

  function buildMenuItems(variant) {
    var items = "";

    for (var i = 0; i < TABS.length; i += 1) {
      var tab = TABS[i];
      var isActive = tab.key === state.activeTab;
      var activeClass = isActive ? " is-active" : "";
      var iconSrc = getMenuIcon(tab.key, tab.icon);

      if (variant === "compact") {
        items +=
          '<a class="ac-menu-item--compact' +
          activeClass +
          '" href="' +
          tab.href +
          '" data-action="tab" data-tab="' +
          tab.key +
          '" title="' +
          tab.label +
          '" aria-label="' +
          tab.label +
          '">' +
          '<img class="ac-icon" src="' +
          iconSrc +
          '" alt="" aria-hidden="true">' +
          "</a>";
      } else {
        items +=
          '<a class="ac-menu-item--full' +
          activeClass +
          '" href="' +
          tab.href +
          '" data-action="tab" data-tab="' +
          tab.key +
          '">' +
          '<img class="ac-icon ac-icon--sm" src="' +
          iconSrc +
          '" alt="" aria-hidden="true">' +
          "<span>" +
          tab.label +
          "</span>" +
          "</a>";
      }
    }

    var toggleMarkup =
      '<button id="acViewToggle" class="ac-mode-toggle" type="button" data-action="toggle-mode" aria-label="Режим просмотра" aria-pressed="' +
      String(state.mode === "full") +
      '">' +
      '<span class="ac-mode-toggle__track" aria-hidden="true"><span class="ac-mode-toggle__thumb"></span></span>' +
      '<span class="ac-mode-toggle__label">' +
      CONTENT_MAP.ui.modeFullLabel +
      "</span>" +
      "</button>";

    return (
      '<div class="ac-menu-shell ac-menu-shell--' +
      variant +
      '">' +
      '<div class="ac-menu ac-menu--' +
      variant +
      '">' +
      items +
      toggleMarkup +
      "</div>" +
      "</div>"
    );
  }

  function renderMenu() {
    var topNav = document.getElementById("acTopNav");
    var compactNav = document.getElementById("acCompactNav");

    if (!topNav || !compactNav) return;
    topNav.innerHTML = '<div class="ac-container">' + buildMenuItems("full") + "</div>";
    compactNav.innerHTML = "";
  }

  function renderInfoCard() {
    var profile = findProfileByAge(state.age);
    var compactModel = getCompactTabModel(profile);
    var heroBenefits = compactModel && compactModel.benefits && compactModel.benefits.length ? compactModel.benefits : getHeroBenefits();
    var showAgeBlock = !(state.mode === "compact" && state.activeTab !== "info");
    var isCompactAiTab = state.mode === "compact" && state.activeTab === "aiprogram";
    var isCompactPhotoTab = state.mode === "compact" && state.activeTab === "photo";
    var isCompactVideoTab = state.mode === "compact" && state.activeTab === "video";
    var isCompactFaqTab = state.mode === "compact" && state.activeTab === "faq";
    var isCompactReviewsTab = state.mode === "compact" && state.activeTab === "reviews";
    var isCompactTeamTab = state.mode === "compact" && state.activeTab === "team";
    var isCompactCustomCard = isCompactAiTab || isCompactPhotoTab || isCompactVideoTab || isCompactFaqTab || isCompactReviewsTab || isCompactTeamTab;

    var title = document.getElementById("acHeroTitle");
    var subtitle = document.getElementById("acHeroSubtitle");
    var progress = document.getElementById("acHeroProgress");
    var benefits = document.getElementById("acHeroBenefits");
    var ageLabel = document.getElementById("acAgeLabel");
    var ageText = document.getElementById("acAgeText");
    var ageInput = document.getElementById("acAgeInput");
    var ageReset = document.getElementById("acAgeReset");
    var ageBlock = document.querySelector(".ac-age-block");
    var promoPinned = document.getElementById("acPromoPinned");
    var heroBenefitsRow = document.querySelector(".ac-hero-benefits-row");
    var heroMotto = document.querySelector(".ac-hero-motto");

    if (title) {
      title.textContent = compactModel && compactModel.title ? compactModel.title : profile.title;
      title.style.display = isCompactCustomCard ? "none" : "";
    }
    if (subtitle) {
      subtitle.textContent = compactModel && compactModel.subtitle ? compactModel.subtitle : HERO_SUBTITLE_STATIC;
      subtitle.style.display = isCompactCustomCard ? "none" : "";
    }
    if (progress) {
      var progressText = compactModel ? String(compactModel.progress || "") : profile.progress;
      if (compactModel || isCompactCustomCard) {
        progress.textContent = "";
        progress.style.display = "none";
      } else {
        if (compactModel && compactModel.progressLink && progressText) {
          progress.innerHTML =
            '<a class="ac-reviews-yandex-link" href="' +
            compactModel.progressLink +
            '" target="_blank" rel="noopener">' +
            progressText +
            "</a>";
        } else {
          progress.textContent = progressText;
        }
        progress.style.display = progressText ? "" : "none";
      }
    }
    if (ageText) {
      ageText.textContent = ageSelectionConfirmed ? "" : "Передвиньте слайдер, чтобы выбрать возраст";
      ageText.style.display = ageSelectionConfirmed ? "none" : "";
    }
    if (ageLabel) {
      ageLabel.textContent = ageSelectionConfirmed ? profile.ageText : CONTENT_MAP.ui.ageLabel;
    }
    if (ageReset) {
      ageReset.hidden = !ageSelectionConfirmed;
    }
    if (ageBlock) {
      ageBlock.hidden = !showAgeBlock;
      ageBlock.classList.toggle("is-attention", isAgeGateLocked() || ageGateNudge);
    }
    var sliderValue = ageToSliderValue(state.age);
    if (ageInput && Number(ageInput.value) !== sliderValue) {
      ageInput.value = String(sliderValue);
    }

    if (benefits) {
      var benefitHtml = "";
      if (isCompactAiTab) {
        benefits.classList.add("is-compact-ai");
        benefits.classList.remove("is-compact-photo");
        benefits.classList.remove("is-compact-video");
        benefits.classList.remove("is-compact-faq");
        benefitHtml = buildCompactAiHeroMarkup();
      } else if (isCompactPhotoTab) {
        benefits.classList.remove("is-compact-ai");
        benefits.classList.add("is-compact-photo");
        benefits.classList.remove("is-compact-video");
        benefits.classList.remove("is-compact-faq");
        benefitHtml = buildCompactPhotoHeroMarkup();
      } else if (isCompactVideoTab) {
        benefits.classList.remove("is-compact-ai");
        benefits.classList.remove("is-compact-photo");
        benefits.classList.add("is-compact-video");
        benefits.classList.remove("is-compact-faq");
        benefitHtml = buildCompactVideoHeroMarkup();
      } else if (isCompactFaqTab) {
        benefits.classList.remove("is-compact-ai");
        benefits.classList.remove("is-compact-photo");
        benefits.classList.remove("is-compact-video");
        benefits.classList.add("is-compact-faq");
        benefits.classList.remove("is-compact-reviews");
        benefitHtml = buildCompactFaqHeroMarkup();
      } else if (isCompactReviewsTab) {
        benefits.classList.remove("is-compact-ai");
        benefits.classList.remove("is-compact-photo");
        benefits.classList.remove("is-compact-video");
        benefits.classList.remove("is-compact-faq");
        benefits.classList.add("is-compact-reviews");
        benefits.classList.remove("is-compact-team");
        benefitHtml = buildCompactReviewsHeroMarkup();
      } else if (isCompactTeamTab) {
        benefits.classList.remove("is-compact-ai");
        benefits.classList.remove("is-compact-photo");
        benefits.classList.remove("is-compact-video");
        benefits.classList.remove("is-compact-faq");
        benefits.classList.remove("is-compact-reviews");
        benefits.classList.add("is-compact-team");
        benefitHtml = buildCompactTeamHeroMarkup();
      } else {
        benefits.classList.remove("is-compact-ai");
        benefits.classList.remove("is-compact-photo");
        benefits.classList.remove("is-compact-video");
        benefits.classList.remove("is-compact-faq");
        benefits.classList.remove("is-compact-reviews");
        benefits.classList.remove("is-compact-team");
        for (var i = 0; i < heroBenefits.length; i += 1) {
          var benefit = heroBenefits[i];
          benefitHtml +=
            "<li>" +
            '<span class="ac-benefit-icon">' +
            '<img class="ac-icon ac-icon--sm" src="' +
            benefit.icon +
            '" alt="" aria-hidden="true">' +
            "</span>" +
            "<span>" +
            benefit.text +
            "</span>" +
            "</li>";
        }
      }
      benefits.innerHTML = benefitHtml;
    }

    if (heroBenefitsRow) {
      heroBenefitsRow.classList.toggle("is-compact-ai", isCompactAiTab);
      heroBenefitsRow.classList.toggle("is-compact-photo", isCompactPhotoTab);
      heroBenefitsRow.classList.toggle("is-compact-video", isCompactVideoTab);
      heroBenefitsRow.classList.toggle("is-compact-faq", isCompactFaqTab);
      heroBenefitsRow.classList.toggle("is-compact-reviews", isCompactReviewsTab);
      heroBenefitsRow.classList.toggle("is-compact-team", isCompactTeamTab);
    }
    if (heroMotto) {
      heroMotto.hidden = !!compactModel || isCompactCustomCard;
    }

    if (promoPinned) {
      promoPinned.hidden = true;
      promoPinned.innerHTML = "";
    }
  }

  function renderFunnel() {
    var shift = getCurrentShift();
    var isIntroStep = state.step === 0;
    var isBookingStep = state.step === SHIFTS.length - 1;
    var gateLocked = isAgeGateLocked();
    var profile = findProfileByAge(state.age);
    var compactTabModel = getCompactTabModel(profile);
    var useCompactTabContentInRight = false;
    var isCompactTabContent = useCompactTabContentInRight && state.mode === "compact" && !!compactTabModel;
    var promo = loadShiftPromo();

    var overlayTitle = document.getElementById("acHeroOverlayTitle");
    var line = document.getElementById("acProgramLine");
    var summary = document.getElementById("acProgramSummary");
    var heroGrid = document.querySelector(".ac-hero-grid");
    var bookingForm = document.getElementById("acBookingForm");
    var bookingName = document.getElementById("acBookingName");
    var bookingPhone = document.getElementById("acBookingPhone");
    var bookingShift = document.getElementById("acBookingShift");
    var bookingPrice = document.getElementById("acBookingPrice");
    var bookingDiscount = document.getElementById("acBookingDiscount");
    var bookingPromo = document.getElementById("acBookingPromo");
    var bookingFixedCard = document.getElementById("acBookingFixedCard");
    var resumeCard = document.getElementById("acHeroResumeCard");
    var bookingConsent = document.getElementById("acBookingConsent");
    var bookingNotice = document.getElementById("acBookingPromoNotice");
    var bookingSubmit = bookingForm ? bookingForm.querySelector('[data-action="booking-submit"]') : null;
    var status = document.getElementById("acStepStatus");
    var nextBtn = document.getElementById("acStepNextBtn");
    var overlay = document.querySelector(".ac-hero-overlay");
    var heroRight = document.querySelector(".ac-hero-right");
    var resumePromoContext = getResumePromoContext();
    var showResumeOnly = !!resumePromoContext && !isBookingStep;

    if (resumeCard) {
      resumeCard.hidden = true;
      resumeCard.innerHTML = "";
    }

    var introLockedState = isIntroStep && gateLocked;

    if (overlay) {
      overlay.classList.toggle("is-intro", isIntroStep);
      overlay.classList.toggle("is-compact-tab-content", isCompactTabContent);
      overlay.classList.toggle("is-resume-only", showResumeOnly);
    }
    if (heroRight) {
      heroRight.classList.toggle("is-intro", introLockedState);
      heroRight.classList.toggle("ac-booking-step", isBookingStep);
    }

    if (isCompactTabContent) {
      if (overlayTitle) overlayTitle.textContent = compactTabModel.title || "";
      if (line) {
        line.style.display = compactTabModel.progress ? "" : "none";
        line.textContent = compactTabModel.progress || "";
      }
      if (summary) {
        summary.style.display = compactTabModel.subtitle ? "" : "none";
        summary.textContent = compactTabModel.subtitle || "";
      }
      if (heroGrid) {
        heroGrid.style.display = "";
        applyCompactHeroGridContent(heroGrid, compactTabModel);
      }
      if (bookingForm) bookingForm.hidden = true;
      if (bookingFixedCard) {
        bookingFixedCard.hidden = true;
        bookingFixedCard.innerHTML = "";
      }
      if (status) status.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      return;
    }

    if (heroGrid) {
      applyDefaultHeroGridContent(heroGrid);
    }
    if (overlayTitle) {
      overlayTitle.style.display = "";
    }
    if (status) status.hidden = false;

    if (isIntroStep) {
      if (overlayTitle) overlayTitle.textContent = CONTENT_MAP.ui.heroOverlayTitle;
      if (line) {
        line.style.display = "none";
        line.textContent = "";
      }
      if (summary) {
        summary.style.display = "";
        summary.textContent = gateLocked
          ? "Выберите возраст ребёнка, чтобы открыть смены и остальные действия."
          : profile.subtitle;
      }
      if (heroGrid) heroGrid.style.display = "";
      if (bookingForm) bookingForm.hidden = true;
      if (bookingFixedCard) {
        bookingFixedCard.hidden = true;
        bookingFixedCard.innerHTML = "";
      }
    } else if (isBookingStep) {
      if (overlayTitle) overlayTitle.textContent = "Отправьте заявку";
      if (summary) {
        summary.textContent = "";
        summary.style.display = "none";
      }
      if (heroGrid) heroGrid.style.display = "none";
      if (bookingForm) {
        var bookingLead = loadBookingLead() || {};
        var isBookingSubmitted = !!bookingLead.submitted;
        var hasDraftResume = !!(resumePromoContext && !resumePromoContext.submitted);
        var selectedShift = findShiftById(state.selectedShiftId);
        var shiftSummary = getShiftSummaryByAge(selectedShift, state.age);
        var shiftIdx = SHIFTS.indexOf(selectedShift);
        var shiftMeta = shiftIdx >= 0 ? getShiftPriceMeta(selectedShift, shiftIdx) : null;
        var priceBase = shiftMeta ? Number(shiftMeta.basePrice || 0) : 0;
        var priceFinal = promo ? Number(promo.finalPrice || priceBase) : priceBase;
        var discount = Math.max(0, priceBase - priceFinal);
        if (line) {
          line.style.display = (isBookingSubmitted || hasDraftResume) ? "" : "none";
          line.textContent = isBookingSubmitted
            ? "Мы перезвоним и подтвердим бронирование"
            : (hasDraftResume ? "Продолжить бронирование" : "");
        }
        bookingForm.hidden = false;
        if (bookingFixedCard) {
          var promoStatus = promo ? String(promo.status || "draft") : "";
          var promoStage = promo ? Number(promo.priceStage || 0) : 0;
          var hasPromoContext = !!(promo && (promoStatus === "active" || promoStage >= 1));
          var hasLeadContext = !!(bookingLead && bookingLead.shiftId);
          var shouldShowFixedCard = hasPromoContext || hasDraftResume || hasLeadContext;

          if (shouldShowFixedCard) {
            var fixedShift = selectedShift;
            if ((!fixedShift || SHIFTS.indexOf(fixedShift) < 0) && hasLeadContext) {
              fixedShift = findExactShiftById(String(bookingLead.shiftId));
            }
            var fixedShiftIdx = fixedShift ? SHIFTS.indexOf(fixedShift) : -1;
            var fixedMeta = fixedShiftIdx >= 0 ? getShiftPriceMeta(fixedShift, fixedShiftIdx) : shiftMeta;
            var fixedSummary = getShiftSummaryByAge(fixedShift || selectedShift, state.age);
            var fixedBase = Number((hasDraftResume && resumePromoContext)
              ? resumePromoContext.basePrice
              : priceBase);
            var fixedFinal = Number((hasDraftResume && resumePromoContext)
              ? resumePromoContext.finalPrice
              : priceFinal);
            var fixedPromo = promo;
            if (!fixedPromo && hasDraftResume && resumePromoContext && resumePromoContext.code) {
              fixedPromo = { code: resumePromoContext.code };
            }
            if (!fixedPromo && bookingLead && bookingLead.promoCode) {
              fixedPromo = { code: String(bookingLead.promoCode) };
            }
            bookingFixedCard.hidden = false;
            bookingFixedCard.innerHTML = buildBookingFixedCardMarkup({
              shiftMeta: fixedMeta,
              shiftSummary: fixedSummary,
              promo: fixedPromo,
              age: state.age,
              priceBase: fixedBase,
              priceFinal: fixedFinal,
              hidePricing: !!bookingLead.consent
            });
          } else {
            bookingFixedCard.hidden = true;
            bookingFixedCard.innerHTML = "";
          }
        }
        if (bookingNotice) {
          bookingNotice.hidden = true;
          bookingNotice.textContent = "";
        }
        bookingForm.classList.toggle("is-submitted", isBookingSubmitted);
        if (bookingName && !bookingName.value) {
          bookingName.value = String(bookingLead.name || "");
        }
        if (bookingPhone && !bookingPhone.value) {
          bookingPhone.value = bookingLead.phone
            ? formatPhoneInput(bookingLead.phone)
            : (promo && promo.phone ? formatPhoneInput(promo.phone) : "");
        }
        if (bookingShift) {
          bookingShift.value = shiftMeta
            ? shiftMeta.date + " • " + shiftMeta.days + " дн. • " + shiftSummary
            : shiftSummary;
        }
        if (bookingPrice) {
          bookingPrice.value = formatPriceNumber(priceFinal);
        }
        if (bookingDiscount) {
          bookingDiscount.value = discount > 0 ? ("− " + formatPriceNumber(discount)) : "—";
        }
        if (bookingPromo) {
          bookingPromo.value = promo && promo.code ? String(promo.code) : "";
        }
        if (bookingConsent) {
          bookingConsent.checked = !!bookingLead.consent;
          syncBookingFixedCardConsentState(bookingConsent.checked);
        }
        var bookingEditableFields = bookingForm.querySelectorAll(
          '[for="acBookingPhone"], #acBookingPhone, [for="acBookingName"], #acBookingName, .ac-booking-form__consent, [data-action="booking-submit"]'
        );
        for (var bf = 0; bf < bookingEditableFields.length; bf += 1) {
          bookingEditableFields[bf].hidden = isBookingSubmitted;
        }
        var consentBlock = bookingForm.querySelector(".ac-booking-form__consent");
        if (consentBlock) {
          consentBlock.hidden = isBookingSubmitted;
        }
        if (bookingSubmit) {
          bookingSubmit.disabled = !canSubmitBooking(
            bookingPhone ? bookingPhone.value : "",
            bookingConsent ? bookingConsent.checked : false,
            isBookingSubmitted
          );
          bookingSubmit.textContent = isBookingSubmitted ? "Заявка отправлена" : "Забронировать";
        }
      }
    } else {
      if (overlayTitle) overlayTitle.textContent = CONTENT_MAP.ui.heroOverlayTitle;
      if (line) {
        line.style.display = "";
        line.textContent = shift.line;
      }
      if (summary) {
        summary.textContent = getShiftSummaryByAge(shift, state.age);
        summary.style.display = "";
      }
      if (heroGrid) heroGrid.style.display = "";
      if (bookingForm) bookingForm.hidden = true;
      if (bookingFixedCard) {
        bookingFixedCard.hidden = true;
        bookingFixedCard.innerHTML = "";
      }
    }

    if (resumeCard) {
      resumeCard.hidden = !showResumeOnly;
      resumeCard.innerHTML = showResumeOnly
        ? buildHeroResumeCardMarkup(resumePromoContext)
        : "";
    }

    if (showResumeOnly) {
      if (overlayTitle) {
        overlayTitle.style.display = "none";
      }
      if (line) {
        line.style.display = "none";
        line.textContent = "";
      }
      if (summary) {
        summary.style.display = "none";
        summary.textContent = "";
      }
      if (heroGrid) {
        heroGrid.style.display = "none";
      }
      if (bookingForm) {
        bookingForm.hidden = true;
      }
      if (bookingFixedCard) {
        bookingFixedCard.hidden = true;
        bookingFixedCard.innerHTML = "";
      }
      if (status) {
        status.hidden = true;
      }
      if (nextBtn) {
        nextBtn.hidden = true;
        nextBtn.disabled = true;
        nextBtn.setAttribute("aria-disabled", "true");
      }
      return;
    }

    if (status) {
      var visualTotalSteps = isBookingStep ? 3 : 2;
      var visualStep = state.step === 0 ? 1 : (isBookingStep ? 3 : 2);
      status.textContent =
        CONTENT_MAP.ui.stepLabel + " " + String(visualStep) + " " + CONTENT_MAP.ui.stepLabelDelimiter + " " + String(visualTotalSteps);
    }

    if (nextBtn) {
      nextBtn.disabled = gateLocked || isBookingStep;
      nextBtn.setAttribute("aria-disabled", String(gateLocked || isBookingStep));
      nextBtn.hidden = isBookingStep;
      if (isIntroStep) {
        nextBtn.classList.add("ac-primary-btn--intro");
        nextBtn.classList.remove("ac-primary-btn--cta");
        nextBtn.innerHTML =
          '<img class="ac-icon ac-icon--sm" src="' +
          ICON_MAP.chevronRight +
          '" alt="" aria-hidden="true">';
        nextBtn.setAttribute("aria-label", "Следующий шаг");
      } else {
        nextBtn.classList.remove("ac-primary-btn--intro");
        nextBtn.classList.add("ac-primary-btn--cta");
        nextBtn.innerHTML =
          '<span>' +
          CONTENT_MAP.ui.finalBookingCta +
          '</span><img class="ac-icon ac-icon--sm" src="' +
          ICON_MAP.chevronRight +
          '" alt="" aria-hidden="true">';
        nextBtn.removeAttribute("aria-label");
      }
    }

  }

  function getFilteredPhotos() {
    if (state.photoCategory === "all") {
      return CONTENT_MAP.photos;
    }

    var result = [];
    for (var i = 0; i < CONTENT_MAP.photos.length; i += 1) {
      var photo = CONTENT_MAP.photos[i];
      if (photo.cat === state.photoCategory) {
        result.push(photo);
      }
    }
    return result;
  }

  function getPhotoCategoryIcon(categoryId) {
    if (categoryId === "all") return "/assets/icons/images.svg";
    if (categoryId === "food") return ICON_MAP.food;
    if (categoryId === "sport") return ICON_MAP.fire;
    if (categoryId === "pool") return "/assets/icons/waves.svg";
    if (categoryId === "study") return "/assets/icons/code-xml.svg";
    return "/assets/icons/images.svg";
  }

  function getFaqTabIcon(categoryId) {
    if (categoryId === "medicine") return ICON_MAP.med;
    if (categoryId === "security") return ICON_MAP.lock;
    if (categoryId === "food") return ICON_MAP.food;
    if (categoryId === "living") return "/assets/icons/check.svg";
    if (categoryId === "communication") return "/assets/icons/phone-mobile.svg";
    if (categoryId === "organization") return ICON_MAP.clipboard;
    if (categoryId === "other") return "/assets/icons/help-circle.svg";
    return "/assets/icons/help-circle.svg";
  }

  function getFaqAnswerMap() {
    var answers = {};
    for (var i = 0; i < FAQ_DATA.length; i += 1) {
      var group = FAQ_DATA[i];
      if (!group || !group.items) continue;
      for (var j = 0; j < group.items.length; j += 1) {
        var item = group.items[j];
        if (!item || !item.q || !item.a) continue;
        answers[String(item.q)] = String(item.a);
      }
    }
    return answers;
  }

  function buildCompactAiHeroMarkup() {
    var stats = CONTENT_MAP.aiStats || [];
    var copy = CONTENT_MAP.aiCopy || [];
    if (!stats.length) return "";

    var lead = stats[0] || {};
    var leadValue = String(lead.value || "");
    var leadText = String(lead.text || lead.label || "");

    var miniStatsHtml = "";
    for (var i = 1; i < stats.length; i += 1) {
      var stat = stats[i] || {};
      miniStatsHtml +=
        '<article class="ac-compact-ai__mini">' +
        '<div class="ac-compact-ai__mini-value">' + String(stat.value || "") + "</div>" +
        '<div class="ac-compact-ai__mini-label">' + String(stat.label || "") + "</div>" +
        "</article>";
    }

    var copyHtml = "";
    for (var j = 0; j < copy.length; j += 1) {
      copyHtml += "<p>" + String(copy[j] || "") + "</p>";
    }

    return (
      '<li class="ac-compact-ai__lead">' +
      '<div class="ac-compact-ai__lead-value">' + leadValue + "</div>" +
      '<p class="ac-compact-ai__lead-text">' + leadText + "</p>" +
      "</li>" +
      '<li class="ac-compact-ai__stats">' + miniStatsHtml + "</li>" +
      '<li class="ac-compact-ai__copy">' + copyHtml + "</li>"
    );
  }

  function buildCompactPhotoHeroMarkup() {
    var categories = CONTENT_MAP.photoCategories || [];
    var photos = getFilteredPhotos();
    var tabsHtml = "";
    var gridHtml = "";
    var i;

    for (i = 0; i < categories.length; i += 1) {
      var category = categories[i] || {};
      var categoryId = String(category.id || "");
      var categoryLabel = String(category.label || "");
      if (!categoryId || !categoryLabel) continue;
      tabsHtml +=
        '<button class="ac-filter-chip ac-filter-chip--compact-photo' +
        (state.photoCategory === categoryId ? " is-active" : "") +
        '" type="button" data-action="photo-cat" data-photo-cat="' +
        categoryId +
        '">' +
        categoryLabel +
        "</button>";
    }

    for (i = 0; i < photos.length; i += 1) {
      var photo = photos[i] || {};
      var photoSrc = String(photo.src || "");
      if (!photoSrc) continue;
      gridHtml +=
        '<button class="ac-compact-photo__thumb" type="button" data-action="photo-open" data-photo-index="' +
        i +
        '">' +
        '<img src="' +
        photoSrc +
        '" alt="' +
        String(photo.alt || "Фото лагеря") +
        '">' +
        "</button>";
    }

    if (!gridHtml) {
      gridHtml = '<p class="ac-compact-photo__empty">Фото по этой теме скоро появятся.</p>';
    }

    return (
      '<li class="ac-compact-photo">' +
      '<div class="ac-compact-photo__tabs">' +
      tabsHtml +
      "</div>" +
      '<div class="ac-compact-photo__grid-wrap">' +
      '<div class="ac-compact-photo__grid">' +
      gridHtml +
      "</div>" +
      "</div>" +
      "</li>"
    );
  }

  function buildCompactVideoHeroMarkup() {
    var videos = CONTENT_MAP.videos || [];
    var perPage = getCompactVideoPageSize();
    var maxPage = Math.max(0, Math.ceil(videos.length / perPage) - 1);
    var safePage = clamp(state.videoPage, 0, maxPage);
    if (safePage !== state.videoPage) {
      state.videoPage = safePage;
    }
    var start = safePage * perPage;
    var pageItems = videos.slice(start, start + perPage);
    var cardsHtml = "";

    for (var i = 0; i < pageItems.length; i += 1) {
      var item = pageItems[i] || {};
      var listIndex = start + i;
      var posterSrc = String(item.poster || item.posterMobile || "");
      cardsHtml +=
        '<article class="ac-compact-video__card">' +
        '<button class="ac-compact-video__media" type="button" data-action="video-open" data-video-index="' +
        listIndex +
        '" aria-label="' +
        CONTENT_MAP.ui.watchVideoLabel +
        '">' +
        '<img class="ac-compact-video__poster" src="' +
        posterSrc +
        '" alt="' +
        String(item.title || "Видео из лагеря") +
        '">' +
        '<span class="ac-compact-video__play"><img class="ac-icon ac-icon--sm" src="' +
        ICON_MAP.play +
        '" alt="" aria-hidden="true"></span>' +
        "</button>" +
        '<p class="ac-compact-video__caption">' +
        String(item.title || "") +
        "</p>" +
        "</article>";
    }

    return (
      '<li class="ac-compact-video">' +
      '<div class="ac-compact-video__grid' + mediaSwapClass("video") + '">' + cardsHtml + "</div>" +
      '<div class="ac-compact-video__nav">' +
      '<button class="ac-nav-btn" type="button" data-action="video-prev" ' +
      (safePage <= 0 ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.prev +
      '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronLeft + '" alt="" aria-hidden="true"></button>' +
      '<button class="ac-nav-btn" type="button" data-action="video-next" ' +
      (safePage >= maxPage ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.next +
      '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronRight + '" alt="" aria-hidden="true"></button>' +
      "</div>" +
      "</li>"
    );
  }

  function buildCompactFaqHeroMarkup() {
    var faqTabs = CONTENT_MAP.faqTabs || [];
    var faqItemsByCategory = CONTENT_MAP.faqItems || {};
    var answers = getFaqAnswerMap();
    var groupsHtml = "";

    for (var i = 0; i < faqTabs.length; i += 1) {
      var tab = faqTabs[i] || {};
      var tabId = String(tab.id || "");
      var tabLabel = String(tab.label || "");
      if (!tabId || !tabLabel) continue;
      var items = faqItemsByCategory[tabId] || [];
      var questionsHtml = "";
      var isActiveGroup = tabId === state.faqCategory;

      for (var j = 0; j < items.length; j += 1) {
        var question = String(items[j] || "");
        if (!question) continue;
        var answer = String(answers[question] || "");
        var isOpen = isActiveGroup && j === 0 && !!answer;
        questionsHtml +=
          '<article class="ac-compact-faq__question' + (isOpen ? " is-open" : "") + '">' +
          '<div class="ac-compact-faq__q">' + question + "</div>" +
          (isOpen ? ('<div class="ac-compact-faq__a">' + answer + "</div>") : "") +
          "</article>";
      }

      groupsHtml +=
        '<section class="ac-compact-faq__group">' +
        '<button class="ac-compact-faq__group-head" type="button" data-action="faq-cat" data-faq-cat="' +
        tabId +
        '">' +
        '<img class="ac-icon ac-icon--sm" src="' +
        getFaqTabIcon(tabId) +
        '" alt="" aria-hidden="true">' +
        '<span>' +
        tabLabel +
        "</span>" +
        "</button>" +
        '<div class="ac-compact-faq__questions">' +
        questionsHtml +
        "</div>" +
        "</section>";
    }

    return (
      '<li class="ac-compact-faq">' +
      groupsHtml +
      "</li>"
    );
  }

  function buildCompactReviewsHeroMarkup() {
    var reviews = CONTENT_MAP.reviews || [];
    var perPage = getCompactReviewPageSize();
    var maxPage = Math.max(0, Math.ceil(reviews.length / perPage) - 1);
    var safePage = clamp(state.reviewPage, 0, maxPage);
    if (safePage !== state.reviewPage) {
      state.reviewPage = safePage;
    }
    var start = safePage * perPage;
    var items = reviews.slice(start, start + perPage);
    var cardsHtml = "";

    for (var i = 0; i < items.length; i += 1) {
      var item = items[i] || {};
      cardsHtml +=
        '<article class="ac-card ac-review-card ac-compact-reviews__card">' +
        '<img class="ac-review-card__avatar" src="' + String(item.avatar || "") + '" alt="' + String(item.name || "") + '">' +
        '<p class="ac-review-card__quote">“' + String(item.quote || "") + '”</p>' +
        '<div class="ac-review-card__name">' + String(item.name || "") + "</div>" +
        '<div class="ac-review-card__meta">' + String(item.meta || "") + "</div>" +
        '<div class="ac-review-card__stars">★★★★★</div>' +
        "</article>";
    }

    return (
      '<li class="ac-compact-reviews">' +
      '<div class="ac-compact-reviews__grid' + mediaSwapClass("review") + '">' +
      cardsHtml +
      "</div>" +
      '<div class="ac-compact-reviews__footer">' +
      '<div class="ac-compact-reviews__nav">' +
      '<button class="ac-nav-btn" type="button" data-action="reviews-prev" ' +
      (safePage <= 0 ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.prev +
      '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronLeft + '" alt="" aria-hidden="true"></button>' +
      '<button class="ac-nav-btn" type="button" data-action="reviews-next" ' +
      (safePage >= maxPage ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.next +
      '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronRight + '" alt="" aria-hidden="true"></button>' +
      "</div>" +
      '<a class="ac-reviews-yandex-link ac-compact-reviews__link" href="' +
      (((CONTENT_MAP.ui && CONTENT_MAP.ui.yandexReviewsUrl) || "https://yandex.ru/maps/org/aydakemp/35558479035/reviews/")) +
      '" target="_blank" rel="noopener">' +
      "Смотреть на Яндекс Картах" +
      "</a>" +
      "</div>" +
      "</li>"
    );
  }

  function buildCompactTeamHeroMarkup() {
    var team = CONTENT_MAP.team || [];
    var perPage = getCompactTeamPageSize();
    var maxPage = Math.max(0, Math.ceil(team.length / perPage) - 1);
    var safePage = clamp(state.teamPage, 0, maxPage);
    if (safePage !== state.teamPage) {
      state.teamPage = safePage;
    }
    var start = safePage * perPage;
    var items = team.slice(start, start + perPage);
    var cardsHtml = "";
    var bookUrl = (CONTENT_MAP.ui && CONTENT_MAP.ui.programmingBookUrl) || "https://www.codims.ru/python-book";

    for (var i = 0; i < items.length; i += 1) {
      var member = items[i] || {};
      cardsHtml +=
        '<article class="ac-card ac-team-card ac-compact-team__card">' +
        '<img class="ac-team-card__avatar" src="' + String(member.avatar || "") + '" alt="' + String(member.name || "") + '">' +
        '<h3>' + String(member.name || "") + "</h3>" +
        '<p class="ac-team-card__role">' + String(member.role || "") + "</p>" +
        '<p>' + String(member.bio || "") + "</p>" +
        "</article>";
    }

    return (
      '<li class="ac-compact-team">' +
      '<div class="ac-compact-team__grid' + mediaSwapClass("team") + '">' +
      cardsHtml +
      "</div>" +
      '<div class="ac-compact-team__nav">' +
      '<button class="ac-nav-btn" type="button" data-action="team-prev" ' +
      (safePage <= 0 ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.prev +
      '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronLeft + '" alt="" aria-hidden="true"></button>' +
      '<button class="ac-nav-btn" type="button" data-action="team-next" ' +
      (safePage >= maxPage ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.next +
      '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronRight + '" alt="" aria-hidden="true"></button>' +
      "</div>" +
      '<div class="ac-compact-team__link-row">' +
      '<a class="ac-compact-team__link" href="' + bookUrl + '" target="_blank" rel="noopener">Учебник по программированию</a>' +
      "</div>" +
      "</li>"
    );
  }

  function renderProgramSectionMarkup() {
    var cards = "";
    for (var i = 0; i < CONTENT_MAP.programCards.length; i += 1) {
      var card = CONTENT_MAP.programCards[i];
      cards += '<article class="ac-card"><h3>' + card.title + "</h3><p>" + card.text + "</p></article>";
    }

    return '<h2>' + CONTENT_MAP.sectionTitles.program + '</h2><div class="ac-grid ac-grid--3">' + cards + "</div>";
  }

  function renderFormatSectionMarkup() {
    var cards = "";

    for (var i = 0; i < CONTENT_MAP.formatCards.length; i += 1) {
      var card = CONTENT_MAP.formatCards[i];
      if (card.list) {
        var list = "";
        for (var j = 0; j < card.list.length; j += 1) {
          list += "<li>" + card.list[j] + "</li>";
        }
        cards += '<article class="ac-card"><h3>' + card.title + "</h3><ul>" + list + "</ul></article>";
      } else {
        cards += '<article class="ac-card"><h3>' + card.title + "</h3><p>" + card.text + "</p></article>";
      }
    }

    return '<h2>' + CONTENT_MAP.sectionTitles.format + '</h2><div class="ac-grid ac-grid--3">' + cards + "</div>";
  }

  function renderAiSectionMarkup() {
    var statCards =
      '<article class="ac-card ac-ai-stat-card"><div class="ac-ai-big">' +
      CONTENT_MAP.aiStats[0].value +
      '</div><div class="ac-ai-label">' +
      CONTENT_MAP.aiStats[0].label +
      '</div><p>' +
      CONTENT_MAP.aiStats[0].text +
      "</p></article>";

    var mini = "";
    for (var i = 1; i < CONTENT_MAP.aiStats.length; i += 1) {
      mini +=
        '<div class="ac-ai-mini"><div class="ac-ai-mini__value">' +
        CONTENT_MAP.aiStats[i].value +
        '</div><div class="ac-ai-mini__label">' +
        CONTENT_MAP.aiStats[i].label +
        "</div></div>";
    }

    statCards += '<article class="ac-card ac-ai-mini-grid">' + mini + "</article>";

    var copy = "";
    for (var j = 0; j < CONTENT_MAP.aiCopy.length; j += 1) {
      copy += "<p>" + CONTENT_MAP.aiCopy[j] + "</p>";
    }

    statCards += '<article class="ac-card ac-ai-copy">' + copy + "</article>";

    return '<h2>' + CONTENT_MAP.sectionTitles.ai + '</h2><div class="ac-grid ac-grid--3">' + statCards + "</div>";
  }

  function renderLocationSectionMarkup() {
    var whereList = "";
    for (var i = 0; i < CONTENT_MAP.location.where.length; i += 1) {
      whereList += "<p>" + CONTENT_MAP.location.where[i] + "</p>";
    }

    var nearby = "";
    for (var j = 0; j < CONTENT_MAP.location.nearby.length; j += 1) {
      nearby += "<p>" + CONTENT_MAP.location.nearby[j] + "</p>";
    }

    return (
      '<h2>' +
      CONTENT_MAP.sectionTitles.location +
      '</h2><div class="ac-grid ac-grid--3">' +
      '<article class="ac-card"><h3>' + CONTENT_MAP.ui.locationWhereTitle + "</h3>" +
      whereList +
      "</article>" +
      '<article class="ac-card ac-card--map"><iframe class="ac-map-frame" loading="lazy" src="' +
      CONTENT_MAP.location.mapUrl +
      '" title="map frame"></iframe></article>' +
      '<article class="ac-card"><h3>' + CONTENT_MAP.ui.locationNearbyTitle + "</h3>" +
      nearby +
      "</article></div>"
    );
  }

  function renderPhotosSectionMarkup() {
    var categories = "";
    for (var i = 0; i < CONTENT_MAP.photoCategories.length; i += 1) {
      var category = CONTENT_MAP.photoCategories[i];
      categories +=
        '<button class="ac-filter-chip' +
        (state.photoCategory === category.id ? " is-active" : "") +
        '" type="button" data-action="photo-cat" data-photo-cat="' +
        category.id +
        '">' +
        '<img class="ac-icon ac-icon--sm" src="' +
        getPhotoCategoryIcon(category.id) +
        '" alt="" aria-hidden="true"><span>' +
        category.label +
        "</span>" +
        "</button>";
    }

    var photos = getFilteredPhotos();
    var perPage = getMediaPageSize("photo");
    var maxPage = Math.max(0, Math.ceil(photos.length / perPage) - 1);
    var safePage = clamp(state.photoPage, 0, maxPage);
    if (safePage !== state.photoPage) {
      state.photoPage = safePage;
    }
    var start = safePage * perPage;
    var pageItems = photos.slice(start, start + perPage);

    var images = "";
    for (var j = 0; j < pageItems.length; j += 1) {
      images +=
        '<button class="ac-photo-thumb" type="button" data-action="photo-open" data-photo-index="' +
        String(start + j) +
        '" aria-label="Открыть фото">' +
        '<img src="' +
        pageItems[j].src +
        '" alt="' +
        pageItems[j].alt +
        '">' +
        "</button>";
    }

    return (
      '<h2>' +
      CONTENT_MAP.sectionTitles.photos +
      '</h2><div class="ac-media-toolbar ac-media-toolbar--filters">' +
      categories +
      '</div><div class="ac-media-row">' +
      '<button class="ac-nav-btn" type="button" data-action="photo-prev" ' +
      (safePage <= 0 ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.prev +
      '"><img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.chevronLeft +
      '" alt="" aria-hidden="true"></button>' +
      '<div class="ac-photo-strip' + mediaSwapClass("photo") + '">' +
      images +
      '</div>' +
      '<button class="ac-nav-btn" type="button" data-action="photo-next" ' +
      (safePage >= maxPage ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.next +
      '"><img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.chevronRight +
      '" alt="" aria-hidden="true"></button></div>'
    );
  }

  function rutubeVideoId(url) {
    var match = String(url || "").match(/rutube\.ru\/(?:video|shorts)\/([a-z0-9]+)/i);
    return match ? match[1] : "";
  }

  function rutubeEmbedUrl(url) {
    var id = rutubeVideoId(url);
    return id ? "https://rutube.ru/play/embed/" + id : "";
  }

  function renderVideosSectionMarkup() {
    var perPage = getMediaPageSize("video");
    var maxPage = Math.max(0, Math.ceil(CONTENT_MAP.videos.length / perPage) - 1);
    var safePage = clamp(state.videoPage, 0, maxPage);
    if (safePage !== state.videoPage) {
      state.videoPage = safePage;
    }
    var start = safePage * perPage;
    var items = CONTENT_MAP.videos.slice(start, start + perPage);
    var cards = "";
    var mobileMedia = isMobileMediaLayout();

    for (var i = 0; i < items.length; i += 1) {
      var listIndex = start + i;
      var posterSrc = String(
        (mobileMedia && items[i].posterMobile) ||
        items[i].poster ||
        items[i].posterMobile ||
        ""
      );
      var mediaMarkup =
        '<img class="ac-video-card__poster" src="' +
        posterSrc +
        '" alt="' +
        items[i].title +
        '"><button class="ac-video-card__play" type="button" aria-label="' +
        CONTENT_MAP.ui.watchVideoLabel +
        '" data-action="video-open" data-video-index="' +
        String(listIndex) +
        '"><img class="ac-icon ac-icon--sm" src="' +
        ICON_MAP.play +
        '" alt="" aria-hidden="true"></button><button class="ac-video-card__open" type="button" aria-label="' +
        CONTENT_MAP.ui.watchVideoLabel +
        '" data-action="video-open" data-video-index="' +
        String(listIndex) +
        '"></button>';
      cards +=
        '<article class="ac-video-card">' +
        mediaMarkup +
        '<p class="ac-video-card__caption">' +
        items[i].title +
        "</p></article>";
    }

    return (
      '<h2>' +
      CONTENT_MAP.sectionTitles.video +
      '</h2><div class="ac-media-row">' +
      '<button class="ac-nav-btn" type="button" data-action="video-prev" ' +
      (safePage <= 0 ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.prev +
      '"><img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.chevronLeft +
      '" alt="" aria-hidden="true"></button><div class="ac-grid ac-grid--3 ac-video-grid' + mediaSwapClass("video") + '">' +
      cards +
      '</div><button class="ac-nav-btn" type="button" data-action="video-next" ' +
      (safePage >= maxPage ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.next +
      '"><img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.chevronRight +
      '" alt="" aria-hidden="true"></button></div>'
    );
  }

  function renderReviewsSectionMarkup() {
    var perPage = getMediaPageSize("review");
    var maxPage = Math.max(0, Math.ceil(CONTENT_MAP.reviews.length / perPage) - 1);
    var safePage = clamp(state.reviewPage, 0, maxPage);
    if (safePage !== state.reviewPage) {
      state.reviewPage = safePage;
    }
    var start = safePage * perPage;
    var items = CONTENT_MAP.reviews.slice(start, start + perPage);
    var cards = "";

    for (var i = 0; i < items.length; i += 1) {
      cards +=
        '<article class="ac-card ac-review-card ac-card--team"><img class="ac-review-card__avatar" src="' +
        items[i].avatar +
        '" alt="' +
        items[i].name +
        '"><p class="ac-review-card__quote">“' +
        items[i].quote +
        '”</p><div class="ac-review-card__name">' +
        items[i].name +
        '</div><div class="ac-review-card__meta">' +
        items[i].meta +
        '</div><div class="ac-review-card__stars">★★★★★</div></article>';
    }

    return (
      '<h2>' +
      CONTENT_MAP.sectionTitles.reviews +
      '</h2><div class="ac-media-row ac-media-row--reviews">' +
      '<button class="ac-nav-btn" type="button" data-action="reviews-prev" ' +
      (safePage <= 0 ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.prev +
      '"><img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.chevronLeft +
      '" alt="" aria-hidden="true"></button><div class="ac-grid ac-grid--4 ac-grid--reviews' + mediaSwapClass("review") + '">' +
      cards +
      '</div><button class="ac-nav-btn" type="button" data-action="reviews-next" ' +
      (safePage >= maxPage ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.next +
      '"><img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.chevronRight +
      '" alt="" aria-hidden="true"></button></div>' +
      '<div class="ac-reviews-link-row"><a class="ac-reviews-yandex-link" href="' +
      (((CONTENT_MAP.ui && CONTENT_MAP.ui.yandexReviewsUrl) || "https://yandex.ru/maps/org/aydakemp/35558479035/reviews/")) +
      '" target="_blank" rel="noopener">' +
      (((CONTENT_MAP.ui && CONTENT_MAP.ui.yandexReviewsLabel) || "Отзывы на Яндекс Картах")) +
      "</a></div>"
    );
  }

  function renderTeamSectionMarkup() {
    var perPage = getMediaPageSize("team");
    var maxPage = Math.max(0, Math.ceil(CONTENT_MAP.team.length / perPage) - 1);
    var safePage = clamp(state.teamPage, 0, maxPage);
    if (safePage !== state.teamPage) {
      state.teamPage = safePage;
    }
    var start = safePage * perPage;
    var items = CONTENT_MAP.team.slice(start, start + perPage);
    var cards = "";

    for (var i = 0; i < items.length; i += 1) {
      cards +=
        '<article class="ac-card ac-team-card"><img class="ac-team-card__avatar" src="' +
        items[i].avatar +
        '" alt="' +
        items[i].name +
        '"><h3>' +
        items[i].name +
        '</h3><p class="ac-team-card__role">' +
        items[i].role +
        '</p><p>' +
        items[i].bio +
        "</p></article>";
    }

    return (
      '<h2>' +
      CONTENT_MAP.sectionTitles.team +
      '</h2><div class="ac-media-row">' +
      '<button class="ac-nav-btn" type="button" data-action="team-prev" ' +
      (safePage <= 0 ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.prev +
      '"><img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.chevronLeft +
      '" alt="" aria-hidden="true"></button><div class="ac-grid ac-grid--4 ac-team-grid' + mediaSwapClass("team") + '">' +
      cards +
      '</div><button class="ac-nav-btn" type="button" data-action="team-next" ' +
      (safePage >= maxPage ? "disabled" : "") +
      ' aria-label="' +
      CONTENT_MAP.ui.next +
      '"><img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.chevronRight +
      '" alt="" aria-hidden="true"></button></div>'
    );
  }

  function renderFaqSectionMarkup() {
    var faqTabs = CONTENT_MAP.faqTabs || [];
    var faqItemsByCategory = CONTENT_MAP.faqItems || {};
    if (!faqTabs.length || !hasOwn(faqItemsByCategory, state.faqCategory)) {
      state.faqCategory = faqTabs.length ? faqTabs[0].id : "medicine";
    }

    var tabs = "";
    for (var i = 0; i < faqTabs.length; i += 1) {
      var tab = faqTabs[i];
      tabs +=
        '<button class="ac-filter-chip' +
        (state.faqCategory === tab.id ? " is-active" : "") +
        '" type="button" data-action="faq-cat" data-faq-cat="' +
        tab.id +
        '">' +
        '<img class="ac-icon ac-icon--sm" src="' +
        getFaqTabIcon(tab.id) +
        '" alt="" aria-hidden="true"><span>' +
        tab.label +
        "</span>" +
        "</button>";
    }

    var items = faqItemsByCategory[state.faqCategory] || faqItemsByCategory.medicine || [];
    var answerMap = getFaqAnswerMap();
    var list = "";
    for (var j = 0; j < items.length; j += 1) {
      var q = String(items[j] || "");
      var a = String(answerMap[q] || "");
      list +=
        '<details class="ac-faq-item"><summary>' +
        q +
        "</summary>" +
        (a ? ('<div class="ac-faq-item__answer">' + a + "</div>") : "") +
        "</details>";
    }

    return (
      '<h2>' +
      CONTENT_MAP.sectionTitles.faq +
      '</h2><div class="ac-media-toolbar ac-media-toolbar--filters">' +
      tabs +
      '</div><div class="ac-faq-list">' +
      list +
      "</div>"
    );
  }

  function renderFaqOverlay(container) {
    if (!container) return;

    var html = "";
    for (var i = 0; i < FAQ_DATA.length; i += 1) {
      var group = FAQ_DATA[i];
      html += '<div class="ac-left-faq__gt">';
      if (group.icon) {
        html +=
          '<img class="ac-icon ac-icon--sm" src="' +
          group.icon +
          '" alt="" aria-hidden="true"> ';
      }
      html += group.group + "</div>";

      for (var j = 0; j < group.items.length; j += 1) {
        var item = group.items[j];
        html +=
          '<div class="ac-left-faq__item">' +
          '<div class="ac-left-faq__q">' +
          item.q +
          "</div>" +
          '<div class="ac-left-faq__a">' +
          item.a +
          "</div>" +
          "</div>";
      }
    }

    container.innerHTML = html;
  }

  function renderLegacyFaqOverlay() {
    var faqContainer = document.getElementById("faqContainer");
    if (faqContainer) {
      renderFaqOverlay(faqContainer);
      return;
    }

    var legacyOverlay = document.getElementById("acLtFaq");
    if (!legacyOverlay) return;

    legacyOverlay.innerHTML = '<div class="ac-left-faq" id="faqContainer"></div>';
    var mounted = document.getElementById("faqContainer");
    if (!mounted) return;
    renderFaqOverlay(mounted);
  }

  function renderContentSections() {
    var program = document.getElementById("acSectionProgram");
    var format = document.getElementById("acSectionFormat");
    var ai = document.getElementById("acSectionAi");
    var location = document.getElementById("acSectionLocation");
    var photos = document.getElementById("acSectionPhotos");
    var video = document.getElementById("acSectionVideo");
    var reviews = document.getElementById("acSectionReviews");
    var team = document.getElementById("acSectionTeam");
    var faq = document.getElementById("acSectionFaq");

    if (program) program.innerHTML = renderProgramSectionMarkup();
    if (format) format.innerHTML = renderFormatSectionMarkup();
    if (ai) ai.innerHTML = renderAiSectionMarkup();
    if (location) location.innerHTML = renderLocationSectionMarkup();
    if (photos) photos.innerHTML = renderPhotosSectionMarkup();
    if (video) video.innerHTML = renderVideosSectionMarkup();
    if (reviews) reviews.innerHTML = renderReviewsSectionMarkup();
    if (team) team.innerHTML = renderTeamSectionMarkup();
    if (faq) faq.innerHTML = renderFaqSectionMarkup();
    renderLegacyFaqOverlay();
  }

  function renderSections() {
    renderContentSections();

    var targetId = TAB_TO_SECTION[state.activeTab];
    var sections = document.querySelectorAll(".ac-section");
    for (var i = 0; i < sections.length; i += 1) {
      sections[i].classList.remove("ac-section--focus");
      if (state.mode === "compact") {
        sections[i].hidden = true;
      } else {
        sections[i].hidden = false;
      }
    }

    if (!targetId || state.mode === "compact") return;

    var targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.classList.add("ac-section--focus");
    }
  }

  function renderFooter() {
    var brand = document.getElementById("acFooterBrand");
    var tagline = document.getElementById("acFooterTagline");

    if (brand) {
      brand.textContent = CONTENT_MAP.footer.brand;
    }
    if (tagline) {
      tagline.textContent = CONTENT_MAP.footer.tagline;
    }
  }

  function renderStaticLabels() {
    var techBadge = document.getElementById("acTechBadge");
    if (techBadge) {
      var dismissed = techBadgeDismissedInSession;
      try {
        dismissed = dismissed || localStorage.getItem(TECH_BADGE_DISMISSED_KEY) === "1";
      } catch (_errDismiss) {
        dismissed = dismissed || false;
      }

      var now = new Date();
      var hh = String(now.getHours()).padStart(2, "0");
      var mm = String(now.getMinutes()).padStart(2, "0");
      var timeLabel = hh + ":" + mm;

      techBadge.innerHTML =
        '<span class="ac-tech-badge__text">' +
        BUILD_TAG +
        " · " +
        timeLabel +
        "</span>" +
        '<button class="ac-tech-badge__close" type="button" data-action="tech-badge-close" aria-label="Скрыть метку сборки">' +
        '<img class="ac-icon ac-icon--sm" src="' +
        ICON_MAP.close +
        '" alt="" aria-hidden="true">' +
        "</button>";
      techBadge.hidden = dismissed;
      var techBadgeCloseButton = techBadge.querySelector('[data-action="tech-badge-close"]');
      if (techBadgeCloseButton) {
        techBadgeCloseButton.addEventListener("click", function (event) {
          dismissTechBadge();
          event.preventDefault();
          event.stopPropagation();
        });
      }
    }

    var assignments = [
      ["acBrandSub", CONTENT_MAP.ui.brandSub],
      ["acAgeLabel", CONTENT_MAP.ui.ageLabel],
      ["acHeroContactLabel", "Связаться"],
      ["acHeroCampaignLabel", CONTENT_MAP.ui.heroCampaignLabel],
      ["acHeroOverlayTitle", CONTENT_MAP.ui.heroOverlayTitle],
      ["acHeroSafetyMedTitle", CONTENT_MAP.ui.heroSafetyMedTitle],
      ["acHeroSafetyMedDesc", CONTENT_MAP.ui.heroSafetyMedDesc],
      ["acHeroSafetyLockTitle", CONTENT_MAP.ui.heroSafetyLockTitle],
      ["acHeroSafetyLockDesc", CONTENT_MAP.ui.heroSafetyLockDesc],
      ["acHeroSafetyFoodTitle", CONTENT_MAP.ui.heroSafetyFoodTitle],
      ["acHeroSafetyFoodDesc", CONTENT_MAP.ui.heroSafetyFoodDesc],
      ["acHeroSafetyPoolTitle", CONTENT_MAP.ui.heroSafetyPoolTitle],
      ["acHeroSafetyPoolDesc", CONTENT_MAP.ui.heroSafetyPoolDesc]
    ];

    for (var i = 0; i < assignments.length; i += 1) {
      var element = document.getElementById(assignments[i][0]);
      if (element) {
        element.textContent = assignments[i][1];
      }
    }
  }

  function renderContactOverlay() {
    return (
      '<div class="ac-overlay-backdrop" data-action="overlay-backdrop">' +
      '<article class="ac-overlay-card" role="dialog" aria-modal="true" aria-label="' +
      CONTENT_MAP.ui.contactTitle +
      '">' +
      '<div class="ac-overlay-head">' +
      '<h3 class="ac-overlay-title">' +
      CONTENT_MAP.ui.contactTitle +
      '</h3>' +
      '<button class="ac-overlay-close" type="button" data-action="overlay-close" aria-label="' + CONTENT_MAP.ui.closeAria + '">' +
      '<img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.close +
      '" alt="" aria-hidden="true">' +
      "</button>" +
      "</div>" +
      '<p class="ac-overlay-meta">' + CONTENT_MAP.ui.contactMeta + "</p>" +
      '<details class="ac-contact-dropdown" open>' +
      '<summary>Каналы связи</summary>' +
      '<div class="ac-contact-list">' +
      '<a class="ac-contact-item" href="tel:+74951234567"><span class="ac-contact-item__dot">•</span><span><strong>Городской телефон</strong><small>+7 (495) 123-45-67</small></span></a>' +
      '<a class="ac-contact-item" href="tel:+79688086455"><span class="ac-contact-item__dot">•</span><span><strong>Мобильный телефон</strong><small>+7 (968) 808-64-55</small></span></a>' +
      '<a class="ac-contact-item" href="https://t.me/proga_school" target="_blank" rel="noopener"><span class="ac-contact-item__dot">•</span><span><strong>Telegram</strong><small>@proga_school</small></span></a>' +
      '<a class="ac-contact-item" href="https://wa.me/79688086455" target="_blank" rel="noopener"><span class="ac-contact-item__dot">•</span><span><strong>WhatsApp</strong><small>Написать в WhatsApp</small></span></a>' +
      "</div>" +
      "</details>" +
      '<div class="ac-overlay-actions"><button class="ac-btn-soft" type="button" data-action="overlay-close">' +
      CONTENT_MAP.ui.close +
      "</button></div>" +
      "</article>" +
      "</div>"
    );
  }

  function renderShiftOverlay() {
    var allShifts = SHIFTS.slice(0, SHIFT_PRICE_META.length);
    var visibleShifts = shiftsShowAll || allShifts.length <= 2 ? allShifts : allShifts.slice(0, 2);
    if (!visibleShifts.length) {
      return "";
    }

    var profile = findProfileByAge(state.age);
    var ageTitle = "СМЕНЫ ДЛЯ " + profile.min + "-" + profile.max + " ЛЕТ";
    var featuredShiftId = state.selectedShiftId;
    if (!shiftsShowAll) {
      var featuredShiftObj = findShiftById(featuredShiftId);
      var featuredInVisible = false;
      for (var vf = 0; vf < visibleShifts.length; vf += 1) {
        if (visibleShifts[vf].id === featuredShiftId) {
          featuredInVisible = true;
          break;
        }
      }
      if (featuredShiftObj && !featuredInVisible) {
        if (visibleShifts.length === 1) {
          visibleShifts.push(featuredShiftObj);
        } else {
          visibleShifts[visibleShifts.length - 1] = featuredShiftObj;
        }
      }
    }
    var featuredFound = false;
    for (var f = 0; f < visibleShifts.length; f += 1) {
      if (visibleShifts[f].id === featuredShiftId) {
        featuredFound = true;
        break;
      }
    }
    if (!featuredFound) {
      featuredShiftId = visibleShifts[0].id;
    }

    function renderCompactShiftItem(shift, meta) {
      return (
        '<button class="ac-shift-item ac-shift-item--compact' +
        (shift.id === featuredShiftId ? " is-active" : "") +
        '" type="button" data-action="select-shift" data-shift-id="' +
        shift.id +
        '">' +
        '<div class="ac-shift-item__body">' +
        (meta.badge ? '<span class="ac-shift-item__badge">' + meta.badge + "</span>" : "") +
        '<div class="ac-shift-item__line">' +
        '<span class="ac-shift-item__name">' + meta.date + "</span>" +
        '<span class="ac-shift-item__days">' + meta.days + " дн.</span>" +
        "</div>" +
        '<div class="ac-shift-item__meta">' + getShiftSummaryByAge(shift, state.age) + "</div>" +
        "</div>" +
        "</button>"
      );
    }

    function renderFeaturedShiftItem(shift, meta, promoView) {
      var actionClass = "ac-shift-price-btn";
      if (promoView.status === "checking_first") {
        actionClass += " is-processing";
      } else if (promoView.status === "active") {
        actionClass += " is-recalc";
      } else if (promoView.status === "phone_gate") {
        actionClass += " is-fix";
      } else if (promoView.stage >= 2) {
        actionClass += " is-fix";
      } else if (promoView.stage === 1) {
        actionClass += " is-upgrade";
      }

      var showOccupancy = promoView.status !== "checking_first";
      var occupancyPercent = clamp(Number(meta.occupancyPercent || 0), 0, 100);
      var seatsLeft = Math.max(0, Number(meta.seats || 0));
      var searchProgress = clamp(Number(promoView.searchProgress || 0), 0, 100);
      var showSearchProgress = promoView.status === "checking_first";
      var showProcess = showSearchProgress || showOccupancy;
      var processLine = "";
      var processProgress = 0;
      var processProgressClass = "";
      if (showSearchProgress) {
        processLine = getPriceSearchStatusLine(searchProgress);
        processProgress = searchProgress;
        processProgressClass = " is-search";
      } else if (showOccupancy) {
        processLine = String(occupancyPercent) + "% мест занято";
        processProgress = occupancyPercent;
        processProgressClass = " is-occupancy";
      }
      var phoneGateLeftMarkup = "";
      if (promoView.status === "phone_gate") {
        phoneGateLeftMarkup =
          '<div class="ac-shift-item__phone-gate">' +
          '<label class="ac-shift-item__phone-label" for="acShiftFixPhone">' +
          "Чтобы мы вас запомнили, введите телефон и зафиксируйте, пожалуйста, цену." +
          "</label>" +
          '<input id="acShiftFixPhone" class="ac-shift-item__phone-input" type="tel" inputmode="tel" autocomplete="tel" maxlength="11" placeholder="+7 (___) ___-__-__" value="' +
          formatPhoneInput(promoView.pendingPhone || "") +
          '">' +
          "</div>";
      }
      var processMarkup = "";
      if (showProcess) {
        processMarkup =
          '<div class="ac-shift-item__process">' +
          (processLine
            ? ('<div class="ac-shift-item__process-line">' + processLine + "</div>")
            : "") +
          '<div class="ac-shift-item__process-progress' + processProgressClass + '"><span style="width:' + processProgress + '%;"></span></div>' +
          "</div>";
      }
      var promoMarkup = "";
      if (promoView.status === "active") {
        promoMarkup =
          '<div class="ac-shift-item__promo-live">' +
          '<div class="ac-shift-item__promo-code">' + (promoView.code || "") + "</div>" +
          '<div class="ac-shift-item__promo-ttl">Действует: ' + (promoView.promoTtl || "00:00:00") + "</div>" +
          "</div>";
      } else if (promoView.stage >= 1) {
        var stagePromoTtl = "Промокод сохранён за вами";
        if (promoView.status === "phone_gate") {
          stagePromoTtl = "Зафиксируйте цену, чтобы активировать 72 ч";
        } else if (promoView.stage >= 2) {
          stagePromoTtl = promoView.promoTtl || "Активируется после фиксации";
        }
        promoMarkup =
          '<div class="ac-shift-item__promo-live">' +
          '<div class="ac-shift-item__promo-code">' + (promoView.code || "") + "</div>" +
          '<div class="ac-shift-item__promo-ttl">' + stagePromoTtl + "</div>" +
          "</div>";
      } else {
        promoMarkup =
          '<div class="ac-shift-item__promo-live is-placeholder" aria-hidden="true">' +
          '<div class="ac-shift-item__promo-code">AIDA-0000</div>' +
          '<div class="ac-shift-item__promo-ttl">Действует: 00:00:00</div>' +
          "</div>";
      }

      return (
        '<article class="ac-shift-item ac-shift-item--featured is-active">' +
        '<div class="ac-shift-item--featured__left ac-shift-item--featured__identity">' +
        (meta.badge ? '<span class="ac-shift-item__badge">' + meta.badge + "</span>" : "") +
        '<div class="ac-shift-item__line ac-shift-item__line--main">' +
        '<span class="ac-shift-item__name">' + meta.date + "</span>" +
        '<button class="ac-shift-item__date-icon" type="button" data-action="shift-calendar-toggle" data-shift-id="' + shift.id + '" aria-label="Открыть календарь смены">' +
        '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.clipboard + '" alt="" aria-hidden="true">' +
        "</button>" +
        "</div>" +
        '<div class="ac-shift-item__identity-meta">' +
        '<span class="ac-shift-item__days">' + meta.days + " дн.</span>" +
        '<span class="ac-shift-item__identity-dot" aria-hidden="true">•</span>' +
        '<span class="ac-shift-item__seats">Осталось ' + seatsLeft + " мест</span>" +
        "</div>" +
        "</div>" +
        '<div class="ac-shift-item--featured__center">' +
        '<div class="ac-shift-item__meta">' + getShiftSummaryByAge(shift, state.age) + "</div>" +
        processMarkup +
        phoneGateLeftMarkup +
        "</div>" +
        '<div class="ac-shift-item--featured__right ac-shift-item--featured__actions-col">' +
        '<div class="ac-shift-item__price-caption">Цена подтверждена для вас</div>' +
        '<div class="ac-shift-item__price-shell">' +
        '<div class="ac-shift-item__price-old' + (promoView.oldPrice ? "" : " is-empty") + '">' + (promoView.oldPrice || "—") + "</div>" +
        '<div class="ac-shift-item__price">' + formatPriceNumber(promoView.price) + "</div>" +
        "</div>" +
        promoMarkup +
        '<div class="ac-shift-item__actions ac-shift-item__actions--primary">' +
        '<button class="ac-primary-btn ac-shift-book-btn" type="button" data-action="shift-booking" data-shift-id="' + shift.id + '">' +
        "Забронировать место" +
        "</button>" +
        "</div>" +
        '<div class="ac-shift-item__actions ac-shift-item__actions--secondary">' +
        '<button class="ac-primary-btn ' + actionClass + '" type="button" data-action="' +
        (promoView.status === "phone_gate" ? "shift-fix" : "shift-price") +
        '" data-shift-id="' + shift.id + '"' +
        (promoView.actionDisabled ? ' disabled aria-disabled="true"' : "") +
        ">" +
        promoView.actionText +
        "</button>" +
        "</div>" +
        '<button class="ac-shift-item__desc-link" type="button" data-action="shift-description" data-shift-id="' + shift.id + '">' +
        'Посмотреть описание смены <img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronRight + '" alt="" aria-hidden="true">' +
        "</button>" +
        (shiftCalendar.open && shiftCalendar.shiftId === shift.id ? buildShiftCalendarMarkup(meta, shift.id) : "") +
        "</div>" +
        "</article>"
      );
    }

    var listHtml = "";
    for (var i = 0; i < visibleShifts.length; i += 1) {
      var shift = visibleShifts[i];
      var shiftIdx = allShifts.indexOf(shift);
      var meta = getShiftPriceMeta(shift, shiftIdx);
      if (shift.id === featuredShiftId) {
        listHtml += renderFeaturedShiftItem(shift, meta, getShiftPromoView(shift.id, meta));
      } else {
        listHtml += renderCompactShiftItem(shift, meta);
      }
    }

    return (
      '<div class="ac-overlay-backdrop" data-action="overlay-backdrop">' +
      '<article class="ac-overlay-card ac-overlay-card--shifts" role="dialog" aria-modal="true" aria-label="' +
      CONTENT_MAP.ui.shiftsTitle +
      '">' +
      '<div class="ac-overlay-head">' +
      '<h3 class="ac-overlay-title ac-overlay-title--shifts">' +
      ageTitle +
      '</h3>' +
      '<button class="ac-overlay-close" type="button" data-action="overlay-close" aria-label="' + CONTENT_MAP.ui.closeAria + '">' +
      '<img class="ac-icon ac-icon--sm" src="' +
      ICON_MAP.close +
      '" alt="" aria-hidden="true">' +
      "</button>" +
      "</div>" +
      '<div class="ac-shift-list ac-shift-list--compact">' +
      listHtml +
      "</div>" +
      (allShifts.length > 2
        ? '<button class="ac-shift-more-btn" type="button" data-action="shift-show-more">' +
          (shiftsShowAll
            ? "Скрыть дополнительные смены"
            : 'Показать смены <img class="ac-icon ac-icon--sm ac-shift-more-btn__icon" src="' +
              ICON_MAP.chevronRight +
              '" alt="" aria-hidden="true">') +
          "</button>"
        : "") +
      "</article>" +
      "</div>"
    );
  }

  function renderPhotoOverlay() {
    var photos = getFilteredPhotos();
    if (!photos.length) {
      return "";
    }
    var current = clamp(state.photoLightboxIndex, 0, photos.length - 1);
    var item = photos[current];
    var disablePrev = current <= 0;
    var disableNext = current >= photos.length - 1;

    return (
      '<div class="ac-overlay-backdrop" data-action="overlay-backdrop">' +
      '<article class="ac-overlay-card ac-overlay-card--photo" role="dialog" aria-modal="true" aria-label="Просмотр фото">' +
      '<div class="ac-overlay-head">' +
      '<h3 class="ac-overlay-title">' + CONTENT_MAP.sectionTitles.photos + "</h3>" +
      '<button class="ac-overlay-close" type="button" data-action="overlay-close" aria-label="' +
      CONTENT_MAP.ui.closeAria +
      '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.close + '" alt="" aria-hidden="true">' +
      "</button>" +
      "</div>" +
      '<div class="ac-photo-lightbox">' +
      '<button class="ac-nav-btn" type="button" data-action="photo-lightbox-prev" ' +
      (disablePrev ? "disabled" : "") +
      ' aria-label="' + CONTENT_MAP.ui.prev + '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronLeft + '" alt="" aria-hidden="true"></button>' +
      '<img class="ac-photo-lightbox__image" src="' + item.src + '" alt="' + item.alt + '">' +
      '<button class="ac-nav-btn" type="button" data-action="photo-lightbox-next" ' +
      (disableNext ? "disabled" : "") +
      ' aria-label="' + CONTENT_MAP.ui.next + '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronRight + '" alt="" aria-hidden="true"></button>' +
      "</div>" +
      "</article>" +
      "</div>"
    );
  }

  function renderVideoOverlay() {
    var videos = CONTENT_MAP.videos || [];
    if (!videos.length) {
      return "";
    }
    var current = clamp(state.videoLightboxIndex, 0, videos.length - 1);
    var item = videos[current];
    var disablePrev = current <= 0;
    var disableNext = current >= videos.length - 1;
    var embedUrl = rutubeEmbedUrl(item.url);
    var mediaMarkup = embedUrl
      ? '<iframe class="ac-video-lightbox__frame" src="' +
        embedUrl +
        '" title="' +
        item.title +
        '" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'
      : '<img class="ac-video-lightbox__image" src="' + item.poster + '" alt="' + item.title + '">';

    return (
      '<div class="ac-overlay-backdrop" data-action="overlay-backdrop">' +
      '<article class="ac-overlay-card ac-overlay-card--photo ac-overlay-card--video" role="dialog" aria-modal="true" aria-label="Просмотр видео">' +
      '<div class="ac-overlay-head">' +
      '<h3 class="ac-overlay-title">' + CONTENT_MAP.sectionTitles.video + "</h3>" +
      '<button class="ac-overlay-close" type="button" data-action="overlay-close" aria-label="' +
      CONTENT_MAP.ui.closeAria +
      '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.close + '" alt="" aria-hidden="true">' +
      "</button>" +
      "</div>" +
      '<div class="ac-photo-lightbox ac-video-lightbox">' +
      '<button class="ac-nav-btn" type="button" data-action="video-lightbox-prev" ' +
      (disablePrev ? "disabled" : "") +
      ' aria-label="' + CONTENT_MAP.ui.prev + '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronLeft + '" alt="" aria-hidden="true"></button>' +
      '<div class="ac-video-lightbox__stage">' +
      mediaMarkup +
      '<p class="ac-video-lightbox__caption">' + item.title + "</p>" +
      "</div>" +
      '<button class="ac-nav-btn" type="button" data-action="video-lightbox-next" ' +
      (disableNext ? "disabled" : "") +
      ' aria-label="' + CONTENT_MAP.ui.next + '">' +
      '<img class="ac-icon ac-icon--sm" src="' + ICON_MAP.chevronRight + '" alt="" aria-hidden="true"></button>' +
      "</div>" +
      "</article>" +
      "</div>"
    );
  }

  function renderOverlays() {
    var overlayRoot = document.getElementById("acOverlayRoot");
    if (!overlayRoot) return;

    if (state.photoLightboxIndex >= 0) {
      overlayRoot.style.pointerEvents = "auto";
      overlayRoot.innerHTML = renderPhotoOverlay();
      return;
    }

    if (state.videoLightboxIndex >= 0) {
      overlayRoot.style.pointerEvents = "auto";
      overlayRoot.innerHTML = renderVideoOverlay();
      return;
    }

    if (state.overlays.shifts) {
      overlayRoot.style.pointerEvents = "auto";
      overlayRoot.innerHTML = renderShiftOverlay();
      startPromoTicker();
      return;
    }

    stopPromoTicker();
    overlayRoot.style.pointerEvents = "none";
    overlayRoot.innerHTML = "";
  }

  function hydratePromoState() {
    var promo = loadShiftPromo();
    if (!promo || !promo.shiftId) return;
    if (Number(promo.age) >= 7 && Number(promo.age) <= 14) {
      state.age = clamp(Number(promo.age), 7, 14);
      ageSelectionConfirmed = true;
      persistAge(state.age);
      if (auditRuntime.active) {
        auditRuntime.ageSelected = true;
      }
    }
    var shift = findExactShiftById(promo.shiftId);
    if (!shift) return;
    state.selectedShiftId = shift.id;
    state.direction = shift.direction;
    if (state.step === 0 && ageSelectionConfirmed) {
      state.step = 1;
    }
  }

  function hydrateBookingLeadState() {
    var lead = loadBookingLead();
    if (!lead || typeof lead !== "object") return;

    if (Number(lead.age) >= 7 && Number(lead.age) <= 14) {
      state.age = clamp(Number(lead.age), 7, 14);
      ageSelectionConfirmed = true;
      persistAge(state.age);
      if (auditRuntime.active) {
        auditRuntime.ageSelected = true;
      }
    }

    if (lead.shiftId) {
      var shift = findExactShiftById(String(lead.shiftId));
      if (shift) {
        state.selectedShiftId = shift.id;
        state.direction = shift.direction;
      }
    }

    if (state.step === 0 && ageSelectionConfirmed) {
      state.step = 1;
    }
  }

  function hydrateAgeState() {
    var storedAge = getStoredAgeValue();
    if (!storedAge) return;
    state.age = storedAge;
    ageSelectionConfirmed = true;
    if (state.step === 0) {
      state.step = 1;
    }
    if (auditRuntime.active) {
      auditRuntime.ageSelected = true;
    }
  }

  function openTabTarget(tabElement) {
    var href = tabElement.getAttribute("href");
    if (!href || href.charAt(0) !== "#") return;
    if (state.mode !== "full") return;

    var target = document.querySelector(href);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleClick(event) {
    var techBadgeClose = event.target.closest('[data-action="tech-badge-close"]');
    if (techBadgeClose) {
      dismissTechBadge();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (auditRuntime.active && !auditRuntime.allowUiActions) {
      var inAuditControls = event.target.closest(".ac-audit-panel, .ac-audit-control-panel, .ac-audit-stage-panel");
      var auditBadge = event.target.closest(".ac-audit-badge");
      var inTopAuditControl = event.target.closest("#acAuditToggle");
      if (auditBadge || (!inAuditControls && !inTopAuditControl)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    if (auditRuntime.active && auditRuntime.allowUiActions && auditRuntime.lockUntilAge && !auditRuntime.ageSelected) {
      var inAuditPanels = event.target.closest(".ac-audit-panel, .ac-audit-control-panel, .ac-audit-stage-panel");
      if (!inAuditPanels) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    if (isAgeGateLocked()) {
      var inAgeInput = event.target.closest("#acAgeInput, .ac-age-input");
      var inAuditPanelsForGate = event.target.closest(".ac-audit-panel, .ac-audit-control-panel, .ac-audit-stage-panel");
      if (!inAgeInput && !inAuditPanelsForGate) {
        event.preventDefault();
        event.stopPropagation();
        nudgeAgeSelection();
        return;
      }
    }

    var toggle = event.target.closest('[data-action="toggle-mode"]');
    if (toggle) {
      setMode(state.mode === "full" ? "compact" : "full");
      return;
    }

    var tab = event.target.closest('[data-action="tab"]');
    if (tab) {
      event.preventDefault();
      setActiveTab(tab.dataset.tab || "info");
      openTabTarget(tab);
      return;
    }

    var resumeBooking = event.target.closest('[data-action="resume-booking"]');
    if (resumeBooking) {
      var resumePromo = loadShiftPromo();
      if (resumePromo && resumePromo.shiftId) {
        var resumeShift = findExactShiftById(resumePromo.shiftId);
        if (resumeShift) {
          state.selectedShiftId = resumeShift.id;
          state.direction = resumeShift.direction;
        }
      } else {
        var resumeLead = loadBookingLead();
        if (resumeLead && resumeLead.shiftId) {
          var leadShift = findExactShiftById(String(resumeLead.shiftId));
          if (leadShift) {
            state.selectedShiftId = leadShift.id;
            state.direction = leadShift.direction;
          }
        }
      }
      var resumeMode = String(resumeBooking.getAttribute("data-resume-mode") || "");
      if (resumeMode === "shift") {
        setOverlay("shifts", true);
      } else {
        setStep(SHIFTS.length - 1);
      }
      return;
    }

    var promoReset = event.target.closest('[data-action="promo-reset"]');
    if (promoReset) {
      var promoBeforeReset = loadShiftPromo();
      var bookingLeadBeforeReset = loadBookingLead() || {};
      var allowReset = true;
      if (promoBeforeReset) {
        allowReset = window.confirm("Вы хотите отказаться от брони?");
      }
      if (!allowReset) {
        return;
      }
      if (promoBeforeReset) {
        var cancelShift = promoBeforeReset.shiftId ? findExactShiftById(String(promoBeforeReset.shiftId)) : null;
        var cancelShiftIdx = cancelShift ? SHIFTS.indexOf(cancelShift) : -1;
        var cancelShiftMeta = cancelShiftIdx >= 0 ? getShiftPriceMeta(cancelShift, cancelShiftIdx) : null;
        sendLeadNotification("promo_cancelled", {
          lead_type: "booking_cancelled",
          status: "cancelled",
          phone: String(bookingLeadBeforeReset.phone || promoBeforeReset.phone || ""),
          name: String(bookingLeadBeforeReset.name || ""),
          shift_id: String(promoBeforeReset.shiftId || ""),
          shift_name: String(promoBeforeReset.shiftName || ""),
          shift_date: cancelShiftMeta ? String(cancelShiftMeta.date || "") : "",
          shift_days: cancelShiftMeta ? Number(cancelShiftMeta.days || 0) : 0,
          price_final: Number(promoBeforeReset.finalPrice || 0),
          promo_code: String(promoBeforeReset.code || ""),
          promo_expires_at_ts: Number(promoBeforeReset.expiresAt || 0),
          promo_expires_at_local: formatPromoDeadline(promoBeforeReset.expiresAt || 0)
        });
      }
      clearBookingStatus();
      setOverlay("shifts", false);
      if (state.step === SHIFTS.length - 1) {
        setStep(isAgeGateLocked() ? 0 : 1);
      } else {
        renderInfoCard();
        renderFunnel();
      }
      window.alert("Бронь отменена");
      return;
    }

    var contactButton = event.target.closest('[data-action="open-contact"]');
    if (contactButton) {
      clearContactCloseTimer();
      setOverlay("contact", !state.overlays.contact);
      return;
    }

    var ageResetButton = event.target.closest('[data-action="age-reset"]');
    if (ageResetButton) {
      resetAgeSelection();
      return;
    }

    if (state.overlays.contact && !event.target.closest("#acContactPanel")) {
      setOverlay("contact", false);
      return;
    }

    var nextStep = event.target.closest('[data-action="step-next"]');
    if (nextStep) {
      if (state.step > 0) {
        if (state.overlays.shifts) {
          return;
        }

        track("booking_clicked", {
          step: state.step + 1,
          shift_id: state.selectedShiftId,
          direction: state.direction
        });
        setOverlay("shifts", true);
      } else {
        setStep(state.step + 1);
      }
      return;
    }

    var closeOverlay = event.target.closest('[data-action="overlay-close"]');
    if (closeOverlay) {
      closeAllOverlays();
      return;
    }

    var backdrop = event.target.closest('[data-action="overlay-backdrop"]');
    if (backdrop && event.target === backdrop) {
      closeAllOverlays();
      return;
    }

    var directionButton = event.target.closest('[data-action="set-direction"]');
    if (directionButton) {
      setDirection(directionButton.dataset.direction || "all");
      return;
    }

    var shiftViewButton = event.target.closest('[data-action="set-shift-view"]');
    if (shiftViewButton) {
      setShiftView(shiftViewButton.dataset.shiftView || "list");
      return;
    }

    var shiftAgeButton = event.target.closest('[data-action="shift-age"]');
    if (shiftAgeButton) {
      setAge(Number(shiftAgeButton.dataset.age || 11));
      return;
    }

    var shiftButton = event.target.closest('[data-action="select-shift"]');
    if (shiftButton) {
      setSelectedShift(shiftButton.dataset.shiftId || SHIFTS[0].id);
      return;
    }

    var shiftShowMore = event.target.closest('[data-action="shift-show-more"]');
    if (shiftShowMore) {
      shiftsShowAll = !shiftsShowAll;
      renderOverlays();
      return;
    }

    var shiftCalendarToggle = event.target.closest('[data-action="shift-calendar-toggle"]');
    if (shiftCalendarToggle) {
      event.preventDefault();
      event.stopPropagation();
      var calendarShiftId = shiftCalendarToggle.dataset.shiftId || "";
      if (shiftCalendar.open && shiftCalendar.shiftId === calendarShiftId) {
        shiftCalendar.open = false;
        shiftCalendar.shiftId = "";
      } else {
        shiftCalendar.open = true;
        shiftCalendar.shiftId = calendarShiftId;
      }
      renderOverlays();
      return;
    }

    var shiftCalendarClose = event.target.closest('[data-action="shift-calendar-close"]');
    if (shiftCalendarClose) {
      event.preventDefault();
      event.stopPropagation();
      shiftCalendar.open = false;
      shiftCalendar.shiftId = "";
      renderOverlays();
      return;
    }

    var shiftBookingButton = event.target.closest('[data-action="shift-booking"]');
    if (shiftBookingButton) {
      var bookingFromShiftId = shiftBookingButton.dataset.shiftId || SHIFTS[0].id;
      var bookingFromShift = findShiftById(bookingFromShiftId);
      if (bookingFromShift) {
        state.selectedShiftId = bookingFromShift.id;
        state.direction = bookingFromShift.direction;
      }
      shiftCalendar.open = false;
      shiftCalendar.shiftId = "";
      persistShiftSelectionSnapshot();
      track("booking_clicked", {
        step: state.step + 1,
        shift_id: state.selectedShiftId,
        direction: state.direction,
        source: "shift_card_primary"
      });
      setOverlay("shifts", false);
      setStep(SHIFTS.length - 1);
      return;
    }

    var shiftPriceButton = event.target.closest('[data-action="shift-price"]');
    if (shiftPriceButton) {
      if (
        event.target.closest(".ac-shift-item__date-icon") ||
        event.target.closest(".ac-shift-calendar") ||
        event.target.closest('[data-action="shift-calendar-toggle"]') ||
        event.target.closest('[data-action="shift-calendar-close"]')
      ) {
        return;
      }
      shiftCalendar.open = false;
      shiftCalendar.shiftId = "";
      applyShiftPriceStep(shiftPriceButton.dataset.shiftId || SHIFTS[0].id);
      return;
    }

    var shiftDescriptionButton = event.target.closest('[data-action="shift-description"]');
    if (shiftDescriptionButton) {
      var descriptionShiftId = shiftDescriptionButton.dataset.shiftId || SHIFTS[0].id;
      var descriptionShift = findShiftById(descriptionShiftId);
      if (descriptionShift) {
        state.selectedShiftId = descriptionShift.id;
        state.direction = descriptionShift.direction;
      }
      setOverlay("shifts", false);
      if (state.mode === "compact") {
        setActiveTab("info");
      } else {
        var programSection = document.getElementById("program");
        if (programSection && typeof programSection.scrollIntoView === "function") {
          programSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      return;
    }

    var shiftFixButton = event.target.closest('[data-action="shift-fix"]');
    if (shiftFixButton) {
      var shiftId = shiftFixButton.dataset.shiftId || SHIFTS[0].id;
      var fixPhone = document.getElementById("acShiftFixPhone");
      var rawPhone = fixPhone ? fixPhone.value : "";
      if (!isValidPhone(rawPhone)) {
        if (fixPhone) {
          fixPhone.focus();
          fixPhone.style.borderColor = "#ef8300";
        }
        return;
      }
      if (fixPhone) {
        fixPhone.style.borderColor = "";
      }
      finalizeShiftPromo(shiftId, rawPhone);
      return;
    }

    var bookingSubmit = event.target.closest('[data-action="booking-submit"]');
    if (bookingSubmit) {
      var bookingName = document.getElementById("acBookingName");
      var bookingPhone = document.getElementById("acBookingPhone");
      var bookingConsent = document.getElementById("acBookingConsent");
      var bookingNotice = document.getElementById("acBookingPromoNotice");
      var bookingShift = document.getElementById("acBookingShift");
      var bookingPrice = document.getElementById("acBookingPrice");
      var bookingDiscount = document.getElementById("acBookingDiscount");
      var bookingPromo = document.getElementById("acBookingPromo");
      var phoneRaw = bookingPhone ? bookingPhone.value : "";
      var normalizedPhone = normalizePhone(phoneRaw);
      if (!isValidPhone(phoneRaw)) {
        if (bookingPhone) {
          bookingPhone.focus();
          bookingPhone.style.borderColor = "#ef8300";
        }
        return;
      }
      if (bookingConsent && !bookingConsent.checked) {
        alert("Пожалуйста, согласитесь с обработкой персональных данных.");
        bookingConsent.focus();
        return;
      }

      if (bookingPhone) {
        bookingPhone.style.borderColor = "";
      }

      var bookingShiftItem = findShiftById(state.selectedShiftId);
      var bookingShiftIdx = SHIFTS.indexOf(bookingShiftItem);
      var bookingShiftMeta = bookingShiftIdx >= 0
        ? getShiftPriceMeta(bookingShiftItem, bookingShiftIdx)
        : null;
      var bookingPromoState = loadShiftPromo();
      var basePrice = bookingShiftMeta ? Number(bookingShiftMeta.basePrice || 0) : 0;
      var finalPrice = bookingPromoState ? Number(bookingPromoState.finalPrice || basePrice) : basePrice;
      var discountAmount = Math.max(0, basePrice - finalPrice);

      saveBookingLead({
        name: bookingName ? String(bookingName.value || "").trim() : "",
        phone: normalizedPhone,
        shiftId: state.selectedShiftId,
        shiftText: bookingShift ? String(bookingShift.value || "") : "",
        priceText: bookingPrice ? String(bookingPrice.value || "") : "",
        priceBase: basePrice,
        priceFinal: finalPrice,
        discountText: bookingDiscount ? String(bookingDiscount.value || "") : "",
        discountValue: discountAmount,
        promoCode: bookingPromo ? String(bookingPromo.value || "") : "",
        consent: !!(bookingConsent && bookingConsent.checked),
        submitted: true,
        submittedAt: Date.now(),
        age: state.age,
        expiresAt: bookingPromoState ? Number(bookingPromoState.expiresAt || 0) : 0
      });

      sendLeadNotification("booking_submitted", {
        lead_type: "booking_final",
        status: "final",
        phone: normalizedPhone,
        name: bookingName ? String(bookingName.value || "").trim() : "",
        shift_id: state.selectedShiftId,
        shift_name: bookingShiftItem ? getShiftSummaryByAge(bookingShiftItem, state.age) : "",
        shift_direction: bookingShiftItem ? (bookingShiftItem.direction || "") : "",
        shift_text: bookingShift ? String(bookingShift.value || "") : "",
        shift_date: bookingShiftMeta ? bookingShiftMeta.date : "",
        shift_days: bookingShiftMeta ? bookingShiftMeta.days : 0,
        price_text: bookingPrice ? String(bookingPrice.value || "") : "",
        promo_code: bookingPromo ? String(bookingPromo.value || "") : "",
        promo_status: bookingPromoState ? String(bookingPromoState.status || "") : "",
        promo_expires_at_ts: bookingPromoState ? Number(bookingPromoState.expiresAt || 0) : 0,
        promo_expires_at_local: bookingPromoState ? formatPromoDeadline(bookingPromoState.expiresAt || 0) : "",
        consent: !!(bookingConsent && bookingConsent.checked)
      });

      bookingSubmit.disabled = true;
      bookingSubmit.textContent = "Заявка отправлена";
      if (bookingNotice) {
        bookingNotice.hidden = false;
        bookingNotice.textContent = "Ваша бронь оформлена, ждите подтверждения от менеджера.";
      }
      var bookingFormNode = document.getElementById("acBookingForm");
      if (bookingFormNode) {
        bookingFormNode.classList.add("is-submitted");
        var bookingConsentBlock = bookingFormNode.querySelector(".ac-booking-form__consent");
        if (bookingConsentBlock) {
          bookingConsentBlock.hidden = true;
        }
      }
      renderInfoCard();
      renderFunnel();
      if (auditRuntime.active && typeof auditRuntime.stageSync === "function") {
        auditRuntime.stageSync();
      }
      return;
    }

    var photoCategoryButton = event.target.closest('[data-action="photo-cat"]');
    if (photoCategoryButton) {
      setPhotoCategory(photoCategoryButton.dataset.photoCat || "all");
      return;
    }

    if (event.target.closest('[data-action="photo-prev"]')) {
      setPhotoPage(state.photoPage - 1);
      return;
    }

    if (event.target.closest('[data-action="photo-next"]')) {
      setPhotoPage(state.photoPage + 1);
      return;
    }

    var photoOpen = event.target.closest('[data-action="photo-open"]');
    if (photoOpen) {
      setPhotoLightbox(Number(photoOpen.dataset.photoIndex || 0));
      return;
    }

    if (event.target.closest('[data-action="photo-lightbox-prev"]')) {
      setPhotoLightbox(state.photoLightboxIndex - 1);
      return;
    }

    if (event.target.closest('[data-action="photo-lightbox-next"]')) {
      setPhotoLightbox(state.photoLightboxIndex + 1);
      return;
    }

    if (event.target.closest('[data-action="video-prev"]')) {
      setVideoPage(state.videoPage - 1);
      return;
    }

    if (event.target.closest('[data-action="video-next"]')) {
      setVideoPage(state.videoPage + 1);
      return;
    }

    var videoOpen = event.target.closest('[data-action="video-open"]');
    if (videoOpen) {
      setVideoLightbox(Number(videoOpen.dataset.videoIndex || 0));
      return;
    }

    if (event.target.closest('[data-action="video-lightbox-prev"]')) {
      setVideoLightbox(state.videoLightboxIndex - 1);
      return;
    }

    if (event.target.closest('[data-action="video-lightbox-next"]')) {
      setVideoLightbox(state.videoLightboxIndex + 1);
      return;
    }

    if (event.target.closest('[data-action="reviews-prev"]')) {
      setReviewPage(state.reviewPage - 1);
      return;
    }

    if (event.target.closest('[data-action="reviews-next"]')) {
      setReviewPage(state.reviewPage + 1);
      return;
    }

    if (event.target.closest('[data-action="team-prev"]')) {
      setTeamPage(state.teamPage - 1);
      return;
    }

    if (event.target.closest('[data-action="team-next"]')) {
      setTeamPage(state.teamPage + 1);
      return;
    }

    var faqOverlayItem = event.target.closest(".ac-left-faq__item");
    if (faqOverlayItem) {
      var faqScope = faqOverlayItem.closest(".ac-left-faq");
      if (faqScope) {
        var items = faqScope.querySelectorAll(".ac-left-faq__item");
        for (var i = 0; i < items.length; i += 1) {
          if (items[i] !== faqOverlayItem) {
            items[i].classList.remove("is-open");
          }
        }
      }
      faqOverlayItem.classList.toggle("is-open");
      return;
    }

    var faqCategory = event.target.closest('[data-action="faq-cat"]');
    if (faqCategory) {
      setFaqCategory(faqCategory.dataset.faqCat || "medicine");
    }
  }

  function handleInput(event) {
    if (auditRuntime.active && !auditRuntime.allowUiActions) {
      var inAuditControls = event.target.closest(".ac-audit-panel, .ac-audit-control-panel, .ac-audit-stage-panel");
      if (!inAuditControls) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    var bookingPhone = event.target.closest("#acBookingPhone");
    if (bookingPhone) {
      bookingPhone.value = formatPhoneInput(bookingPhone.value);
      bookingPhone.style.borderColor = bookingPhone.value
        ? (isValidPhone(bookingPhone.value) ? "" : "#ef8300")
        : "";

      var bookingSubmit = document.querySelector('[data-action="booking-submit"]');
      var bookingLead = loadBookingLead() || {};
      var bookingConsent = document.getElementById("acBookingConsent");
      if (bookingSubmit) {
        bookingSubmit.disabled = !canSubmitBooking(
          bookingPhone.value,
          bookingConsent ? bookingConsent.checked : false,
          !!bookingLead.submitted
        );
      }
      return;
    }

    var bookingConsentInput = event.target.closest("#acBookingConsent");
    if (bookingConsentInput) {
      var submitButton = document.querySelector('[data-action="booking-submit"]');
      var leadState = loadBookingLead() || {};
      var phoneInput = document.getElementById("acBookingPhone");
      if (submitButton) {
        submitButton.disabled = !canSubmitBooking(
          phoneInput ? phoneInput.value : "",
          bookingConsentInput.checked,
          !!leadState.submitted
        );
      }
      syncBookingFixedCardConsentState(bookingConsentInput.checked);
      return;
    }

    var shiftFixPhone = event.target.closest("#acShiftFixPhone");
    if (shiftFixPhone) {
      shiftFixPhone.value = formatPhoneInput(shiftFixPhone.value);
      shiftFixPhone.style.borderColor = shiftFixPhone.value
        ? (isValidPhone(shiftFixPhone.value) ? "" : "#ef8300")
        : "";
      var promoState = loadShiftPromo();
      if (promoState && promoState.status === "phone_gate") {
        promoState.pendingPhone = normalizePhone(shiftFixPhone.value);
        saveShiftPromo(promoState);
      }
      return;
    }

    var ageInput = event.target.closest("#acAgeInput");
    if (!ageInput) return;

    setAge(sliderValueToAge(Number(ageInput.value)));
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      closeAllOverlays();
    }
  }

  function setupAuditToggleButton() {
    var existing = document.getElementById("acAuditToggle");
    if (existing) return;

    var button = document.createElement("button");
    button.id = "acAuditToggle";
    button.className = "ac-audit-toggle-btn";
    button.type = "button";
    button.setAttribute("aria-label", "Переключить audit режим");

    var isAudit = false;
    try {
      isAudit = (window.location.search || "").indexOf("audit=1") !== -1;
    } catch (_err) {
      isAudit = false;
    }

    button.textContent = isAudit ? "Audit OFF" : "Audit ON";

    button.addEventListener("click", function () {
      var url;
      try {
        url = new URL(window.location.href);
      } catch (_err) {
        return;
      }

      if (url.searchParams.get("audit") === "1") {
        url.searchParams.delete("audit");
      } else {
        url.searchParams.set("audit", "1");
      }

      window.location.href = url.toString();
    });

    document.body.appendChild(button);
  }

  function enableAuditMode() {
    var search = "";
    try {
      search = window.location.search || "";
    } catch (_err) {
      return;
    }

    if (search.indexOf("audit=1") === -1) return;

    var auditGroups = [
      { id: "topnav", label: "TopNav" },
      { id: "hero", label: "Hero" },
      { id: "funnel", label: "Funnel" },
      { id: "program", label: "Программа" },
      { id: "format", label: "Формат" },
      { id: "ai", label: "AI" },
      { id: "location", label: "Локация" },
      { id: "photos", label: "Фото" },
      { id: "video", label: "Видео" },
      { id: "reviews", label: "Отзывы" },
      { id: "team", label: "Команда" },
      { id: "faq", label: "FAQ" },
      { id: "footer", label: "Footer" }
    ];

    var auditTargets = [
      { group: "topnav", selector: "#acViewToggle", label: "Toggle: Режим кратко/подробно" },
      { group: "topnav", selector: "#acTopNav", label: "TopNav: контейнер" },
      { group: "topnav", selector: "#acTopNav [data-action='tab']", label: "TopNav: пункт меню", all: true },

      { group: "hero", selector: ".ac-compact-nav", label: "Hero: компактное меню" },
      { group: "hero", selector: ".ac-compact-nav [data-action='tab']", label: "Hero: иконка меню", all: true },
      { group: "hero", selector: ".ac-hero-left", label: "Hero Left: контейнер" },
      { group: "hero", selector: "#acHeroTitle", label: "Hero Left: главный заголовок" },
      { group: "hero", selector: "#acHeroSubtitle", label: "Hero Left: подзаголовок" },
      { group: "hero", selector: "#acHeroProgress", label: "Hero Left: прогресс" },
      { group: "hero", selector: "#acHeroBenefits li", label: "Hero Left: пункт преимуществ", all: true },
      { group: "hero", selector: "#acAgeLabel", label: "Hero Left: лейбл возраста" },
      { group: "hero", selector: "#acAgeText", label: "Hero Left: текст возраста" },
      { group: "hero", selector: ".ac-age-bar", label: "Hero Left: контейнер слайдера" },
      { group: "hero", selector: "#acAgeInput", label: "Hero Left: возраст слайдер" },
      { group: "hero", selector: ".ac-age-marks", label: "Hero Left: шкала возрастов" },
      { group: "hero", selector: ".ac-social-row a", label: "Hero Left: соцкнопка", all: true },
      { group: "hero", selector: ".ac-hero-right", label: "Hero Right: контейнер" },
      { group: "hero", selector: ".ac-hero-pill--left", label: "Hero Right: кнопка Связаться" },
      { group: "hero", selector: ".ac-hero-pill--right", label: "Hero Right: плашка AI-программы" },

      { group: "funnel", selector: ".ac-hero-overlay", label: "Funnel: контейнер" },
      { group: "funnel", selector: ".ac-hero-right__bg", label: "Funnel: слой фона" },
      { group: "funnel", selector: ".ac-hero-right__scrim", label: "Funnel: слой затемнения" },
      { group: "funnel", selector: ".ac-funnel-body", label: "Funnel: слой контента" },
      { group: "funnel", selector: ".ac-hero-grid", label: "Funnel: слой сетки" },
      { group: "funnel", selector: ".ac-funnel-controls", label: "Funnel: слой контролов" },
      { group: "funnel", selector: "#acHeroOverlayTitle", label: "Funnel: заголовок" },
      { group: "funnel", selector: "#acProgramLine", label: "Funnel: строка программы" },
      { group: "funnel", selector: "#acProgramSummary", label: "Funnel: описание" },
      { group: "funnel", selector: ".ac-hero-grid__item", label: "Funnel: карточка безопасности", all: true },
      { group: "funnel", selector: ".ac-funnel-controls [data-action='step-next']", label: "Funnel: кнопка далее/цены" },

      { group: "program", selector: "#program", label: "Программа: секция" },
      { group: "program", selector: "#program h2", label: "Программа: заголовок" },
      { group: "program", selector: "#program .ac-card", label: "Программа: карточка", all: true },

      { group: "format", selector: "#format", label: "Формат: секция" },
      { group: "format", selector: "#format h2", label: "Формат: заголовок" },
      { group: "format", selector: "#format .ac-card", label: "Формат: карточка", all: true },

      { group: "ai", selector: "#ai", label: "AI: секция" },
      { group: "ai", selector: "#ai h2", label: "AI: заголовок" },
      { group: "ai", selector: "#ai .ac-card", label: "AI: карточка", all: true },

      { group: "location", selector: "#location", label: "Локация: секция" },
      { group: "location", selector: "#location h2", label: "Локация: заголовок" },
      { group: "location", selector: "#location .ac-card", label: "Локация: карточка", all: true },

      { group: "photos", selector: "#photos", label: "Фото: секция" },
      { group: "photos", selector: "#photos h2", label: "Фото: заголовок" },
      { group: "photos", selector: "#photos .ac-filter-chip", label: "Фото: фильтр", all: true },
      { group: "photos", selector: "#photos [data-action='photo-prev'], #photos [data-action='photo-next']", label: "Фото: навигация", all: true },
      { group: "photos", selector: "#photos .ac-photo-strip img", label: "Фото: изображение", all: true },

      { group: "video", selector: "#video", label: "Видео: секция" },
      { group: "video", selector: "#video h2", label: "Видео: заголовок" },
      { group: "video", selector: "#video .ac-video-card", label: "Видео: карточка", all: true },
      { group: "video", selector: "#video [data-action='video-prev'], #video [data-action='video-next']", label: "Видео: навигация", all: true },

      { group: "reviews", selector: "#reviews", label: "Отзывы: секция" },
      { group: "reviews", selector: "#reviews h2", label: "Отзывы: заголовок" },
      { group: "reviews", selector: "#reviews .ac-review-card", label: "Отзывы: карточка", all: true },
      { group: "reviews", selector: "#reviews [data-action='reviews-prev'], #reviews [data-action='reviews-next']", label: "Отзывы: навигация", all: true },

      { group: "team", selector: "#team", label: "Команда: секция" },
      { group: "team", selector: "#team h2", label: "Команда: заголовок" },
      { group: "team", selector: "#team .ac-team-card", label: "Команда: карточка", all: true },
      { group: "team", selector: "#team [data-action='team-prev'], #team [data-action='team-next']", label: "Команда: навигация", all: true },

      { group: "faq", selector: "#faq", label: "FAQ: секция" },
      { group: "faq", selector: "#faq h2", label: "FAQ: заголовок" },
      { group: "faq", selector: "#faq .ac-faq-tab", label: "FAQ: таб", all: true },
      { group: "faq", selector: "#faq .ac-faq-item", label: "FAQ: пункт", all: true },

      { group: "footer", selector: ".ac-footer", label: "Footer: контейнер" },
      { group: "footer", selector: "#acFooterBrand, #acFooterTagline", label: "Footer: текст", all: true }
    ];

    var nodes = [];
    var order = 1;

    for (var i = 0; i < auditTargets.length; i += 1) {
      var target = auditTargets[i];
        if (target.all) {
          var many = document.querySelectorAll(target.selector);
          for (var k = 0; k < many.length; k += 1) {
            var elMany = many[k];
            if (!elMany) continue;
            elMany.classList.add("ac-audit-target");
            var posMany = "";
            try {
              posMany = window.getComputedStyle(elMany).position || "";
            } catch (_errPosMany) {
              posMany = "";
            }
            if (posMany === "static" || !posMany) {
              elMany.classList.add("ac-audit-target--relative");
            }
            elMany.setAttribute("data-audit-index", String(order));
            elMany.setAttribute("data-audit-label", target.label + " #" + String(k + 1));
            elMany.setAttribute("data-audit-group", target.group);
          elMany.style.setProperty("--ac-audit-badge-x", String(3 + ((order - 1) % 3) * 24) + "px");
          elMany.style.setProperty("--ac-audit-badge-y", String(3 + Math.floor(((order - 1) % 6) / 3) * 24) + "px");
          var badgeMany = document.createElement("button");
          badgeMany.type = "button";
          badgeMany.className = "ac-audit-badge";
          badgeMany.setAttribute("aria-label", "Блок " + String(order));
          badgeMany.textContent = String(order);
          elMany.appendChild(badgeMany);
          nodes.push({
            index: order,
            label: target.label + " #" + String(k + 1),
            group: target.group,
            node: elMany,
            badge: badgeMany
          });
          order += 1;
        }
      } else {
        var el = document.querySelector(target.selector);
        if (!el) continue;
        el.classList.add("ac-audit-target");
        var pos = "";
        try {
          pos = window.getComputedStyle(el).position || "";
        } catch (_errPos) {
          pos = "";
        }
        if (pos === "static" || !pos) {
          el.classList.add("ac-audit-target--relative");
        }
        el.setAttribute("data-audit-index", String(order));
        el.setAttribute("data-audit-label", target.label);
        el.setAttribute("data-audit-group", target.group);
        el.style.setProperty("--ac-audit-badge-x", String(3 + ((order - 1) % 3) * 24) + "px");
        el.style.setProperty("--ac-audit-badge-y", String(3 + Math.floor(((order - 1) % 6) / 3) * 24) + "px");
        if (target.selector === ".ac-age-bar") {
          el.style.setProperty("--ac-audit-badge-x", "6px");
          el.style.setProperty("--ac-audit-badge-y", "-12px");
        }
        if (target.selector === "#acAgeInput") {
          el.style.setProperty("--ac-audit-badge-x", "2px");
          el.style.setProperty("--ac-audit-badge-y", "-18px");
        }
        var badge = document.createElement("button");
        badge.type = "button";
        badge.className = "ac-audit-badge";
        badge.setAttribute("aria-label", "Блок " + String(order));
        badge.textContent = String(order);
        el.appendChild(badge);
        nodes.push({
          index: order,
          label: target.label,
          group: target.group,
          node: el,
          badge: badge
        });
        order += 1;
      }
    }

    for (var c = 0; c < nodes.length; c += 1) {
      var maybeContainer = nodes[c].node;
      var descendants = maybeContainer.querySelectorAll(".ac-audit-target");
      var hasNestedTargets = false;
      for (var d = 0; d < descendants.length; d += 1) {
        if (descendants[d] !== maybeContainer) {
          hasNestedTargets = true;
          break;
        }
      }
      if (hasNestedTargets) {
        maybeContainer.classList.add("ac-audit-target--container");
      }
    }

    document.body.classList.add("ac-audit-mode");
    auditRuntime.active = true;
    auditRuntime.allowUiActions = false;
    auditRuntime.allowDrag = true;
    auditRuntime.snapGrid = 4;
    auditRuntime.normalizeToParent = true;
    auditRuntime.lockUntilAge = true;
    auditRuntime.ageSelected = false;
    auditRuntime.secondaryLayer = true;

    var panel = document.createElement("aside");
    panel.className = "ac-audit-panel";
    panel.innerHTML =
      '<div class="ac-audit-panel__toolbar">' +
      '<div class="ac-audit-panel__head">Hero Audit Map</div>' +
      '<button class="ac-audit-panel__toggle" type="button" aria-label="Сбросить позиции блоков" data-action="audit-reset-pos">Сброс</button>' +
      '<button class="ac-audit-panel__toggle" type="button" aria-label="Развернуть панель" data-action="audit-toggle">Развернуть</button>' +
      "</div>" +
      '<div class="ac-audit-panel__sub">Глобальная нумерация всех значимых блоков сайта</div>' +
      '<div class="ac-audit-groups"></div>' +
      '<ol class="ac-audit-panel__list"></ol>';

    var controlPanel = document.createElement("aside");
    controlPanel.className = "ac-audit-control-panel";
    controlPanel.innerHTML =
      '<div class="ac-audit-control-panel__toolbar">' +
      '<div class="ac-audit-control-panel__head">Audit Actions</div>' +
      '<button class="ac-audit-panel__toggle" type="button" data-action="audit-control-toggle" aria-label="Развернуть панель действий">Развернуть</button>' +
      "</div>" +
      '<div class="ac-audit-control-panel__statuses">' +
      '<button class="ac-audit-status is-on" type="button" data-action="audit-ui-toggle">UI OFF</button>' +
      '<button class="ac-audit-status is-on" type="button" data-action="audit-drag-toggle">DRAG ON</button>' +
      '<button class="ac-audit-status is-on" type="button" data-action="audit-snap-toggle">SNAP 4PX</button>' +
      '<button class="ac-audit-status is-on" type="button" data-action="audit-normalize-toggle">NORM PARENT ON</button>' +
      '<button class="ac-audit-status" type="button" data-action="audit-apply-confirmed">APPLY CONFIRMED</button>' +
      '<button class="ac-audit-status" type="button" data-action="audit-log-clear">CLEAR LOG</button>' +
      "</div>" +
      '<div class="ac-audit-control-panel__sub">Перетащите бейдж блока, затем отметьте статус привязки.</div>' +
      '<ol class="ac-audit-control-panel__moved"></ol>' +
      '<pre class="ac-audit-control-panel__apply-log">Нет подтвержденных правок</pre>' +
      '<ol class="ac-audit-control-panel__journal"><li class="ac-audit-control-panel__empty">Журнал пуст</li></ol>';

    var stagePanel = document.createElement("aside");
    stagePanel.className = "ac-audit-stage-panel";
    stagePanel.innerHTML =
      '<div class="ac-audit-stage-panel__toolbar">' +
      '<div class="ac-audit-stage-panel__head">Site Stages</div>' +
      '<button class="ac-audit-panel__toggle" type="button" data-action="audit-stage-toggle" aria-label="Развернуть стадии">Развернуть</button>' +
      "</div>" +
      '<div class="ac-audit-stage-panel__statuses">' +
      '<button class="ac-audit-status is-on" type="button" data-action="audit-stage-lock-toggle">LOCK UNTIL AGE ON</button>' +
      '<button class="ac-audit-status is-on" type="button" data-action="audit-layer-toggle">LAYER B ON</button>' +
      '<button class="ac-audit-status" type="button" data-action="audit-stage-reset">RESET STAGES</button>' +
      "</div>" +
      '<ol class="ac-audit-stage-panel__list"></ol>';

    var groupsState = {};
    for (var g = 0; g < auditGroups.length; g += 1) {
      groupsState[auditGroups[g].id] = true;
    }

    var groupsWrap = panel.querySelector(".ac-audit-groups");
    if (groupsWrap) {
      var groupsHtml = "";
      groupsHtml += '<button class="ac-audit-group is-on" type="button" data-action="audit-group-all-on">Все ON</button>';
      groupsHtml += '<button class="ac-audit-group" type="button" data-action="audit-group-all-off">Все OFF</button>';
      for (var gg = 0; gg < auditGroups.length; gg += 1) {
        groupsHtml +=
          '<button class="ac-audit-group is-on" type="button" data-action="audit-group-toggle" data-group="' +
          auditGroups[gg].id +
          '">' +
          auditGroups[gg].label +
          "</button>";
      }
      groupsWrap.innerHTML = groupsHtml;
    }

    var list = panel.querySelector(".ac-audit-panel__list");
    if (list) {
      for (var j = 0; j < nodes.length; j += 1) {
        var item = nodes[j];
        var li = document.createElement("li");
        li.className = "ac-audit-panel__item";
        li.setAttribute("data-group", item.group);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ac-audit-jump";
        btn.setAttribute("data-index", String(item.index));
        btn.setAttribute("data-group", item.group);
        btn.textContent = String(item.index) + ". " + item.label;
        li.appendChild(btn);
        list.appendChild(li);
        item.listItem = li;
      }
    }

    var movedOrder = [];
    var movedMap = {};
    var statusFlow = ["draft", "aligned", "fixed"];
    var changeLog = [];

    function toPercent(value, total) {
      if (!total) return "0.00%";
      return (Math.round((value / total) * 10000) / 100).toFixed(2) + "%";
    }

    function readAnchor(item) {
      var rect = item.node.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var anchorX = centerX <= window.innerWidth / 2 ? "left" : "right";
      var anchorY = centerY <= window.innerHeight / 2 ? "top" : "bottom";
      var offsetX = anchorX === "left" ? rect.left : window.innerWidth - rect.right;
      var offsetY = anchorY === "top" ? rect.top : window.innerHeight - rect.bottom;
      return {
        anchorX: anchorX,
        anchorY: anchorY,
        offsetX: Math.round(offsetX),
        offsetY: Math.round(offsetY),
        normX: toPercent(offsetX, window.innerWidth),
        normY: toPercent(offsetY, window.innerHeight)
      };
    }

    function getNodeSelector(node) {
      if (!node) return "unknown";
      if (node.id) return "#" + node.id;
      if (node.classList && node.classList.length) return "." + node.classList[0];
      return String(node.tagName || "node").toLowerCase();
    }

    function readParentAnchor(item) {
      var nodeRect = item.node.getBoundingClientRect();
      var parent = item.node.parentElement;
      if (!parent) {
        return {
          parentSelector: "document",
          anchorX: "left",
          anchorY: "top",
          left: Math.round(nodeRect.left),
          top: Math.round(nodeRect.top),
          right: Math.round(window.innerWidth - nodeRect.right),
          bottom: Math.round(window.innerHeight - nodeRect.bottom),
          offsetX: Math.round(nodeRect.left),
          offsetY: Math.round(nodeRect.top),
          normX: toPercent(nodeRect.left, window.innerWidth),
          normY: toPercent(nodeRect.top, window.innerHeight)
        };
      }
      var parentRect = parent.getBoundingClientRect();
      var relLeft = nodeRect.left - parentRect.left;
      var relTop = nodeRect.top - parentRect.top;
      var relRight = parentRect.right - nodeRect.right;
      var relBottom = parentRect.bottom - nodeRect.bottom;
      return {
        parentSelector: getNodeSelector(parent),
        anchorX: "left",
        anchorY: "top",
        left: Math.round(relLeft),
        top: Math.round(relTop),
        right: Math.round(relRight),
        bottom: Math.round(relBottom),
        offsetX: Math.round(relLeft),
        offsetY: Math.round(relTop),
        normX: toPercent(relLeft, parentRect.width || 1),
        normY: toPercent(relTop, parentRect.height || 1)
      };
    }

    function normalizeToGrid(value) {
      var grid = auditRuntime.snapGrid || 0;
      if (!grid || grid < 1) return value;
      return Math.round(value / grid) * grid;
    }

    function syncControlPanelState() {
      var uiBtn = controlPanel.querySelector('[data-action="audit-ui-toggle"]');
      var dragBtn = controlPanel.querySelector('[data-action="audit-drag-toggle"]');
      var snapBtn = controlPanel.querySelector('[data-action="audit-snap-toggle"]');
      var normalizeBtn = controlPanel.querySelector('[data-action="audit-normalize-toggle"]');

      if (uiBtn) {
        uiBtn.classList.toggle("is-on", !auditRuntime.allowUiActions);
        uiBtn.textContent = auditRuntime.allowUiActions ? "UI ON" : "UI OFF";
      }

      if (dragBtn) {
        dragBtn.classList.toggle("is-on", auditRuntime.allowDrag);
        dragBtn.textContent = auditRuntime.allowDrag ? "DRAG ON" : "DRAG OFF";
      }

      if (snapBtn) {
        var snapOn = !!auditRuntime.snapGrid;
        snapBtn.classList.toggle("is-on", snapOn);
        snapBtn.textContent = snapOn ? "SNAP " + String(auditRuntime.snapGrid) + "PX" : "SNAP OFF";
      }

      if (normalizeBtn) {
        normalizeBtn.classList.toggle("is-on", auditRuntime.normalizeToParent);
        normalizeBtn.textContent = auditRuntime.normalizeToParent ? "NORM PARENT ON" : "NORM PARENT OFF";
      }
    }

    function renderSecondaryNumberingLayer() {
      for (var ri = 0; ri < nodes.length; ri += 1) {
        if (!nodes[ri] || !nodes[ri].node) continue;
        var oldBadge = nodes[ri].node.querySelector(".ac-audit-badge--layer2");
        if (oldBadge && oldBadge.parentNode) {
          oldBadge.parentNode.removeChild(oldBadge);
        }
      }

      if (!auditRuntime.secondaryLayer) return;

      var seq = 1;
      for (var ni = 0; ni < nodes.length; ni += 1) {
        var item = nodes[ni];
        if (!item || !item.node) continue;
        if (item.node.classList.contains("ac-audit-target--hidden")) continue;
        var b = document.createElement("span");
        b.className = "ac-audit-badge ac-audit-badge--layer2";
        b.textContent = "B" + String(seq);
        b.setAttribute("title", item.label || ("Block " + String(seq)));
        item.node.appendChild(b);
        seq += 1;
      }
    }

    function setWorkflowMarker(key, node, code, title) {
      var marker = document.querySelector('[data-audit-workflow-marker="' + key + '"]');
      if (!node || !code) {
        if (marker && marker.parentNode) {
          marker.parentNode.removeChild(marker);
        }
        return;
      }

      if (!marker) {
        marker = document.createElement("span");
        marker.className = "ac-audit-workflow-marker";
        marker.setAttribute("data-audit-workflow-marker", key);
      }

      if (marker.parentNode !== node) {
        if (marker.parentNode) {
          marker.parentNode.removeChild(marker);
        }
        node.appendChild(marker);
      }

      node.classList.add("ac-audit-state-host");
      marker.textContent = code;
      marker.setAttribute("title", title || code);
      marker.setAttribute("aria-label", "Workflow state " + code);
    }

    function getBookingWorkflowState() {
      var promo = loadShiftPromo();
      var lead = loadBookingLead() || {};
      var resumeContext = getResumePromoContext();
      var isBookingStep = state.step === SHIFTS.length - 1;
      var hasResumeCard = !!resumeContext && !isBookingStep;
      var promoStatus = promo ? String(promo.status || "draft") : "none";
      var promoStage = promo ? Number(promo.priceStage || 0) : 0;

      if (!ageSelectionConfirmed && state.step === 0) {
        return {
          code: "B00",
          title: "Ожидание выбора возраста",
          meta: "Доступ к бронированию заблокирован",
          done: false
        };
      }

      if (state.overlays.shifts) {
        if (promoStatus === "checking_first") {
          return {
            code: "B21",
            title: "Поиск персональной цены",
            meta: "Окно смен открыто: идёт первый расчёт",
            done: false
          };
        }
        if (promoStatus === "phone_gate") {
          return {
            code: "B23",
            title: "Фиксация цены по телефону",
            meta: "Окно смен открыто: ожидается ввод телефона",
            done: false
          };
        }
        if (promoStatus === "active") {
          return {
            code: "B24",
            title: "Цена зафиксирована",
            meta: "Окно смен открыто: активна 72ч фиксация",
            done: false
          };
        }
        if (promoStage >= 1) {
          return {
            code: "B22",
            title: "Первое улучшение получено",
            meta: "Окно смен открыто: есть улучшенная цена и промокод",
            done: false
          };
        }
        return {
          code: "B20",
          title: "Выбор смены",
          meta: "Окно смен открыто: базовый список",
          done: false
        };
      }

      if (isBookingStep) {
        if (lead.submitted) {
          return {
            code: "B40",
            title: "Заявка отправлена",
            meta: "Форма бронирования подтверждена",
            done: true
          };
        }
        if (promoStatus === "active") {
          return {
            code: "B33",
            title: "Финальная форма с фиксацией",
            meta: "Шаг бронирования: активный промокод 72ч",
            done: false
          };
        }
        if (promoStage >= 1) {
          return {
            code: "B32",
            title: "Финальная форма с улучшенной ценой",
            meta: "Шаг бронирования: применена персональная цена",
            done: false
          };
        }
        return {
          code: "B30",
          title: "Финальная форма бронирования",
          meta: "Шаг бронирования без промокода",
          done: false
        };
      }

      if (hasResumeCard) {
        if (resumeContext.submitted) {
          return {
            code: "B51",
            title: "Возврат после отправки заявки",
            meta: "В Hero Right показано сохранённое бронирование",
            done: true
          };
        }
        return {
          code: "B50",
          title: "Возврат к сохранённому подбору",
          meta: "В Hero Right показан resume-блок",
          done: false
        };
      }

      return {
        code: "B10",
        title: "Базовый рабочий экран",
        meta: "Интерфейс открыт, бронирование не начато",
        done: false
      };
    }

    function getPromoWorkflowState() {
      var promo = loadShiftPromo();
      if (!promo) {
        return { code: "P00", meta: "Промо-состояние отсутствует" };
      }

      var status = String(promo.status || "draft");
      var stage = Number(promo.priceStage || 0);
      if (status === "checking_first") {
        return { code: "P10", meta: "Идёт проверка и поиск первой цены" };
      }
      if (status === "phone_gate") {
        return { code: "P20", meta: "Ожидается телефон для фиксации 72ч" };
      }
      if (status === "active") {
        return { code: "P30", meta: "Цена зафиксирована, таймер активен" };
      }
      if (stage >= 1) {
        return { code: "P11", meta: "Первая улучшенная цена и промокод сохранены" };
      }
      return { code: "P01", meta: "Черновик промо без улучшений" };
    }

    function renderWorkflowStateMarkers() {
      var workflowState = getBookingWorkflowState();
      var promoState = getPromoWorkflowState();

      setWorkflowMarker(
        "hero-right",
        document.querySelector(".ac-hero-right"),
        workflowState.code,
        workflowState.title + " — " + workflowState.meta
      );

      var resumeHost = document.getElementById("acHeroResumeCard");
      var resumeCard = resumeHost && !resumeHost.hidden
        ? resumeHost.querySelector(".ac-booking-fixed__card")
        : null;
      setWorkflowMarker(
        "hero-resume",
        resumeCard,
        resumeCard ? workflowState.code : "",
        resumeCard ? ("Resume: " + workflowState.meta) : ""
      );

      var bookingFixedHost = document.getElementById("acBookingFixedCard");
      var bookingFixedCard = bookingFixedHost && !bookingFixedHost.hidden
        ? bookingFixedHost.querySelector(".ac-booking-fixed__card")
        : null;
      setWorkflowMarker(
        "booking-fixed",
        bookingFixedCard,
        bookingFixedCard ? workflowState.code : "",
        bookingFixedCard ? ("Booking fixed: " + workflowState.meta) : ""
      );

      var shiftsPriceHost = state.overlays.shifts
        ? document.querySelector(".ac-overlay-card--shifts .ac-shift-item--featured .ac-shift-item__price-shell")
        : null;
      setWorkflowMarker(
        "shift-price",
        shiftsPriceHost,
        shiftsPriceHost ? promoState.code : "",
        shiftsPriceHost ? promoState.meta : ""
      );

      var shiftsInfoHost = state.overlays.shifts
        ? document.querySelector(".ac-overlay-card--shifts .ac-shift-item--featured__center")
        : null;
      setWorkflowMarker(
        "shift-info",
        shiftsInfoHost,
        shiftsInfoHost ? workflowState.code : "",
        shiftsInfoHost ? workflowState.meta : ""
      );
    }

    function renderStagePanel() {
      var stageList = stagePanel.querySelector(".ac-audit-stage-panel__list");
      var lockBtn = stagePanel.querySelector('[data-action="audit-stage-lock-toggle"]');
      var layerBtn = stagePanel.querySelector('[data-action="audit-layer-toggle"]');
      if (!stageList) return;

      if (lockBtn) {
        lockBtn.classList.toggle("is-on", auditRuntime.lockUntilAge);
        lockBtn.textContent = auditRuntime.lockUntilAge ? "LOCK UNTIL AGE ON" : "LOCK UNTIL AGE OFF";
      }
      if (layerBtn) {
        layerBtn.classList.toggle("is-on", !!auditRuntime.secondaryLayer);
        layerBtn.textContent = auditRuntime.secondaryLayer ? "LAYER B ON" : "LAYER B OFF";
      }

      var isCompact = state.mode === "compact";
      var stepNumber = state.step + 1;
      var introStep = state.step === 0;
      var ageReady = auditRuntime.ageSelected;
      var lockActive = auditRuntime.lockUntilAge && !ageReady;
      var lineText = "";
      var lineNode = document.getElementById("acProgramLine");
      if (lineNode) {
        var lineClone = lineNode.cloneNode(true);
        var badges = lineClone.querySelectorAll(".ac-audit-badge");
        for (var bi = 0; bi < badges.length; bi += 1) {
          if (badges[bi] && badges[bi].parentNode) {
            badges[bi].parentNode.removeChild(badges[bi]);
          }
        }
        lineText = (lineClone.textContent || "").trim();
      }

      var stages = [
        { code: "S1", title: "Первый вход", meta: isCompact ? "Режим: Кратко" : "Режим: Подробно", active: true, done: isCompact },
        {
          code: "S2",
          title: "Ожидание выбора возраста",
          meta: introStep ? "Правый блок: " + (lineText || "Выберите возраст ребёнка") : "Этап интро пройден",
          active: introStep,
          done: ageReady
        },
        {
          code: "S3",
          title: "Разблокировка сценария",
          meta: lockActive ? "Кнопки заблокированы до выбора возраста" : "Кнопки разблокированы",
          active: !lockActive,
          done: ageReady
        },
        {
          code: "S4",
          title: "Воронка шаги 1-4",
          meta: "Текущий шаг: " + String(stepNumber) + " из 4",
          active: ageReady,
          done: stepNumber >= 4
        }
      ];
      var workflowState = getBookingWorkflowState();
      var promoState = getPromoWorkflowState();
      stages.push({
        code: workflowState.code,
        title: workflowState.title,
        meta: workflowState.meta,
        active: true,
        done: !!workflowState.done
      });
      stages.push({
        code: promoState.code,
        title: "Состояние цены / промокода",
        meta: promoState.meta,
        active: true,
        done: promoState.code === "P30"
      });

      var html = "";
      for (var si = 0; si < stages.length; si += 1) {
        var stage = stages[si];
        var cls = "ac-audit-stage";
        if (stage.done) cls += " is-done";
        else if (stage.active) cls += " is-active";
        html +=
          '<li class="' +
          cls +
          '">' +
          '<div class="ac-audit-stage__row">' +
          '<span class="ac-audit-stage__code">' +
          stage.code +
          "</span>" +
          '<strong class="ac-audit-stage__title">' +
          stage.title +
          "</strong>" +
          "</div>" +
          '<div class="ac-audit-stage__meta">' +
          stage.meta +
          "</div>" +
          "</li>";
      }

      stageList.innerHTML = html;
      renderWorkflowStateMarkers();
      renderSecondaryNumberingLayer();
    }

    function renderMovedList() {
      var movedList = controlPanel.querySelector(".ac-audit-control-panel__moved");
      if (!movedList) return;

      if (!movedOrder.length) {
        movedList.innerHTML = '<li class="ac-audit-control-panel__empty">Пока нет перетаскиваний</li>';
        return;
      }

      var html = "";
      for (var mm = 0; mm < movedOrder.length; mm += 1) {
        var idx = movedOrder[mm];
        var record = movedMap[idx];
        if (!record) continue;
        html +=
          '<li class="ac-audit-moved-item">' +
          '<div class="ac-audit-moved-item__title">#' +
          String(record.index) +
          " " +
          record.label +
          "</div>" +
          '<div class="ac-audit-moved-item__meta">dx ' +
          String(record.dx) +
          "px · dy " +
          String(record.dy) +
          "px · " +
          (auditRuntime.normalizeToParent ? "parent " + record.parentSelector : "viewport") +
          " · " +
          record.anchorX +
          ":" +
          String(record.offsetX) +
          "px · " +
          record.anchorY +
          ":" +
          String(record.offsetY) +
          "px · " +
          record.normX +
          " / " +
          record.normY +
          "</div>" +
          '<div class="ac-audit-moved-item__actions">' +
          '<button class="ac-audit-status ac-audit-status--row' +
          (record.status === "fixed" ? " is-fixed" : "") +
          '" type="button" data-action="audit-item-status" data-index="' +
          String(record.index) +
          '">' +
          "STATUS: " +
          String(record.status).toUpperCase() +
          "</button>" +
          '<button class="ac-audit-status ac-audit-status--row' +
          (record.decision === "accept" ? " is-on" : "") +
          '" type="button" data-action="audit-item-decision" data-index="' +
          String(record.index) +
          '" data-decision="accept">ACCEPT</button>' +
          '<button class="ac-audit-status ac-audit-status--row' +
          (record.decision === "hold" ? " is-on" : "") +
          '" type="button" data-action="audit-item-decision" data-index="' +
          String(record.index) +
          '" data-decision="hold">HOLD</button>' +
          '<button class="ac-audit-status ac-audit-status--row' +
          (record.decision === "reject" ? " is-on" : "") +
          '" type="button" data-action="audit-item-decision" data-index="' +
          String(record.index) +
          '" data-decision="reject">REJECT</button>' +
          '<button class="ac-audit-status ac-audit-status--row" type="button" data-action="audit-item-undo" data-index="' +
          String(record.index) +
          '"' +
          ((record.history && record.history.length) ? "" : " disabled") +
          '>UNDO (' +
          String((record.history && record.history.length) || 0) +
          ")</button>" +
          "</div>" +
          '<input class="ac-audit-comment" type="text" data-action="audit-item-comment" data-index="' +
          String(record.index) +
          '" placeholder="Комментарий для внедрения" value="' +
          String(record.comment || "").replace(/\"/g, "&quot;") +
          '">' +
          "</li>";
      }

      movedList.innerHTML = html;
    }

    function applyConfirmedChanges() {
      var accepted = [];
      for (var ai = 0; ai < movedOrder.length; ai += 1) {
        var idx = movedOrder[ai];
        var record = movedMap[idx];
        if (!record) continue;
        if (record.status === "fixed" && record.decision === "accept") {
          accepted.push(record);
        }
      }

      var logNode = controlPanel.querySelector(".ac-audit-control-panel__apply-log");
      if (!logNode) return;

      if (!accepted.length) {
        logNode.textContent = "Нет подтвержденных правок";
        return;
      }

      var lines = [];
      for (var ri = 0; ri < accepted.length; ri += 1) {
        var r = accepted[ri];
        lines.push(
          "#" +
            String(r.index) +
            " " +
            r.label +
            " | parent=" +
            r.parentSelector +
            " | dx=" +
            String(r.dx) +
            " dy=" +
            String(r.dy) +
            " | " +
            r.anchorX +
            ":" +
            String(r.offsetX) +
            " " +
            r.anchorY +
            ":" +
            String(r.offsetY) +
            " | " +
            r.normX +
            "/" +
            r.normY +
            (r.comment ? " | note: " + r.comment : "")
        );
      }
      logNode.textContent = lines.join("\n");
    }

    function findItemByIndex(index) {
      for (var fi = 0; fi < nodes.length; fi += 1) {
        if (nodes[fi].index === index) return nodes[fi];
      }
      return null;
    }

    function renderChangeLog() {
      var journal = controlPanel.querySelector(".ac-audit-control-panel__journal");
      if (!journal) return;
      if (!changeLog.length) {
        journal.innerHTML = '<li class="ac-audit-control-panel__empty">Журнал пуст</li>';
        return;
      }

      var html = "";
      for (var li = changeLog.length - 1; li >= 0; li -= 1) {
        var row = changeLog[li];
        html +=
          '<li class="ac-audit-log-item">#' +
          String(row.index) +
          " " +
          row.label +
          " · " +
          row.kind +
          " · " +
          row.from +
          " -> " +
          row.to +
          " · " +
          row.parent +
          "</li>";
      }
      journal.innerHTML = html;
    }

    function pushChangeLog(entry) {
      changeLog.push(entry);
      if (changeLog.length > 120) {
        changeLog.shift();
      }
      renderChangeLog();
    }

    function upsertMovedRecord(item, options) {
      var opts = options || {};
      var recordHistory = opts.recordHistory === true;
      var anchor = auditRuntime.normalizeToParent ? readParentAnchor(item) : readAnchor(item);
      var index = item.index;
      if (!movedMap[index]) {
        movedOrder.push(index);
      }
      var prev = movedMap[index] || {};
      var history = prev.history ? prev.history.slice() : [];
      var prevDx = Math.round(prev.dx || 0);
      var prevDy = Math.round(prev.dy || 0);
      var nextDx = Math.round(item.offsetX || 0);
      var nextDy = Math.round(item.offsetY || 0);
      if (recordHistory && (nextDx !== prevDx || nextDy !== prevDy)) {
        history.push({
          dx: prevDx,
          dy: prevDy,
          parentSelector: prev.parentSelector || "viewport",
          anchorX: prev.anchorX || "left",
          anchorY: prev.anchorY || "top",
          offsetX: Math.round(prev.offsetX || 0),
          offsetY: Math.round(prev.offsetY || 0),
          normX: prev.normX || "0.00%",
          normY: prev.normY || "0.00%"
        });
        if (history.length > 30) {
          history.shift();
        }
        pushChangeLog({
          index: index,
          label: item.label,
          kind: "move",
          from: String(prevDx) + "," + String(prevDy),
          to: String(nextDx) + "," + String(nextDy),
          parent: anchor.parentSelector || "viewport"
        });
      }
      movedMap[index] = {
        index: index,
        label: item.label,
        dx: nextDx,
        dy: nextDy,
        status: prev.status || "draft",
        decision: prev.decision || "hold",
        comment: prev.comment || "",
        history: history,
        parentSelector: anchor.parentSelector || "viewport",
        anchorX: anchor.anchorX,
        anchorY: anchor.anchorY,
        offsetX: anchor.offsetX,
        offsetY: anchor.offsetY,
        normX: anchor.normX,
        normY: anchor.normY
      };
      renderMovedList();
    }

    function syncGroupFilters() {
      for (var n = 0; n < nodes.length; n += 1) {
        var visible = groupsState[nodes[n].group] !== false;
        nodes[n].node.classList.toggle("ac-audit-target--hidden", !visible);
        if (nodes[n].listItem) {
          nodes[n].listItem.classList.toggle("ac-audit-panel__item--hidden", !visible);
        }
      }

      var groupButtons = panel.querySelectorAll('[data-action="audit-group-toggle"]');
      for (var b = 0; b < groupButtons.length; b += 1) {
        var groupId = groupButtons[b].getAttribute("data-group");
        var isOn = groupsState[groupId] !== false;
        groupButtons[b].classList.toggle("is-on", isOn);
      }
      renderSecondaryNumberingLayer();
    }

    function setActiveNode(targetNode) {
      for (var q = 0; q < nodes.length; q += 1) {
        nodes[q].node.classList.remove("ac-audit-target--active");
      }
      if (targetNode) {
        targetNode.classList.add("ac-audit-target--active");
      }
    }

    function setNodeOffset(item, dx, dy) {
      item.offsetX = dx;
      item.offsetY = dy;
      item.node.style.setProperty("--ac-audit-dx", String(dx) + "px");
      item.node.style.setProperty("--ac-audit-dy", String(dy) + "px");
    }

    var dragState = null;

    function startDrag(event, item) {
      if (!item || !item.node) return;
      if (!auditRuntime.allowDrag) return;
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      dragState = {
        item: item,
        startX: event.clientX,
        startY: event.clientY,
        baseX: item.offsetX || 0,
        baseY: item.offsetY || 0,
        rect: item.node.getBoundingClientRect()
      };

      item.node.classList.add("ac-audit-target--dragging");
      setActiveNode(item.node);
    }

    document.addEventListener("mousemove", function (event) {
      if (!dragState) return;
      var margin = 4;
      var nextX = dragState.baseX + (event.clientX - dragState.startX);
      var nextY = dragState.baseY + (event.clientY - dragState.startY);
      var projectedLeft = dragState.rect.left + (nextX - dragState.baseX);
      var projectedRight = dragState.rect.right + (nextX - dragState.baseX);
      var projectedTop = dragState.rect.top + (nextY - dragState.baseY);
      var projectedBottom = dragState.rect.bottom + (nextY - dragState.baseY);

      if (projectedLeft < margin) {
        nextX += margin - projectedLeft;
      }
      if (projectedRight > window.innerWidth - margin) {
        nextX -= projectedRight - (window.innerWidth - margin);
      }
      if (projectedTop < margin) {
        nextY += margin - projectedTop;
      }
      if (projectedBottom > window.innerHeight - margin) {
        nextY -= projectedBottom - (window.innerHeight - margin);
      }

      nextX = normalizeToGrid(nextX);
      nextY = normalizeToGrid(nextY);
      setNodeOffset(dragState.item, nextX, nextY);
    });

    document.addEventListener("mouseup", function () {
      if (!dragState) return;
      dragState.item.node.classList.remove("ac-audit-target--dragging");
      upsertMovedRecord(dragState.item, { recordHistory: true });
      dragState = null;
    });

    panel.addEventListener("click", function (event) {
      var toggleButton = event.target.closest('[data-action="audit-toggle"]');
      if (toggleButton) {
        var collapsed = panel.classList.toggle("ac-audit-panel--collapsed");
        toggleButton.textContent = collapsed ? "Развернуть" : "Свернуть";
        toggleButton.setAttribute("aria-label", collapsed ? "Развернуть панель" : "Свернуть панель");
        return;
      }

      if (event.target.closest('[data-action="audit-reset-pos"]')) {
        for (var rr = 0; rr < nodes.length; rr += 1) {
          setNodeOffset(nodes[rr], 0, 0);
          nodes[rr].node.classList.remove("ac-audit-target--active");
        }
        movedOrder = [];
        movedMap = {};
        changeLog = [];
        renderMovedList();
        renderChangeLog();
        applyConfirmedChanges();
        return;
      }

      if (event.target.closest('[data-action="audit-group-all-on"]')) {
        for (var z = 0; z < auditGroups.length; z += 1) {
          groupsState[auditGroups[z].id] = true;
        }
        syncGroupFilters();
        return;
      }

      if (event.target.closest('[data-action="audit-group-all-off"]')) {
        for (var zz = 0; zz < auditGroups.length; zz += 1) {
          groupsState[auditGroups[zz].id] = false;
        }
        syncGroupFilters();
        return;
      }

      var groupToggle = event.target.closest('[data-action="audit-group-toggle"]');
      if (groupToggle) {
        var targetGroup = groupToggle.getAttribute("data-group");
        if (targetGroup && hasOwn(groupsState, targetGroup)) {
          groupsState[targetGroup] = !groupsState[targetGroup];
          syncGroupFilters();
        }
        return;
      }

      var btn = event.target.closest(".ac-audit-jump");
      if (!btn) return;
      var idx = Number(btn.getAttribute("data-index"));
      if (!idx) return;
      var targetNode = null;
      for (var p = 0; p < nodes.length; p += 1) {
        if (nodes[p].index === idx) {
          targetNode = nodes[p].node;
          break;
        }
      }
      if (!targetNode) return;
      targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
      setActiveNode(targetNode);
    });

    controlPanel.addEventListener("click", function (event) {
      var toggleControls = event.target.closest('[data-action="audit-control-toggle"]');
      if (toggleControls) {
        var collapsed = controlPanel.classList.toggle("ac-audit-control-panel--collapsed");
        toggleControls.textContent = collapsed ? "Развернуть" : "Свернуть";
        toggleControls.setAttribute("aria-label", collapsed ? "Развернуть панель действий" : "Свернуть панель действий");
        return;
      }

      if (event.target.closest('[data-action="audit-ui-toggle"]')) {
        auditRuntime.allowUiActions = !auditRuntime.allowUiActions;
        syncControlPanelState();
        return;
      }

      if (event.target.closest('[data-action="audit-drag-toggle"]')) {
        auditRuntime.allowDrag = !auditRuntime.allowDrag;
        syncControlPanelState();
        return;
      }

      if (event.target.closest('[data-action="audit-snap-toggle"]')) {
        auditRuntime.snapGrid = auditRuntime.snapGrid ? 0 : 4;
        syncControlPanelState();
        return;
      }

      if (event.target.closest('[data-action="audit-normalize-toggle"]')) {
        auditRuntime.normalizeToParent = !auditRuntime.normalizeToParent;
        for (var rn = 0; rn < movedOrder.length; rn += 1) {
          var index = movedOrder[rn];
          for (var nn = 0; nn < nodes.length; nn += 1) {
            if (nodes[nn].index === index) {
              upsertMovedRecord(nodes[nn]);
              break;
            }
          }
        }
        syncControlPanelState();
        renderMovedList();
        return;
      }

      if (event.target.closest('[data-action="audit-apply-confirmed"]')) {
        applyConfirmedChanges();
        return;
      }

      if (event.target.closest('[data-action="audit-log-clear"]')) {
        changeLog = [];
        renderChangeLog();
        return;
      }

      var statusBtn = event.target.closest('[data-action="audit-item-status"]');
      if (statusBtn) {
        var itemIndex = Number(statusBtn.getAttribute("data-index"));
        if (!itemIndex || !movedMap[itemIndex]) return;
        var current = movedMap[itemIndex].status || "draft";
        var currentIdx = 0;
        for (var sf = 0; sf < statusFlow.length; sf += 1) {
          if (statusFlow[sf] === current) {
            currentIdx = sf;
            break;
          }
        }
        movedMap[itemIndex].status = statusFlow[(currentIdx + 1) % statusFlow.length];
        renderMovedList();
        return;
      }

      var decisionBtn = event.target.closest('[data-action="audit-item-decision"]');
      if (decisionBtn) {
        var decisionIndex = Number(decisionBtn.getAttribute("data-index"));
        var decision = decisionBtn.getAttribute("data-decision") || "hold";
        if (!decisionIndex || !movedMap[decisionIndex]) return;
        movedMap[decisionIndex].decision = decision;
        renderMovedList();
        return;
      }

      var undoBtn = event.target.closest('[data-action="audit-item-undo"]');
      if (undoBtn) {
        var undoIndex = Number(undoBtn.getAttribute("data-index"));
        var undoRecord = movedMap[undoIndex];
        if (!undoIndex || !undoRecord || !undoRecord.history || !undoRecord.history.length) return;
        var prevState = undoRecord.history.pop();
        var targetItem = findItemByIndex(undoIndex);
        if (!targetItem) return;
        setNodeOffset(targetItem, prevState.dx, prevState.dy);
        upsertMovedRecord(targetItem, { recordHistory: false });
        movedMap[undoIndex].history = undoRecord.history;
        pushChangeLog({
          index: undoIndex,
          label: targetItem.label,
          kind: "undo",
          from: String(undoRecord.dx) + "," + String(undoRecord.dy),
          to: String(prevState.dx) + "," + String(prevState.dy),
          parent: movedMap[undoIndex].parentSelector || "viewport"
        });
        renderMovedList();
      }
    });

    controlPanel.addEventListener("input", function (event) {
      var commentInput = event.target.closest('[data-action="audit-item-comment"]');
      if (!commentInput) return;
      var itemIndex = Number(commentInput.getAttribute("data-index"));
      if (!itemIndex || !movedMap[itemIndex]) return;
      movedMap[itemIndex].comment = commentInput.value || "";
    });

    stagePanel.addEventListener("click", function (event) {
      var toggleStages = event.target.closest('[data-action="audit-stage-toggle"]');
      if (toggleStages) {
        var collapsed = stagePanel.classList.toggle("ac-audit-stage-panel--collapsed");
        toggleStages.textContent = collapsed ? "Развернуть" : "Свернуть";
        toggleStages.setAttribute("aria-label", collapsed ? "Развернуть стадии" : "Свернуть стадии");
        return;
      }

      if (event.target.closest('[data-action="audit-stage-lock-toggle"]')) {
        auditRuntime.lockUntilAge = !auditRuntime.lockUntilAge;
        renderStagePanel();
        return;
      }

      if (event.target.closest('[data-action="audit-layer-toggle"]')) {
        auditRuntime.secondaryLayer = !auditRuntime.secondaryLayer;
        renderStagePanel();
        return;
      }

      if (event.target.closest('[data-action="audit-stage-reset"]')) {
        auditRuntime.ageSelected = false;
        setStep(0);
        renderStagePanel();
      }
    });

    for (var h = 0; h < nodes.length; h += 1) {
      (function (item) {
        if (item.badge) {
          item.badge.addEventListener("mouseenter", function () {
            setActiveNode(item.node);
          });
          item.badge.addEventListener("focus", function () {
            setActiveNode(item.node);
          });
          item.badge.addEventListener("mousedown", function (event) {
            startDrag(event, item);
          });
        }

        if (item.listItem) {
          item.listItem.addEventListener("mouseenter", function () {
            setActiveNode(item.node);
          });
        }
      })(nodes[h]);
    }

    panel.classList.add("ac-audit-panel--collapsed");
    controlPanel.classList.add("ac-audit-control-panel--collapsed");
    stagePanel.classList.add("ac-audit-stage-panel--collapsed");

    document.body.appendChild(panel);
    document.body.appendChild(controlPanel);
    document.body.appendChild(stagePanel);
    syncGroupFilters();
    syncControlPanelState();
    renderMovedList();
    renderChangeLog();
    auditRuntime.stageSync = renderStagePanel;
    renderStagePanel();

    window.addEventListener("resize", function () {
      if (!movedOrder.length) return;
      for (var mr = 0; mr < movedOrder.length; mr += 1) {
        var movedItemIndex = movedOrder[mr];
        for (var mn = 0; mn < nodes.length; mn += 1) {
          if (nodes[mn].index === movedItemIndex) {
            upsertMovedRecord(nodes[mn]);
            break;
          }
        }
      }
      renderStagePanel();
    });
  }

  function bootstrap() {
    hydrateAgeState();
    hydratePromoState();
    hydrateBookingLeadState();
    renderLayout();
    renderStaticLabels();
    renderMenu();
    renderInfoCard();
    renderFunnel();
    renderSections();
    renderFooter();
    renderOverlays();
    startHeroSlideshow();

    var storedMode = getStoredMode();
    track("page_loaded", {
      mode: state.mode,
      active_tab: state.activeTab,
      step: state.step + 1
    });

    if (storedMode) {
      track("reload_restored_mode", {
        mode: state.mode,
        stored_mode: storedMode
      });
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    document.addEventListener("keydown", handleKeydown);

    setupContactDropdown();
    setupAuditToggleButton();
    enableAuditMode();
  }

  bootstrap();
})();
