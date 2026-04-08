/* src/scripts/core/view-mode.js */
(function initAidacampViewMode(windowObj){
  'use strict';

  if(!windowObj) return;
  const MOBILE_VIEWPORT_MAX_WIDTH = 900;

  function resolveRequestedView(rawView){
    return rawView === 'mobile' ? 'mobile' : 'desktop';
  }

  function resolveEffectiveView(requestedView, useDesktopBaseForMobile){
    const requested = resolveRequestedView(requestedView);
    return (requested === 'mobile' && !!useDesktopBaseForMobile) ? 'desktop' : requested;
  }

  function isMobileViewport(){
    return isViewportNarrow(MOBILE_VIEWPORT_MAX_WIDTH);
  }

  function getViewportView(){
    return isMobileViewport() ? 'mobile' : 'desktop';
  }

  function isViewportNarrow(maxWidth = MOBILE_VIEWPORT_MAX_WIDTH){
    const safeWidth = Number(maxWidth);
    const width = Number.isFinite(safeWidth) && safeWidth > 0 ? safeWidth : MOBILE_VIEWPORT_MAX_WIDTH;
    return windowObj.matchMedia ? windowObj.matchMedia(`(max-width: ${Math.round(width)}px)`).matches : false;
  }

  function shouldShowLegacyMobile(requestedView, useDesktopBaseForMobile){
    return requestedView === 'mobile' && !useDesktopBaseForMobile;
  }

  windowObj.AC_VIEW_MODE = Object.freeze({
    MOBILE_VIEWPORT_MAX_WIDTH,
    resolveRequestedView,
    resolveEffectiveView,
    isMobileViewport,
    isViewportNarrow,
    getViewportView,
    shouldShowLegacyMobile
  });
})(window);


/* src/scripts/core/block-factory.js */
/* src/scripts/core/block-factory.js */
(function initAidacampBlockFactory(windowObj){
  'use strict';

  if(!windowObj) return;

  windowObj.AIDACAMP_BLOCKS = windowObj.AIDACAMP_BLOCKS || {};

  windowObj.createAidacampBlock = function createAidacampBlock(blockId){
    return function buildBlock(context){
      var unsubscribers = [];
      var ctx = context || {};
      var runtime = ctx.runtime;

      function mount(){
        if(!runtime || !runtime.bus || typeof runtime.bus.on !== 'function') return;
        var off = runtime.bus.on('state:sync', function onStateSync(snapshot){
          if(!snapshot || typeof snapshot !== 'object') return;
        });
        unsubscribers.push(off);
      }

      function unmount(){
        while(unsubscribers.length){
          var off = unsubscribers.pop();
          if(typeof off === 'function'){
            off();
          }
        }
      }

      function onEvent(){
        // Foundation layer: modules are isolated and listen through the runtime bus.
      }

      return {
        id: blockId,
        mount: mount,
        unmount: unmount,
        onEvent: onEvent
      };
    };
  };
})(window);


/* src/scripts/core/modular-runtime.js */
/* src/scripts/core/modular-runtime.js */
(function initAidacampModularRuntime(windowObj){
  'use strict';

  if(!windowObj || windowObj.AIDACAMP_MODULAR) return;

  function createEmitter(){
    var listeners = new Map();

    function on(eventName, handler){
      if(typeof handler !== 'function') return function noop(){};
      var bucket = listeners.get(eventName);
      if(!bucket){
        bucket = new Set();
        listeners.set(eventName, bucket);
      }
      bucket.add(handler);
      return function unsubscribe(){
        var current = listeners.get(eventName);
        if(!current) return;
        current.delete(handler);
        if(current.size === 0){
          listeners.delete(eventName);
        }
      };
    }

    function emit(eventName, payload){
      var bucket = listeners.get(eventName);
      if(!bucket || bucket.size === 0) return;
      bucket.forEach(function runHandler(handler){
        try {
          handler(payload, eventName);
        } catch (error){
          console.warn('[modular-runtime] event handler error', eventName, error);
        }
      });
    }

    return { on: on, emit: emit };
  }

  function createStore(initialState){
    var currentState = Object.freeze(Object.assign({}, initialState || {}));
    var subscribers = new Set();

    function getState(){
      return currentState;
    }

    function setState(patch){
      if(!patch || typeof patch !== 'object') return currentState;
      currentState = Object.freeze(Object.assign({}, currentState, patch));
      subscribers.forEach(function notify(subscriber){
        try {
          subscriber(currentState);
        } catch (error){
          console.warn('[modular-runtime] store subscriber error', error);
        }
      });
      return currentState;
    }

    function subscribe(handler){
      if(typeof handler !== 'function') return function noop(){};
      subscribers.add(handler);
      return function unsubscribe(){
        subscribers.delete(handler);
      };
    }

    return {
      getState: getState,
      setState: setState,
      subscribe: subscribe
    };
  }

  function createComposer(blocks){
    var list = Array.isArray(blocks) ? blocks.slice() : [];
    var byId = new Map();
    list.forEach(function add(entry){
      if(!entry || !entry.id) return;
      byId.set(entry.id, Object.assign({}, entry));
    });

    function getOrdered(){
      return list
        .filter(function filter(entry){ return entry && entry.id; })
        .map(function map(entry){
          return byId.get(entry.id) || Object.assign({}, entry);
        });
    }

    function upsert(blockConfig){
      if(!blockConfig || !blockConfig.id) return;
      if(byId.has(blockConfig.id)){
        byId.set(blockConfig.id, Object.assign({}, byId.get(blockConfig.id), blockConfig));
        return;
      }
      byId.set(blockConfig.id, Object.assign({}, blockConfig));
      list.push({ id: blockConfig.id });
    }

    return {
      getOrdered: getOrdered,
      upsert: upsert
    };
  }

  function createRuntime(options){
    var opts = options || {};
    var bus = createEmitter();
    var store = createStore(opts.initialState || {});
    var composer = createComposer(opts.blocks || []);
    var active = new Map();

    function getModuleFactory(id){
      var blockBag = windowObj.AIDACAMP_BLOCKS || {};
      return blockBag[id] || null;
    }

    function isBlockEnabled(blockConfig){
      if(!blockConfig) return false;
      if(blockConfig.enabled === false) return false;
      if(!blockConfig.flag) return true;
      var flags = windowObj.AIDACAMP_FLAGS || {};
      return !!flags[blockConfig.flag];
    }

    function mount(context){
      var ctx = context || {};
      var mountedIds = [];
      composer.getOrdered().forEach(function mountBlock(blockConfig){
        if(!blockConfig || !blockConfig.id) return;
        if(!isBlockEnabled(blockConfig)) return;
        var factory = getModuleFactory(blockConfig.id);
        if(typeof factory !== 'function') return;
        try {
          var moduleInstance = factory({
            id: blockConfig.id,
            config: blockConfig,
            bus: bus,
            store: store,
            root: ctx.root || document,
            runtime: api
          });
          if(moduleInstance && typeof moduleInstance.mount === 'function'){
            moduleInstance.mount();
          }
          if(moduleInstance){
            if(typeof moduleInstance.unmount !== 'function' || typeof moduleInstance.onEvent !== 'function'){
              console.warn('[modular-runtime] invalid block contract', blockConfig.id);
            }
          }
          active.set(blockConfig.id, moduleInstance || null);
          mountedIds.push(blockConfig.id);
        } catch (error){
          console.warn('[modular-runtime] mount failed', blockConfig.id, error);
        }
      });
      return mountedIds;
    }

    function unmount(){
      active.forEach(function maybeUnmount(moduleInstance, id){
        if(moduleInstance && typeof moduleInstance.unmount === 'function'){
          try {
            moduleInstance.unmount();
          } catch (error){
            console.warn('[modular-runtime] unmount failed', id, error);
          }
        }
      });
      active.clear();
    }

    function emit(eventName, payload){
      bus.emit(eventName, payload);
      active.forEach(function notifyModule(moduleInstance){
        if(!moduleInstance || typeof moduleInstance.onEvent !== 'function') return;
        try {
          moduleInstance.onEvent(eventName, payload);
        } catch (error){
          console.warn('[modular-runtime] module event failed', eventName, error);
        }
      });
    }

    var api = {
      version: 'foundation-v1',
      bus: bus,
      store: store,
      composer: composer,
      mount: mount,
      unmount: unmount,
      emit: emit
    };

    return api;
  }

  windowObj.AIDACAMP_MODULAR = {
    createRuntime: createRuntime
  };
})(window);


/* src/scripts/core/content-adapter.js */
/* src/scripts/core/content-adapter.js */
(function initAidacampContentAdapter(windowObj){
  'use strict';

  if(!windowObj || windowObj.AIDACAMP_CONTENT_ADAPTER) return;

  function safeClone(value){
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error){
      return value;
    }
  }

  function getFallbackBlock(blockId){
    var root = windowObj.AIDACAMP_CONTENT || {};
    if(blockId === 'shifts') return safeClone(root.shifts || []);
    if(blockId === 'media-content') return safeClone(root.mediaContent || null);
    if(blockId === 'hero-content') return safeClone(root.heroContent || null);
    if(blockId === 'ui-copy') return safeClone(root.uiCopy || null);
    if(blockId === 'legacy-content-map'){
      if(root.legacyContentMap && typeof root.legacyContentMap === 'object'){
        return safeClone(root.legacyContentMap);
      }
      var acData = windowObj.AC_DATA || {};
      if(acData && typeof acData === 'object' && acData.CONTENT_MAP){
        return safeClone({
          CONTENT_MAP: acData.CONTENT_MAP || {},
          AGE_PROFILES: acData.AGE_PROFILES || [],
          SHIFTS: acData.SHIFTS || [],
          DIRECTIONS: acData.DIRECTIONS || [],
          TAB_TO_SECTION: acData.TAB_TO_SECTION || {},
          AGE_SLIDER_POINTS: acData.AGE_SLIDER_POINTS || [9, 11, 13]
        });
      }
    }
    return null;
  }

  function getDefaultLocale(){
    var htmlLang = (document && document.documentElement && document.documentElement.lang) || '';
    var normalized = String(htmlLang || '').trim().toLowerCase();
    return normalized || 'ru';
  }

  async function fetchJson(url){
    var response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if(!response.ok){
      throw new Error('http_' + String(response.status));
    }
    return response.json();
  }

  function resolveApiBase(){
    var settings = windowObj.AIDACAMP_SETTINGS || {};
    var contentApiBase = settings && settings.contentApiBase ? String(settings.contentApiBase).trim() : '';
    if(contentApiBase) return contentApiBase.replace(/\/$/, '');
    return '';
  }

  function isApiEnabled(){
    var flags = windowObj.AIDACAMP_FLAGS || {};
    return !!flags.FF_CONTENT_FROM_API;
  }

  async function loadBlock(blockId, locale){
    var normalizedBlock = String(blockId || '').trim();
    var normalizedLocale = String(locale || getDefaultLocale()).trim().toLowerCase();
    if(!normalizedBlock){
      return { ok:false, source:'none', error:'block_required', blockId:'', locale: normalizedLocale, payload:null };
    }

    if(!isApiEnabled()){
      return {
        ok:true,
        source:'fallback',
        mode:'fallback',
        fallbackUsed:true,
        blockId: normalizedBlock,
        locale: normalizedLocale,
        payload: getFallbackBlock(normalizedBlock)
      };
    }

    var base = resolveApiBase();
    var path = '/api/content?block=' + encodeURIComponent(normalizedBlock) + '&locale=' + encodeURIComponent(normalizedLocale);
    var url = base ? (base + path) : path;

    try {
      var data = await fetchJson(url);
      if(data && data.ok && data.found){
        return {
          ok:true,
          source:'api',
          mode:'api',
          fallbackUsed:false,
          blockId: normalizedBlock,
          locale: normalizedLocale,
          payload: data.payload
        };
      }
    } catch (error){
      return {
        ok:true,
        source:'fallback',
        mode:'fallback',
        fallbackUsed:true,
        blockId: normalizedBlock,
        locale: normalizedLocale,
        payload: getFallbackBlock(normalizedBlock),
        error: String(error && error.message ? error.message : error)
      };
    }

    return {
      ok:true,
      source:'fallback',
      mode:'fallback',
      fallbackUsed:true,
      blockId: normalizedBlock,
      locale: normalizedLocale,
      payload: getFallbackBlock(normalizedBlock)
    };
  }

  async function loadBlocks(blockIds, locale){
    var ids = Array.isArray(blockIds) ? blockIds.map(function map(value){ return String(value || '').trim(); }).filter(Boolean) : [];
    var normalizedLocale = String(locale || getDefaultLocale()).trim().toLowerCase();

    if(ids.length === 0){
      return { ok:true, source:'none', mode:'none', locale: normalizedLocale, blocks:{}, fallbackBlocks: [] };
    }

    if(!isApiEnabled()){
      var fallbackBlocks = {};
      ids.forEach(function mapId(id){
        fallbackBlocks[id] = getFallbackBlock(id);
      });
      return { ok:true, source:'fallback', mode:'fallback', locale: normalizedLocale, blocks:fallbackBlocks, fallbackBlocks: ids.slice() };
    }

    var base = resolveApiBase();
    var path = '/api/content/batch?blocks=' + encodeURIComponent(ids.join(',')) + '&locale=' + encodeURIComponent(normalizedLocale);
    var url = base ? (base + path) : path;

    try {
      var data = await fetchJson(url);
      if(data && data.ok && data.blocks && typeof data.blocks === 'object'){
        var mergedBlocks = {};
        var usedFallback = false;
        var fallbackBlockIds = [];
        ids.forEach(function mergeById(id){
          var value = Object.prototype.hasOwnProperty.call(data.blocks, id) ? data.blocks[id] : null;
          if(value === null || value === undefined){
            mergedBlocks[id] = getFallbackBlock(id);
            usedFallback = true;
            fallbackBlockIds.push(id);
            return;
          }
          mergedBlocks[id] = value;
        });
        return {
          ok:true,
          source: usedFallback ? 'api+fallback' : 'api',
          mode: usedFallback ? 'api+fallback' : 'api',
          locale: normalizedLocale,
          blocks: mergedBlocks,
          fallbackBlocks: fallbackBlockIds
        };
      }
    } catch (_error){
      // fallback below
    }

    var blocks = {};
    ids.forEach(function mapFallback(id){
      blocks[id] = getFallbackBlock(id);
    });
    return { ok:true, source:'fallback', mode:'fallback', locale: normalizedLocale, blocks: blocks, fallbackBlocks: ids.slice() };
  }

  windowObj.AIDACAMP_CONTENT_ADAPTER = {
    loadBlock: loadBlock,
    loadBlocks: loadBlocks
  };
})(window);


/* src/scripts/core/runtime-content.js */
/* src/scripts/core/runtime-content.js */
(function initRuntimeContent(windowObj){
  'use strict';

  if(!windowObj || windowObj.AC_RUNTIME_CONTENT){
    return;
  }

  function normalizeValue(value){
    return String(value || '').trim();
  }

  function normalizeList(value){
    return Array.isArray(value)
      ? value.map(normalizeValue).filter(Boolean)
      : [];
  }

  function cloneObject(value){
    if(!value || typeof value !== 'object'){
      return {};
    }
    return Object.assign({}, value);
  }

  function buildDefaultCalendarLocaleCopy(){
    var normalize = function normalize(value){
      var cleaned = normalizeValue(value).replace(/\./g, '');
      return cleaned ? (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) : '';
    };
    var weekdaysShort = [];
    for(var i = 0; i < 7; i += 1){
      var dt = new Date(Date.UTC(2026, 0, 4 + i));
      var value = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' }).format(dt);
      weekdaysShort.push(normalize(value));
    }
    var monthNames = [];
    for(var month = 0; month < 12; month += 1){
      var dtMonth = new Date(Date.UTC(2026, month, 1));
      var monthValue = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' }).format(dtMonth);
      monthNames.push(normalize(monthValue).toLowerCase());
    }
    return {
      weekdaysShort: Object.freeze(weekdaysShort),
      monthNames: Object.freeze(monthNames)
    };
  }

  function buildUtmH1CopyRules(raw){
    var source = (raw && typeof raw === 'object') ? raw : {};
    var next = {};
    Object.entries(source).forEach(function entryHandler(item){
      var key = normalizeValue(item[0]).toLowerCase();
      var value = item[1] || {};
      if(!key) return;
      var title = normalizeValue(value.title);
      var sub = normalizeValue(value.sub);
      if(!title || !sub) return;
      next[key] = Object.freeze({ title: title, sub: sub });
    });
    return Object.freeze(next);
  }

  function createRuntimeContent(context){
    var ctx = context || {};
    var initialUiCopy = (ctx.initialUiCopy && typeof ctx.initialUiCopy === 'object') ? ctx.initialUiCopy : {};
    var initialHeroContent = (ctx.initialHeroContent && typeof ctx.initialHeroContent === 'object') ? ctx.initialHeroContent : {};

    var DEFAULT_MOBILE_DOCS_COPY = Object.freeze(Object.assign({}, initialUiCopy.mobileDocs || {}));
    var INITIAL_BOOKING_HINTS = Object.freeze(Object.assign({}, initialUiCopy.bookingHints || {}));
    var INITIAL_MEDIA_COPY = Object.freeze(Object.assign({}, initialUiCopy.mediaCopy || {}));
    var INITIAL_SHIFT_COPY = Object.freeze(Object.assign({}, initialUiCopy.shiftCopy || {}));
    var INITIAL_TELEGRAM_COPY = Object.freeze(Object.assign({}, initialUiCopy.telegramCopy || {}));
    var INITIAL_CALENDAR_LOCALE_COPY = Object.freeze(Object.assign({}, initialUiCopy.calendarLocale || {}));

    var DEFAULT_CALENDAR_LOCALE_COPY = buildDefaultCalendarLocaleCopy();
    var HERO_VARIANT_BROAD_FALLBACK = Object.freeze({
      broad: Object.freeze({
        tier: 'broad',
        variant: 'v1',
        title: '',
        sub: '',
        cta: '',
        hintStage1: '',
        hintStage1Followup: '',
        hintStage2: ''
      })
    });

    var defaultHeroBroadVariant = (
      initialHeroContent.variantCopy &&
      typeof initialHeroContent.variantCopy === 'object' &&
      initialHeroContent.variantCopy.broad &&
      typeof initialHeroContent.variantCopy.broad === 'object'
    )
      ? initialHeroContent.variantCopy.broad
      : HERO_VARIANT_BROAD_FALLBACK.broad;
    var DEFAULT_HERO_VARIANT_COPY = Object.freeze({
      broad: Object.freeze({
        tier: String(defaultHeroBroadVariant.tier || HERO_VARIANT_BROAD_FALLBACK.broad.tier),
        variant: String(defaultHeroBroadVariant.variant || HERO_VARIANT_BROAD_FALLBACK.broad.variant),
        title: String(defaultHeroBroadVariant.title || HERO_VARIANT_BROAD_FALLBACK.broad.title),
        sub: String(defaultHeroBroadVariant.sub || HERO_VARIANT_BROAD_FALLBACK.broad.sub),
        cta: String(defaultHeroBroadVariant.cta || HERO_VARIANT_BROAD_FALLBACK.broad.cta),
        hintStage1: String(defaultHeroBroadVariant.hintStage1 || HERO_VARIANT_BROAD_FALLBACK.broad.hintStage1),
        hintStage1Followup: String(defaultHeroBroadVariant.hintStage1Followup || HERO_VARIANT_BROAD_FALLBACK.broad.hintStage1Followup),
        hintStage2: String(defaultHeroBroadVariant.hintStage2 || HERO_VARIANT_BROAD_FALLBACK.broad.hintStage2)
      })
    });
    var defaultHeroUtmRules = (initialHeroContent.utmH1Rules && typeof initialHeroContent.utmH1Rules === 'object')
      ? initialHeroContent.utmH1Rules
      : {};

    var UTM_H1_COPY_RULES = buildUtmH1CopyRules(defaultHeroUtmRules);
    var HERO_VARIANT_COPY = DEFAULT_HERO_VARIANT_COPY;
    var HERO_VARIANT_DEFAULT_TIER = 'broad';
    var HERO_VARIANT_BANNER_TIER = Object.freeze({});

    var HERO_IMAGES = ['/assets/images/hero-camp-sunset-20260328-lite.avif'];
    var HERO_IMAGES_B = ['/assets/images/hero-ab-pool-20260401-lite.avif'];
    var HERO_MOBILE = '/assets/images/hero-camp-mobile-people-ultra.avif';
    var HERO_MOBILE_B = '/assets/images/hero-camp-mobile-people-ultra.avif';

    var HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS = Object.freeze([]);
    var MOBILE_DOCS_COPY = Object.freeze(cloneObject(DEFAULT_MOBILE_DOCS_COPY));
    var BOOKING_HINTS_COPY = Object.freeze(cloneObject(INITIAL_BOOKING_HINTS));
    var CALENDAR_LOCALE_COPY = Object.freeze({
      weekdaysShort: Object.freeze(Array.isArray(INITIAL_CALENDAR_LOCALE_COPY.weekdaysShort)
        ? normalizeList(INITIAL_CALENDAR_LOCALE_COPY.weekdaysShort)
        : Array.from(DEFAULT_CALENDAR_LOCALE_COPY.weekdaysShort)),
      monthNames: Object.freeze(Array.isArray(INITIAL_CALENDAR_LOCALE_COPY.monthNames)
        ? normalizeList(INITIAL_CALENDAR_LOCALE_COPY.monthNames)
        : Array.from(DEFAULT_CALENDAR_LOCALE_COPY.monthNames))
    });
    var MEDIA_COPY = Object.freeze(cloneObject(INITIAL_MEDIA_COPY));
    var SHIFT_COPY = Object.freeze(cloneObject(INITIAL_SHIFT_COPY));
    var TELEGRAM_COPY = Object.freeze(cloneObject(INITIAL_TELEGRAM_COPY));
    var DESKTOP_MOBILE_SECTION_TEMPLATES = Object.freeze({});

    function bookingText(key){
      return String(Object.prototype.hasOwnProperty.call(BOOKING_HINTS_COPY, key) ? BOOKING_HINTS_COPY[key] : '');
    }

    function uiBookingHintTemplate(key, fallbackOrParams, params){
      var hasInlineParams = fallbackOrParams && typeof fallbackOrParams === 'object' && !Array.isArray(fallbackOrParams);
      var fallback = hasInlineParams ? '' : (fallbackOrParams || '');
      var templateParams = hasInlineParams ? fallbackOrParams : (params || {});
      var template = String(fallback || bookingText(key) || '');
      return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function(_match, name){
        return Object.prototype.hasOwnProperty.call(templateParams, name) ? String(templateParams[name] || '') : '';
      });
    }

    function mediaText(key){
      return String(Object.prototype.hasOwnProperty.call(MEDIA_COPY, key) ? MEDIA_COPY[key] : '');
    }

    function telegramText(key){
      return String(Object.prototype.hasOwnProperty.call(TELEGRAM_COPY, key) ? TELEGRAM_COPY[key] : '');
    }

    function syncHeroContentConfig(){
      var heroContent = (windowObj.AIDACAMP_CONTENT && windowObj.AIDACAMP_CONTENT.heroContent && typeof windowObj.AIDACAMP_CONTENT.heroContent === 'object')
        ? windowObj.AIDACAMP_CONTENT.heroContent
        : {};
      var defaultTier = normalizeValue(heroContent.defaultTier || 'broad') || 'broad';
      var bannerTier = (heroContent.bannerTier && typeof heroContent.bannerTier === 'object') ? heroContent.bannerTier : {};
      var variantCopy = (heroContent.variantCopy && typeof heroContent.variantCopy === 'object') ? heroContent.variantCopy : {};
      var utmH1Rules = (heroContent.utmH1Rules && typeof heroContent.utmH1Rules === 'object') ? heroContent.utmH1Rules : {};
      var broadFallback = (variantCopy[defaultTier] && typeof variantCopy[defaultTier] === 'object')
        ? variantCopy[defaultTier]
        : DEFAULT_HERO_VARIANT_COPY.broad;
      var heroImages = Array.isArray(heroContent.heroImages) ? heroContent.heroImages.filter(Boolean) : [];
      var heroImagesB = Array.isArray(heroContent.heroImagesB) ? heroContent.heroImagesB.filter(Boolean) : [];

      HERO_VARIANT_DEFAULT_TIER = defaultTier;
      HERO_VARIANT_BANNER_TIER = Object.freeze(cloneObject(bannerTier));
      HERO_VARIANT_COPY = Object.freeze(
        Object.assign({}, DEFAULT_HERO_VARIANT_COPY, variantCopy, { [defaultTier]: broadFallback })
      );
      UTM_H1_COPY_RULES = buildUtmH1CopyRules(utmH1Rules);

      HERO_IMAGES = Object.freeze(heroImages.length ? heroImages : ['/assets/images/hero-camp-sunset-20260328-lite.avif']);
      HERO_IMAGES_B = Object.freeze(heroImagesB.length ? heroImagesB : ['/assets/images/hero-ab-pool-20260401-lite.avif']);
      HERO_MOBILE = String(heroContent.heroMobile || HERO_IMAGES[0] || '/assets/images/hero-camp-mobile-people-ultra.avif');
      HERO_MOBILE_B = String(heroContent.heroMobileB || HERO_IMAGES_B[0] || '/assets/images/hero-camp-mobile-people-ultra.avif');

      var benefitItems = Array.isArray(heroContent.benefitsExperimentItems)
        ? heroContent.benefitsExperimentItems
          .filter(function(item){ return item && typeof item === 'object' && item.title && item.icon; })
          .map(function mapItem(item){
            return Object.freeze({
              title: String(item.title),
              icon: String(item.icon),
              iconClass: String(item.iconClass || '')
            });
          })
        : [];
      if(benefitItems.length){
        HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS = Object.freeze(benefitItems);
      }
      return {
        heroConfig: {
          HERO_IMAGES: HERO_IMAGES,
          HERO_IMAGES_B: HERO_IMAGES_B,
          HERO_MOBILE: HERO_MOBILE,
          HERO_MOBILE_B: HERO_MOBILE_B,
          HERO_VARIANT_COPY: HERO_VARIANT_COPY,
          HERO_VARIANT_DEFAULT_TIER: HERO_VARIANT_DEFAULT_TIER,
          HERO_VARIANT_BANNER_TIER: HERO_VARIANT_BANNER_TIER,
          UTM_H1_COPY_RULES: UTM_H1_COPY_RULES,
          HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS: HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS
        }
      };
    }

    function syncUiCopyConfig(){
      var nextUiCopy = (windowObj.AIDACAMP_CONTENT && windowObj.AIDACAMP_CONTENT.uiCopy && typeof windowObj.AIDACAMP_CONTENT.uiCopy === 'object')
        ? windowObj.AIDACAMP_CONTENT.uiCopy
        : {};
      var mobileDocs = (nextUiCopy.mobileDocs && typeof nextUiCopy.mobileDocs === 'object') ? nextUiCopy.mobileDocs : {};
      var docLinks = Array.isArray(mobileDocs.links)
        ? mobileDocs.links
          .filter(function(entry){ return entry && entry.href && entry.text; })
          .map(function mapDoc(entry){
            return Object.freeze({
              href: String(entry.href),
              target: String(entry.target || ''),
              rel: String(entry.rel || ''),
              text: String(entry.text)
            });
          })
        : [];
      var templates = (nextUiCopy.desktopMobileSectionTemplates && typeof nextUiCopy.desktopMobileSectionTemplates === 'object')
        ? nextUiCopy.desktopMobileSectionTemplates
        : {};
      var calendarLocale = (nextUiCopy.calendarLocale && typeof nextUiCopy.calendarLocale === 'object')
        ? nextUiCopy.calendarLocale
        : {};
      var weekdaysRaw = Array.isArray(calendarLocale.weekdaysShort) ? calendarLocale.weekdaysShort : [];
      var monthsRaw = Array.isArray(calendarLocale.monthNames) ? calendarLocale.monthNames : [];
      var bookingHints = (nextUiCopy.bookingHints && typeof nextUiCopy.bookingHints === 'object')
        ? nextUiCopy.bookingHints
        : {};
      var mediaCopy = (nextUiCopy.mediaCopy && typeof nextUiCopy.mediaCopy === 'object') ? nextUiCopy.mediaCopy : {};
      var shiftCopy = (nextUiCopy.shiftCopy && typeof nextUiCopy.shiftCopy === 'object') ? nextUiCopy.shiftCopy : {};
      var telegramCopy = (nextUiCopy.telegramCopy && typeof nextUiCopy.telegramCopy === 'object') ? nextUiCopy.telegramCopy : {};

      var previousShiftCopy = SHIFT_COPY && typeof SHIFT_COPY === 'object' ? SHIFT_COPY : {};
      var summaryByAgeRaw = (shiftCopy.summaryByAge && typeof shiftCopy.summaryByAge === 'object') ? shiftCopy.summaryByAge : {};
      var normalizeLines = function(value){
        return Array.isArray(value)
          ? value.map(normalizeValue).filter(Boolean)
          : [];
      };
      var summaryByAge = {
        '7-9': normalizeLines(summaryByAgeRaw['7-9']),
        '10-12': normalizeLines(summaryByAgeRaw['10-12']),
        '13-14': normalizeLines(summaryByAgeRaw['13-14'])
      };
      var ageLabelByAgeRaw = (shiftCopy.ageLabelByAge && typeof shiftCopy.ageLabelByAge === 'object')
        ? shiftCopy.ageLabelByAge
        : {};
      var markerPatternByAgeRaw = (shiftCopy.markerPatternByAge && typeof shiftCopy.markerPatternByAge === 'object')
        ? shiftCopy.markerPatternByAge
        : {};
      var allAgesSplitPatternRaw = String(shiftCopy.allAgesSplitPattern || previousShiftCopy.allAgesSplitPattern || '').trim();

      MOBILE_DOCS_COPY = Object.freeze({
        orgName: String(mobileDocs.orgName || DEFAULT_MOBILE_DOCS_COPY.orgName || ''),
        orgMeta: String(mobileDocs.orgMeta || DEFAULT_MOBILE_DOCS_COPY.orgMeta || ''),
        copyright: String(mobileDocs.copyright || DEFAULT_MOBILE_DOCS_COPY.copyright || ''),
        links: Object.freeze(docLinks)
      });
      DESKTOP_MOBILE_SECTION_TEMPLATES = Object.freeze(Object.assign({}, templates));
      CALENDAR_LOCALE_COPY = Object.freeze({
        weekdaysShort: Object.freeze((normalizeList(weekdaysRaw).length === 7
          ? normalizeList(weekdaysRaw)
          : Array.from(DEFAULT_CALENDAR_LOCALE_COPY.weekdaysShort))),
        monthNames: Object.freeze((normalizeList(monthsRaw).length === 12
          ? normalizeList(monthsRaw)
          : Array.from(DEFAULT_CALENDAR_LOCALE_COPY.monthNames)))
      });
      BOOKING_HINTS_COPY = Object.freeze(Object.assign({}, BOOKING_HINTS_COPY, bookingHints));
      MEDIA_COPY = Object.freeze(Object.assign({}, MEDIA_COPY, mediaCopy));
      SHIFT_COPY = Object.freeze({
        summaryByAge: Object.freeze({
          '7-9': Object.freeze(summaryByAge['7-9'].length ? summaryByAge['7-9'] : Array.from(previousShiftCopy.summaryByAge && previousShiftCopy.summaryByAge['7-9'] || [])),
          '10-12': Object.freeze(summaryByAge['10-12'].length ? summaryByAge['10-12'] : Array.from(previousShiftCopy.summaryByAge && previousShiftCopy.summaryByAge['10-12'] || [])),
          '13-14': Object.freeze(summaryByAge['13-14'].length ? summaryByAge['13-14'] : Array.from(previousShiftCopy.summaryByAge && previousShiftCopy.summaryByAge['13-14'] || []))
        }),
        ageLabelByAge: Object.freeze({
          '7-9': String(ageLabelByAgeRaw['7-9'] || previousShiftCopy.ageLabelByAge && previousShiftCopy.ageLabelByAge['7-9'] || ''),
          '10-12': String(ageLabelByAgeRaw['10-12'] || previousShiftCopy.ageLabelByAge && previousShiftCopy.ageLabelByAge['10-12'] || ''),
          '13-14': String(ageLabelByAgeRaw['13-14'] || previousShiftCopy.ageLabelByAge && previousShiftCopy.ageLabelByAge['13-14'] || '')
        }),
        markerPatternByAge: Object.freeze({
          '7-9': String(markerPatternByAgeRaw['7-9'] || previousShiftCopy.markerPatternByAge && previousShiftCopy.markerPatternByAge['7-9'] || ''),
          '10-12': String(markerPatternByAgeRaw['10-12'] || previousShiftCopy.markerPatternByAge && previousShiftCopy.markerPatternByAge['10-12'] || ''),
          '13-14': String(markerPatternByAgeRaw['13-14'] || previousShiftCopy.markerPatternByAge && previousShiftCopy.markerPatternByAge['13-14'] || '')
        }),
        allAgesSplitPattern: allAgesSplitPatternRaw || previousShiftCopy.allAgesSplitPattern || ''
      });
      TELEGRAM_COPY = Object.freeze(Object.assign({}, TELEGRAM_COPY, telegramCopy));

      return {
        bookingTextCopy: Object.freeze({
          MOBILE_DOCS_COPY: MOBILE_DOCS_COPY,
          BOOKING_HINTS_COPY: BOOKING_HINTS_COPY,
          MEDIA_COPY: MEDIA_COPY,
          SHIFT_COPY: SHIFT_COPY,
          TELEGRAM_COPY: TELEGRAM_COPY,
          DESKTOP_MOBILE_SECTION_TEMPLATES: DESKTOP_MOBILE_SECTION_TEMPLATES,
          CALENDAR_LOCALE_COPY: CALENDAR_LOCALE_COPY
        })
      };
    }

    function calendarWeekdaysShort(){
      var raw = CALENDAR_LOCALE_COPY && Array.isArray(CALENDAR_LOCALE_COPY.weekdaysShort)
        ? CALENDAR_LOCALE_COPY.weekdaysShort
        : [];
      var normalized = raw.map(normalizeValue).filter(Boolean);
      return normalized.length === 7 ? normalized : Array.from(DEFAULT_CALENDAR_LOCALE_COPY.weekdaysShort);
    }

    function calendarMonthNames(){
      var raw = CALENDAR_LOCALE_COPY && Array.isArray(CALENDAR_LOCALE_COPY.monthNames)
        ? CALENDAR_LOCALE_COPY.monthNames
        : [];
      var normalized = raw.map(normalizeValue).filter(Boolean);
      return normalized.length === 12 ? normalized : Array.from(DEFAULT_CALENDAR_LOCALE_COPY.monthNames);
    }

    function snapshot(){
      return {
        HERO_VARIANT_COPY: HERO_VARIANT_COPY,
        HERO_VARIANT_DEFAULT_TIER: HERO_VARIANT_DEFAULT_TIER,
        HERO_VARIANT_BANNER_TIER: HERO_VARIANT_BANNER_TIER,
        HERO_IMAGES: HERO_IMAGES,
        HERO_IMAGES_B: HERO_IMAGES_B,
        HERO_MOBILE: HERO_MOBILE,
        HERO_MOBILE_B: HERO_MOBILE_B,
        UTM_H1_COPY_RULES: UTM_H1_COPY_RULES,
        HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS: HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS,
        MOBILE_DOCS_COPY: MOBILE_DOCS_COPY,
        BOOKING_HINTS_COPY: BOOKING_HINTS_COPY,
        MEDIA_COPY: MEDIA_COPY,
        SHIFT_COPY: SHIFT_COPY,
        TELEGRAM_COPY: TELEGRAM_COPY,
        DESKTOP_MOBILE_SECTION_TEMPLATES: DESKTOP_MOBILE_SECTION_TEMPLATES,
        CALENDAR_LOCALE_COPY: CALENDAR_LOCALE_COPY
      };
    }

    syncHeroContentConfig();
    syncUiCopyConfig();

    return {
      bookingText: bookingText,
      uiBookingHintTemplate: uiBookingHintTemplate,
      mediaText: mediaText,
      telegramText: telegramText,
      calendarWeekdaysShort: calendarWeekdaysShort,
      calendarMonthNames: calendarMonthNames,
      syncHeroContentConfig: syncHeroContentConfig,
      syncUiCopyConfig: syncUiCopyConfig,
      getHeroConfig: function(){ return snapshot(); },
      getMobileDocsCopy: function(){ return MOBILE_DOCS_COPY; },
      getBookingHintsCopy: function(){ return BOOKING_HINTS_COPY; },
      getMediaCopy: function(){ return MEDIA_COPY; },
      getShiftCopy: function(){ return SHIFT_COPY; },
      getTelegramCopy: function(){ return TELEGRAM_COPY; },
      getTemplatesCopy: function(){ return DESKTOP_MOBILE_SECTION_TEMPLATES; },
      getCalendarLocaleCopy: function(){ return CALENDAR_LOCALE_COPY; },
      getDefaultCalendarLocaleCopy: function(){ return DEFAULT_CALENDAR_LOCALE_COPY; },
      getHeroStateSnapshot: snapshot
    };
  }

  windowObj.AC_RUNTIME_CONTENT = {
    createRuntimeContent: createRuntimeContent
  };
})(window);


/* src/scripts/core/bootstrap-deferred-queue.js */
(function(windowObj){
  function scheduleDeferredQueue(tasks){
    if(!Array.isArray(tasks) || !tasks.length) return;
    let index = 0;
    const runNext = () => {
      if(index >= tasks.length) return;
      const task = tasks[index++];
      try{
        task();
      } catch (error){
        console.warn('[bootstrap] deferred task failed', error);
      }
      if(index >= tasks.length) return;
      if('requestIdleCallback' in windowObj){
        windowObj.requestIdleCallback(runNext, { timeout: 1200 });
      } else {
        windowObj.setTimeout(runNext, 24);
      }
    };
    if('requestIdleCallback' in windowObj){
      windowObj.requestIdleCallback(runNext, { timeout: 900 });
    } else {
      windowObj.setTimeout(runNext, 0);
    }
  }

  windowObj.AIDACAMP_BOOTSTRAP = windowObj.AIDACAMP_BOOTSTRAP || {};
  windowObj.AIDACAMP_BOOTSTRAP.scheduleDeferredQueue = scheduleDeferredQueue;
})(window);



/* src/scripts/core/booking-runtime-bridge.js */
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
      getPrimaryActionState,
      getStepState,
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


/* src/scripts/features/action-dispatcher.js */
(function registerActionDispatcher(windowObj){
  'use strict';

  if(!windowObj || !windowObj.AC_FEATURES){
    return;
  }

  var DATA_MEDIA_FILTER_TAGS = (
    windowObj &&
    windowObj.AC_DATA &&
    windowObj.AC_DATA.MEDIA_FILTER_TAGS
  ) || {
    all: ['all', 'camp', 'pool', 'sport', 'study', 'food'],
    camp: ['all', 'camp'],
    pool: ['pool'],
    sport: ['sport'],
    study: ['study'],
    food: ['food']
  };

  var actionDispatcher = windowObj.AC_FEATURES.actionDispatcher || {};
  if(actionDispatcher.createActionDispatcher){
    return;
  }

  var MOBILE_PHOTO_FILTER_TAGS = Object.assign(
    {
      camp: ['all'],
      pool: ['pool'],
      sport: ['sport'],
      study: ['study'],
      food: ['food']
    },
    DATA_MEDIA_FILTER_TAGS
  );
  var DEFAULT_VISITED_STATE = Object.freeze({
    bookingAction: {}
  });

  function clamp(value, min, max){
    if(!Number.isFinite(value)) return min;
    if(value < min) return min;
    if(value > max) return max;
    return value;
  }

  function toNumber(value, fallback){
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function getStateValue(state, key, fallback){
    return state && Object.prototype.hasOwnProperty.call(state, key)
      ? state[key]
      : fallback;
  }

  function getTeamVisibleItems(mediaContent, hiddenName){
    if(!mediaContent || !Array.isArray(mediaContent.team)) return [];
    var safeHiddenName = String(hiddenName || '').trim();
    return mediaContent.team.filter(function filterTeam(item){
      return String(item && item.fio || '') !== safeHiddenName;
    });
  }

  function getMediaListByKey(mediaContent, key){
    var list = Array.isArray(mediaContent && mediaContent[key]) ? mediaContent[key] : [];
    return list;
  }

  function normalizePhotos(mediaContent, state, photoFilter){
    var safeState = state || {};
    var safeFilter = String(photoFilter || safeState.photoFilter || 'all').trim();
    var rawPhotos = getMediaListByKey(mediaContent, 'photos');
    var visible = getMediaListByKey(mediaContent, 'photos');
    if(!visible.length){
      return rawPhotos;
    }
    var tagMap = Object.freeze(Object.assign({
      all: ['all', 'camp', 'pool', 'sport', 'study', 'food']
    }, MOBILE_PHOTO_FILTER_TAGS));
    var tags = tagMap[safeFilter] || tagMap.all;
    var byTags = rawPhotos.filter(function filter(item){
      return item && tags.includes(item.cat);
    });
    if(byTags.length){
      return byTags;
    }
    return rawPhotos.filter(function fallbackFilter(item){
      return item && (item.cat === 'all' || item.cat === 'camp');
    });
  }

  function buildPhotoStateForMobileIndex(mediaContent, state, actionEl){
    var maxIndex = Math.max(0, (mediaContent && mediaContent.reviews ? mediaContent.reviews.length : 1) - 1);
    var raw = actionEl.dataset.photoIndex || 0;
    var safe = clamp(toNumber(raw, 0), 0, maxIndex);
    return safe;
  }

  function createActionDispatcher(context){
    var ctx = context || {};
    var localState = Object.assign({}, DEFAULT_VISITED_STATE);

    function getState(){
      if(typeof ctx.getState === 'function'){
        return ctx.getState() || {};
      }
      return {};
    }

    function recordMeta(action){
      localState[action] = Date.now();
    }

    var handlers = {
      'open-photo': function onOpenPhoto(actionEl){
        var state = getState();
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var photoFilter = String(getStateValue(actionEl.dataset, 'photoFilter', '') || state.photoFilter || 'all').trim();
        var index = toNumber(actionEl.dataset.photoIndex, 0);
        var clickedFromMobilePhoto = !!actionEl.closest('.mobile-photo-stage, .mobile-photo-preview-strip');
        var list = clickedFromMobilePhoto
          ? normalizePhotos(mediaContent, state, photoFilter)
          : (Array.isArray(ctx.getPhotoGalleryList && ctx.getPhotoGalleryList()) ? ctx.getPhotoGalleryList().slice() : []);
        if(!list.length){
          list = getMediaListByKey(mediaContent, 'photos');
        }
        var safeIndex = list.length ? clamp(index, 0, list.length - 1) : 0;
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobilePhotoIndex: safeIndex});
        }
        if(typeof ctx.openMedia === 'function'){
          ctx.openMedia('photo', safeIndex);
        }
        return true;
      },
      'open-stay-photo': function onOpenStayPhoto(actionEl){
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var source = typeof ctx.getStayGallery === 'function'
          ? ctx.getStayGallery()
          : getMediaListByKey(mediaContent, 'photos');
        if(!source.length){
          return true;
        }
        if(typeof ctx.setActivePhotoList === 'function'){
          ctx.setActivePhotoList(source);
        }
        if(typeof ctx.openMedia === 'function'){
          ctx.openMedia('photo', clamp(toNumber(actionEl.dataset.stayIndex, 0), 0, source.length - 1));
        }
        return true;
      },
      'open-video': function onOpenVideo(actionEl){
        var directUrl = String(actionEl.dataset.video || '');
        if(directUrl){
          if(typeof ctx.openVideo === 'function'){
            ctx.openVideo(directUrl);
          }
          return true;
        }
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var videos = getMediaListByKey(mediaContent, 'videos');
        var index = toNumber(actionEl.dataset.videoIndex, 0);
        var item = videos[clamp(index, 0, Math.max(videos.length - 1, 0))];
        if(item && item.url && typeof ctx.openVideo === 'function'){
          ctx.openVideo(item.url);
        }
        return true;
      },
      'open-referral-photo': function onOpenReferralPhoto(){
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var alt = typeof ctx.bookingText === 'function' ? ctx.bookingText('referralHoodieAlt') : '';
        if(typeof ctx.setActivePhotoList === 'function'){
          ctx.setActivePhotoList([{
            src: '/assets/images/referral-hoodie.jpeg',
            alt: alt,
            cat: 'all'
          }]);
        }
        if(typeof ctx.openMedia === 'function'){
          ctx.openMedia('photo', 0);
        }
        return true;
      },
      'video-carousel-prev': function onVideoCarouselPrev(actionEl){
        var scopeRoot = actionEl.closest('.section-modal-body') || document;
        if(typeof ctx.scrollVideoCarousel === 'function'){
          ctx.scrollVideoCarousel(-1, scopeRoot);
        }
        return true;
      },
      'video-carousel-next': function onVideoCarouselNext(actionEl){
        var scopeRoot = actionEl.closest('.section-modal-body') || document;
        if(typeof ctx.scrollVideoCarousel === 'function'){
          ctx.scrollVideoCarousel(1, scopeRoot);
        }
        return true;
      },
      'toggle-shift-about': function onToggleShiftAbout(actionEl){
        var shiftId = actionEl.dataset.shiftId || '';
        if(!shiftId) return true;
        if(typeof ctx.openShiftAboutModal === 'function'){
          ctx.openShiftAboutModal(shiftId);
        }
        return true;
      },
      'toggle-shift-calendar-inline': function onToggleShiftCalendarInline(actionEl){
        var shiftId = actionEl.dataset.shiftId || '';
        var viewKey = actionEl.dataset.shiftView || 'desktop';
        if(!shiftId) return true;
        if(viewKey === 'desktop'){
          if(typeof ctx.openCalendar === 'function'){
            ctx.openCalendar(shiftId);
          }
          return true;
        }
        if(typeof ctx.toggleShiftOptionPanel === 'function'){
          ctx.toggleShiftOptionPanel(viewKey, 'calendarId', shiftId);
        }
        return true;
      },
      'open-all-shifts': function onOpenAllShifts(){
        if(typeof ctx.navigateToSection === 'function'){
          ctx.navigateToSection('section-programs');
        }
        return true;
      },
      'mobile-focus-age': function onMobileFocusAge(){
        if(typeof ctx.focusMobileAgeGate === 'function'){
          ctx.focusMobileAgeGate();
        }
        return true;
      },
      'dismiss-summary-bar': function onDismissSummaryBar(){
        if(typeof ctx.dismissSummaryBarTemporarily === 'function'){
          ctx.dismissSummaryBarTemporarily(30000);
        }
        return true;
      },
      'mobile-photo-select': function onMobilePhotoSelect(actionEl){
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var state = getState();
        var stateFilter = state.photoFilter || 'all';
        var tags = MOBILE_PHOTO_FILTER_TAGS[stateFilter] || MOBILE_PHOTO_FILTER_TAGS.camp;
        var list = getMediaListByKey(mediaContent, 'photos').filter(function filter(item){
          return item && tags.includes(item.cat);
        });
        var max = Math.max(0, list.length - 1);
        var safe = clamp(toNumber(actionEl.dataset.photoIndex, 0), 0, max);
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobilePhotoIndex: safe});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        if(typeof ctx.openMedia === 'function'){
          ctx.openMedia('photo', safe);
        }
        return true;
      },
      'mobile-video-select': function onMobileVideoSelect(actionEl){
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var max = Math.max(0, getMediaListByKey(mediaContent, 'videos').length - 1);
        var safe = clamp(toNumber(actionEl.dataset.videoIndex, 0), 0, max);
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileVideoIndex: safe});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-review-select': function onMobileReviewSelect(actionEl){
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var max = Math.max(0, getMediaListByKey(mediaContent, 'reviews').length - 1);
        var safe = clamp(toNumber(actionEl.dataset.reviewIndex, 0), 0, max);
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileReviewIndex: safe});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-review-prev': function onMobileReviewPrev(){
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var total = Math.max(0, getMediaListByKey(mediaContent, 'reviews').length);
        if(!total){
          return true;
        }
        var state = getState();
        var current = Math.max(0, toNumber(state.mobileReviewIndex, 0));
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileReviewIndex: (current - 1 + total) % total});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-review-next': function onMobileReviewNext(){
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var total = Math.max(0, getMediaListByKey(mediaContent, 'reviews').length);
        if(!total){
          return true;
        }
        var state = getState();
        var current = Math.max(0, toNumber(state.mobileReviewIndex, 0));
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileReviewIndex: (current + 1) % total});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-stay-select': function onMobileStaySelect(actionEl){
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileStayIndex: clamp(toNumber(actionEl.dataset.stayIndex, 0), 0, 999999)});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-faq-filter': function onMobileFaqFilter(actionEl){
        var group = String(actionEl.dataset.faqGroup || '').trim();
        if(!group){
          return true;
        }
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileFaqGroup: group, mobileFaqOpenKey: ''});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-faq-toggle': function onMobileFaqToggle(actionEl){
        var key = String(actionEl.dataset.faqKey || '').trim();
        if(!key){
          return true;
        }
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileFaqOpenKey: key});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-team-prev': function onMobileTeamPrev(){
        var bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : null;
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var team = getTeamVisibleItems(mediaContent, bookingText ? bookingText('teamHiddenMobileName') : '');
        if(!team.length){
          return true;
        }
        var state = getState();
        var next = (getStateValue(state, 'mobileTeamIndex', 0) - 1 + team.length) % team.length;
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileTeamIndex: next});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-team-next': function onMobileTeamNext(){
        var bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : null;
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var team = getTeamVisibleItems(mediaContent, bookingText ? bookingText('teamHiddenMobileName') : '');
        if(!team.length){
          return true;
        }
        var state = getState();
        var next = (getStateValue(state, 'mobileTeamIndex', 0) + 1 + team.length) % team.length;
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileTeamIndex: next});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-team-select': function onMobileTeamSelect(actionEl){
        var bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : null;
        var mediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent() : {};
        var team = getTeamVisibleItems(mediaContent, bookingText ? bookingText('teamHiddenMobileName') : '');
        if(!team.length){
          return true;
        }
        var index = clamp(toNumber(actionEl.dataset.teamIndex, 0), 0, team.length - 1);
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileTeamIndex: index});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-journey-step': function onMobileJourneyStep(actionEl){
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileJourneyStep: clamp(toNumber(actionEl.dataset.stepIndex, 0), 0, 3)});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-program-select': function onMobileProgramSelect(actionEl){
        var shiftId = String(actionEl.dataset.shiftId || '').trim();
        if(!shiftId){
          return true;
        }
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileProgramShiftId: shiftId});
        }
        if(typeof ctx.renderCompactTrustPanelContent === 'function'){
          ctx.renderCompactTrustPanelContent();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        return true;
      },
      'mobile-docs-toggle': function onMobileDocsToggle(){
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({mobileDocsExpanded: !getStateValue(getState(), 'mobileDocsExpanded', false)});
        }
        if(typeof ctx.syncMobileDocsExpandedUi === 'function'){
          ctx.syncMobileDocsExpandedUi();
        }
        if(typeof ctx.renderDesktopMobileDocsBlock === 'function'){
          ctx.renderDesktopMobileDocsBlock();
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        if(typeof ctx.syncMobileDocsExpandedUi === 'function'){
          ctx.syncMobileDocsExpandedUi();
        }
        return true;
      },
      'open-book-photo': function onOpenBookPhoto(){
        var bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : function(){ return ''; };
        if(typeof ctx.setActivePhotoList === 'function'){
          ctx.setActivePhotoList([{ src: '/assets/images/cdn-cache/8fc8172e_8991804334.webp', alt: bookingText('bookPreviewAlt'), cat: 'study' }]);
        }
        if(typeof ctx.openMedia === 'function'){
          ctx.openMedia('photo', 0);
        }
        return true;
      },
      'team-carousel-prev': function onTeamCarouselPrev(actionEl){
        var scopeRoot = actionEl.closest('.section-modal-body') || document;
        if(typeof ctx.scrollTeamCarousel === 'function'){
          ctx.scrollTeamCarousel(-1, scopeRoot);
        }
        return true;
      },
      'team-carousel-next': function onTeamCarouselNext(actionEl){
        var scopeRoot = actionEl.closest('.section-modal-body') || document;
        if(typeof ctx.scrollTeamCarousel === 'function'){
          ctx.scrollTeamCarousel(1, scopeRoot);
        }
        return true;
      },
      'open-calendar': function onOpenCalendar(actionEl){
        var shiftId = actionEl.dataset.shiftId || '';
        if(shiftId && typeof ctx.openCalendar === 'function'){
          ctx.openCalendar(shiftId);
        }
        return true;
      },
      'open-season-calendar': function onOpenSeasonCalendar(){
        if(typeof ctx.openSeasonCalendar === 'function'){
          ctx.openSeasonCalendar();
        }
        return true;
      },
      'primary-cta': function onPrimaryCta(){
        if(typeof ctx.handlePrimaryCTA === 'function'){
          ctx.handlePrimaryCTA();
        }
        return true;
      },
      'reset-age-selection': function onResetAge(){
        if(typeof ctx.resetAgeSelection === 'function'){
          ctx.resetAgeSelection();
        }
        return true;
      },
      'reset-shift-selection': function onResetShift(){
        if(typeof ctx.resetShiftSelection === 'function'){
          ctx.resetShiftSelection();
        }
        return true;
      },
      'reset-booking-all': function onResetBookingAll(){
        if(typeof ctx.openResetBookingConfirmModal === 'function'){
          ctx.openResetBookingConfirmModal();
        }
        return true;
      },
      'close-offer': function onCloseOffer(){
        if(typeof ctx.bumpOfferRunId === 'function'){
          ctx.bumpOfferRunId();
        }
        if(typeof ctx.clearOfferTimeout === 'function'){
          ctx.clearOfferTimeout();
        }
        var overlay = document.getElementById('offerOverlay');
        if(overlay){
          overlay.classList.add('hidden');
        }
        if(typeof ctx.resetOfferProgressUI === 'function'){
          ctx.resetOfferProgressUI();
        }
        return true;
      },
      'save-on-device': function onSaveOnDevice(){
        if(typeof ctx.saveOfferAndClose === 'function'){
          ctx.saveOfferAndClose();
        }
        if(typeof ctx.openNoticeModal === 'function'){
          var bookingText = ctx.bookingText || function(){ return ''; };
          ctx.openNoticeModal(bookingText('offerSavedOnDevice'));
        }
        return true;
      },
      'apply-offer': function onApplyOffer(){
        if(typeof ctx.clearOfferTimeout === 'function'){
          ctx.clearOfferTimeout();
        }
        var state = getState();
        if(typeof ctx.applyStatePatch === 'function'){
          ctx.applyStatePatch({
            offerStage: Math.max(toNumber(state.offerStage, 0), 1)
          });
        }
        if(typeof ctx.persist === 'function'){
          ctx.persist();
        }
        if(typeof ctx.renderAll === 'function'){
          ctx.renderAll();
        }
        var overlay = document.getElementById('offerOverlay');
        if(overlay){
          overlay.classList.add('hidden');
        }
        var lead = windowObj.AC_FEATURES && windowObj.AC_FEATURES.bookingInlineLead;
        if(lead && typeof lead.openForm === 'function'){
          lead.openForm({
            state: state,
            document: document,
            syncGuidedState: ctx.syncGuidedState,
            buildBookingSummaryHtml: ctx.buildBookingSummaryHtml,
            isOfferActive: ctx.isOfferActive,
            startTimer: ctx.startTimer,
            track: ctx.track,
            selectedShiftPayload: ctx.selectedShiftPayload,
            buildHeroVariantMeta: ctx.buildHeroVariantMeta
          });
        }
        return true;
      },
      'close-form': function onCloseForm(){
        var lead = windowObj.AC_FEATURES && windowObj.AC_FEATURES.bookingInlineLead;
        if(lead && typeof lead.closeForm === 'function'){
          lead.closeForm({document: document});
        }
        return true;
      },
      'submit-form': function onSubmitForm(){
        if(typeof ctx.submitLead === 'function'){
          ctx.submitLead('drawer');
        }
        return true;
      },
      'submit-inline-lead': function onSubmitInlineLead(actionEl){
        var scope = String(actionEl.dataset.inlineScope || '').trim();
        if(typeof ctx.submitLead === 'function'){
          ctx.submitLead(scope || 'drawer');
        }
        return true;
      },
      'close-success': function onCloseSuccess(){
        if(typeof ctx.closeSuccessModal === 'function'){
          ctx.closeSuccessModal();
        }
        return true;
      },
      'close-notice': function onCloseNotice(){
        if(typeof ctx.closeNoticeModal === 'function'){
          ctx.closeNoticeModal();
        }
        return true;
      },
      'close-variant-coach': function onCloseVariantCoach(actionEl){
        var dismissKey = String(actionEl.dataset.variantKey || '').trim();
        if(typeof ctx.hideVariantCoachBadge === 'function'){
          ctx.hideVariantCoachBadge(ctx.getPrimaryBookingViewConfig ? ctx.getPrimaryBookingViewConfig() : 'desktop', dismissKey);
        }
        return true;
      },
      'confirm-notice': function onConfirmNotice(){
        if(typeof ctx.closeNoticeModal === 'function'){
          ctx.closeNoticeModal();
        }
        if(typeof ctx.getNoticeConfirmHandler === 'function'){
          var noticeHandler = ctx.getNoticeConfirmHandler();
          if(typeof noticeHandler === 'function'){
            noticeHandler();
          }
        }
        return true;
      },
      'close-calendar': function onCloseCalendar(){
        if(typeof ctx.closeCalendar === 'function'){
          ctx.closeCalendar();
        }
        return true;
      },
      'close-section-modal': function onCloseSectionModal(){
        if(typeof ctx.closeSectionModal === 'function'){
          ctx.closeSectionModal();
        }
        return true;
      },
      'close-video-modal': function onCloseVideoModal(){
        if(typeof ctx.closeVideo === 'function'){
          ctx.closeVideo();
        }
        return true;
      },
      'invite-friend': function onInviteFriend(){
        return sendInviteText(ctx, ctx.buildInviteClipboardText ? ctx.buildInviteClipboardText() : '');
      },
      'copy-invite-link': function onCopyInviteLink(){
        return sendInviteText(ctx, ctx.buildInviteClipboardText ? ctx.buildInviteClipboardText() : '');
      },
      'close-version-badge': function onCloseVersionBadge(){
        var versionBadge = document.getElementById('version-badge');
        if(versionBadge){
          versionBadge.classList.add('hidden');
        }
        if(windowObj.localStorage){
          windowObj.localStorage.setItem('aidacamp-version-badge-hidden', '1');
        }
        return true;
      },
      'toggle-hero-menu': function onToggleHeroMenu(){
        if(typeof ctx.setHeroMenuOpen === 'function' && typeof ctx.isHeroMenuOpen === 'function'){
          if(typeof ctx.setHeroPhoneDropdownOpen === 'function'){
            ctx.setHeroPhoneDropdownOpen(false);
          }
          ctx.setHeroMenuOpen(!ctx.isHeroMenuOpen());
        }
        return true;
      },
      'toggle-hero-phone-dropdown': function onToggleHeroPhoneDropdown(){
        if(
          typeof ctx.setHeroPhoneDropdownOpen === 'function' &&
          typeof ctx.isHeroPhoneDropdownOpen === 'function'
        ){
          if(typeof ctx.setHeroMenuOpen === 'function'){
            ctx.setHeroMenuOpen(false);
          }
          ctx.setHeroPhoneDropdownOpen(!ctx.isHeroPhoneDropdownOpen());
        }
        return true;
      }
    };

    function sendInviteText(context, text){
      if(windowObj.navigator && windowObj.navigator.clipboard && typeof windowObj.navigator.clipboard.writeText === 'function'){
        windowObj.navigator.clipboard.writeText(text)
          .then(function onCopied(){
            if(typeof context.openNoticeModal === 'function' && typeof context.bookingText === 'function'){
              context.openNoticeModal(context.bookingText('inviteCopySuccess'));
            }
          })
          .catch(function onCopyError(){
            if(typeof context.openNoticeModal === 'function' && typeof context.bookingText === 'function'){
              context.openNoticeModal(context.bookingText('inviteCopyFailed'));
            }
          });
        return true;
      }
      if(typeof context.openNoticeModal === 'function' && typeof context.bookingText === 'function'){
        context.openNoticeModal(context.bookingText('inviteCopyManual'));
      }
      return true;
    }

    return {
      handleAction: function(target){
        var actionEl = target && target.closest ? target.closest('[data-action]') : null;
        if(!actionEl) return false;
        var action = String(actionEl.dataset && actionEl.dataset.action || '');
        var handler = handlers[action];
        if(typeof handler !== 'function'){
          return false;
        }
        recordMeta(action);
        return handler(actionEl) === false ? false : true;
      },
      getHandledActions: function(){
        return Object.keys(handlers);
      },
      getMeta: function(){
        return Object.assign({}, localState);
      }
    };
  }

  actionDispatcher.createActionDispatcher = createActionDispatcher;
  windowObj.AC_FEATURES.actionDispatcher = actionDispatcher;
})(window);


/* src/scripts/features/analytics.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  var config = window.AC_NOTIFY_CONFIG || {};
  var DEBUG = !!window.AC_DEBUG;

  function resolveNotifyUrl(eventName) {
    if (!config || typeof config !== "object") return "";
    if (hasOwn(config, eventName) && config[eventName]) {
      return String(config[eventName]);
    }
    if (config.all) {
      return String(config.all);
    }
    return "";
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function postJson(url, payload) {
    if (!url || !window.fetch) {
      return Promise.resolve(false);
    }
    return window.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload || {}),
      keepalive: true
    }).then(function (response) {
      return !!(response && response.ok);
    }).catch(function () {
      return false;
    });
  }

  function buildTelegramText(eventName, payload) {
    var lines = [];
    lines.push("AidaCamp lead event");
    lines.push("Тип: " + String(eventName || ""));

    if (payload && typeof payload === "object") {
      var preferredOrder = [
        "status",
        "lead_type",
        "phone",
        "name",
        "shift_name",
        "shift_date",
        "shift_days",
        "price_final",
        "price_text",
        "promo_code",
        "promo_expires_at_local",
        "city",
        "region",
        "country",
        "ip",
        "sent_at_local",
        "mode",
        "active_tab",
        "step"
      ];

      for (var i = 0; i < preferredOrder.length; i += 1) {
        var key = preferredOrder[i];
        if (!hasOwn(payload, key) || payload[key] === "" || payload[key] === null || payload[key] === undefined) continue;
        lines.push(key + ": " + String(payload[key]));
      }
    }

    return lines.join("\n");
  }

  function postTelegram(eventName, payload) {
    var token = String(config.telegramBotToken || "");
    var chatId = String(config.telegramChatId || "");
    if (!token || !chatId || !window.fetch) {
      return Promise.resolve(false);
    }

    return window.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildTelegramText(eventName, payload),
        disable_web_page_preview: true
      }),
      keepalive: true
    }).then(function (response) {
      return !!(response && response.ok);
    }).catch(function () {
      return false;
    });
  }

  window.AC_FEATURES.track = function track(eventName, payload) {
    var safePayload = payload && typeof payload === "object" ? payload : {};

    try {
      if (window.analytics && typeof window.analytics.track === "function") {
        window.analytics.track(eventName, safePayload);
        return;
      }
    } catch (_err) {
      // fallback to console
    }

    if (DEBUG) {
      try {
        console.log("[analytics]", eventName, safePayload);
      } catch (_err2) {
        // noop
      }
    }
  };

  window.AC_FEATURES.notifyLead = function notifyLead(eventName, payload) {
    var safeName = String(eventName || "lead_event");
    var safePayload = payload && typeof payload === "object" ? payload : {};
    var url = resolveNotifyUrl(safeName);

    if (!url) {
      return postTelegram(safeName, safePayload).then(function (sent) {
        if (sent) return true;
        if (DEBUG) {
          try {
            console.log("[notify]", safeName, safePayload);
          } catch (_err) {
            // noop
          }
        }
        return false;
      });
    }

    return postJson(url, {
      event: safeName,
      payload: safePayload
    }).then(function (sentWebhook) {
      if (sentWebhook) return true;
      return postTelegram(safeName, safePayload).then(function (sentTelegram) {
        if (sentTelegram) return true;
        if (DEBUG) {
          try {
            console.log("[notify]", safeName, safePayload);
          } catch (_err2) {
            // noop
          }
        }
        return false;
      });
    });
  };
})();


/* src/scripts/features/audit.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};

  window.AC_FEATURES.auditRuntime = {
    active: false,
    allowUiActions: false,
    allowDrag: true,
    snapGrid: 4,
    normalizeToParent: true,
    lockUntilAge: true,
    ageSelected: false,
    stageSync: null
  };
})();


/* src/scripts/features/booking-debug-flow.js */
(function registerBookingDebugFlow(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  windowObj.AC_FEATURES.bookingDebugFlow = windowObj.AC_FEATURES.bookingDebugFlow || {};

  function create(context){
    var ctx = context || {};
    var doc = ctx.document || windowObj.document;
    var isLocalRuntime = ctx.isLocalRuntime || function(){ return false; };
    var bookingText = ctx.bookingText || function(){ return ''; };
    var getBuildVersionLabel = ctx.getBuildVersionLabel || function(){ return ''; };
    var versionBadgeHiddenKey = ctx.versionBadgeHiddenKey || 'aidacamp_version_badge_hidden_v1';
    var getState = ctx.getState || function(){ return {}; };
    var getShifts = ctx.getShifts || function(){ return []; };
    var offerDiscountFactor = Number(ctx.offerDiscountFactor || 0.95);
    var generateCode = ctx.generateCode || function(){ return ''; };
    var clearOfferTimeout = ctx.clearOfferTimeout || function(){};
    var clearShiftOptionPanels = ctx.clearShiftOptionPanels || function(){};
    var applyStatePatch = ctx.applyStatePatch || function(){};
    var renderAll = ctx.renderAll || function(){};
    var persist = ctx.persist || function(){};

    function applyBookingDebugBlocksUi(){
      var state = getState();
      doc.body.classList.toggle('booking-debug-blocks', !!state.debugBookingBlocks);
      var btn = doc.getElementById('debugBookingBlocksBtn');
      if(btn){
        btn.classList.toggle('active', !!state.debugBookingBlocks);
        btn.setAttribute('aria-pressed', state.debugBookingBlocks ? 'true' : 'false');
      }
    }

    function applyDebugUiState(){
      if(!isLocalRuntime()){
        doc.getElementById('debugControls')?.remove();
        doc.getElementById('version-badge')?.remove();
        doc.body.classList.remove('booking-debug-blocks');
        return;
      }
      var badge = doc.getElementById('version-badge');
      if(!badge) return;
      var finalStepBtn = doc.querySelector('[data-action="debug-booking-what-to-do"]');
      if(finalStepBtn){
        finalStepBtn.textContent = bookingText('debugStepWhatNextLabel');
      }
      var badgeLabel = doc.getElementById('version-badge-label');
      var isHidden = windowObj.localStorage.getItem(versionBadgeHiddenKey) === '1';
      var label = String(getBuildVersionLabel() || '').trim();
      if(badgeLabel) badgeLabel.textContent = label;
      badge.title = label;
      badge.classList.toggle('hidden', isHidden);
      applyBookingDebugBlocksUi();
    }

    function setBookingDebugBlocks(enabled){
      applyStatePatch({
        debugBookingBlocks: !!enabled
      }, { persistState: true });
      applyBookingDebugBlocksUi();
    }

    function forceBookingDebugStage(mode){
      var state = getState();
      var shifts = getShifts();
      var primaryShift = shifts.find(function(s){ return !s.isShort; }) || shifts[0];
      if(!primaryShift) return;

      clearOfferTimeout();
      clearShiftOptionPanels();
      applyStatePatch({
        offerSearching: false,
        bookingCompleted: false
      });

      if(mode === 'what-to-do'){
        applyStatePatch({
          age: state.age || '10-12',
          ageSelected: true,
          shiftId: primaryShift.id,
          basePrice: primaryShift.price,
          offerPrice: Math.max(0, Math.round(primaryShift.price * offerDiscountFactor)),
          code: generateCode(),
          expiresAt: Date.now() + (72 * 60 * 60 * 1000),
          offerStage: 1,
          bookingCompleted: true
        });
        renderAll();
        persist();
        return;
      }

      var nextPatch = {
        age: state.age || '10-12',
        ageSelected: true,
        shiftId: primaryShift.id,
        basePrice: primaryShift.price,
        previousCode: null,
        nextCodePreview: null
      };

      if(mode === 'stage-3'){
        nextPatch.offerPrice = null;
        nextPatch.code = null;
        nextPatch.expiresAt = null;
        nextPatch.offerStage = 0;
      } else {
        nextPatch.offerPrice = Math.max(0, Math.round(primaryShift.price * offerDiscountFactor));
        nextPatch.code = generateCode();
        nextPatch.expiresAt = Date.now() + (72 * 60 * 60 * 1000);
        nextPatch.offerStage = 1;
      }

      applyStatePatch(nextPatch);
      renderAll();
      persist();
    }

    return Object.freeze({
      applyDebugUiState: applyDebugUiState,
      applyBookingDebugBlocksUi: applyBookingDebugBlocksUi,
      setBookingDebugBlocks: setBookingDebugBlocks,
      forceBookingDebugStage: forceBookingDebugStage
    });
  }

  windowObj.AC_FEATURES.bookingDebugFlow.create = create;
})(window);


/* src/scripts/features/booking-hint-flow.js */
(function(){
  function createBookingHintFlow(ctx = {}){
    const getActiveBookingViewKeys = typeof ctx.getActiveBookingViewKeys === 'function' ? ctx.getActiveBookingViewKeys : (() => []);
    const getRenderableBookingViewKeys = typeof ctx.getRenderableBookingViewKeys === 'function' ? ctx.getRenderableBookingViewKeys : (() => []);
    const getBookingViewConfig = typeof ctx.getBookingViewConfig === 'function' ? ctx.getBookingViewConfig : (() => ({}));
    const getBookingStage = typeof ctx.getBookingStage === 'function' ? ctx.getBookingStage : (() => 1);
    const hasSelectedAge = typeof ctx.hasSelectedAge === 'function' ? ctx.hasSelectedAge : (() => false);
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));

    function pulseNode(node){
      if(!node) return;
      node.classList.remove('guided-pulse');
      void node.offsetWidth;
      node.classList.add('guided-pulse');
      window.setTimeout(() => {
        node.classList.remove('guided-pulse');
      }, 1300);
    }

    function nudgeUserToNextStep(message = 'Сначала завершите предыдущий шаг.'){
      const state = getState();
      getActiveBookingViewKeys().forEach((prefix) => {
        const cfg = getBookingViewConfig(prefix);
        const inlineHint = document.getElementById(cfg.guidedInlineHintId);
        if(inlineHint){
          inlineHint.textContent = message;
          inlineHint.classList.add('visible');
          pulseNode(inlineHint);
          window.clearTimeout(inlineHint.__hideTimer);
          inlineHint.__hideTimer = window.setTimeout(() => {
            inlineHint.classList.remove('visible');
          }, 2400);
        }

        if(!hasSelectedAge()){
          pulseNode(document.getElementById(cfg.ageTabsId));
          return;
        }

        if(!state.shiftId){
          pulseNode(document.getElementById(cfg.shiftListId));
          return;
        }

        if(state.offerStage === 0){
          pulseNode(document.getElementById(cfg.ctaWrapId));
        }
      });
    }

    function showHint(message, requiredStep = ''){
      getActiveBookingViewKeys().forEach((prefix) => {
        const cfg = getBookingViewConfig(prefix);
        const el = document.getElementById(cfg.inlineHintId);
        const baseHint = document.getElementById(cfg.hintId);
        const stage = getBookingStage();
        if(!el) return;
        window.clearTimeout(el.__hideTimer);
        el.textContent = message;
        if(requiredStep){
          el.dataset.requiredStep = requiredStep;
        } else {
          delete el.dataset.requiredStep;
          el.__hideTimer = window.setTimeout(() => {
            el.classList.remove('visible');
            el.textContent = '';
            if(baseHint) baseHint.classList.remove('is-muted-hidden');
          }, 2400);
        }
        el.classList.add('visible');
        if(baseHint){
          if(stage <= 1){
            baseHint.classList.remove('is-muted-hidden');
          } else {
            baseHint.classList.add('is-muted-hidden');
          }
        }
      });
    }

    function syncBookingHints(){
      const state = getState();
      getRenderableBookingViewKeys().forEach((prefix) => {
        const cfg = getBookingViewConfig(prefix);
        const el = document.getElementById(cfg.inlineHintId);
        const baseHint = document.getElementById(cfg.hintId);
        if(!el) return;
        const requiredStep = el.dataset.requiredStep || '';
        if(!requiredStep){
          if(!el.classList.contains('visible') && baseHint){
            baseHint.classList.remove('is-muted-hidden');
          }
          return;
        }

        const resolved = (
          (requiredStep === 'age' && hasSelectedAge()) ||
          (requiredStep === 'shift' && !!state.shiftId) ||
          !!state.shiftId
        );

        if(resolved){
          el.classList.remove('visible');
          el.textContent = '';
          delete el.dataset.requiredStep;
          if(baseHint) baseHint.classList.remove('is-muted-hidden');
        }
      });
    }

    return Object.freeze({
      pulseNode,
      nudgeUserToNextStep,
      showHint,
      syncBookingHints
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.bookingHintFlow = Object.freeze({ create: createBookingHintFlow });
})();


/* src/scripts/features/booking-inline-lead.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.bookingInlineLead = window.AC_FEATURES.bookingInlineLead || {};

  function onlyDigits(value) {
    return (value || "").replace(/\D/g, "");
  }

  function formatPhoneInput(value) {
    var digits = onlyDigits(value);
    if (!digits) return "";

    if (digits[0] === "8") digits = "7" + digits.slice(1);
    if (digits[0] === "9") digits = "7" + digits;
    if (digits[0] !== "7") digits = "7" + digits;
    digits = digits.slice(0, 11);

    var out = "+7";
    if (digits.length > 1) out += " (" + digits.slice(1, 4);
    if (digits.length >= 4) out += ")";
    if (digits.length > 4) out += " " + digits.slice(4, 7);
    if (digits.length > 7) out += "-" + digits.slice(7, 9);
    if (digits.length > 9) out += "-" + digits.slice(9, 11);
    return out;
  }

  function normalizePhone(value) {
    var digits = onlyDigits(value);
    if (!digits) return "";
    if (digits[0] === "8") digits = "7" + digits.slice(1);
    if (digits[0] === "9") digits = "7" + digits;
    if (digits[0] !== "7") digits = "7" + digits;
    digits = digits.slice(0, 11);
    return digits.length === 11 ? "+" + digits : "";
  }

  function isValidPhone(value) {
    return !!normalizePhone(value);
  }

  function getLeadScopeConfig(scope) {
    var targetScope = scope || "drawer";
    var map = {
      drawer: {
        hostId: "formDrawer",
        phoneInputId: "parentPhone",
        consentId: "consentCheck",
        errorId: "phoneError",
        submitId: "submitLeadBtn"
      },
      "booking-desktop": {
        hostId: "desktopInlineLeadHost",
        phoneInputId: "inlineLeadPhoneDesktop",
        consentId: "inlineLeadConsentDesktop",
        errorId: "inlineLeadErrorDesktop",
        submitId: "inlineLeadSubmitDesktop"
      },
      "booking-mobile": {
        hostId: "mobileInlineLeadHost",
        phoneInputId: "inlineLeadPhoneMobile",
        consentId: "inlineLeadConsentMobile",
        errorId: "inlineLeadErrorMobile",
        submitId: "inlineLeadSubmitMobile"
      },
      offer: {
        hostId: "offerInlineLeadHost",
        phoneInputId: "inlineLeadPhoneOffer",
        consentId: "inlineLeadConsentOffer",
        errorId: "inlineLeadErrorOffer",
        submitId: "inlineLeadSubmitOffer"
      }
    };
    return map[targetScope] || null;
  }

  function getLeadSubmitDefaultText() {
    return "Забронировать";
  }

  function setLeadPhoneError(options) {
    var opts = options || {};
    var scope = opts.scope || "drawer";
    var show = !!opts.show;
    var message = opts.message || "";
    var document = opts.document || window.document;
    var cfg = getLeadScopeConfig(scope);
    if (!cfg) return;
    var input = document.getElementById(cfg.phoneInputId);
    var error = document.getElementById(cfg.errorId);
    if (!input || !error) return;
    if (message) error.textContent = message;
    input.classList.toggle("input-error", show);
    error.classList.toggle("visible", show);
  }

  function setLeadSubmitState(options) {
    var opts = options || {};
    var loading = !!opts.loading;
    var scope = opts.scope || "drawer";
    var document = opts.document || window.document;
    var cfg = getLeadScopeConfig(scope);
    if (!cfg) return;
    var btn = document.getElementById(cfg.submitId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "Бронируем..." : getLeadSubmitDefaultText(scope);
  }

  function bindPhoneMaskForScope(options) {
    var opts = options || {};
    var scope = opts.scope || "drawer";
    var document = opts.document || window.document;
    var cfg = getLeadScopeConfig(scope);
    if (!cfg) return;
    var phoneInput = document.getElementById(cfg.phoneInputId);
    if (!phoneInput || phoneInput.dataset.maskBound === "1") return;

    phoneInput.addEventListener("input", function (e) {
      e.target.value = formatPhoneInput(e.target.value);
      setLeadPhoneError({ scope: scope, show: false, document: document });
    });
    phoneInput.addEventListener("blur", function () {
      var val = phoneInput.value.trim();
      if (!val) {
        setLeadPhoneError({ scope: scope, show: false, document: document });
        return;
      }
      setLeadPhoneError({ scope: scope, show: !isValidPhone(val), document: document });
    });
    phoneInput.addEventListener("paste", function () {
      requestAnimationFrame(function () {
        phoneInput.value = formatPhoneInput(phoneInput.value);
        setLeadPhoneError({ scope: scope, show: false, document: document });
      });
    });
    phoneInput.dataset.maskBound = "1";
  }

  function buildInlineLeadFormHtml(scope) {
    var cfg = getLeadScopeConfig(scope);
    if (!cfg) return "";
    return '\n'
      + '  <div class="inline-lead-card ' + (scope === "offer" ? "inline-lead-card--offer" : "") + '" data-inline-scope="' + scope + '">\n'
      + '    <div class="form-field">\n'
      + '      <label for="' + cfg.phoneInputId + '">Телефон</label>\n'
      + '      <input class="input-box" id="' + cfg.phoneInputId + '" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" maxlength="18" />\n'
      + '      <div class="field-error" id="' + cfg.errorId + '">Введите телефон полностью в формате +7 (___) ___-__-__</div>\n'
      + "    </div>\n"
      + '    <label class="check-row inline-lead-check">\n'
      + '      <input type="checkbox" id="' + cfg.consentId + '" />\n'
      + '      <span>Я согласен(на) на <a href="https://www.codims.ru/privacy" target="_blank" rel="noopener noreferrer">обработку персональных данных</a>.</span>\n'
      + "    </label>\n"
      + '    <button class="cta-main inline-lead-submit" id="' + cfg.submitId + '" type="button" data-action="submit-inline-lead" data-inline-scope="' + scope + '">\n'
      + "      " + getLeadSubmitDefaultText(scope) + "\n"
      + "    </button>\n"
      + "  </div>\n";
  }

  function openInlineLead(options) {
    var opts = options || {};
    var scope = opts.scope;
    var document = opts.document || window.document;
    var state = opts.state || {};
    var track = typeof opts.track === "function" ? opts.track : function () {};
    var selectedShiftPayload = typeof opts.selectedShiftPayload === "function" ? opts.selectedShiftPayload : function () { return {}; };
    var buildHeroVariantMeta = typeof opts.buildHeroVariantMeta === "function" ? opts.buildHeroVariantMeta : function (x) { return x || {}; };

    var cfg = getLeadScopeConfig(scope);
    if (!cfg) return;
    var host = document.getElementById(cfg.hostId);
    if (!host) return;

    if (!host.innerHTML.trim()) {
      host.innerHTML = buildInlineLeadFormHtml(scope);
    }
    host.classList.remove("hidden");

    var phoneInput = document.getElementById(cfg.phoneInputId);
    if (phoneInput) {
      phoneInput.value = formatPhoneInput(state.phone || "");
    }
    var consentCheck = document.getElementById(cfg.consentId);
    if (consentCheck) {
      consentCheck.checked = false;
    }
    setLeadPhoneError({ scope: scope, show: false, document: document });
    setLeadSubmitState({ loading: false, scope: scope, document: document });
    bindPhoneMaskForScope({ scope: scope, document: document });
    if (phoneInput) phoneInput.focus();
    track("form_open", Object.assign({}, selectedShiftPayload(), { lead_scope: scope }));
    track("hero_variant_form_open_new", buildHeroVariantMeta(Object.assign({}, selectedShiftPayload(), { lead_scope: scope })));
  }

  function closeInlineLead(options) {
    var opts = options || {};
    var scope = opts.scope;
    var document = opts.document || window.document;
    var cfg = getLeadScopeConfig(scope);
    if (!cfg) return;
    var host = document.getElementById(cfg.hostId);
    if (!host) return;
    host.classList.add("hidden");
  }

  function openForm(options) {
    var opts = options || {};
    var state = opts.state || {};
    var document = opts.document || window.document;
    var syncGuidedState = opts.syncGuidedState || function () {};
    var buildBookingSummaryHtml = opts.buildBookingSummaryHtml || function () { return ""; };
    var isOfferActive = opts.isOfferActive || function () { return false; };
    var startTimer = opts.startTimer || function () {};
    var track = typeof opts.track === "function" ? opts.track : function () {};
    var selectedShiftPayload = typeof opts.selectedShiftPayload === "function" ? opts.selectedShiftPayload : function () { return {}; };
    var buildHeroVariantMeta = typeof opts.buildHeroVariantMeta === "function" ? opts.buildHeroVariantMeta : function (x) { return x || {}; };

    syncGuidedState();
    if (!state.shiftId) return;

    var formLead = document.getElementById("formLead");
    if (formLead) formLead.textContent = "";

    var phoneInput = document.getElementById("parentPhone");
    var parentPhone = document.getElementById("parentPhone");
    if (parentPhone) parentPhone.value = state.phone || "";
    if (phoneInput) phoneInput.value = formatPhoneInput(state.phone || "");
    var bookingSummaryBox = document.getElementById("bookingSummaryBox");
    if (bookingSummaryBox) bookingSummaryBox.innerHTML = buildBookingSummaryHtml({ showTimer: true });
    setLeadPhoneError({ scope: "drawer", show: false, document: document });
    setLeadSubmitState({ loading: false, scope: "drawer", document: document });
    bindPhoneMaskForScope({ scope: "drawer", document: document });
    if (isOfferActive()) startTimer();
    track("form_open", selectedShiftPayload());
    track("hero_variant_form_open_new", buildHeroVariantMeta(Object.assign({}, selectedShiftPayload(), { lead_scope: "drawer" })));
    var drawer = document.getElementById("formDrawer");
    if (drawer) drawer.classList.remove("hidden");
  }

  function closeForm(options) {
    var document = (options && options.document) || window.document;
    var drawer = document.getElementById("formDrawer");
    if (drawer) drawer.classList.add("hidden");
  }

  async function submitLeadFromScope(options) {
    var opts = options || {};
    var scope = opts.scope || "drawer";
    var state = opts.state || {};
    var shifts = opts.shifts || [];
    var document = opts.document || window.document;
    var getInProgress = typeof opts.getInProgress === "function" ? opts.getInProgress : function () { return false; };
    var setInProgress = typeof opts.setInProgress === "function" ? opts.setInProgress : function () {};
    var syncGuidedState = opts.syncGuidedState || function () {};
    var normalizePhoneFn = opts.normalizePhone || normalizePhone;
    var isValidPhoneFn = opts.isValidPhone || isValidPhone;
    var setLeadPhoneErrorFn = opts.setLeadPhoneError || function () {};
    var setLeadSubmitStateFn = opts.setLeadSubmitState || function () {};
    var openNoticeModal = opts.openNoticeModal || function () {};
    var persist = opts.persist || function () {};
    var labelAge = opts.labelAge || function (value) { return value || ""; };
    var formatPrice = opts.formatPrice || function (value) { return String(value || ""); };
    var buildAbMeta = opts.buildAbMeta || function () { return {}; };
    var track = typeof opts.track === "function" ? opts.track : function () {};
    var selectedShiftPayload = typeof opts.selectedShiftPayload === "function" ? opts.selectedShiftPayload : function () { return {}; };
    var buildHeroVariantMeta = typeof opts.buildHeroVariantMeta === "function" ? opts.buildHeroVariantMeta : function (x) { return x || {}; };
    var notifyLead = opts.notifyLead || function () { return Promise.resolve(false); };
    var closeFormFn = opts.closeForm || function () {};
    var closeInlineLeadFn = opts.closeInlineLead || function () {};
    var renderSummary = opts.renderSummary || function () {};
    var renderBookingPanels = opts.renderBookingPanels || function () {};
    var updateSummaryBarVisibility = opts.updateSummaryBarVisibility || function () {};
    var isAdminDebugSession = opts.isAdminDebugSession || function () { return false; };

    if (getInProgress()) return;
    syncGuidedState();

    var cfg = getLeadScopeConfig(scope);
    if (!cfg) return;
    var phoneInput = document.getElementById(cfg.phoneInputId);
    var consentInput = document.getElementById(cfg.consentId);
    var nameInput = document.getElementById("parentName");
    var name = (nameInput && nameInput.value.trim()) || "Родитель";
    var phoneRaw = phoneInput ? phoneInput.value.trim() : "";
    var phone = normalizePhoneFn(phoneRaw);
    var consent = !!(consentInput && consentInput.checked);

    if (!phoneRaw) {
      setLeadPhoneErrorFn(scope, true);
      openNoticeModal("Введите номер телефона.");
      if (phoneInput) phoneInput.focus();
      return;
    }

    if (!consent) {
      openNoticeModal("Подтвердите согласие на обработку персональных данных.");
      if (consentInput) consentInput.focus();
      return;
    }

    if (!isValidPhoneFn(phoneRaw)) {
      setLeadPhoneErrorFn(scope, true);
      openNoticeModal("Проверьте номер телефона.");
      if (phoneInput) phoneInput.focus();
      return;
    }

    setLeadPhoneErrorFn(scope, false);
    setInProgress(true);
    setLeadSubmitStateFn(true, scope);

    state.phone = phone;
    persist();

    var shift = shifts.find(function (s) { return s.id === state.shiftId; });
    var price = state.offerPrice || state.basePrice || (shift ? shift.price : null);
    var payload = Object.assign({
      name: name,
      phone: phone,
      age: labelAge(state.age),
      shift_id: shift ? shift.id : "",
      shift_name: shift ? shift.dates : "",
      shift_date: shift ? shift.dates : "",
      price_final: price || null,
      price_text: price ? formatPrice(price) : "—",
      promo_code: state.code || "",
      promo_status: state.offerPrice ? (state.offerStage >= 2 ? "improved_again" : "fixed") : "none",
      mode: state.previewView === "mobile"
        ? "mobile:" + (state.mobileMode || "full")
        : "desktop:" + (state.desktopMode || "full"),
      sent_at_local: new Date().toLocaleString("ru-RU")
    }, buildAbMeta());

    track("form_submit", Object.assign({}, selectedShiftPayload(), {
      booking_code: state.code || "",
      lead_scope: scope,
      parent_name_present: !!name,
      phone_present: !!phone
    }));
    track("hero_variant_form_submit_new", buildHeroVariantMeta(Object.assign({}, selectedShiftPayload(), {
      booking_code: state.code || "",
      lead_scope: scope,
      parent_name_present: !!name,
      phone_present: !!phone
    })));

    try {
      var deliveryResult = await notifyLead("booking_submitted", payload);
      state.bookingCompleted = true;
      state.offerSearching = false;
      persist();
      if (scope === "drawer") {
        closeFormFn();
      } else {
        closeInlineLeadFn(scope);
      }
      if (scope === "offer") {
        var offerOverlay = document.getElementById("offerOverlay");
        if (offerOverlay) offerOverlay.classList.add("hidden");
      }
      renderSummary();
      renderBookingPanels();
      updateSummaryBarVisibility();
      if (!isAdminDebugSession() || !deliveryResult || deliveryResult.ok !== false) {
        // Skip dedicated success popup; keep booking in final booked card state.
      }
    } finally {
      setInProgress(false);
      setLeadSubmitStateFn(false, scope);
    }
  }

  window.AC_FEATURES.bookingInlineLead.onlyDigits = onlyDigits;
  window.AC_FEATURES.bookingInlineLead.formatPhoneInput = formatPhoneInput;
  window.AC_FEATURES.bookingInlineLead.normalizePhone = normalizePhone;
  window.AC_FEATURES.bookingInlineLead.isValidPhone = isValidPhone;
  window.AC_FEATURES.bookingInlineLead.getLeadScopeConfig = getLeadScopeConfig;
  window.AC_FEATURES.bookingInlineLead.getLeadSubmitDefaultText = getLeadSubmitDefaultText;
  window.AC_FEATURES.bookingInlineLead.setLeadPhoneError = setLeadPhoneError;
  window.AC_FEATURES.bookingInlineLead.setLeadSubmitState = setLeadSubmitState;
  window.AC_FEATURES.bookingInlineLead.bindPhoneMaskForScope = bindPhoneMaskForScope;
  window.AC_FEATURES.bookingInlineLead.buildInlineLeadFormHtml = buildInlineLeadFormHtml;
  window.AC_FEATURES.bookingInlineLead.openInlineLead = openInlineLead;
  window.AC_FEATURES.bookingInlineLead.closeInlineLead = closeInlineLead;
  window.AC_FEATURES.bookingInlineLead.openForm = openForm;
  window.AC_FEATURES.bookingInlineLead.closeForm = closeForm;
  window.AC_FEATURES.bookingInlineLead.submitLeadFromScope = submitLeadFromScope;
})();


/* src/scripts/features/booking-runtime.js */
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
    getPrimaryActionState: getPrimaryActionState,
    getStepState: getStepState,
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


/* src/scripts/features/booking-view-flow.js */
(function(){
  function createBookingViewFlow(ctx = {}){
    const bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : (() => '');
    const getBookingStage = typeof ctx.getBookingStage === 'function' ? ctx.getBookingStage : (() => 1);
    const splitPrimaryActionText = typeof ctx.splitPrimaryActionText === 'function' ? ctx.splitPrimaryActionText : ((text) => ({stacked:false, main:String(text || ''), gainText:''}));
    const getSelectedShift = typeof ctx.getSelectedShift === 'function' ? ctx.getSelectedShift : (() => null);
    const getPrimaryActionState = typeof ctx.getPrimaryActionState === 'function' ? ctx.getPrimaryActionState : (() => ({disabled:false, hint:''}));
    const getResolvedPrimaryActionText = typeof ctx.getResolvedPrimaryActionText === 'function' ? ctx.getResolvedPrimaryActionText : (() => '');
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const hasSelectedAge = typeof ctx.hasSelectedAge === 'function' ? ctx.hasSelectedAge : (() => false);
    const formatPrice = typeof ctx.formatPrice === 'function' ? ctx.formatPrice : ((v) => String(v || '—'));
    const getVisiblePrice = typeof ctx.getVisiblePrice === 'function' ? ctx.getVisiblePrice : (() => 0);
    const isOfferActive = typeof ctx.isOfferActive === 'function' ? ctx.isOfferActive : (() => false);
    const formatRemainingCompact = typeof ctx.formatRemainingCompact === 'function' ? ctx.formatRemainingCompact : (() => '');
    const stripRemainingPrefix = typeof ctx.stripRemainingPrefix === 'function' ? ctx.stripRemainingPrefix : ((v) => String(v || ''));
    const ageLabel = typeof ctx.ageLabel === 'function' ? ctx.ageLabel : (() => '');
    const shiftDaysLabel = typeof ctx.shiftDaysLabel === 'function' ? ctx.shiftDaysLabel : (() => '');
    const uiBookingHintTemplate = typeof ctx.uiBookingHintTemplate === 'function' ? ctx.uiBookingHintTemplate : (() => '');
    const getTypewriterRunId = typeof ctx.getTypewriterRunId === 'function' ? ctx.getTypewriterRunId : (() => 0);
    const setTypewriterRunId = typeof ctx.setTypewriterRunId === 'function' ? ctx.setTypewriterRunId : (() => {});
    const getTypewriterTimer = typeof ctx.getTypewriterTimer === 'function' ? ctx.getTypewriterTimer : (() => null);
    const setTypewriterTimer = typeof ctx.setTypewriterTimer === 'function' ? ctx.setTypewriterTimer : (() => {});
    const getTypewriterDone = typeof ctx.getTypewriterDone === 'function' ? ctx.getTypewriterDone : (() => false);
    const setTypewriterDone = typeof ctx.setTypewriterDone === 'function' ? ctx.setTypewriterDone : (() => {});
    const syncGuidedState = typeof ctx.syncGuidedState === 'function' ? ctx.syncGuidedState : (() => {});
    const getRenderableBookingViewKeys = typeof ctx.getRenderableBookingViewKeys === 'function' ? ctx.getRenderableBookingViewKeys : (() => []);
    const getBookingViewConfig = typeof ctx.getBookingViewConfig === 'function' ? ctx.getBookingViewConfig : (() => null);
    const renderSteps = typeof ctx.renderSteps === 'function' ? ctx.renderSteps : (() => {});
    const renderGuidedState = typeof ctx.renderGuidedState === 'function' ? ctx.renderGuidedState : (() => {});
    const applyBookingStageClass = typeof ctx.applyBookingStageClass === 'function' ? ctx.applyBookingStageClass : (() => {});
    const applyBookingStage2Alignment = typeof ctx.applyBookingStage2Alignment === 'function' ? ctx.applyBookingStage2Alignment : (() => {});
    const applyBookingStructureSchema = typeof ctx.applyBookingStructureSchema === 'function' ? ctx.applyBookingStructureSchema : (() => {});
    const syncBookingHints = typeof ctx.syncBookingHints === 'function' ? ctx.syncBookingHints : (() => {});
    const updateBookingScarcityUi = typeof ctx.updateBookingScarcityUi === 'function' ? ctx.updateBookingScarcityUi : (() => {});
    const scheduleBookingCardMinHeightSync = typeof ctx.scheduleBookingCardMinHeightSync === 'function' ? ctx.scheduleBookingCardMinHeightSync : (() => {});
    const closeInlineLead = typeof ctx.closeInlineLead === 'function' ? ctx.closeInlineLead : (() => {});

    function stopBookingStage1TitleTypewriter(){
      setTypewriterRunId(getTypewriterRunId() + 1);
      const timer = getTypewriterTimer();
      if(timer){
        window.clearTimeout(timer);
        setTypewriterTimer(null);
      }
    }

    function runBookingStage1TitleTypewriter(target, text){
      if(!target) return;
      const phrase = String(text || '').trim();
      if(!phrase){
        target.textContent = '';
        target.classList.remove('booking-title-typewriter', 'is-typing', 'is-typed');
        return;
      }
      if(target.classList.contains('is-typing') && target.dataset.typewriterText === phrase){
        return;
      }
      stopBookingStage1TitleTypewriter();
      const runId = getTypewriterRunId();
      const typeDelay = 156;
      const moveDelay = 92;
      target.dataset.typewriterText = phrase;
      target.textContent = '';
      target.classList.add('booking-title-typewriter', 'is-typing');
      target.classList.remove('is-typed');
      const wait = (ms) => new Promise((resolve) => {
        const timer = window.setTimeout(() => {
          setTypewriterTimer(null);
          resolve();
        }, ms);
        setTypewriterTimer(timer);
      });
      const canContinue = () => runId === getTypewriterRunId();
      const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      let value = '';
      let caret = 0;
      const render = (showCaret = true) => {
        const left = escapeHtml(value.slice(0, caret));
        const right = escapeHtml(value.slice(caret));
        target.innerHTML = `${left}${showCaret ? '<span class="booking-title-typewriter__caret" aria-hidden="true"></span>' : ''}${right}`;
      };
      const moveCaretTo = async (targetPos) => {
        const to = Math.max(0, Math.min(value.length, targetPos));
        while(caret !== to){
          if(!canContinue()) return false;
          caret += caret < to ? 1 : -1;
          render(true);
          await wait(moveDelay);
        }
        return canContinue();
      };
      const insertAtCaret = async (chunk) => {
        const source = String(chunk || '');
        for(let i = 0; i < source.length; i += 1){
          if(!canContinue()) return false;
          value = value.slice(0, caret) + source[i] + value.slice(caret);
          caret += 1;
          render(true);
          await wait(typeDelay);
        }
        return canContinue();
      };
      const deleteBackward = async (count = 1) => {
        let remaining = Math.max(0, Number(count) || 0);
        while(remaining > 0 && caret > 0){
          if(!canContinue()) return false;
          value = value.slice(0, caret - 1) + value.slice(caret);
          caret -= 1;
          remaining -= 1;
          render(true);
          await wait(typeDelay);
        }
        return canContinue();
      };
      const runScript = async () => {
        if(!await insertAtCaret(bookingText('stage1TypewriterBase'))) return;
        await wait(1200);
        const seenWord = bookingText('stage1TypewriterSeenWord');
        const pricesPhrase = bookingText('stage1TypewriterPricesPhrase');
        const pricesSwap = bookingText('stage1TypewriterPricesSwap');
        const accentChar = bookingText('stage1TypewriterAccentChar');
        const chooseWord = bookingText('stage1TypewriterChooseWord');
        const seenWordStart = value.indexOf(seenWord);
        if(seenWordStart >= 0){
          const letterEPos = seenWordStart + 4;
          if(!await moveCaretTo(letterEPos + 1)) return;
          if(!await deleteBackward(1)) return;
          if(!await insertAtCaret(accentChar)) return;
        }
        await wait(900);
        const pricesStart = value.indexOf(pricesPhrase);
        if(pricesStart >= 0){
          if(!await moveCaretTo(pricesStart + pricesPhrase.length)) return;
          if(!await deleteBackward(pricesPhrase.length)) return;
          if(!await insertAtCaret(pricesSwap)) return;
        }
        await wait(1000);
        const chooseStart = value.indexOf(chooseWord);
        if(chooseStart >= 0){
          const itRusStart = chooseStart + 5;
          if(!await moveCaretTo(itRusStart + 2)) return;
          if(!await deleteBackward(2)) return;
          if(!await insertAtCaret('IT')) return;
        }
        if(!canContinue()) return;
        render(true);
        target.classList.remove('is-typing');
        target.classList.add('is-typed');
        setTypewriterDone(true);
      };
      runScript().catch(() => {
        setTypewriterDone(true);
        target.classList.remove('is-typing');
        target.classList.add('is-typed');
      });
    }

    function renderBookingInfo(viewCfg){
      if(!viewCfg) return;
      const state = getState();
      const info = document.getElementById(viewCfg.infoId);
      const title = document.getElementById(viewCfg.titleId);
      const lead = document.getElementById(viewCfg.leadId);
      const btn = document.getElementById(viewCfg.startBtnId);
      const hint = document.getElementById(viewCfg.hintId);
      const shift = getSelectedShift();
      const action = getPrimaryActionState();
      const isDesktopPanel = viewCfg.key === 'desktop';
      const isPriceCheckStage = !!shift && state.offerStage === 0;
      const actionText = getResolvedPrimaryActionText(action, shift);

      if(btn){
        btn.classList.remove('hidden');
        const isStageFour = getBookingStage() === 4 && !state.bookingCompleted;
        const split = isStageFour ? splitPrimaryActionText(actionText) : {stacked:false, main: actionText, gainText:''};
        if(split.stacked){
          btn.innerHTML = `
            <span class="cta-main-line cta-main-line--primary">${split.main}</span>
            <span class="cta-main-line cta-main-line--accent">${bookingText('bookingFinalizeBenefitLine')} ${split.gainText}</span>
          `;
          btn.dataset.ctaLayout = 'stacked';
          btn.setAttribute('aria-label', `${split.main}. ${bookingText('bookingFinalizeBenefitLine')} ${split.gainText}`);
        } else {
          btn.textContent = actionText;
          btn.removeAttribute('data-cta-layout');
          btn.removeAttribute('aria-label');
        }
        btn.classList.toggle('is-disabled', !!action.disabled);
        btn.classList.toggle('cta-main-compact', isDesktopPanel && isPriceCheckStage);
        btn.setAttribute('aria-disabled', action.disabled ? 'true' : 'false');
        btn.disabled = !!action.disabled;
      }
      if(hint) hint.textContent = action.hint;

      if(state.bookingCompleted){
        stopBookingStage1TitleTypewriter();
        setTypewriterDone(false);
        title?.classList.remove('booking-title-typewriter', 'is-typing', 'is-typed');
        if(title) title.textContent = bookingText('bookingCompletedTitle');
        if(lead) lead.textContent = '';
        if(btn){
          btn.classList.add('is-disabled', 'hidden');
          btn.setAttribute('aria-disabled', 'true');
          btn.disabled = true;
          btn.removeAttribute('data-cta-layout');
          btn.removeAttribute('aria-label');
          btn.textContent = bookingText('primaryCtaAccepted');
          btn.classList.remove('cta-main-compact');
        }
        if(!shift){
          if(info) info.innerHTML = '';
          return;
        }
        if(info){
          info.innerHTML = `
            <div class="booking-completed-main">
              <button class="completed-followup-image-trigger" type="button" data-action="open-referral-photo" aria-label="${bookingText('bookingReferralImageAria')}">
                <img class="completed-followup-image" src="/assets/images/referral-hoodie.jpeg" alt="${bookingText('referralHoodieAlt')}">
                <span class="completed-followup-note-overlay">${bookingText('bookingReferralNote')}</span>
              </button>
            </div>
          `;
        }
        return;
      }

      if(!hasSelectedAge()){
        const stage1TitleText = bookingText('ageToSeeShiftsPrices');
        if(title){
          if(!getTypewriterDone()){
            runBookingStage1TitleTypewriter(title, stage1TitleText);
          } else {
            title.textContent = bookingText('stage1TypewriterFinal');
            title.classList.add('booking-title-typewriter', 'is-typed');
            title.classList.remove('is-typing');
          }
        }
        if(lead) lead.textContent = '';
        if(info) info.innerHTML = '';
        return;
      }

      stopBookingStage1TitleTypewriter();
      setTypewriterDone(false);
      title?.classList.remove('booking-title-typewriter', 'is-typing', 'is-typed');

      if(!shift){
        if(title) title.textContent = `${bookingText('bookingShiftsForAgePrefix')} ${ageLabel(state.age)}`;
        if(lead) lead.textContent = '';
        if(info) info.innerHTML = '';
        btn?.classList.remove('cta-main-compact');
        return;
      }

      const currentPrice = formatPrice(shift.price);
      const visiblePriceValue = getVisiblePrice();
      const visiblePrice = formatPrice(visiblePriceValue);
      const timerText = isOfferActive() ? formatRemainingCompact(state.expiresAt - Date.now()) : '';
      const basePriceValue = Number(state.basePrice || shift.price || 0);
      const safeVisiblePrice = Number(visiblePriceValue || 0);
      const savingsValue = Math.max(0, basePriceValue - safeVisiblePrice);
      const savingsText = formatPrice(savingsValue);
      const discountPercent = basePriceValue > 0
        ? Math.max(0, Math.round(((basePriceValue - safeVisiblePrice) / basePriceValue) * 100))
        : 0;

      if(title) title.textContent = state.offerStage >= 1 ? bookingText('bookingYourTermsTitle') : bookingText('bookingCheckPriceTitle');
      if(lead) lead.textContent = '';

      if(isDesktopPanel && state.offerStage === 0){
        if(info) info.innerHTML = `
          <div class="booking-shift-focus">
            <div class="booking-shift-focus__dates">${shift.dates}</div>
            <div class="booking-shift-focus__days">${shiftDaysLabel(shift)}</div>
            <div class="booking-shift-focus__preliminary">
              <span class="booking-shift-focus__preliminary-label">${bookingText('bookingPreliminaryPriceLabel')}</span>
              <span class="booking-shift-focus__preliminary-value">${formatPrice(shift.price)}</span>
            </div>
            <div class="booking-shift-focus__seats">${uiBookingHintTemplate('shiftSeatsLeftTemplate', {count: shift.left})}</div>
          </div>
        `;
        return;
      }

      const isSummaryStage = state.offerStage >= 1;
      if(info) info.innerHTML = isSummaryStage ? `
        <div class="booking-price-box booking-summary-mini">
          <div class="booking-summary-stage4-head">
            <div class="booking-summary-stage4-age">${ageLabel(state.age)} · ${shift.dates}</div>
          </div>
          <div class="booking-price-head">
            <div class="booking-price-col booking-price-col--fixed" style="text-align:left;">
              <small>${bookingText('bookingStage4FixedPriceLabel')}</small>
              <div class="booking-price-main big">${visiblePrice}</div>
            </div>
          </div>
          <div class="booking-stage4-badges">
            ${discountPercent > 0 ? `<span class="booking-stage4-badge">${bookingText('bookingStage4DiscountLabel')} ${discountPercent}%</span>` : ''}
            ${savingsValue > 0 ? `<span class="booking-stage4-badge">${bookingText('bookingStage4BenefitLabel')} ${savingsText}</span>` : ''}
            ${state.code ? `<span class="booking-stage4-badge booking-stage4-badge--code">${bookingText('bookingStage4CodeLabel')} ${state.code}</span>` : ''}
          </div>
          <div class="booking-stage4-note">${bookingText('bookingStage4AwaitingNote')}</div>
          ${timerText ? `<div class="booking-timer-line" data-live-timer="true"><span class="booking-timer-label">${bookingText('bookingTimerPrefix')}</span><span class="booking-timer-value">${stripRemainingPrefix(timerText)}</span></div>` : ''}
        </div>
      ` : `
        <div class="booking-price-box">
          <div class="booking-price-head">
            <div class="booking-price-col">
              <small>${bookingText('bookingCurrentPriceLabel')}</small>
              <div class="booking-price-main">${currentPrice}</div>
            </div>
            <div class="booking-price-col" style="text-align:right;">
              <small>${bookingText('bookingAfterCheckPriceLabel')}</small>
              <div class="booking-price-main big">${visiblePrice}</div>
            </div>
          </div>
        </div>
      `;
    }

    function renderBookingPanels(){
      syncGuidedState();
      var renderableViews = getRenderableBookingViewKeys();
      renderableViews.forEach(function(viewKey){
        var cfg = getBookingViewConfig(viewKey);
        try {
          renderBookingInfo(cfg);
          renderSteps(cfg);
          renderGuidedState(cfg);
          applyBookingStageClass(cfg);
          applyBookingStage2Alignment(cfg);
          applyBookingStructureSchema(cfg);
        } catch (err){
          console.warn('[booking] render failed for view:', cfg && cfg.key, err);
        }
      });
      syncBookingHints();
      updateBookingScarcityUi();
      scheduleBookingCardMinHeightSync();
      if(getBookingStage() < 4){
        renderableViews.forEach(function(viewKey){
          var cfg = getBookingViewConfig(viewKey);
          if(cfg && cfg.inlineLeadScope){
            closeInlineLead(cfg.inlineLeadScope);
          }
        });
      }
    }

    return Object.freeze({
      stopBookingStage1TitleTypewriter,
      runBookingStage1TitleTypewriter,
      renderBookingInfo,
      renderBookingPanels
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.bookingViewFlow = Object.freeze({ create: createBookingViewFlow });
})();


/* src/scripts/features/booking.block.js */
/* src/scripts/features/booking.block.js */
(function registerBookingBlock(windowObj){
  'use strict';
  if(!windowObj || typeof windowObj.createAidacampBlock !== 'function') return;
  windowObj.AIDACAMP_BLOCKS.booking = windowObj.createAidacampBlock('booking');
})(window);


/* src/scripts/features/calendar-flow.js */
(function(){
  function createCalendarFlow(ctx = {}){
    const getShifts = typeof ctx.getShifts === 'function' ? ctx.getShifts : (() => []);
    const bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : (() => '');
    const calendarWeekdaysShort = typeof ctx.calendarWeekdaysShort === 'function' ? ctx.calendarWeekdaysShort : (() => []);
    const calendarMonthNames = typeof ctx.calendarMonthNames === 'function' ? ctx.calendarMonthNames : (() => []);
    const closeTransientModals = typeof ctx.closeTransientModals === 'function' ? ctx.closeTransientModals : (() => {});
    const emitModularEvent = typeof ctx.emitModularEvent === 'function' ? ctx.emitModularEvent : (() => {});
    const track = typeof ctx.track === 'function' ? ctx.track : (() => {});
    const getShiftOptionPanels = typeof ctx.getShiftOptionPanels === 'function' ? ctx.getShiftOptionPanels : (() => ({
      desktop:{aboutId:null, calendarId:null},
      mobile:{aboutId:null, calendarId:null}
    }));
    const setShiftOptionPanels = typeof ctx.setShiftOptionPanels === 'function' ? ctx.setShiftOptionPanels : (() => {});
    const renderShiftOptions = typeof ctx.renderShiftOptions === 'function' ? ctx.renderShiftOptions : (() => {});

    function parseShiftDate(dateStr){
      const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if(!m) return null;
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }

    function renderCalendar(shift){
      const grid = document.getElementById('calendarGrid');
      const title = document.getElementById('calendarTitle');
      if(!grid || !title || !shift) return;

      const start = parseShiftDate(shift.start);
      const end = parseShiftDate(shift.end);
      if(!start || !end) return;

      const ruWeek = calendarWeekdaysShort();
      const ruMonth = calendarMonthNames();

      title.textContent = `${start.toLocaleDateString('ru-RU')} — ${end.toLocaleDateString('ru-RU')}`;

      const firstMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      const cursor = new Date(firstMonth);
      const isMultiMonthRange = firstMonth.getTime() !== lastMonth.getTime();
      let html = '';

      while(cursor <= lastMonth){
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let displayFrom = 1;
        let displayTo = daysInMonth;

        if(isMultiMonthRange){
          const isFirst = year === firstMonth.getFullYear() && month === firstMonth.getMonth();
          const isLast = year === lastMonth.getFullYear() && month === lastMonth.getMonth();
          if(isFirst){
            displayFrom = Math.max(1, daysInMonth - 13);
          }else if(isLast){
            displayTo = Math.min(daysInMonth, 14);
          }
        }

        const leading = new Date(year, month, displayFrom).getDay();
        html += `
          <div class="calendar-month">
            <div class="calendar-month-title">${ruMonth[month]} ${year}</div>
            <div class="calendar-month-grid">
        `;

        for(let i = 0; i < leading; i += 1){
          html += '<div class="calendar-day empty"></div>';
        }
        for(let day = displayFrom; day <= displayTo; day += 1){
          const d = new Date(year, month, day);
          const isInRange = d >= start && d <= end;
          html += `
            <div class="calendar-day ${isInRange ? 'active' : ''}">
              <span>${day}</span>
              <small>${ruWeek[d.getDay()]}</small>
            </div>
          `;
        }
        html += '</div></div>';
        cursor.setMonth(cursor.getMonth() + 1);
      }

      grid.innerHTML = html;
    }

    function renderSeasonCalendar(){
      const grid = document.getElementById('calendarGrid');
      const title = document.getElementById('calendarTitle');
      if(!grid || !title) return;
      const shifts = getShifts();
      const seasonShifts = shifts
        .map((shift, idx) => ({
          ...shift,
          startDate: parseShiftDate(shift.start),
          endDate: parseShiftDate(shift.end),
          colorIndex: idx % 6
        }))
        .filter((shift) => shift.startDate && shift.endDate)
        .sort((a, b) => a.startDate - b.startDate);
      if(!seasonShifts.length) return;
      const seasonShiftById = new Map(seasonShifts.map((shift) => [shift.id, shift]));

      const ruWeek = calendarWeekdaysShort();
      const ruMonth = calendarMonthNames();
      const colorPalette = ['#ff8a00', '#38bdf8', '#a78bfa', '#22c55e', '#f43f5e', '#f59e0b'];
      const minStart = seasonShifts[0].startDate;
      const maxEnd = seasonShifts[seasonShifts.length - 1].endDate;
      const firstMonth = new Date(minStart.getFullYear(), minStart.getMonth(), 1);
      const lastMonth = new Date(maxEnd.getFullYear(), maxEnd.getMonth(), 1);
      const cursor = new Date(firstMonth);

      title.textContent = bookingText('seasonCalendarTitle');
      let html = '';

      while(cursor <= lastMonth){
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        if(month === 6){
          cursor.setMonth(cursor.getMonth() + 1);
          continue;
        }
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const leading = new Date(year, month, 1).getDay();
        html += `
          <div class="calendar-month">
            <div class="calendar-month-title">${ruMonth[month]} ${year}</div>
            <div class="calendar-month-grid">
        `;
        const cells = [];
        for(let i = 0; i < leading; i += 1){
          cells.push({ empty: true, hasShift: false, html: '<div class="calendar-day empty"></div>' });
        }
        for(let day = 1; day <= daysInMonth; day += 1){
          const date = new Date(year, month, day);
          const matched = seasonShifts.filter((shift) => date >= shift.startDate && date <= shift.endDate);
          const parentOverlays = matched
            .map((shift) => (shift.sourceId ? seasonShiftById.get(shift.sourceId) : null))
            .filter((shift) => shift && date >= shift.startDate && date <= shift.endDate);
          parentOverlays.forEach((parentShift) => {
            if(!matched.some((shift) => shift.id === parentShift.id)){
              matched.push(parentShift);
            }
          });
          matched.sort((a, b) => {
            if(a.id === 'shift-2' && b.id !== 'shift-2') return -1;
            if(b.id === 'shift-2' && a.id !== 'shift-2') return 1;
            const aChild = !!a.sourceId;
            const bChild = !!b.sourceId;
            if(aChild !== bChild) return aChild ? 1 : -1;
            return (a.startDate - b.startDate) || String(a.id).localeCompare(String(b.id));
          });
          if(!matched.length){
            cells.push({
              empty: false,
              hasShift: false,
              html: `<div class="calendar-day"><span>${day}</span><small>${ruWeek[date.getDay()]}</small></div>`
            });
            continue;
          }
          const primary = matched[0];
          const multi = matched.length > 1;
          const hasParentOverlay = matched.some((shift) => shift.id === 'shift-2') && matched.some((shift) => shift.sourceId === 'shift-2');
          const parentShift = matched.find((shift) => shift.id === 'shift-2') || null;
          const childShift = matched.find((shift) => shift.sourceId === 'shift-2') || matched[1] || matched[0];
          const mixA = colorPalette[matched[0].colorIndex] || colorPalette[0];
          const mixB = colorPalette[matched[1]?.colorIndex ?? matched[0].colorIndex] || colorPalette[1];
          const mixC = colorPalette[matched[2]?.colorIndex ?? matched[0].colorIndex] || colorPalette[2];
          const parentOverlayColor = colorPalette[parentShift?.colorIndex ?? matched[0].colorIndex] || colorPalette[0];
          const childOverlayColor = colorPalette[childShift?.colorIndex ?? matched[1]?.colorIndex ?? matched[0].colorIndex] || colorPalette[1];
          const overlayColorStyle = `--shift-mix-a:${mixA};--shift-mix-b:${mixB};--shift-mix-c:${mixC};` +
            `--parent-overlay-color:${parentOverlayColor};--child-overlay-color:${childOverlayColor};`;
          const shiftClasses = [
            `shift-color-${primary.colorIndex}`,
            multi ? `multi stack-${Math.min(matched.length, 4)}` : '',
            hasParentOverlay ? 'has-parent-overlay' : ''
          ].filter(Boolean).join(' ');
          const shiftTitle = matched.map((shift) => `${shift.label || shift.title}: ${shift.dates}`).join(' · ');
          cells.push({
            empty: false,
            hasShift: true,
            html: `<div class="calendar-day active ${shiftClasses}" style="${overlayColorStyle}" title="${shiftTitle}"><span>${day}</span><small>${ruWeek[date.getDay()]}${multi ? ` · ${matched.length}` : ''}</small></div>`
          });
        }
        while(cells.length % 7 !== 0){
          cells.push({ empty: true, hasShift: false, html: '<div class="calendar-day empty"></div>' });
        }
        for(let i = 0; i < cells.length; i += 7){
          const week = cells.slice(i, i + 7);
          if(!week.some((cell) => cell.hasShift)) continue;
          html += `<div class="calendar-week">${week.map((cell) => cell.html).join('')}</div>`;
        }
        html += '</div></div>';
        cursor.setMonth(cursor.getMonth() + 1);
      }

      grid.innerHTML = html;
    }

    function openCalendar(shiftId){
      const shifts = getShifts();
      const shift = shifts.find((s) => s.id === shiftId);
      if(!shift) return;
      closeTransientModals('calendar');
      renderCalendar(shift);
      document.getElementById('calendarModal')?.classList.remove('hidden');
      emitModularEvent('calendar:opened', {
        mode: 'shift',
        shiftId: shift.id,
        shiftLabel: shift.label || shift.title || ''
      });
    }

    function openSeasonCalendar(){
      closeTransientModals('calendar');
      renderSeasonCalendar();
      document.getElementById('calendarModal')?.classList.remove('hidden');
      emitModularEvent('calendar:opened', {
        mode: 'season',
        shiftId: '',
        shiftLabel: ''
      });
      track('season_calendar_open');
    }

    function closeCalendar(){
      document.getElementById('calendarModal')?.classList.add('hidden');
      emitModularEvent('calendar:closed', { mode: 'modal' });
    }

    function toggleShiftOptionPanel(viewKey, panelType, shiftId){
      const safeView = viewKey === 'mobile' ? 'mobile' : 'desktop';
      const panels = getShiftOptionPanels();
      const current = panels[safeView]?.[panelType] || null;
      const nextPanels = {
        ...panels,
        [safeView]: {
          ...(panels[safeView] || {}),
          [panelType]: current === shiftId ? null : shiftId
        }
      };
      setShiftOptionPanels(nextPanels);
      renderShiftOptions(safeView);
    }

    function clearShiftOptionPanels(){
      setShiftOptionPanels({
        desktop:{aboutId:null, calendarId:null},
        mobile:{aboutId:null, calendarId:null}
      });
    }

    return Object.freeze({
      parseShiftDate,
      renderCalendar,
      renderSeasonCalendar,
      openCalendar,
      openSeasonCalendar,
      closeCalendar,
      toggleShiftOptionPanel,
      clearShiftOptionPanels
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.calendarFlow = Object.freeze({ create: createCalendarFlow });
})();


/* src/scripts/features/calendar.block.js */
/* src/scripts/features/calendar.block.js */
(function registerCalendarBlock(windowObj){
  'use strict';
  if(!windowObj || typeof windowObj.createAidacampBlock !== 'function') return;
  windowObj.AIDACAMP_BLOCKS.calendar = windowObj.createAidacampBlock('calendar');
})(window);


/* src/scripts/features/contacts.block.js */
/* src/scripts/features/contacts.block.js */
(function registerContactsBlock(windowObj){
  'use strict';
  if(!windowObj || typeof windowObj.createAidacampBlock !== 'function') return;
  windowObj.AIDACAMP_BLOCKS.contacts = windowObj.createAidacampBlock('contacts');
})(window);


/* src/scripts/features/docs-flow.js */
(function(){
  function createDocsFlow(ctx = {}){
    const shouldUseMobileTemplatesForDesktopSource = typeof ctx.shouldUseMobileTemplatesForDesktopSource === 'function'
      ? ctx.shouldUseMobileTemplatesForDesktopSource
      : (() => false);
    const getMobileDocsCopy = typeof ctx.getMobileDocsCopy === 'function'
      ? ctx.getMobileDocsCopy
      : (() => ({orgName:'', orgMeta:'', copyright:'', links:[]}));
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const getDesktopMobileSectionTemplates = typeof ctx.getDesktopMobileSectionTemplates === 'function'
      ? ctx.getDesktopMobileSectionTemplates
      : (() => ({}));

    function renderDesktopMobileDocsBlock(){
      const footer = document.getElementById('section-legal');
      if(!footer) return;

      if(!footer.dataset.originalMarkup){
        footer.dataset.originalMarkup = footer.innerHTML;
      }

      const useMobileDocs = shouldUseMobileTemplatesForDesktopSource();
      if(!useMobileDocs){
        if(footer.dataset.mobileDocsApplied === '1'){
          footer.innerHTML = footer.dataset.originalMarkup || footer.innerHTML;
          footer.dataset.mobileDocsApplied = '0';
        }
        footer.classList.remove('mobile-docs-inline');
        return;
      }

      const mobileDocsCopy = getMobileDocsCopy();
      const state = getState();
      footer.classList.add('mobile-docs-inline');
      footer.dataset.mobileDocsApplied = '1';
      const linksMarkup = (mobileDocsCopy.links || []).map((entry) => {
        const attrs = [`href="${entry.href}"`];
        if(entry.target){
          attrs.push(`target="${entry.target}"`);
        }
        if(entry.rel){
          attrs.push(`rel="${entry.rel}"`);
        }
        return `<a ${attrs.join(' ')}>${entry.text}</a>`;
      }).join('');
      footer.innerHTML = `
        <div class="mobile-docs-shell">
          <article class="mobile-docs-accordion-item ${state.mobileDocsExpanded ? 'open' : ''}">
            <button type="button" class="mobile-docs-toggle" data-action="mobile-docs-toggle">
              <span class="mobile-docs-toggle-copy">
                <span class="mobile-docs-toggle-main">${mobileDocsCopy.orgName}</span>
                <span class="mobile-docs-toggle-meta">${mobileDocsCopy.orgMeta}</span>
              </span>
              <img class="ac-icon" src="/assets/icons/chevron-right.svg" alt="" aria-hidden="true">
            </button>
            <div class="mobile-docs-links">
              ${linksMarkup}
            </div>
          </article>
          <div class="footer-copyright-mini">${mobileDocsCopy.copyright}</div>
        </div>
      `;
    }

    function syncMobileDocsExpandedUi(){
      const state = getState();
      document.querySelectorAll('.mobile-docs-accordion-item').forEach((item) => {
        item.classList.toggle('open', !!state.mobileDocsExpanded);
      });
    }

    function applyMobileTemplatesToDesktopSections(){
      const useMobileTemplates = shouldUseMobileTemplatesForDesktopSource();
      const templates = getDesktopMobileSectionTemplates();
      Object.entries(templates).forEach(([sectionId, template]) => {
        const section = document.getElementById(sectionId);
        if(!section) return;
        if(!section.dataset.desktopOriginalMarkup){
          section.dataset.desktopOriginalMarkup = section.innerHTML;
        }
        if(useMobileTemplates){
          section.innerHTML = template;
          section.classList.add('mobile-template');
        } else if(section.dataset.desktopOriginalMarkup){
          section.innerHTML = section.dataset.desktopOriginalMarkup;
          section.classList.remove('mobile-template');
        }
      });
    }

    return Object.freeze({
      renderDesktopMobileDocsBlock,
      syncMobileDocsExpandedUi,
      applyMobileTemplatesToDesktopSections
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.docsFlow = Object.freeze({ create: createDocsFlow });
})();


/* src/scripts/features/events.js */
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


/* src/scripts/features/faq.block.js */
/* src/scripts/features/faq.block.js */
(function registerFaqBlock(windowObj){
  'use strict';
  if(!windowObj || typeof windowObj.createAidacampBlock !== 'function') return;
  windowObj.AIDACAMP_BLOCKS.faq = windowObj.createAidacampBlock('faq');
})(window);


/* src/scripts/features/funnel.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.funnel = window.AC_FEATURES.funnel || {};
})();


/* src/scripts/features/global-ui-bindings.js */
(function registerGlobalUiBindings(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  windowObj.AC_FEATURES.globalUiBindings = windowObj.AC_FEATURES.globalUiBindings || {};

  function init(context){
    var ctx = context || {};
    var doc = ctx.document || windowObj.document;
    if(!doc) return;

    var navigateToSection = ctx.navigateToSection || function(){};
    var isHeroMenuOpen = ctx.isHeroMenuOpen || function(){ return false; };
    var setHeroMenuOpen = ctx.setHeroMenuOpen || function(){};
    var isHeroPhoneDropdownOpen = ctx.isHeroPhoneDropdownOpen || function(){ return false; };
    var setHeroPhoneDropdownOpen = ctx.setHeroPhoneDropdownOpen || function(){};
    var closeSuccessModal = ctx.closeSuccessModal || function(){};
    var closeNoticeModal = ctx.closeNoticeModal || function(){};
    var bumpOfferRunId = ctx.bumpOfferRunId || function(){};
    var clearOfferTimeout = ctx.clearOfferTimeout || function(){};
    var resetOfferProgressUI = ctx.resetOfferProgressUI || function(){};
    var closeMedia = ctx.closeMedia || function(){};
    var nextMedia = ctx.nextMedia || function(){};
    var prevMedia = ctx.prevMedia || function(){};
    var closeVideo = ctx.closeVideo || function(){};
    var closeCalendar = ctx.closeCalendar || function(){};
    var closeSectionModal = ctx.closeSectionModal || function(){};
    var openNoticeModal = ctx.openNoticeModal || function(){};
    var bookingText = ctx.bookingText || function(){ return ''; };
    var getViewportPreviewView = ctx.getViewportPreviewView || function(){ return ''; };
    var switchView = ctx.switchView || function(){};
    var initHero = ctx.initHero || function(){};
    var applyHeroAbVariant = ctx.applyHeroAbVariant || function(){};
    var applyCompactSectionModalLayout = ctx.applyCompactSectionModalLayout || function(){};
    var updateSummaryBarVisibility = ctx.updateSummaryBarVisibility || function(){};
    var scheduleBookingCardMinHeightSync = ctx.scheduleBookingCardMinHeightSync || function(){};
    var getState = ctx.getState || function(){ return {}; };
    var getHeroResizeTimer = ctx.getHeroResizeTimer || function(){ return null; };
    var setHeroResizeTimer = ctx.setHeroResizeTimer || function(){};
    var setPhotoFilter = ctx.setPhotoFilter || function(){};
    var setFaqFilter = ctx.setFaqFilter || function(){};
    var openSectionModal = ctx.openSectionModal || function(){};
    var track = ctx.track || function(){};
    var showHint = ctx.showHint || function(){};
    var nudgeUserToNextStep = ctx.nudgeUserToNextStep || function(){};
    var hasSelectedAge = ctx.hasSelectedAge || function(){ return false; };
    var getBookingState = ctx.getBookingState || function(){ return {}; };
    var openVideo = ctx.openVideo || function(){};
    var selectedShiftPayload = ctx.selectedShiftPayload || function(){ return {}; };
    var buildHeroVariantMeta = ctx.buildHeroVariantMeta || function(){ return {}; };
    var bookingDesktopIds = ctx.bookingDesktopIds || {};
    var bookingMobileIds = ctx.bookingMobileIds || {};

    function bindModalKeyboardShortcuts(){
      doc.addEventListener('keydown', function(e){
        var lightbox = doc.getElementById('mediaLightbox');
        if(!lightbox || lightbox.classList.contains('hidden')) return;
        if(e.key === 'Escape') closeMedia();
        if(e.key === 'ArrowRight') nextMedia();
        if(e.key === 'ArrowLeft') prevMedia();
      });

      doc.addEventListener('keydown', function(e){
        var modal = doc.getElementById('videoModal');
        if(!modal || modal.classList.contains('hidden')) return;
        if(e.key === 'Escape') closeVideo();
      });

      doc.addEventListener('keydown', function(e){
        var modal = doc.getElementById('calendarModal');
        if(!modal || modal.classList.contains('hidden')) return;
        if(e.key === 'Escape') closeCalendar();
      });

      doc.addEventListener('keydown', function(e){
        var modal = doc.getElementById('sectionModal');
        if(!modal || modal.classList.contains('hidden')) return;
        if(e.key === 'Escape') closeSectionModal();
      });
    }

    doc.addEventListener('click', function(e){
      var navEl = e.target.closest('[data-nav]');
      if(!navEl) return;

      e.preventDefault();
      var target = navEl.dataset.nav;
      if(!target) return;

      if(navEl.closest('#serviceMenu')){
        doc.querySelectorAll('#serviceMenu [data-nav]').forEach(function(x){ x.classList.remove('active'); });
        navEl.classList.add('active');
        setHeroMenuOpen(false);
      }

      navigateToSection(target);
    });

    doc.addEventListener('click', function(e){
      var anchor = e.target.closest('a[href^="#section-"]');
      if(!anchor) return;
      var href = anchor.getAttribute('href');
      if(!href) return;
      e.preventDefault();
      navigateToSection(href);
    });

    doc.addEventListener('click', function(e){
      var photoFilterBtn = e.target.closest('[data-photo-filter]');
      if(photoFilterBtn){
        setPhotoFilter(photoFilterBtn.dataset.photoFilter || '');
        var statePhoto = getBookingState();
        var sectionModalPhoto = doc.getElementById('sectionModal');
        var sectionModalOpenedPhoto = !!(sectionModalPhoto && !sectionModalPhoto.classList.contains('hidden'));
        if((statePhoto.previewView === 'desktop' && statePhoto.desktopMode === 'compact') || (statePhoto.previewView === 'mobile' && sectionModalOpenedPhoto)){
          openSectionModal('section-photos');
        }
        return;
      }

      var faqFilterBtn = e.target.closest('[data-faq-filter]');
      if(faqFilterBtn){
        setFaqFilter(faqFilterBtn.dataset.faqFilter || '');
        var stateFaq = getBookingState();
        var sectionModalFaq = doc.getElementById('sectionModal');
        var sectionModalOpenedFaq = !!(sectionModalFaq && !sectionModalFaq.classList.contains('hidden'));
        if((stateFaq.previewView === 'desktop' && stateFaq.desktopMode === 'compact') || (stateFaq.previewView === 'mobile' && sectionModalOpenedFaq)){
          openSectionModal('section-faq');
        }
        return;
      }

      var ageSelector = '#' + (bookingDesktopIds.ageTabsId || '') + ', #' + (bookingMobileIds.ageTabsId || '');
      var ageWrap = e.target.closest(ageSelector);
      var ageBtn = e.target.closest('button');
      if(ageWrap && ageBtn){
        var ageText = String(ageBtn.textContent || '').trim();
        if(ageText){
          track('age_select', { age_label: ageText });
        }
      }

      var shiftSelector = '#' + (bookingDesktopIds.shiftOptionsId || '') + ', #' + (bookingMobileIds.shiftOptionsId || '');
      var shiftWrap = e.target.closest(shiftSelector);
      var shiftBtn = e.target.closest('button, .shift-option, .slot-card');
      if(shiftWrap && shiftBtn){
        var shiftText = String(shiftBtn.textContent || '').trim().split('\n')[0];
        if(shiftText){
          var shiftState = getBookingState();
          track('shift_select', {
            shift_label: shiftText,
            age: shiftState.age || ''
          });
        }
      }
    });

    doc.addEventListener('click', function(e){
      var videoCard = e.target.closest('[data-video]');
      if(videoCard){
        var url = videoCard.dataset.video || '';
        if(url){
          if(videoCard.tagName === 'A') e.preventDefault();
          openVideo(url);
          return;
        }
      }

      var shiftDisabledSelector = '#' + (bookingDesktopIds.shiftListId || '') + '.disabled, #' + (bookingMobileIds.shiftListId || '') + '.disabled';
      var shiftDisabled = e.target.closest(shiftDisabledSelector);
      if(shiftDisabled){
        showHint('Сначала выберите возраст ребёнка', 'age');
        nudgeUserToNextStep('Сначала выберите возраст ребёнка — тогда откроется список смен.');
      }

      var shiftVeil = e.target.closest('.shift-list-veil');
      if(shiftVeil){
        showHint('Сначала выберите возраст ребёнка', 'age');
        nudgeUserToNextStep('Сначала выберите возраст ребёнка — после этого откроются смены.');
      }

      var ctaBtn = e.target.closest('#desktopStartBtn');
      if(ctaBtn && ctaBtn.classList.contains('is-disabled')){
        var ctaState = getBookingState();
        if(!hasSelectedAge()){
          showHint('Выберите возраст', 'age');
        } else if(!ctaState.shiftId){
          showHint('Выберите подходящую смену', 'shift');
        }
        nudgeUserToNextStep();
      }

      var summaryBtn = e.target.closest('#summaryBar button, #summaryBar .cta-main');
      if(summaryBtn){
        var summaryState = getBookingState();
        if(!hasSelectedAge() || !summaryState.shiftId){
          if(!hasSelectedAge()){
            showHint('Сначала выберите возраст ребёнка', 'age');
            nudgeUserToNextStep('Чтобы перейти дальше, сначала выберите возраст ребёнка.');
          } else {
            showHint('Выберите подходящую смену', 'shift');
            nudgeUserToNextStep('Чтобы перейти дальше, выберите смену.');
          }
        }
      }
    });

    doc.addEventListener('click', function(e){
      if(!isHeroMenuOpen()) return;
      var withinMenu = e.target.closest('#heroMenuWrap');
      if(!withinMenu){
        setHeroMenuOpen(false);
      }
    });

    doc.addEventListener('click', function(e){
      if(!isHeroPhoneDropdownOpen()) return;
      var withinPhone = e.target.closest('#heroPhoneWrap');
      if(!withinPhone){
        setHeroPhoneDropdownOpen(false);
      }
    });

    windowObj.addEventListener('scroll', function(){
      if(isHeroMenuOpen()){
        setHeroMenuOpen(false);
      }
      if(isHeroPhoneDropdownOpen()){
        setHeroPhoneDropdownOpen(false);
      }
    }, {passive:true});

    doc.addEventListener('scroll', function(){
      if(isHeroMenuOpen()){
        setHeroMenuOpen(false);
      }
      if(isHeroPhoneDropdownOpen()){
        setHeroPhoneDropdownOpen(false);
      }
    }, {capture:true, passive:true});

    var locationMapBtn = doc.getElementById('locationMapBtn');
    if(locationMapBtn){
      locationMapBtn.addEventListener('click', function(){
        track('map_click', {source:'contacts_map'});
      });
    }

    var yandexReviewsBtn = doc.getElementById('yandexReviewsBtn');
    if(yandexReviewsBtn){
      yandexReviewsBtn.addEventListener('click', function(){
        track('social_click', {network:'Яндекс Отзывы'});
      });
    }

    var socialsGrid = doc.getElementById('socialsGrid');
    if(socialsGrid){
      socialsGrid.addEventListener('click', function(e){
        var link = e.target.closest('.social-link');
        if(!link) return;
        var network = String(link.dataset.network || '').trim()
          || String((link.querySelector('.social-label') && link.querySelector('.social-label').textContent) || '').trim();
        track('social_click', {network: network});
      });
    }

    var successTelegramBtn = doc.getElementById('successTelegramBtn');
    if(successTelegramBtn){
      successTelegramBtn.addEventListener('click', function(){
        var payload = selectedShiftPayload();
        track('telegram_click', Object.assign({source:'success_modal'}, payload));
        track('hero_variant_telegram_click_new', buildHeroVariantMeta(Object.assign({source:'success_modal'}, payload)));
      });
    }

    (function bindLeadMaskForDrawer(){
      var lead = windowObj.AC_FEATURES && windowObj.AC_FEATURES.bookingInlineLead;
      if(lead && typeof lead.bindPhoneMaskForScope === 'function'){
        lead.bindPhoneMaskForScope({scope:'drawer', document: doc});
      }
    })();

    var formDrawer = doc.getElementById('formDrawer');
    if(formDrawer){
      formDrawer.addEventListener('click', function(e){
        if(e.target.id === 'formDrawer'){
          var lead = windowObj.AC_FEATURES && windowObj.AC_FEATURES.bookingInlineLead;
          if(lead && typeof lead.closeForm === 'function'){
            lead.closeForm({document: doc});
          }
        }
      });
    }

    var successOverlay = doc.getElementById('successOverlay');
    if(successOverlay){
      successOverlay.addEventListener('click', function(e){
        if(e.target.id === 'successOverlay') closeSuccessModal();
      });
    }

    var noticeOverlay = doc.getElementById('noticeOverlay');
    if(noticeOverlay){
      noticeOverlay.addEventListener('click', function(e){
        if(e.target.id === 'noticeOverlay') closeNoticeModal();
      });
    }

    var offerOverlay = doc.getElementById('offerOverlay');
    if(offerOverlay){
      offerOverlay.addEventListener('click', function(e){
        if(e.target.id === 'offerOverlay'){
          bumpOfferRunId();
          clearOfferTimeout();
          offerOverlay.classList.add('hidden');
          resetOfferProgressUI();
        }
      });
    }

    var mediaClose = doc.getElementById('mediaClose');
    var mediaNext = doc.getElementById('mediaNext');
    var mediaPrev = doc.getElementById('mediaPrev');
    var mediaLightbox = doc.getElementById('mediaLightbox');
    if(mediaClose) mediaClose.addEventListener('click', closeMedia);
    if(mediaNext) mediaNext.addEventListener('click', nextMedia);
    if(mediaPrev) mediaPrev.addEventListener('click', prevMedia);
    if(mediaLightbox){
      mediaLightbox.addEventListener('click', function(e){
        if(e.target.id === 'mediaLightbox') closeMedia();
      });
    }

    var videoModal = doc.getElementById('videoModal');
    if(videoModal){
      videoModal.addEventListener('click', function(e){
        if(e.target.id === 'videoModal') closeVideo();
      });
    }

    var calendarModal = doc.getElementById('calendarModal');
    if(calendarModal){
      calendarModal.addEventListener('click', function(e){
        if(e.target.id === 'calendarModal') closeCalendar();
      });
    }

    var sectionModal = doc.getElementById('sectionModal');
    if(sectionModal){
      sectionModal.addEventListener('click', function(e){
        if(e.target.id === 'sectionModal') closeSectionModal();
      });
      var sectionModalBody = doc.getElementById('sectionModalBody');
      var sectionModalTouchY = 0;
      sectionModal.addEventListener('wheel', function(e){
        if(sectionModal.classList.contains('hidden')) return;
        var scroller = e.target.closest('.section-modal-body') || sectionModalBody;
        if(!scroller || !sectionModal.contains(scroller)) return;
        if(scroller.scrollHeight <= scroller.clientHeight + 1) return;
        e.preventDefault();
        scroller.scrollTop += e.deltaY;
      }, {passive:false});
      sectionModal.addEventListener('touchstart', function(e){
        if(sectionModal.classList.contains('hidden')) return;
        var touch = e.touches && e.touches[0];
        if(!touch) return;
        sectionModalTouchY = touch.clientY;
      }, {passive:true});
      sectionModal.addEventListener('touchmove', function(e){
        if(sectionModal.classList.contains('hidden')) return;
        var scroller = e.target.closest('.section-modal-body') || sectionModalBody;
        if(!scroller || !sectionModal.contains(scroller)) return;
        if(scroller.scrollHeight <= scroller.clientHeight + 1) return;
        var touch = e.touches && e.touches[0];
        if(!touch) return;
        var deltaY = sectionModalTouchY - touch.clientY;
        sectionModalTouchY = touch.clientY;
        if(Math.abs(deltaY) < 0.5) return;
        e.preventDefault();
        scroller.scrollTop += deltaY;
      }, {passive:false});
    }

    doc.addEventListener('visibilitychange', function(){
      try{
        var ENABLE_WELCOME_BACK_POPUP = false;
        if(!ENABLE_WELCOME_BACK_POPUP) return;
        var hiddenKey = 'aidacamp_hidden_once';
        var shownKey = 'aidacamp_welcome_back_shown';
        if(doc.hidden){
          sessionStorage.setItem(hiddenKey, '1');
          return;
        }
        if(sessionStorage.getItem(hiddenKey) === '1' && sessionStorage.getItem(shownKey) !== '1'){
          openNoticeModal(
            bookingText('returnWelcomeMessage'),
            bookingText('returnWelcomeTitle')
          );
          sessionStorage.setItem(shownKey, '1');
        }
      }catch(_error){
      }
    });

    bindModalKeyboardShortcuts();

    windowObj.addEventListener('resize', function(){
      var resizeTimer = getHeroResizeTimer();
      if(resizeTimer){
        windowObj.clearTimeout(resizeTimer);
      }
      var nextTimer = windowObj.setTimeout(function(){
        var state = getState();
        var autoView = getViewportPreviewView();
        if(autoView !== state.previewView){
          switchView(autoView);
          return;
        }
        initHero();
        applyHeroAbVariant();
        applyCompactSectionModalLayout();
        updateSummaryBarVisibility();
        scheduleBookingCardMinHeightSync();
      }, 160);
      setHeroResizeTimer(nextTimer);
    }, {passive:true});
  }

  windowObj.AC_FEATURES.globalUiBindings.init = init;
})(window);


/* src/scripts/features/guided-state-flow.js */
(function(){
  function createGuidedStateFlow(ctx = {}){
    const getBookingViewConfig = typeof ctx.getBookingViewConfig === 'function' ? ctx.getBookingViewConfig : (() => ({}));
    const syncGuidedState = typeof ctx.syncGuidedState === 'function' ? ctx.syncGuidedState : (() => {});
    const getBookingStage = typeof ctx.getBookingStage === 'function' ? ctx.getBookingStage : (() => 1);
    const placeStage2ContentForView = typeof ctx.placeStage2ContentForView === 'function' ? ctx.placeStage2ContentForView : (() => {});
    const syncCompletedBookingScaffold = typeof ctx.syncCompletedBookingScaffold === 'function' ? ctx.syncCompletedBookingScaffold : (() => {});
    const stopVariantFlowScenario = typeof ctx.stopVariantFlowScenario === 'function' ? ctx.stopVariantFlowScenario : (() => {});
    const bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : (() => '');
    const hideVariantCoachBadge = typeof ctx.hideVariantCoachBadge === 'function' ? ctx.hideVariantCoachBadge : (() => {});
    const hasSelectedAge = typeof ctx.hasSelectedAge === 'function' ? ctx.hasSelectedAge : (() => false);
    const ageLabel = typeof ctx.ageLabel === 'function' ? ctx.ageLabel : (() => '');
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const getSelectedShift = typeof ctx.getSelectedShift === 'function' ? ctx.getSelectedShift : (() => null);
    const scheduleVariantFlowScenario = typeof ctx.scheduleVariantFlowScenario === 'function' ? ctx.scheduleVariantFlowScenario : (() => {});

    function renderGuidedState(viewCfg){
      const state = getState();
      const cfg = viewCfg && viewCfg.key ? viewCfg : getBookingViewConfig('desktop');
      syncGuidedState();
      const stage = getBookingStage();
      const shiftList = document.getElementById(cfg.shiftListId);
      const ctaWrap = document.getElementById(cfg.ctaWrapId);
      const ageTabs = document.getElementById(cfg.ageTabsId);
      const chipHost = document.getElementById(cfg.summaryChipsId);
      const ageChip = document.getElementById(cfg.ageChipId);
      const ageChipText = document.getElementById(cfg.ageChipTextId);
      const shiftChip = document.getElementById(cfg.shiftChipId);
      const shiftChipText = document.getElementById(cfg.shiftChipTextId);
      const baseHint = document.getElementById(cfg.hintId);
      const guidedInlineHint = document.getElementById(cfg.guidedInlineHintId);
      const bookingCard = document.getElementById(cfg.cardId);
      const stepThree = bookingCard?.querySelector('.booking-step-3');
      const allShiftsBtn = bookingCard?.querySelector('.booking-all-shifts-link');
      if(!shiftList || !ctaWrap || !ageTabs || !ageChip || !ageChipText || !shiftChip || !shiftChipText) return;

      placeStage2ContentForView(cfg, stage, bookingCard);
      syncCompletedBookingScaffold(cfg, bookingCard);
      const isMobile = cfg.key === 'mobile';
      if(state.bookingCompleted){
        stopVariantFlowScenario();
        shiftList.classList.add('disabled');
        ageTabs.classList.add('hidden');
        ctaWrap.classList.add('hidden');
        ageChip.classList.remove('visible');
        shiftChip.classList.remove('visible');
        if(chipHost) chipHost.classList.add('visible', 'booking-summary-chips--completed');
        if(stepThree) stepThree.classList.remove('is-force-hidden');
        if(allShiftsBtn) allShiftsBtn.classList.add('hidden');
        if(isMobile) document.getElementById(cfg.cardId)?.classList.remove('has-mobile-summary-chips');
        if(baseHint){
          baseHint.textContent = '';
          baseHint.classList.remove('is-muted-hidden');
        }
        if(guidedInlineHint){
          guidedInlineHint.textContent = '';
          guidedInlineHint.classList.remove('visible', 'variant-coach');
        }
        return;
      }
      if(allShiftsBtn){
        allShiftsBtn.textContent = bookingText('allShiftsByAge');
        allShiftsBtn.classList.toggle('hidden', stage !== 2 || state.offerStage >= 1);
      }
      if(chipHost){
        if(ageChip.parentElement !== chipHost) chipHost.appendChild(ageChip);
        if(shiftChip.parentElement !== chipHost) chipHost.appendChild(shiftChip);
      }

      shiftList.classList.remove('disabled','highlight','collapsed');
      ctaWrap.classList.remove('hidden', 'highlight');
      ageTabs.classList.remove('hidden');
      ageChip.classList.remove('visible');
      shiftChip.classList.remove('visible');
      chipHost?.classList.remove('visible');
      if(stepThree){
        const shouldShowStepThree = stage >= 1;
        stepThree.classList.toggle('is-force-hidden', !shouldShowStepThree);
      }
      if(isMobile) document.getElementById(cfg.cardId)?.classList.remove('has-mobile-summary-chips');
      if(stage === 1 || stage === 2) ctaWrap.classList.add('hidden');

      if(!hasSelectedAge()){
        if(baseHint){
          baseHint.textContent = '';
          baseHint.classList.add('is-muted-hidden');
        }
        if(guidedInlineHint){
          guidedInlineHint.textContent = '';
          guidedInlineHint.classList.remove('visible', 'variant-coach');
        }
        stopVariantFlowScenario();
        shiftList.classList.add('disabled');
        hideVariantCoachBadge(cfg);
        return;
      }

      if(baseHint){
        baseHint.textContent = '';
        baseHint.classList.remove('is-muted-hidden');
      }
      if(guidedInlineHint){
        guidedInlineHint.textContent = '';
        guidedInlineHint.classList.remove('visible', 'variant-coach');
      }

      ageChipText.textContent = ageLabel(state.age);
      ageChip.classList.add('visible');
      chipHost?.classList.add('visible');
      ageTabs.classList.add('hidden');

      if(hasSelectedAge() && !state.shiftId){
        shiftList.classList.remove('collapsed');
        shiftList.classList.add('highlight');
        scheduleVariantFlowScenario();
        hideVariantCoachBadge(cfg);
        return;
      }

      const shift = getSelectedShift();
      if(shift){
        shiftChipText.textContent = shift.dates;
        if(isMobile) document.getElementById(cfg.cardId)?.classList.add('has-mobile-summary-chips');
        shiftChip.classList.add('visible');
        shiftList.classList.add('collapsed');
        stepThree?.classList.remove('is-force-hidden');
      }

      if(state.shiftId && state.offerStage === 0){
        stopVariantFlowScenario();
        ctaWrap.classList.add('highlight');
        hideVariantCoachBadge(cfg);
        return;
      }

      stopVariantFlowScenario();
      hideVariantCoachBadge(cfg);
    }

    return Object.freeze({ renderGuidedState });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.guidedStateFlow = Object.freeze({ create: createGuidedStateFlow });
})();


/* src/scripts/features/hero-ab-flow.js */
(function(){
  function createHeroAbFlow(ctx = {}){
    const getCurrentSearchParams = typeof ctx.getCurrentSearchParams === 'function' ? ctx.getCurrentSearchParams : (() => new URLSearchParams(''));
    const bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : (() => '');
    const trackOnce = typeof ctx.trackOnce === 'function' ? ctx.trackOnce : (() => {});
    const syncModularState = typeof ctx.syncModularState === 'function' ? ctx.syncModularState : (() => {});
    const emitModularEvent = typeof ctx.emitModularEvent === 'function' ? ctx.emitModularEvent : (() => {});
    const getHeroAbVariant = typeof ctx.getHeroAbVariant === 'function' ? ctx.getHeroAbVariant : (() => 'A');
    const setHeroAbVariant = typeof ctx.setHeroAbVariant === 'function' ? ctx.setHeroAbVariant : (() => {});
    const getHeroAbTimers = typeof ctx.getHeroAbTimers === 'function' ? ctx.getHeroAbTimers : (() => []);
    const setHeroAbTimers = typeof ctx.setHeroAbTimers === 'function' ? ctx.setHeroAbTimers : (() => {});
    const getMobileAutoTimer = typeof ctx.getMobileAutoTimer === 'function' ? ctx.getMobileAutoTimer : (() => null);
    const setMobileAutoTimer = typeof ctx.setMobileAutoTimer === 'function' ? ctx.setMobileAutoTimer : (() => {});
    const getMobileCollapsed = typeof ctx.getMobileCollapsed === 'function' ? ctx.getMobileCollapsed : (() => false);
    const setMobileCollapsed = typeof ctx.setMobileCollapsed === 'function' ? ctx.setMobileCollapsed : (() => {});
    const getMobileScrollBound = typeof ctx.getMobileScrollBound === 'function' ? ctx.getMobileScrollBound : (() => false);
    const setMobileScrollBound = typeof ctx.setMobileScrollBound === 'function' ? ctx.setMobileScrollBound : (() => {});
    const getMobileInteractionBound = typeof ctx.getMobileInteractionBound === 'function' ? ctx.getMobileInteractionBound : (() => false);
    const setMobileInteractionBound = typeof ctx.setMobileInteractionBound === 'function' ? ctx.setMobileInteractionBound : (() => {});
    const getMobileUserInteracted = typeof ctx.getMobileUserInteracted === 'function' ? ctx.getMobileUserInteracted : (() => false);
    const setMobileUserInteracted = typeof ctx.setMobileUserInteracted === 'function' ? ctx.setMobileUserInteracted : (() => {});
    const safeInvoke = typeof ctx.safeInvoke === 'function' ? ctx.safeInvoke : ((_,__,___,fb)=> (typeof fb === 'function' ? fb() : fb));
    const getViewMode = typeof ctx.getViewMode === 'function' ? ctx.getViewMode : (() => window.AC_VIEW_MODE);
    const applyHeroBenefitsLayoutExperiment = typeof ctx.applyHeroBenefitsLayoutExperiment === 'function' ? ctx.applyHeroBenefitsLayoutExperiment : (() => {});
    const resolveDesktopView = typeof ctx.resolveDesktopView === 'function' ? ctx.resolveDesktopView : (() => document.getElementById('desktopView'));
    const resolveMobileView = typeof ctx.resolveMobileView === 'function' ? ctx.resolveMobileView : (() => document.getElementById('mobileView'));

    const HERO_AB_TEST_KEY = String(ctx.heroAbTestKey || 'aidacamp_hero_ab_variant_v1');
    const HERO_AB_TEST_ID = String(ctx.heroAbTestId || 'hero-ab-v1');
    const HERO_AB_DESKTOP_BG_ONLY = !!ctx.heroAbDesktopBgOnly;
    const HERO_AB_MOBILE_EFFECTS_ENABLED = !!ctx.heroAbMobileEffectsEnabled;
    const HERO_AB_BENEFIT_STEP_MS = Number(ctx.heroAbBenefitStepMs || 1100);
    const HERO_AB_SHIFT_UP_MS = Number(ctx.heroAbShiftUpMs || 4200);
    const HERO_AB_BENEFIT_REVEAL_DELAY_MS = Number(ctx.heroAbBenefitRevealDelayMs || 4700);
    const HERO_AB_DESKTOP_SHIFT_UP_MS = Number(ctx.heroAbDesktopShiftUpMs || HERO_AB_SHIFT_UP_MS);
    const HERO_AB_DESKTOP_BENEFIT_REVEAL_DELAY_MS = Number(ctx.heroAbDesktopBenefitRevealDelayMs || HERO_AB_BENEFIT_REVEAL_DELAY_MS);

    function pushHeroAbTimer(timerId){
      const timers = getHeroAbTimers();
      const next = Array.isArray(timers) ? timers.slice() : [];
      next.push(timerId);
      setHeroAbTimers(next);
    }

    function clearHeroAbTimers(){
      (getHeroAbTimers() || []).forEach((timerId) => window.clearTimeout(timerId));
      setHeroAbTimers([]);
    }

    function getForcedHeroAbVariant(){
      const search = getCurrentSearchParams();
      const forcedRaw = String(search.get('hero_ab') || search.get('hero_mode') || '').trim();
      const normalized = forcedRaw.toUpperCase();
      if(normalized === 'A' || normalized === 'CONTROL') return 'A';
      if(normalized === 'B' || normalized === 'POOL' || normalized === 'POOL_MOTION') return 'B';
      return '';
    }

    function resolveHeroAbVariant(){
      const forced = getForcedHeroAbVariant();
      if(forced){
        localStorage.setItem(HERO_AB_TEST_KEY, forced);
        setHeroAbVariant(forced);
        return forced;
      }
      const savedRaw = String(localStorage.getItem(HERO_AB_TEST_KEY) || '').trim().toUpperCase();
      if(savedRaw === 'A' || savedRaw === 'B'){
        setHeroAbVariant(savedRaw);
        return savedRaw;
      }
      let assigned = 'A';
      try {
        const random = (window.crypto && typeof window.crypto.getRandomValues === 'function')
          ? (window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296)
          : Math.random();
        assigned = random < 0.5 ? 'A' : 'B';
      } catch (error){
        assigned = Math.random() < 0.5 ? 'A' : 'B';
      }
      localStorage.setItem(HERO_AB_TEST_KEY, assigned);
      setHeroAbVariant(assigned);
      return assigned;
    }

    function applyHeroAbAnimationForRoot(root){
      if(!root) return;
      const heroAbVariant = getHeroAbVariant();
      const isDesktopRoot = root.id === 'desktopView' && !root.classList.contains('mobile-preview-active');
      const isMobileRuntimeRoot = !isDesktopRoot;
      const shouldAnimateForRoot = isDesktopRoot ? true : heroAbVariant === 'B';
      root.classList.remove('hero-ab-b', 'hero-ab-b-shifted');
      root.querySelectorAll('.hero-slogan').forEach((node) => {
        const current = String(node.textContent || '').trim();
        if(!node.dataset.heroSloganOriginal){
          node.dataset.heroSloganOriginal = current;
        }
        node.textContent = node.dataset.heroSloganOriginal || current;
      });
      root.querySelectorAll('.hero-benefits-grid .hero-benefit-card').forEach((card) => {
        card.classList.remove('hero-benefit-visible');
      });
      if(isDesktopRoot && HERO_AB_DESKTOP_BG_ONLY) return;
      if(isMobileRuntimeRoot && !HERO_AB_MOBILE_EFFECTS_ENABLED) return;
      if(!shouldAnimateForRoot) return;
      root.classList.add('hero-ab-b');
      if(heroAbVariant === 'B'){
        root.querySelectorAll('.hero-slogan').forEach((node) => { node.textContent = bookingText('heroSeasonSlogan'); });
      }
      const cards = Array.from(root.querySelectorAll('.hero-benefits-grid .hero-benefit-card'));
      if(!cards.length) return;
      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(prefersReducedMotion){
        root.classList.add('hero-ab-b-shifted');
        cards.forEach((card) => card.classList.add('hero-benefit-visible'));
        return;
      }
      const shiftUpMs = isDesktopRoot ? HERO_AB_DESKTOP_SHIFT_UP_MS : HERO_AB_SHIFT_UP_MS;
      const revealDelayMs = isDesktopRoot ? HERO_AB_DESKTOP_BENEFIT_REVEAL_DELAY_MS : HERO_AB_BENEFIT_REVEAL_DELAY_MS;
      const shiftUpTimer = window.setTimeout(() => {
        root.classList.add('hero-ab-b-shifted');
      }, shiftUpMs);
      pushHeroAbTimer(shiftUpTimer);
      let revealIndex = 0;
      let revealInterval = null;
      const revealNext = () => {
        const card = cards[revealIndex];
        if(card){
          card.classList.add('hero-benefit-visible');
          revealIndex += 1;
        }
        if(revealIndex >= cards.length && revealInterval){
          window.clearInterval(revealInterval);
        }
      };
      const revealStartTimer = window.setTimeout(() => {
        revealNext();
        revealInterval = window.setInterval(revealNext, HERO_AB_BENEFIT_STEP_MS);
        pushHeroAbTimer(revealInterval);
      }, revealDelayMs);
      pushHeroAbTimer(revealStartTimer);
    }

    function applyHeroAbVariant(){
      clearHeroAbTimers();
      const currentTimer = getMobileAutoTimer();
      if(currentTimer){
        window.clearTimeout(currentTimer);
        setMobileAutoTimer(null);
      }
      const desktopView = resolveDesktopView();
      const mobileView = resolveMobileView();
      const heroAbVariant = getHeroAbVariant();
      const resolveMobileHeroRoot = () => {
        if(desktopView && desktopView.classList.contains('mobile-preview-active')) return desktopView;
        if(mobileView && !mobileView.classList.contains('hidden')) return mobileView;
        if(ctx.useDesktopBaseForMobile && desktopView) return desktopView;
        return mobileView || desktopView || null;
      };
      const isMobileHeroRuntime = () => {
        if(desktopView && desktopView.classList.contains('mobile-preview-active')) return true;
        if(mobileView && !mobileView.classList.contains('hidden')) return true;
        const mobileViewport = safeInvoke(getViewMode(), 'isMobileViewport', [], null);
        if(typeof mobileViewport === 'boolean') return mobileViewport;
        return window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
      };

      applyHeroBenefitsLayoutExperiment(desktopView, !!(ctx.heroBenefitsLayoutExperiment && !(desktopView && desktopView.classList.contains('mobile-preview-active'))));
      applyHeroBenefitsLayoutExperiment(mobileView, false);
      applyHeroAbAnimationForRoot(desktopView);
      applyHeroAbAnimationForRoot(mobileView);

      desktopView?.classList.remove('hero-ab-b-mobile-precollapse', 'hero-ab-b-mobile-collapsed');
      mobileView?.classList.remove('hero-ab-b-mobile-precollapse', 'hero-ab-b-mobile-collapsed');
      setMobileCollapsed(false);

      if(!HERO_AB_MOBILE_EFFECTS_ENABLED){
        const timer = getMobileAutoTimer();
        if(timer){
          window.clearTimeout(timer);
          setMobileAutoTimer(null);
        }
        trackOnce('hero_ab_assigned_v1', { test_id: HERO_AB_TEST_ID, variant: heroAbVariant });
        return;
      }

      const collapseMobileHero = (reason = 'scroll') => {
        if(heroAbVariant !== 'B' || getMobileCollapsed()) return;
        const mobileRoot = resolveMobileHeroRoot();
        if(!mobileRoot) return;
        setMobileCollapsed(true);
        mobileRoot.classList.remove('hero-ab-b-mobile-precollapse');
        mobileRoot.classList.add('hero-ab-b-mobile-collapsed');
        const timer = getMobileAutoTimer();
        if(timer){
          window.clearTimeout(timer);
          setMobileAutoTimer(null);
        }
        trackOnce('hero_ab_mobile_scroll_collapse_v1', { test_id: HERO_AB_TEST_ID, variant: heroAbVariant, reason });
      };

      if(!getMobileScrollBound()){
        window.addEventListener('scroll', () => {
          if(!isMobileHeroRuntime()) return;
          if(!getMobileUserInteracted()) return;
          const y = window.scrollY || document.documentElement.scrollTop || 0;
          if(y < 12) return;
          collapseMobileHero('scroll');
        }, {passive:true});
        setMobileScrollBound(true);
      }
      if(!getMobileInteractionBound()){
        const markHeroAbInteracted = () => setMobileUserInteracted(true);
        window.addEventListener('touchstart', markHeroAbInteracted, {passive:true});
        window.addEventListener('pointerdown', markHeroAbInteracted, {passive:true});
        window.addEventListener('wheel', markHeroAbInteracted, {passive:true});
        window.addEventListener('keydown', markHeroAbInteracted);
        setMobileInteractionBound(true);
      }
      if(heroAbVariant === 'B' && isMobileHeroRuntime()){
        setMobileUserInteracted(false);
        const mobileRoot = resolveMobileHeroRoot();
        mobileRoot?.classList.add('hero-ab-b-mobile-precollapse');
        setMobileAutoTimer(window.setTimeout(() => {
          collapseMobileHero('timeout_10s');
        }, 10000));
      }

      trackOnce('hero_ab_assigned_v1', { test_id: HERO_AB_TEST_ID, variant: heroAbVariant });
      syncModularState({ heroVariant: heroAbVariant || 'A' });
      emitModularEvent('hero:ab-applied', { variant: heroAbVariant || 'A' });
    }

    return Object.freeze({
      clearHeroAbTimers,
      getForcedHeroAbVariant,
      resolveHeroAbVariant,
      applyHeroAbAnimationForRoot,
      applyHeroAbVariant
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.heroAbFlow = Object.freeze({ create: createHeroAbFlow });
})();


/* src/scripts/features/hero-v3-simple-flow.js */
(function registerHeroV3SimpleFlow(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  windowObj.AC_FEATURES.heroV3SimpleFlow = windowObj.AC_FEATURES.heroV3SimpleFlow || {};

  var DEFAULT_COPY = Object.freeze({
    menuToggleText: '⋯',
    heroTag: '66 км от Москвы · смены июнь–август',
    heroTitleHtml: 'AI-лагерь 7–14:<br><span class="hero-title-accent">проект за смену</span>',
    heroSub: 'Python · Minecraft · AI · Хакатон · Бассейн',
    heroSlogan: '6 лет работы · 1200+ детей · ★ 5.0 Яндекс Карты',
    bookingTitle: 'Подберём смену за 1 минуту',
    bookingLead: 'Программу и даты — за 10 минут',
    stepLabels: Object.freeze(['1. ВОЗРАСТ', '2. ВАШ ТЕЛЕФОН', '3. —', '4. —'])
  });

  function setTextIfPresent(root, selector, value){
    var node = root.querySelector(selector);
    if(node && typeof value === 'string' && value){
      node.textContent = value;
    }
  }

  function create(context){
    var ctx = context || {};
    var doc = ctx.document || windowObj.document;
    var getEnabled = ctx.getEnabled || function(){ return false; };
    var setHeroPhoneDropdownOpen = ctx.setHeroPhoneDropdownOpen || function(){};
    var copy = Object.freeze(Object.assign({}, DEFAULT_COPY, ctx.copy || {}));

    function applyMode(){
      var enabled = !!getEnabled();
      var desktopView = doc.getElementById('desktopView');
      var mobileView = doc.getElementById('mobileView');
      doc.documentElement.classList.toggle('hero-v3-simple-enabled', enabled);
      doc.body.classList.toggle('hero-v3-simple-enabled', enabled);
      if(desktopView) desktopView.classList.toggle('hero-v3-simple', enabled);
      if(mobileView) mobileView.classList.toggle('hero-v3-simple', enabled);
      if(enabled){
        var debugControls = doc.getElementById('debugControls');
        if(debugControls) debugControls.classList.add('hidden');
      }
      setHeroPhoneDropdownOpen(false);

      var menuToggleText = doc.querySelector('.hero-menu-toggle-text');
      if(menuToggleText){
        menuToggleText.textContent = enabled ? copy.menuToggleText : 'Меню';
      }
      if(!enabled){
        return;
      }

      setTextIfPresent(doc, '#desktopView .hero-tag', copy.heroTag);
      setTextIfPresent(doc, '#desktopView .hero-sub', copy.heroSub);
      setTextIfPresent(doc, '#desktopView .hero-slogan', copy.heroSlogan);
      setTextIfPresent(doc, '#desktopBookingTitle', copy.bookingTitle);
      setTextIfPresent(doc, '#desktopBookingLead', copy.bookingLead);

      var heroTitle = doc.querySelector('#desktopView .hero-title');
      if(heroTitle && copy.heroTitleHtml){
        heroTitle.innerHTML = copy.heroTitleHtml;
      }
      var labels = Array.isArray(copy.stepLabels) ? copy.stepLabels : DEFAULT_COPY.stepLabels;
      doc.querySelectorAll('#desktop-booking-card .booking-step').forEach(function(node, idx){
        if(node && labels[idx]){
          node.textContent = labels[idx];
        }
      });
    }

    return Object.freeze({
      applyMode: applyMode
    });
  }

  windowObj.AC_FEATURES.heroV3SimpleFlow.create = create;
})(window);


/* src/scripts/features/hero-variant-flow.js */
(function registerHeroVariantFlow(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  windowObj.AC_FEATURES.heroVariantFlow = windowObj.AC_FEATURES.heroVariantFlow || {};

  function create(context){
    var ctx = context || {};
    var doc = ctx.document || windowObj.document;
    var getCurrentSearchParams = ctx.getCurrentSearchParams || function(){ return new URLSearchParams(''); };
    var getHeroVariantState = ctx.getHeroVariantState || function(){ return null; };
    var setHeroVariantState = ctx.setHeroVariantState || function(){};
    var getVariantCopyMap = ctx.getVariantCopyMap || function(){ return {}; };
    var getVariantBannerTierMap = ctx.getVariantBannerTierMap || function(){ return {}; };
    var getVariantDefaultTier = ctx.getVariantDefaultTier || function(){ return 'broad'; };
    var getUtmH1Rules = ctx.getUtmH1Rules || function(){ return {}; };
    var bookingText = ctx.bookingText || function(){ return ''; };
    var mediaContentRef = ctx.getMediaContent || function(){ return {}; };
    var ageLabel = ctx.ageLabel || function(v){ return String(v || ''); };
    var getState = ctx.getState || function(){ return {}; };
    var hasSelectedAge = ctx.hasSelectedAge || function(){ return false; };
    var getBookingStage = ctx.getBookingStage || function(){ return 0; };
    var trackOnce = ctx.trackOnce || function(){};
    var getBookingViewConfig = ctx.getBookingViewConfig || function(){ return null; };
    var getRootDocument = function(){
      return doc || windowObj.document;
    };
    var variantCoachDismissedKey = '';
    var variantCoachReminderTimer = null;

    function normalizeBannerId(value){
      return String(value || '').trim();
    }

    function normalizeUtmH1Key(value){
      var raw = String(value || '').trim().toLowerCase();
      if(!raw) return '';
      if(raw.startsWith('utm_h1=')){
        return raw.slice('utm_h1='.length).trim();
      }
      return raw;
    }

    function resolveHeroVariantFromUtm(){
      var search = getCurrentSearchParams();
      var bannerId = normalizeBannerId(search.get('utm_content') || '');
      var utmH1Key = normalizeUtmH1Key(search.get('utm_h1') || '');
      var campaignId = String(search.get('utm_campaign') || '').trim();
      var tiers = getVariantBannerTierMap();
      var defaultTier = getVariantDefaultTier();
      var tierFromBanner = bannerId ? tiers[bannerId] : '';
      var isKnownBanner = !!tierFromBanner;
      var tier = isKnownBanner ? tierFromBanner : defaultTier;
      var copyMap = getVariantCopyMap();
      var baseCopy = copyMap[tier] || copyMap[defaultTier] || {};
      var rules = getUtmH1Rules();
      var utmH1Rule = utmH1Key ? rules[utmH1Key] : null;
      var copy = utmH1Rule
        ? Object.assign({}, baseCopy, { title: utmH1Rule.title, sub: utmH1Rule.sub })
        : baseCopy;
      var fallbackReason = !bannerId
        ? 'unknown_banner_or_no_utm'
        : (!isKnownBanner ? 'unknown_banner_or_no_utm' : '');
      return {
        bannerId: bannerId,
        utmH1Key: utmH1Key,
        campaignId: campaignId,
        tier: tier,
        copy: copy,
        fallbackReason: fallbackReason
      };
    }

    function buildHeroVariantMeta(extra){
      var variant = getHeroVariantState() || resolveHeroVariantFromUtm();
      var defaultTier = getVariantDefaultTier();
      return Object.assign({
        banner_id: variant.bannerId || '',
        campaign_id: variant.campaignId || '',
        utm_h1: variant.utmH1Key || '',
        tier: variant.tier || defaultTier,
        variant: variant.copy && variant.copy.variant || 'v1'
      }, extra && typeof extra === 'object' ? extra : {});
    }

    function syncHeroReviewsBlogLink(variant){
      var activeVariant = variant || getHeroVariantState() || resolveHeroVariantFromUtm();
      var shouldShowLink = activeVariant.utmH1Key === 'reviews';
      var mediaContent = mediaContentRef();
      var references = (mediaContent && mediaContent.references && typeof mediaContent.references === 'object')
        ? mediaContent.references
        : {};
      var blogUrl = String(
        references.reviewsBlogUrl || 'https://aidacamp.ru/stati/tpost/rfsocy9b51-razbirayu-negativnie-otzivi-pro-lagerya/'
      ).trim();
      var blogLabel = String(references.reviewsBlogLabel || bookingText('reviewsBlogLabel')).trim();

      doc.querySelectorAll('.hero-reviews-blog-link').forEach(function(node){ node.remove(); });
      if(!shouldShowLink || !blogUrl) return;

      var subtitleNodes = doc.querySelectorAll('.hero-sub');
      subtitleNodes.forEach(function(node){
        if(!node || !node.parentElement) return;
        var link = doc.createElement('a');
        link.className = 'hero-reviews-blog-link inline-link-btn primary';
        link.href = blogUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = blogLabel;
        node.insertAdjacentElement('afterend', link);
      });
    }

    function applyHeroVariantCopy(){
      var variant = getHeroVariantState() || resolveHeroVariantFromUtm();
      var copyMap = getVariantCopyMap();
      var defaultTier = getVariantDefaultTier();
      var copy = variant.copy || copyMap[defaultTier] || {};
      if(variant.utmH1Key && copy.title){
        doc.querySelectorAll('.hero-title').forEach(function(node){
          if(node) node.textContent = copy.title;
        });
      }
      doc.querySelectorAll('.hero-slogan').forEach(function(node){
        if(node) node.textContent = copy.title;
      });
      if(variant.utmH1Key && copy.sub){
        doc.querySelectorAll('.hero-sub').forEach(function(node){
          if(node) node.textContent = copy.sub;
        });
      }
      syncHeroReviewsBlogLink(variant);
    }

    function injectHeroSeasonOfferCta(){
      var sloganNodes = doc.querySelectorAll('.hero-slogan');
      sloganNodes.forEach(function(sloganNode){
        if(!sloganNode || !sloganNode.parentElement) return;
        if(sloganNode.parentElement.querySelector('.hero-season-offer')) return;
        var wrap = doc.createElement('div');
        wrap.className = 'hero-season-offer';
        wrap.innerHTML =
          '<div class="hero-season-offer-price">' + bookingText('heroSeasonOfferPriceText') + '</div>' +
          '<button class="hero-season-calendar-btn" type="button" data-action="open-season-calendar" aria-label="' + bookingText('heroSeasonCalendarAria') + '">' +
          '<img class="ac-icon" src="/assets/icons/calendar.svg" alt="" aria-hidden="true">' +
          '<span>' + bookingText('heroSeasonCalendarText') + '</span>' +
          '</button>';
        sloganNode.insertAdjacentElement('afterend', wrap);
      });
    }

    function formatVariantHint(template){
      var source = String(template || '').trim();
      if(!source) return '';
      var state = getState();
      return source.replace('{{age}}', ageLabel(state.age || '10-12'));
    }

    function clearVariantCoachReminderTimer(){
      if(!variantCoachReminderTimer) return;
      windowObj.clearTimeout(variantCoachReminderTimer);
      variantCoachReminderTimer = null;
    }

    function ensureVariantCoachBadge(viewCfg){
      var cfg = viewCfg && viewCfg.key ? viewCfg : getBookingViewConfig('desktop');
      if(!cfg || !cfg.cardId) return null;
      var root = getRootDocument();
      var card = root.getElementById(cfg.cardId);
      if(!card) return null;
      var badge = card.querySelector('.variant-coach-badge');
      if(!badge){
        badge = root.createElement('div');
        badge.className = 'variant-coach-badge';
      }
      return badge;
    }

    function hideVariantCoachBadge(viewCfg, dismissKey){
      var cfg = viewCfg && viewCfg.key ? viewCfg : getBookingViewConfig('desktop');
      clearVariantCoachReminderTimer();
      if(!cfg || !cfg.cardId) return;
      var root = getRootDocument();
      var card = root.getElementById(cfg.cardId);
      var badge = card && card.querySelector('.variant-coach-badge');
      if(!badge) return;
      if(dismissKey){
        variantCoachDismissedKey = String(dismissKey);
      }
      badge.classList.remove('visible', 'variant-coach-badge--stage1', 'variant-coach-badge--stage2');
      badge.innerHTML = '';
      badge.remove();
    }

    function syncVariantCoachBadge(viewCfg){
      var cfg = viewCfg && viewCfg.key ? viewCfg : getBookingViewConfig('desktop');
      hideVariantCoachBadge(cfg);
    }

    function syncVariantBookingHint(viewCfg){
      if(!viewCfg || !viewCfg.guidedInlineHintId) return;
      var hintNode = doc.getElementById(viewCfg.guidedInlineHintId);
      if(!hintNode) return;

      var variant = getHeroVariantState() || resolveHeroVariantFromUtm();
      var copyMap = getVariantCopyMap();
      var defaultTier = getVariantDefaultTier();
      var copy = variant.copy || copyMap[defaultTier] || {};
      var stage = getBookingStage();
      var state = getState();
      var message = '';

      if(!state.bookingCompleted){
        if(!hasSelectedAge()){
          message = copy.hintStage1 || '';
        } else if(!state.shiftId && stage === 2){
          message = formatVariantHint(copy.hintStage2 || '');
        }
      }

      if(!message){
        hintNode.classList.remove('visible', 'variant-coach');
        hintNode.textContent = '';
        return;
      }

      hintNode.textContent = message;
      hintNode.classList.add('visible', 'variant-coach');
    }

    function initHeroVariantPersonalization(){
      var resolved = resolveHeroVariantFromUtm();
      setHeroVariantState(resolved);
      var fallbackReason = resolved.fallbackReason || '';
      trackOnce('hero_variant_shown_new', buildHeroVariantMeta());
      if(fallbackReason){
        trackOnce('hero_variant_fallback_new', buildHeroVariantMeta({ reason: fallbackReason }));
      }
      applyHeroVariantCopy();
    }

    return Object.freeze({
      buildHeroVariantMeta: buildHeroVariantMeta,
      resolveHeroVariantFromUtm: resolveHeroVariantFromUtm,
      applyHeroVariantCopy: applyHeroVariantCopy,
      injectHeroSeasonOfferCta: injectHeroSeasonOfferCta,
      formatVariantHint: formatVariantHint,
      clearVariantCoachReminderTimer: clearVariantCoachReminderTimer,
      syncVariantBookingHint: syncVariantBookingHint,
      ensureVariantCoachBadge: ensureVariantCoachBadge,
      hideVariantCoachBadge: hideVariantCoachBadge,
      syncVariantCoachBadge: syncVariantCoachBadge,
      initHeroVariantPersonalization: initHeroVariantPersonalization
    });
  }

  windowObj.AC_FEATURES.heroVariantFlow.create = create;
})(window);


/* src/scripts/features/hero.block.js */
/* src/scripts/features/hero.block.js */
(function registerHeroBlock(windowObj){
  'use strict';
  if(!windowObj || typeof windowObj.createAidacampBlock !== 'function') return;
  windowObj.AIDACAMP_BLOCKS.hero = windowObj.createAidacampBlock('hero');
})(window);


/* src/scripts/features/lead-notify-flow.js */
(function(){
  function createLeadNotifyFlow(ctx = {}){
    const buildAbMeta = typeof ctx.buildAbMeta === 'function' ? ctx.buildAbMeta : (() => ({}));
    const saveLeadFallbackMeta = typeof ctx.saveLeadFallbackMeta === 'function' ? ctx.saveLeadFallbackMeta : (() => {});
    const telegramText = typeof ctx.telegramText === 'function' ? ctx.telegramText : (() => '');
    const formatPrice = typeof ctx.formatPrice === 'function' ? ctx.formatPrice : ((v) => String(v || '—'));

    function formatTelegramMessage(eventName, payload){
      const lines = [];
      const dash = telegramText('fallbackDash');
      const noPhone = telegramText('fallbackNoPhone');
      const pushLine = (label, value) => {
        lines.push(`${label}: ${value || dash}`);
      };

      if(eventName === 'promo_fixed'){
        lines.push(telegramText('titlePromoFixed'));
        lines.push('');
        pushLine(telegramText('labelType'), payload.promo_status === 'improved_again'
          ? telegramText('valueTypeImprovedAgain')
          : telegramText('valueTypeFirstFix'));
        pushLine(telegramText('labelPhone'), payload.phone || noPhone);
        pushLine(telegramText('labelAge'), payload.age || dash);
        pushLine(telegramText('labelShift'), payload.shift_name || dash);
        pushLine(telegramText('labelDates'), payload.shift_date || dash);
        pushLine(telegramText('labelPrice'), payload.price_final ? formatPrice(payload.price_final) : dash);
        pushLine(telegramText('labelCode'), payload.promo_code || dash);
        pushLine(telegramText('labelExpiresAt'), payload.promo_expires_at_local || dash);
        lines.push('');
        pushLine(telegramText('labelMode'), payload.mode || dash);
        pushLine(telegramText('labelSentAt'), payload.sent_at_local || dash);
      }

      if(eventName === 'booking_submitted'){
        lines.push(telegramText('titleBookingSubmitted'));
        lines.push('');
        pushLine(telegramText('labelName'), payload.name || dash);
        pushLine(telegramText('labelPhone'), payload.phone || dash);
        pushLine(telegramText('labelAge'), payload.age || dash);
        pushLine(telegramText('labelShift'), payload.shift_name || dash);
        pushLine(telegramText('labelDates'), payload.shift_date || dash);
        pushLine(telegramText('labelPrice'), payload.price_text || dash);
        pushLine(telegramText('labelCode'), payload.promo_code || dash);
        pushLine(telegramText('labelPromoStatus'), payload.promo_status || dash);
        lines.push('');
        pushLine(telegramText('labelMode'), payload.mode || dash);
        pushLine(telegramText('labelSentAt'), payload.sent_at_local || dash);
      }

      if(eventName === 'booking_draft_saved'){
        lines.push(telegramText('titleBookingDraft'));
        lines.push('');
        pushLine(telegramText('labelName'), payload.name || dash);
        pushLine(telegramText('labelPhone'), payload.phone || dash);
        pushLine(telegramText('labelShift'), payload.shift_name || payload.shift_text || dash);
        pushLine(telegramText('labelPrice'), payload.price_text || dash);
        pushLine(telegramText('labelCode'), payload.promo_code || dash);
        lines.push('');
        pushLine(telegramText('labelSentAt'), payload.sent_at_local || dash);
      }

      if(eventName === 'promo_cancelled'){
        lines.push(telegramText('titlePromoCancelled'));
        lines.push('');
        pushLine(telegramText('labelName'), payload.name || dash);
        pushLine(telegramText('labelPhone'), payload.phone || dash);
        pushLine(telegramText('labelShift'), payload.shift_name || dash);
        pushLine(telegramText('labelCode'), payload.promo_code || dash);
        pushLine(telegramText('labelPrice'), payload.price_final ? formatPrice(payload.price_final) : dash);
        lines.push('');
        pushLine(telegramText('labelSentAt'), payload.sent_at_local || dash);
      }

      if(lines.length === 0){
        lines.push(telegramText('fallbackLeadTitle'));
        lines.push(`${telegramText('fallbackEventLabel')}: ${eventName}`);
        lines.push(JSON.stringify(payload, null, 2));
      }

      return lines.join('\n');
    }

    async function sendLeadToTelegram(eventName, payload, cfg){
      const token = String(cfg?.telegramBotToken || '');
      const chatId = String(cfg?.telegramChatId || '');
      if(!token || !chatId){
        return {ok:false, delivered:false, fallback:true, reason:'telegram_not_configured'};
      }
      try {
        const formBody = new URLSearchParams();
        formBody.set('chat_id', chatId);
        formBody.set('text', formatTelegramMessage(eventName, payload));
        formBody.set('disable_web_page_preview', 'true');
        const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method:'POST',
          body: formBody,
          keepalive:true
        });
        if(tgResponse.ok){
          return {ok:true, delivered:true, endpoint:'telegram_bot', fallback:true};
        }
      } catch(error){
      }
      return {ok:false, delivered:false, fallback:true};
    }

    async function notifyLead(eventName, payload){
      const cfg = window.AC_NOTIFY_CONFIG || {};
      const enrichedPayload = {
        ...(payload && typeof payload === 'object' ? payload : {}),
        ...buildAbMeta()
      };
      const body = {event: eventName, payload: enrichedPayload};
      const endpoint = cfg.leadEndpoint || '/api/lead';

      try {
        const response = await fetch(endpoint, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(body),
          keepalive:true
        });
        if(response.ok){
          return {ok: true, delivered: true, endpoint};
        }

        const telegramResult = await sendLeadToTelegram(eventName, enrichedPayload, cfg);
        if(telegramResult.ok){
          saveLeadFallbackMeta(eventName, endpoint, `http_${response.status}_telegram_ok`);
          return telegramResult;
        }

        saveLeadFallbackMeta(eventName, endpoint, `http_${response.status}`);
        console.warn('[LEAD_MOCK_FALLBACK]', {endpoint, body});
        return {ok: false, delivered: false, fallback: true};
      } catch(error){
        const telegramResult = await sendLeadToTelegram(eventName, enrichedPayload, cfg);
        if(telegramResult.ok){
          saveLeadFallbackMeta(eventName, endpoint, 'network_telegram_ok');
          return telegramResult;
        }
        console.error('notifyLead error', error);
        saveLeadFallbackMeta(eventName, endpoint, String(error));
        return {ok: false, delivered: false, fallback: true, error: String(error)};
      }
    }

    return Object.freeze({
      notifyLead,
      sendLeadToTelegram,
      formatTelegramMessage
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.leadNotifyFlow = Object.freeze({ create: createLeadNotifyFlow });
})();


/* src/scripts/features/legal.block.js */
/* src/scripts/features/legal.block.js */
(function registerLegalBlock(windowObj){
  'use strict';
  if(!windowObj || typeof windowObj.createAidacampBlock !== 'function') return;
  windowObj.AIDACAMP_BLOCKS.legal = windowObj.createAidacampBlock('legal');
})(window);


/* src/scripts/features/media-flow-inline.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.mediaFlowInline = window.AC_FEATURES.mediaFlowInline || {};

  function getCompactStayCards(ctx) {
    var document = (ctx && ctx.document) || window.document;
    var cards = Array.from(document.querySelectorAll("#section-stay .stay-card")).map(function (card) {
      return {
        img: (card.querySelector("img") || {}).getAttribute && card.querySelector("img").getAttribute("src") || "",
        title: String(((card.querySelector(".stay-card-body strong") || {}).textContent || "")).trim(),
        text: String(((card.querySelector(".stay-card-body span") || {}).textContent || "")).trim()
      };
    }).filter(function (item) { return item.title; });
    if (!cards.length) {
      cards = [
        {
          img: "/assets/images/cdn-cache/53d52bed_45b1eb46cf5961c2188d.jpg.webp",
          title: "Комнаты и размещение",
          text: "Спокойные светлые комнаты, удобное размещение и бытовая среда без ощущения «походного лагеря»."
        },
        {
          img: "/assets/images/cdn-cache/62b758b3_63e9322f53ec8ca1b307.jpg.webp",
          title: "Санузлы и бытовые зоны",
          text: "Родителям важно понимать не только программу, но и бытовой комфорт ребёнка."
        },
        {
          img: "/assets/images/stay-common-lounge.webp",
          title: "Общая гостиная и зона отдыха",
          text: "Тёплое общее пространство для спокойного досуга, настольных игр и вечернего общения под присмотром вожатых."
        }
      ];
    }
    return cards;
  }

  function renderCompactInlineStayList(ctx, mobileInlineStayList) {
    if (!mobileInlineStayList) return;
    var state = ctx.state;
    var stayCards = getCompactStayCards(ctx);
    if (!stayCards.length) {
      mobileInlineStayList.innerHTML = "";
      return;
    }

    var safeIndex = Math.min(Math.max(state.mobileStayIndex || 0, 0), stayCards.length - 1);
    state.mobileStayIndex = safeIndex;
    var active = stayCards[safeIndex];

    mobileInlineStayList.innerHTML = '\n'
      + '  <article class="mobile-stay-feature">\n'
      + '    <button type="button" class="mobile-stay-feature-photo" data-action="open-stay-photo" data-stay-index="' + safeIndex + '" aria-label="Открыть фото: ' + active.title + '">\n'
      + (active.img ? '<img src="' + active.img + '" alt="' + active.title + '">' : "")
      + "    </button>\n"
      + "    <strong>" + active.title + "</strong>\n"
      + "    <p>" + active.text + "</p>\n"
      + "  </article>\n"
      + '  <div class="mobile-stay-preview-strip">\n'
      + stayCards.map(function (item, idx) {
        return '\n'
          + '      <button type="button" class="mobile-stay-preview-thumb ' + (idx === safeIndex ? "active" : "") + '" data-action="mobile-stay-select" data-stay-index="' + idx + '" aria-label="Показать: ' + item.title + '">\n'
          + (item.img ? '<img src="' + item.img + '" alt="' + item.title + '">' : "")
          + "      </button>\n";
      }).join("")
      + "  </div>\n";
  }

  function renderCompactInlineTeamList(ctx, mobileInlineTeamList) {
    if (!mobileInlineTeamList) return;
    var mediaContent = ctx.mediaContent;
    var founder = mediaContent.team.find(function (item) { return item.fio === "Дарья Афанасьева"; }) || mediaContent.team[0];
    var teachers = mediaContent.team.filter(function (item) { return item.fio !== (founder && founder.fio); });
    var founderSummary = founder && founder.bio
      ? founder.bio.split(".").map(function (part) { return part.trim(); }).filter(Boolean).slice(0, 2).join(". ") + "."
      : "";
    var teacherFocusMap = {
      "Никита Брагин": "Scratch, Minecraft и Python",
      "Омар Алхамви": "Python и нейросети",
      "Александр Ташкин": "Scratch, Minecraft и Python"
    };

    mobileInlineTeamList.innerHTML = '\n'
      + '  <article class="mobile-team-feature-card">\n'
      + '    <div class="mobile-team-feature-cover-wrap" data-action="open-book-photo" role="button" tabindex="0" aria-label="Открыть обложку книги">\n'
      + '      <img class="mobile-team-feature-cover" src="/assets/images/cdn-cache/8fc8172e_8991804334.webp" alt="Собственная книга по Python">\n'
      + "    </div>\n"
      + "    <strong>Собственная книга по Python</strong>\n"
      + '    <span>Команда не только ведёт занятия, но и создаёт собственные учебники и игровые методики. <a class="mobile-team-feature-link" href="' + mediaContent.references.programmingBookUrl + '" target="_blank" rel="noopener noreferrer">Смотреть книгу</a></span>\n'
      + "  </article>\n"
      + (founder ? '\n'
        + '    <article class="mobile-team-founder-card">\n'
        + '      <div class="mobile-team-avatar">\n'
        + '        <img src="' + founder.avatarUrl + '" alt="' + founder.fio + '">\n'
        + "      </div>\n"
        + "      <strong>" + founder.fio + "</strong>\n"
        + '      <span class="mobile-team-role">' + founder.role + "</span>\n"
        + "      <p>" + founderSummary + "</p>\n"
        + "    </article>\n" : "")
      + (teachers.length ? '\n'
        + '    <div class="mobile-team-carousel-block">\n'
        + '      <div class="mobile-team-carousel-head"><strong>Преподаватели</strong></div>\n'
        + '      <div class="mobile-team-carousel-track">\n'
        + teachers.map(function (teacher) {
          return '\n'
            + '          <article class="mobile-team-teacher-card">\n'
            + '            <div class="mobile-team-avatar"><img src="' + teacher.avatarUrl + '" alt="' + teacher.fio + '"></div>\n'
            + "            <strong>" + teacher.fio + "</strong>\n"
            + '            <span class="mobile-team-role">' + (teacherFocusMap[teacher.fio] || teacher.role) + "</span>\n"
            + "          </article>\n";
        }).join("")
        + "      </div>\n"
        + "    </div>\n" : "");
  }

  function renderCompactInlineContactsList(ctx, mobileInlineContactsList) {
    if (!mobileInlineContactsList) return;
    var mediaContent = ctx.mediaContent;
    var mapUrl = mediaContent.references.locationMapUrl;
    var mapEmbedUrl = mediaContent.references.locationMapEmbedUrl;
    var cityPhone = mediaContent.contacts.find(function (item) { return item.label === "city_phone"; });
    var mobilePhone = mediaContent.contacts.find(function (item) { return item.label === "mobile_phone"; });
    var whatsapp = mediaContent.contacts.find(function (item) { return item.label === "whatsapp"; });
    var telegram = mediaContent.contacts.find(function (item) { return item.label === "telegram"; });
    mobileInlineContactsList.innerHTML = '\n'
      + '  <article class="mobile-map-preview-card">\n'
      + '    <div class="mobile-map-preview">\n'
      + '      <iframe src="' + mapEmbedUrl + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Карта локации лагеря"></iframe>\n'
      + "    </div>\n"
      + "    <strong>Московская область, Наро-Фоминский округ</strong>\n"
      + '    <span>Удобный заезд и понятная локация. Маршрут открывается в Яндекс.Картах. <a class="mobile-map-inline-link" href="' + mapUrl + '" target="_blank" rel="noopener noreferrer">Открыть карту</a></span>\n'
      + "  </article>\n"
      + '  <div class="mobile-contact-grid">\n'
      + (cityPhone ? '<a class="mobile-contact-card" href="' + cityPhone.href + '"><strong>' + cityPhone.text + "</strong></a>" : "")
      + (mobilePhone ? '<a class="mobile-contact-card" href="' + mobilePhone.href + '"><strong>' + mobilePhone.text + "</strong></a>" : "")
      + (whatsapp ? '<a class="mobile-contact-card" href="' + whatsapp.href + '" target="_blank" rel="noopener noreferrer"><strong>' + whatsapp.text + "</strong></a>" : "")
      + (telegram ? '<a class="mobile-contact-card" href="' + telegram.href + '" target="_blank" rel="noopener noreferrer"><strong>Telegram</strong></a>' : "")
      + "  </div>\n";
  }

  function renderCompactInlineSocials(ctx, mobileInlineSocials) {
    if (!mobileInlineSocials) return;
    var mediaContent = ctx.mediaContent;
    var socialDisplayName = ctx.socialDisplayName;
    var socialBadgeMark = ctx.socialBadgeMark;
    mobileInlineSocials.innerHTML = mediaContent.socials.map(function (item) {
      return '\n'
        + '  <a class="mobile-social-link" href="' + item.href + '" target="_blank" rel="noopener noreferrer" aria-label="' + socialDisplayName(item) + '">\n'
        + '    <span class="mobile-social-icon"><span class="social-badge-mark">' + socialBadgeMark(item) + "</span></span>\n"
        + '    <span class="mobile-social-label">' + socialDisplayName(item) + "</span>\n"
        + "  </a>\n";
    }).join("");
  }

  window.AC_FEATURES.mediaFlowInline.getCompactStayCards = getCompactStayCards;
  window.AC_FEATURES.mediaFlowInline.renderCompactInlineStayList = renderCompactInlineStayList;
  window.AC_FEATURES.mediaFlowInline.renderCompactInlineTeamList = renderCompactInlineTeamList;
  window.AC_FEATURES.mediaFlowInline.renderCompactInlineContactsList = renderCompactInlineContactsList;
  window.AC_FEATURES.mediaFlowInline.renderCompactInlineSocials = renderCompactInlineSocials;
})();



/* src/scripts/features/media-flow-trust-panel.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.mediaFlowTrustPanel = window.AC_FEATURES.mediaFlowTrustPanel || {};

  function renderCompactTrustPanelContent(ctx) {
    var state = ctx.state;
    var shifts = ctx.shifts;
    var mediaContent = ctx.mediaContent;
    var formatPrice = ctx.formatPrice;
    var shiftDaysLabel = ctx.shiftDaysLabel;
    var getShiftDisplayDescription = ctx.getShiftDisplayDescription;
    var hasSelectedAge = ctx.hasSelectedAge;
    var getPhotosForActiveFilter = ctx.getPhotosForActiveFilter;
    var socialBadgeMark = ctx.socialBadgeMark;
    var socialDisplayName = ctx.socialDisplayName;
    var renderCompactInlineTeamList = ctx.renderCompactInlineTeamList;
    var renderCompactInlineStayList = ctx.renderCompactInlineStayList;
    var renderCompactInlineContactsList = ctx.renderCompactInlineContactsList;
    var renderCompactInlineSocials = ctx.renderCompactInlineSocials;
    var document = ctx.document || window.document;

    var aboutTargets = document.querySelectorAll("#mobileAboutFeatures, #mobileAboutFeaturesDesktop");
    var journeyTargets = document.querySelectorAll("#mobileJourneyContent, #mobileJourneyContentDesktop");
    var programsTargets = document.querySelectorAll("#mobileProgramsContent, #mobileProgramsContentDesktop");
    var photoGalleryTargets = document.querySelectorAll("#mobilePhotoGallery, #mobilePhotoGalleryDesktop");
    var videoGalleryTargets = document.querySelectorAll("#mobileVideoGallery, #mobileVideoGalleryDesktop");
    var reviewsGalleryTargets = document.querySelectorAll("#mobileReviewsGallery, #mobileReviewsGalleryDesktop");
    var faqFiltersTargets = document.querySelectorAll("#mobileFaqFilters, #mobileFaqFiltersDesktop");
    var faqListTargets = document.querySelectorAll("#mobileFaqList, #mobileFaqListDesktop");
    var teamTargets = document.querySelectorAll("#mobileInlineTeamList, #mobileInlineTeamListDesktop");
    var stayTargets = document.querySelectorAll("#mobileInlineStayList, #mobileInlineStayListDesktop");
    var contactsTargets = document.querySelectorAll("#mobileInlineContactsList, #mobileInlineContactsListDesktop");
    var socialsTargets = document.querySelectorAll("#mobileInlineSocials, #mobileInlineSocialsDesktop");
    var mobileDocsRequisites = document.getElementById("mobileDocsRequisites");
    var mobileDocsAccordion = document.getElementById("mobileDocsAccordion");

    if (aboutTargets.length) {
      var aboutHtml = '\n'
        + '  <article class="mobile-about-feature-item">\n'
        + "    <small>Проекты</small>\n"
        + "    <strong>AI и программирование</strong>\n"
        + "    <p>Реальные проекты: Scratch, Python, Minecraft, нейросети.</p>\n"
        + "  </article>\n"
        + '  <article class="mobile-about-feature-item">\n'
        + "    <small>Среда</small>\n"
        + "    <strong>Бассейн и живая лагерная среда</strong>\n"
        + "    <p>Спорт, команда и общение — не только экран.</p>\n"
        + "  </article>\n"
        + '  <article class="mobile-about-feature-item">\n'
        + "    <small>Результат</small>\n"
        + "    <strong>Итог за смену</strong>\n"
        + "    <p>Ребёнок уезжает с проектом, опытом и уверенностью.</p>\n"
        + "  </article>\n";
      aboutTargets.forEach(function (target) {
        target.innerHTML = aboutHtml;
      });
    }

    if (journeyTargets.length) {
      var steps = [
        {
          title: "Быстрое включение",
          text: "В первый же день дети знакомятся, собираются в команды и входят в механику смены без долгой раскачки."
        },
        {
          title: "Практика вместо теории",
          text: "Scratch, Python, Minecraft и AI через реальные задачи: меньше теории, больше практики."
        },
        {
          title: "Живая среда",
          text: "Бассейн, спорт и командная среда формируют ритм, дисциплину и уверенность."
        },
        {
          title: "Финальный результат",
          text: "К концу смены у ребёнка есть проект, защита и заметный рост по навыкам."
        }
      ];
      var safeStep = Math.max(0, Math.min(state.mobileJourneyStep || 0, steps.length - 1));
      state.mobileJourneyStep = safeStep;
      var activeStep = steps[safeStep];
      var journeyHtml = '\n'
        + '  <article class="mobile-journey-active">\n'
        + '    <div class="mobile-journey-active-heading">\n'
        + '      <div class="mobile-journey-active-index">' + (safeStep + 1) + "</div>\n"
        + "      <strong>" + activeStep.title + "</strong>\n"
        + "    </div>\n"
        + "    <p>" + activeStep.text + "</p>\n"
        + "  </article>\n"
        + '  <div class="mobile-journey-dots" aria-label="Навигация по шагам">\n'
        + steps.map(function (_, index) {
          return '\n'
            + "      <button\n"
            + '        type="button"\n'
            + '        class="mobile-journey-dot ' + (index === safeStep ? "active" : "") + '"\n'
            + '        data-action="mobile-journey-step"\n'
            + '        data-step-index="' + index + '"\n'
            + '        aria-label="Шаг ' + (index + 1) + '"\n'
            + "      ></button>\n";
        }).join("")
        + "  </div>\n";
      journeyTargets.forEach(function (target) {
        target.innerHTML = journeyHtml;
      });
    }

    if (programsTargets.length) {
      var mainShifts = shifts.slice();
      if (mainShifts.length) {
        var activeShiftId = mainShifts.some(function (shift) { return shift.id === state.mobileProgramShiftId; })
          ? state.mobileProgramShiftId
          : mainShifts[0].id;
        state.mobileProgramShiftId = activeShiftId;
        var activeShift = mainShifts.find(function (shift) { return shift.id === activeShiftId; }) || mainShifts[0];
        var selectorLabel = function (shift) { return String(shift.title || "").trim(); };
        var ageHint = hasSelectedAge()
          ? ""
          : "Сначала выберите возраст ребёнка, чтобы увидеть персональную подсказку.";

        var programsHtml = '\n'
          + '  <div class="mobile-program-selector">\n'
          + mainShifts.map(function (shift) {
            return '\n'
              + "      <button\n"
              + '        type="button"\n'
              + '        class="mobile-program-chip ' + (shift.id === activeShift.id ? "active" : "") + " " + (shift.isShort ? "short" : "") + '"\n'
              + '        data-action="mobile-program-select"\n'
              + '        data-shift-id="' + shift.id + '"\n'
              + "      >" + selectorLabel(shift) + "</button>\n";
          }).join("")
          + "  </div>\n"
          + '  <article class="mobile-program-active-card">\n'
          + '    <div class="mobile-program-dates">' + activeShift.dates + "</div>\n"
          + '    <div class="mobile-program-price-row">\n'
          + '      <div class="mobile-program-price">' + formatPrice(activeShift.price) + "</div>\n"
          + '      <div class="mobile-program-inline-actions">\n'
          + '        <button class="shift-calendar-btn shift-about-btn" type="button" data-action="toggle-shift-about" data-shift-id="' + activeShift.id + '" aria-label="Описание смены ' + activeShift.title + '">\n'
          + '          <img class="ac-icon" src="/assets/icons/info.svg" alt="" aria-hidden="true">\n'
          + "        </button>\n"
          + '        <button class="shift-calendar-btn" type="button" data-action="open-calendar" data-shift-id="' + activeShift.id + '" aria-label="Календарь ' + activeShift.title + '">\n'
          + '          <img class="ac-icon" src="/assets/icons/calendar.svg" alt="" aria-hidden="true">\n'
          + "        </button>\n"
          + "      </div>\n"
          + "    </div>\n"
          + '    <div class="mobile-program-meta">\n'
          + (activeShift.isShort ? "" : "<span>" + shiftDaysLabel(activeShift) + "</span>")
          + "<span>Осталось " + activeShift.left + " мест</span>"
          + (activeShift.isShort ? '<span class="mobile-program-short-badge">Короткая смена</span>' : "")
          + "    </div>\n"
          + "    <p>" + (activeShift.isShort ? (activeShift.desc || "") : getShiftDisplayDescription(activeShift)) + "</p>\n"
          + (ageHint ? '<div class="mobile-program-hint">' + ageHint + "</div>" : "")
          + "  </article>\n"
          + '  <div class="mobile-program-dots">\n'
          + mainShifts.map(function (shift, idx) {
            return '\n'
              + '      <button class="mobile-program-dot ' + (shift.id === activeShift.id ? "active" : "") + '" type="button" data-action="mobile-program-select" data-shift-id="' + shift.id + '" aria-label="Показать смену ' + (selectorLabel(shift) || (idx + 1)) + '"></button>\n';
          }).join("")
          + "  </div>\n";
        programsTargets.forEach(function (target) {
          target.innerHTML = programsHtml;
        });
      } else {
        programsTargets.forEach(function (target) {
          target.innerHTML = "";
        });
      }
    }

    if (photoGalleryTargets.length) {
      var photoList = getPhotosForActiveFilter(state.photoFilter);
      ctx.setPhotoLists(photoList);
      var photoActiveIndex = Math.min(Math.max(state.mobilePhotoIndex || 0, 0), Math.max(photoList.length - 1, 0));
      state.mobilePhotoIndex = photoActiveIndex;
      var activePhoto = photoList[photoActiveIndex];

      if (activePhoto) {
        var photoHtml = '\n'
          + '  <div class="mobile-media-stage mobile-photo-stage">\n'
          + '    <button type="button" data-action="open-photo" data-photo-index="' + photoActiveIndex + '">\n'
          + '      <img src="' + activePhoto.src + '" alt="' + (activePhoto.alt || "Фото лагеря") + '">\n'
          + '      <div class="mobile-media-overlay">\n'
          + "        <strong>" + (activePhoto.alt || "Атмосфера лагеря").replace(/^all$/i, "Атмосфера") + "</strong>\n"
          + "        <span>Тапните, чтобы открыть фото</span>\n"
          + "      </div>\n"
          + "    </button>\n"
          + "  </div>\n"
          + '  <div class="mobile-photo-preview-strip">\n'
          + photoList.map(function (item, idx) {
            return '\n'
              + '      <button class="mobile-photo-preview-thumb ' + (idx === photoActiveIndex ? "active" : "") + '" type="button" data-action="mobile-photo-select" data-photo-index="' + idx + '" aria-label="Выбрать фото ' + (idx + 1) + '">\n'
              + '        <img src="' + item.src + '" alt="' + (item.alt || "Фото") + '">\n'
              + "      </button>\n";
          }).join("")
          + "  </div>\n";
        photoGalleryTargets.forEach(function (target) {
          target.innerHTML = photoHtml;
        });
      } else {
        photoGalleryTargets.forEach(function (target) {
          target.innerHTML = "";
        });
      }
    }

    if (videoGalleryTargets.length) {
      var videoList = mediaContent.videos || [];
      var videoActiveIndex = Math.min(Math.max(state.mobileVideoIndex || 0, 0), Math.max(videoList.length - 1, 0));
      state.mobileVideoIndex = videoActiveIndex;
      var activeVideo = videoList[videoActiveIndex];

      if (activeVideo) {
        var videoHtml = '\n'
          + '  <div class="mobile-media-stage mobile-video-stage">\n'
          + '    <button type="button" data-action="open-video" data-video="' + activeVideo.url + '">\n'
          + '      <img src="' + activeVideo.cover + '" alt="' + activeVideo.title + '">\n'
          + '      <span class="mobile-media-play"><img class="ac-icon" src="/assets/icons/play.svg" alt="" aria-hidden="true"></span>\n'
          + '      <div class="mobile-media-overlay">\n'
          + "        <strong>" + activeVideo.title + "</strong>\n"
          + "        <span>Смотреть видео</span>\n"
          + "      </div>\n"
          + "    </button>\n"
          + "  </div>\n"
          + '  <div class="mobile-video-preview-strip">\n'
          + videoList.map(function (item, idx) {
            return '\n'
              + '      <button class="mobile-video-preview-thumb ' + (idx === videoActiveIndex ? "active" : "") + '" type="button" data-action="mobile-video-select" data-video-index="' + idx + '" aria-label="Выбрать видео ' + (idx + 1) + '">\n'
              + '        <img src="' + item.cover + '" alt="' + item.title + '">\n'
              + "      </button>\n";
          }).join("")
          + "  </div>\n";
        videoGalleryTargets.forEach(function (target) {
          target.innerHTML = videoHtml;
        });
      } else {
        videoGalleryTargets.forEach(function (target) {
          target.innerHTML = "";
        });
      }
    }

    if (reviewsGalleryTargets.length) {
      var reviewsList = mediaContent.reviews || [];
      var reviewsActiveIndex = Math.min(Math.max(state.mobileReviewIndex || 0, 0), Math.max(reviewsList.length - 1, 0));
      state.mobileReviewIndex = reviewsActiveIndex;
      var activeReview = reviewsList[reviewsActiveIndex];
      if (activeReview) {
        var reviewsHtml = '\n'
          + '  <div class="mobile-review-social-proof">\n'
          + '    <div class="mobile-review-top">\n'
          + '      <div class="mobile-review-scoreline">\n'
          + "        <strong>5.0</strong><span class=\"mobile-review-stars\">★★★★★</span>\n"
          + "      </div>\n"
          + '      <a class="inline-link-btn primary" href="' + mediaContent.references.yandexReviewsUrl + '" target="_blank" rel="noopener noreferrer">Отзывы в Яндекс</a>\n'
          + "    </div>\n"
          + "    <div class=\"mobile-review-proof\">Более 40 реальных отзывов на Яндекс.Картах</div>\n"
          + "    <p class=\"mobile-review-trust-note\">Родители пишут не про “анимацию”, а про сильную команду и реальные проекты.</p>\n"
          + "  </div>\n"
          + '  <div class="mobile-review-main">\n'
          + '    <div class="mobile-review-card">\n'
          + '      <div class="mobile-review-head">\n'
          + '        <img src="' + activeReview.avatar + '" alt="' + activeReview.name + '">\n'
          + "        <div>\n"
          + "          <strong>" + activeReview.name + "</strong>\n"
          + "          <span>" + activeReview.meta + "</span>\n"
          + '          <span class="mobile-review-stars">★★★★★</span>\n'
          + "        </div>\n"
          + "      </div>\n"
          + '      <div class="mobile-review-text">' + activeReview.quote + "</div>\n"
          + "    </div>\n"
          + '    <div class="mobile-review-dots">\n'
          + reviewsList.map(function (_, idx) {
            return '<button class="mobile-review-dot ' + (idx === reviewsActiveIndex ? "active" : "") + '" type="button" data-action="mobile-review-select" data-review-index="' + idx + '" aria-label="Показать отзыв ' + (idx + 1) + '"></button>';
          }).join("")
          + "    </div>\n"
          + '    <div class="mobile-review-main-nav">\n'
          + '      <button class="mobile-review-nav-btn" type="button" data-action="mobile-review-prev" aria-label="Предыдущий отзыв">Назад</button>\n'
          + '      <button class="mobile-review-nav-btn" type="button" data-action="mobile-review-next" aria-label="Следующий отзыв">Далее</button>\n'
          + "    </div>\n"
          + "  </div>\n";
        reviewsGalleryTargets.forEach(function (target) {
          target.innerHTML = reviewsHtml;
        });
      } else {
        reviewsGalleryTargets.forEach(function (target) {
          target.innerHTML = "";
        });
      }
    }

    if (faqListTargets.length || faqFiltersTargets.length) {
      var rawGroups = mediaContent.faq.map(function (group) { return group.group; });
      var primaryGroups = rawGroups.filter(function (group) { return group !== "all" && group !== "Все"; });
      var tailGroups = rawGroups.filter(function (group) { return group === "all" || group === "Все"; });
      var groups = primaryGroups.concat(tailGroups);
      var safeGroup = groups.includes(state.mobileFaqGroup) ? state.mobileFaqGroup : (groups[0] || "Медицина");
      state.mobileFaqGroup = safeGroup;
      var activeFaqGroup = mediaContent.faq.find(function (group) { return group.group === safeGroup; });
      var faqItems = (activeFaqGroup && activeFaqGroup.items || []).map(function (item, index) {
        return {
          key: safeGroup + ":" + index,
          q: item.q,
          a: item.a
        };
      });
      var fallbackKey = (faqItems[0] || {}).key || "";
      var activeKey = faqItems.some(function (item) { return item.key === state.mobileFaqOpenKey; }) ? state.mobileFaqOpenKey : fallbackKey;
      state.mobileFaqOpenKey = activeKey;

      var faqFiltersHtml = groups.map(function (group) {
        return '\n'
          + "    <button\n"
          + '      type="button"\n'
          + '      class="mobile-faq-filter-chip ' + (group === safeGroup ? "active" : "") + '"\n'
          + '      data-action="mobile-faq-filter"\n'
          + '      data-faq-group="' + group + '"\n'
          + "    >" + group + "</button>\n";
      }).join("");
      faqFiltersTargets.forEach(function (target) {
        target.innerHTML = faqFiltersHtml;
      });

      var faqListHtml = faqItems.map(function (item) {
        return '\n'
          + '  <article class="mobile-faq-item ' + (item.key === activeKey ? "open" : "") + '">\n'
          + "    <button\n"
          + '      type="button"\n'
          + '      class="mobile-faq-question"\n'
          + '      data-action="mobile-faq-toggle"\n'
          + '      data-faq-key="' + item.key + '"\n'
          + "    >\n"
          + "      <span>" + item.q + "</span>\n"
          + '      <img class="ac-icon" src="/assets/icons/chevron-right.svg" alt="" aria-hidden="true">\n'
          + "    </button>\n"
          + '    <div class="mobile-faq-answer">' + item.a + "</div>\n"
          + "  </article>\n";
      }).join("");
      faqListTargets.forEach(function (target) {
        target.innerHTML = faqListHtml;
      });
    }

    teamTargets.forEach(function (target) { return renderCompactInlineTeamList(target); });
    stayTargets.forEach(function (target) { return renderCompactInlineStayList(target); });
    contactsTargets.forEach(function (target) { return renderCompactInlineContactsList(target); });
    socialsTargets.forEach(function (target) { return renderCompactInlineSocials(target); });

    if (mobileDocsRequisites) {
      mobileDocsRequisites.innerHTML = "";
    }

    if (mobileDocsAccordion) {
      mobileDocsAccordion.innerHTML = '\n'
        + '  <article class="mobile-docs-accordion-item ' + (state.mobileDocsExpanded ? "open" : "") + '">\n'
        + '    <button type="button" class="mobile-docs-toggle" data-action="mobile-docs-toggle">\n'
        + '      <span class="mobile-docs-toggle-copy">\n'
        + '        <span class="mobile-docs-toggle-main">ООО «ВОИП КОННЕКТ»</span>\n'
        + '        <span class="mobile-docs-toggle-meta">ИНН 7729713637 · РТО 025773</span>\n'
        + "      </span>\n"
        + '      <img class="ac-icon" src="/assets/icons/chevron-right.svg" alt="" aria-hidden="true">\n'
        + "    </button>\n"
        + '    <div class="mobile-docs-links">\n'
        + '      <a href="legal.html#education-license" target="_blank" rel="noopener noreferrer">Образовательная лицензия Л035-01298-77/01082973</a>\n'
        + '      <a href="mailto:hello@codims.ru">hello@codims.ru</a>\n'
        + '      <a href="https://www.codims.ru/privacy" target="_blank" rel="noopener noreferrer">Политика обработки персональных данных</a>\n'
        + '      <a href="legal.html#legal-info" target="_blank" rel="noopener noreferrer">Юридическая информация</a>\n'
        + '      <a href="legal.html#org-info" target="_blank" rel="noopener noreferrer">Сведения об организации</a>\n'
        + '      <a href="legal.html#children-rest" target="_blank" rel="noopener noreferrer">Отдых и оздоровление детей</a>\n'
        + '      <a href="legal.html#partners-info" target="_blank" rel="noopener noreferrer">Условия для партнёров</a>\n'
        + '      <a href="legal.html#bloggers-info" target="_blank" rel="noopener noreferrer">Сотрудничество с блогерами</a>\n'
        + "    </div>\n"
        + "  </article>\n"
        + '  <div class="footer-copyright-mini">© 2019–2026</div>\n';
    }

    document.querySelectorAll("#mobilePhotoFilters [data-photo-filter], #mobilePhotoFiltersDesktop [data-photo-filter]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.photoFilter === state.photoFilter);
    });
  }

  window.AC_FEATURES.mediaFlowTrustPanel.renderCompactTrustPanelContent = renderCompactTrustPanelContent;
})();



/* src/scripts/features/media-flow.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.mediaFlow = window.AC_FEATURES.mediaFlow || {};

  function contactIconMarkup(label) {
    var map = {
      city_phone: "/assets/icons/phone-city.svg",
      mobile_phone: "/assets/icons/phone-mobile.svg",
      whatsapp: "/assets/icons/whatsapp.svg",
      telegram: "/assets/icons/telegram.svg"
    };
    var src = map[label];
    return src ? '<img class="ac-icon" src="' + src + '" alt="" aria-hidden="true">' : "•";
  }

  function resolveFloatingContactLinks(mediaContent) {
    var contacts = Array.isArray(mediaContent && mediaContent.contacts) ? mediaContent.contacts : [];
    var mobilePhone = contacts.find(function (item) { return item.label === "mobile_phone"; });
    var cityPhone = contacts.find(function (item) { return item.label === "city_phone"; });
    var whatsapp = contacts.find(function (item) { return item.label === "whatsapp"; });
    var telegram = contacts.find(function (item) { return item.label === "telegram"; });
    return {
      cityPhoneHref: (cityPhone && cityPhone.href) || "tel:+74951284429",
      cityPhoneLabel: (cityPhone && cityPhone.text) || "+7 (495) 128-44-29",
      mobilePhoneHref: (mobilePhone && mobilePhone.href) || "tel:+79688086455",
      mobilePhoneLabel: (mobilePhone && mobilePhone.text) || "+7 (968) 808-64-55",
      whatsappHref: (whatsapp && whatsapp.href) || "https://wa.me/79688086455",
      telegramHref: (telegram && telegram.href) || "https://t.me/Progaschool"
    };
  }

  function initFloatingContactsWidget(options) {
    var opts = options || {};
    var documentRef = opts.document || document;
    if (!documentRef || documentRef.getElementById("floatingContactsWidget")) return;

    var links = resolveFloatingContactLinks(opts.mediaContent || {});
    var host = documentRef.createElement("div");
    host.id = "floatingContactsWidget";
    host.className = "floating-contacts";
    host.innerHTML = '\n'
      + '  <div class="floating-contacts-panel" id="floatingContactsPanel" aria-label="Быстрые контакты">\n'
      + '    <a class="floating-contacts-link" href="' + links.cityPhoneHref + '">\n'
      + '      <img class="ac-icon floating-contacts-link-icon" src="/assets/icons/phone-city.svg" alt="" aria-hidden="true">\n'
      + '      <span class="floating-contacts-label">' + links.cityPhoneLabel + '</span>\n'
      + "    </a>\n"
      + '    <a class="floating-contacts-link" href="' + links.mobilePhoneHref + '">\n'
      + '      <img class="ac-icon floating-contacts-link-icon" src="/assets/icons/phone-mobile.svg" alt="" aria-hidden="true">\n'
      + '      <span class="floating-contacts-label">' + links.mobilePhoneLabel + '</span>\n'
      + "    </a>\n"
      + '    <a class="floating-contacts-link" href="' + links.whatsappHref + '" target="_blank" rel="noopener noreferrer">\n'
      + '      <img class="ac-icon floating-contacts-link-icon" src="/assets/icons/whatsapp.svg" alt="" aria-hidden="true">\n'
      + '      <span class="floating-contacts-label">WhatsApp</span>\n'
      + "    </a>\n"
      + '    <a class="floating-contacts-link" href="' + links.telegramHref + '" target="_blank" rel="noopener noreferrer">\n'
      + '      <img class="ac-icon floating-contacts-link-icon" src="/assets/icons/telegram.svg" alt="" aria-hidden="true">\n'
      + '      <span class="floating-contacts-label">Telegram</span>\n'
      + "    </a>\n"
      + "  </div>\n"
      + '  <button type="button" class="floating-contacts-toggle" id="floatingContactsToggle" aria-expanded="false" aria-controls="floatingContactsPanel" aria-label="Открыть контакты">\n'
      + '    <svg class="floating-contacts-glyph" viewBox="0 0 24 24" aria-hidden="true">\n'
      + '      <path class="floating-contacts-glyph-outline" d="M4.5 5.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3v-3H4.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"></path>\n'
      + '      <circle class="floating-contacts-dot floating-contacts-dot-left" cx="8" cy="11.5" r="1.35"></circle>\n'
      + '      <circle class="floating-contacts-dot floating-contacts-dot-center" cx="12" cy="11.5" r="1.35"></circle>\n'
      + '      <circle class="floating-contacts-dot floating-contacts-dot-right" cx="16" cy="11.5" r="1.35"></circle>\n'
      + "    </svg>\n"
      + "  </button>\n";
    documentRef.body.appendChild(host);

    var toggle = host.querySelector("#floatingContactsToggle");
    if (!toggle) return;

    var track = typeof opts.track === "function" ? opts.track : function () {};

    toggle.addEventListener("click", function () {
      var isOpen = host.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      track("floating_contacts_toggle", { open: isOpen ? 1 : 0 });
    });

    host.querySelectorAll(".floating-contacts-link").forEach(function (link) {
      link.addEventListener("click", function () {
        host.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        var label = String((link.querySelector(".floating-contacts-label") || {}).textContent || "").toLowerCase();
        track("floating_contacts_click", { channel: label });
      });
    });

    documentRef.addEventListener("click", function (event) {
      if (!host.classList.contains("is-open")) return;
      if (host.contains(event.target)) return;
      host.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });

    documentRef.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (!host.classList.contains("is-open")) return;
      host.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  function socialBadgeMark(item) {
    var mark = String((item && item.label) || "").trim().toUpperCase();
    var allowed = new Set(["VK", "RT", "IG", "OK", "YT", "LI", "TT", "PI", "YA"]);
    return allowed.has(mark) ? mark : "•";
  }

  function socialDisplayName(item) {
    var key = String((item && item.key) || "").trim();
    var badge = socialBadgeMark(item);
    if (!key) return badge;
    if (key.toUpperCase() !== badge) return key;
    if (key === "VK") return "ВКонтакте";
    return key;
  }

  function faqGlyph(iconPath, groupName) {
    if (iconPath && iconPath.includes("med")) return "MED";
    if (iconPath && iconPath.includes("lock")) return "SAFE";
    if (iconPath && iconPath.includes("food")) return "FOOD";
    if (iconPath && iconPath.includes("check")) return "ROOM";
    if (iconPath && iconPath.includes("phone")) return "CALL";
    return String(groupName || "").slice(0, 3).toUpperCase();
  }

  function renderStars() {
    return '<div class="stars">★★★★★</div>';
  }

  window.AC_FEATURES.mediaFlow.contactIconMarkup = contactIconMarkup;
  window.AC_FEATURES.mediaFlow.resolveFloatingContactLinks = resolveFloatingContactLinks;
  window.AC_FEATURES.mediaFlow.initFloatingContactsWidget = initFloatingContactsWidget;
  window.AC_FEATURES.mediaFlow.socialBadgeMark = socialBadgeMark;
  window.AC_FEATURES.mediaFlow.socialDisplayName = socialDisplayName;
  window.AC_FEATURES.mediaFlow.faqGlyph = faqGlyph;
  window.AC_FEATURES.mediaFlow.renderStars = renderStars;
})();



/* src/scripts/features/media-gesture-bindings.js */
(function registerMediaGestureBindings(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  windowObj.AC_FEATURES.mediaGestureBindings = windowObj.AC_FEATURES.mediaGestureBindings || {};

  function initMediaGestureBindings(context){
    var ctx = context || {};
    var doc = ctx.document || windowObj.document;
    if(!doc) return;

    var closeMedia = ctx.closeMedia || function(){};
    var nextMedia = ctx.nextMedia || function(){};
    var prevMedia = ctx.prevMedia || function(){};
    var applyStatePatch = ctx.applyStatePatch || function(){};
    var renderCompactTrustPanelContent = ctx.renderCompactTrustPanelContent || function(){};
    var persist = ctx.persist || function(){};
    var getMediaContent = ctx.getMediaContent || function(){ return {}; };
    var getCompactStayCards = ctx.getCompactStayCards || function(){ return []; };
    var getPhotosForActiveFilter = ctx.getPhotosForActiveFilter || function(){ return []; };
    var getState = ctx.getState || function(){ return {}; };

    (function bindMediaSwipe(){
      var lightbox = doc.getElementById('mediaLightbox');
      var content = doc.getElementById('mediaContent');
      if(!lightbox || !content) return;
      var startX = 0;
      var startY = 0;
      var moved = false;

      content.addEventListener('touchstart', function(e){
        if(lightbox.classList.contains('hidden')) return;
        var touch = e.touches && e.touches[0];
        if(!touch) return;
        startX = touch.clientX;
        startY = touch.clientY;
        moved = false;
      }, {passive:true});

      content.addEventListener('touchmove', function(e){
        if(lightbox.classList.contains('hidden')) return;
        var touch = e.touches && e.touches[0];
        if(!touch) return;
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if(Math.abs(dx) > 6 || Math.abs(dy) > 6){
          moved = true;
        }
      }, {passive:true});

      content.addEventListener('touchend', function(e){
        if(lightbox.classList.contains('hidden')) return;
        var touch = (e.changedTouches && e.changedTouches[0]) || null;
        if(!touch || !moved) return;
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if(Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy)) return;
        if(dx < 0){
          nextMedia();
        } else {
          prevMedia();
        }
      }, {passive:true});
    })();

    (function bindMobileReviewSwipe(){
      var startX = 0;
      var startY = 0;
      var trackedCard = null;

      doc.addEventListener('touchstart', function(e){
        var card = e.target.closest('.mobile-review-card');
        if(!card) return;
        var touch = e.touches && e.touches[0];
        if(!touch) return;
        trackedCard = card;
        startX = touch.clientX;
        startY = touch.clientY;
      }, {passive:true});

      doc.addEventListener('touchend', function(e){
        if(!trackedCard) return;
        var touch = (e.changedTouches && e.changedTouches[0]) || null;
        trackedCard = null;
        if(!touch) return;
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if(Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy)) return;
        var state = getState();
        var mediaContent = getMediaContent();
        var total = Math.max(0, (mediaContent.reviews && mediaContent.reviews.length) || 0);
        if(!total) return;
        if(dx < 0){
          applyStatePatch({ mobileReviewIndex: (Math.max(0, state.mobileReviewIndex || 0) + 1) % total });
        } else {
          applyStatePatch({ mobileReviewIndex: (Math.max(0, state.mobileReviewIndex || 0) - 1 + total) % total });
        }
        renderCompactTrustPanelContent();
        persist();
      }, {passive:true});
    })();

    (function bindMobileEdgeTapNavigation(){
      function getVisibleElement(nodeList){
        var list = Array.from(nodeList || []);
        return list.find(function(node){ return node && node.offsetParent !== null; }) || list[0] || null;
      }

      function getEdgeDirection(stageEl, clientX){
        if(!stageEl || !Number.isFinite(clientX)) return 0;
        var rect = stageEl.getBoundingClientRect();
        if(!rect || rect.width < 120) return 0;
        var leftZone = rect.left + rect.width * 0.28;
        var rightZone = rect.right - rect.width * 0.28;
        if(clientX <= leftZone) return -1;
        if(clientX >= rightZone) return 1;
        return 0;
      }

      function stepThumb(root, stripSelector, thumbSelector, direction){
        var strip = getVisibleElement(root.querySelectorAll(stripSelector));
        if(!strip) return false;
        var thumbs = Array.from(strip.querySelectorAll(thumbSelector));
        if(!thumbs.length) return false;
        var currentIndex = Math.max(0, thumbs.findIndex(function(thumb){ return thumb.classList.contains('active'); }));
        var nextIndex = (currentIndex + direction + thumbs.length) % thumbs.length;
        if(thumbs[nextIndex]) thumbs[nextIndex].click();
        return true;
      }

      doc.addEventListener('click', function(e){
        var stage = e.target.closest('.mobile-photo-stage, .mobile-video-stage, .mobile-review-card, .mobile-stay-feature, .mobile-program-active-card, .mobile-journey-active');
        if(!stage) return;
        if(e.target.closest('button, a, [data-action], iframe, input, textarea, select')) return;
        var direction = getEdgeDirection(stage, e.clientX);
        if(!direction) return;

        var root = stage.closest('.section-card, .section-modal-body, #mobileView, #desktopView') || doc;
        if(stage.classList.contains('mobile-photo-stage')){
          if(stepThumb(root, '.mobile-photo-preview-strip', '.mobile-photo-preview-thumb', direction)) persist();
          return;
        }
        if(stage.classList.contains('mobile-video-stage')){
          if(stepThumb(root, '.mobile-video-preview-strip', '.mobile-video-preview-thumb', direction)) persist();
          return;
        }
        if(stage.classList.contains('mobile-program-active-card')){
          if(stepThumb(root, '.mobile-program-dots', '.mobile-program-dot', direction)) persist();
          return;
        }
        if(stage.classList.contains('mobile-stay-feature')){
          if(stepThumb(root, '.mobile-stay-preview-strip', '.mobile-stay-preview-thumb', direction)) persist();
          return;
        }

        var state = getState();
        if(stage.classList.contains('mobile-journey-active')){
          var totalJourney = 4;
          var currentJourney = Math.max(0, Number(state.mobileJourneyStep || 0));
          applyStatePatch({ mobileJourneyStep: (currentJourney + (direction > 0 ? 1 : -1) + totalJourney) % totalJourney });
          renderCompactTrustPanelContent();
          persist();
          return;
        }
        if(stage.classList.contains('mobile-review-card')){
          var mediaContent = getMediaContent();
          var totalReview = Math.max(0, (mediaContent.reviews && mediaContent.reviews.length) || 0);
          if(!totalReview) return;
          if(direction > 0){
            applyStatePatch({ mobileReviewIndex: (Math.max(0, state.mobileReviewIndex || 0) + 1) % totalReview });
          } else {
            applyStatePatch({ mobileReviewIndex: (Math.max(0, state.mobileReviewIndex || 0) - 1 + totalReview) % totalReview });
          }
          renderCompactTrustPanelContent();
          persist();
        }
      });
    })();

    (function bindMobileProgramSwipe(){
      var startX = 0;
      var startY = 0;
      var activeCard = null;

      function stepProgramBySwipe(card, direction){
        if(!card || !direction) return;
        var root = card.closest('.section-card, .section-modal-body, #mobileView, #desktopView') || doc;
        var dots = Array.from(root.querySelectorAll('.mobile-program-dots .mobile-program-dot'));
        if(!dots.length) return;
        var current = Math.max(0, dots.findIndex(function(dot){ return dot.classList.contains('active'); }));
        var next = (current + direction + dots.length) % dots.length;
        if(dots[next]) dots[next].click();
        persist();
      }

      doc.addEventListener('touchstart', function(e){
        var card = e.target.closest('.mobile-program-active-card');
        if(!card) return;
        var touch = e.touches && e.touches[0];
        if(!touch) return;
        activeCard = card;
        startX = touch.clientX;
        startY = touch.clientY;
      }, {passive:true});

      doc.addEventListener('touchend', function(e){
        if(!activeCard) return;
        var card = activeCard;
        var touch = e.changedTouches && e.changedTouches[0];
        activeCard = null;
        if(!touch) return;
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if(Math.abs(dx) < 38 || Math.abs(dx) <= Math.abs(dy)) return;
        stepProgramBySwipe(card, dx < 0 ? 1 : -1);
      }, {passive:true});
    })();

    (function bindMobileJourneySwipe(){
      var startX = 0;
      var startY = 0;
      var activeCard = null;

      doc.addEventListener('touchstart', function(e){
        var card = e.target.closest('.mobile-journey-active');
        if(!card) return;
        var touch = e.touches && e.touches[0];
        if(!touch) return;
        activeCard = card;
        startX = touch.clientX;
        startY = touch.clientY;
      }, {passive:true});

      doc.addEventListener('touchend', function(e){
        if(!activeCard) return;
        var touch = e.changedTouches && e.changedTouches[0];
        activeCard = null;
        if(!touch) return;
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if(Math.abs(dx) < 32 || Math.abs(dx) <= Math.abs(dy)) return;
        var state = getState();
        var total = 4;
        var current = Math.max(0, Number(state.mobileJourneyStep || 0));
        applyStatePatch({ mobileJourneyStep: (current + (dx < 0 ? 1 : -1) + total) % total });
        renderCompactTrustPanelContent();
        persist();
      }, {passive:true});
    })();

    (function bindMobileStaySwipe(){
      var startX = 0;
      var startY = 0;
      var activeCard = null;

      doc.addEventListener('touchstart', function(e){
        var card = e.target.closest('.mobile-stay-feature, .mobile-stay-feature-photo');
        if(!card) return;
        var touch = e.touches && e.touches[0];
        if(!touch) return;
        activeCard = card;
        startX = touch.clientX;
        startY = touch.clientY;
      }, {passive:true});

      doc.addEventListener('touchend', function(e){
        if(!activeCard) return;
        var touch = e.changedTouches && e.changedTouches[0];
        activeCard = null;
        if(!touch) return;
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if(Math.abs(dx) < 32 || Math.abs(dx) <= Math.abs(dy)) return;
        var list = getCompactStayCards();
        var total = Math.max(0, list.length || 0);
        if(!total) return;
        var state = getState();
        applyStatePatch({ mobileStayIndex: (Math.max(0, state.mobileStayIndex || 0) + (dx < 0 ? 1 : -1) + total) % total });
        renderCompactTrustPanelContent();
        persist();
      }, {passive:true});
    })();

    (function bindMobilePhotoSwipe(){
      var startX = 0;
      var startY = 0;
      var activeNode = null;

      doc.addEventListener('touchstart', function(e){
        var node = e.target.closest('.mobile-photo-stage, .mobile-photo-preview-strip');
        if(!node) return;
        var touch = e.touches && e.touches[0];
        if(!touch) return;
        activeNode = node;
        startX = touch.clientX;
        startY = touch.clientY;
      }, {passive:true});

      doc.addEventListener('touchend', function(e){
        if(!activeNode) return;
        var touch = e.changedTouches && e.changedTouches[0];
        activeNode = null;
        if(!touch) return;
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if(Math.abs(dx) < 34 || Math.abs(dx) <= Math.abs(dy)) return;
        var state = getState();
        var list = getPhotosForActiveFilter(state.photoFilter);
        var total = Math.max(0, list.length || 0);
        if(!total) return;
        var current = Math.max(0, Number(state.mobilePhotoIndex || 0));
        applyStatePatch({ mobilePhotoIndex: (current + (dx < 0 ? 1 : -1) + total) % total });
        renderCompactTrustPanelContent();
        persist();
      }, {passive:true});
    })();
  }

  windowObj.AC_FEATURES.mediaGestureBindings.init = initMediaGestureBindings;
})(window);



/* src/scripts/features/media-sections-flow.js */
(function(){
  function createMediaSectionsFlow(ctx = {}){
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const getMediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent : (() => ({}));
    const photoCatLabel = typeof ctx.photoCatLabel === 'function' ? ctx.photoCatLabel : ((v) => String(v || ''));
    const contactIconMarkup = typeof ctx.contactIconMarkup === 'function' ? ctx.contactIconMarkup : (() => '•');
    const socialBadgeMark = typeof ctx.socialBadgeMark === 'function' ? ctx.socialBadgeMark : (() => '•');
    const socialDisplayName = typeof ctx.socialDisplayName === 'function' ? ctx.socialDisplayName : ((item) => String(item?.key || ''));
    const faqGlyph = typeof ctx.faqGlyph === 'function' ? ctx.faqGlyph : (() => 'FAQ');
    const bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : (() => '');
    const setPhotoLists = typeof ctx.setPhotoLists === 'function' ? ctx.setPhotoLists : (() => {});
    const prepareStayGalleryTriggers = typeof ctx.prepareStayGalleryTriggers === 'function' ? ctx.prepareStayGalleryTriggers : (() => {});
    const renderCompactTrustPanelContent = typeof ctx.renderCompactTrustPanelContent === 'function' ? ctx.renderCompactTrustPanelContent : (() => {});

    function renderMediaSections(){
      const state = getState();
      const mediaContent = getMediaContent();
      const photoGrid = document.getElementById('photoGrid');
      const videoList = document.getElementById('videoList');
      const contactsGrid = document.getElementById('contactsGrid');
      const socialsGrid = document.getElementById('socialsGrid');
      const footerSocialsList = document.getElementById('footerSocialsList');
      const faqGroups = document.getElementById('faqGroups');
      const teamGrid = document.getElementById('teamGrid');
      const bookLinkBtn = document.getElementById('bookLinkBtn');
      const yandexReviewsBtn = document.getElementById('yandexReviewsBtn');
      const reviewsGrid = document.getElementById('reviewsGrid');
      const locationMapBtn = document.getElementById('locationMapBtn');
      const locationMapFrame = document.getElementById('locationMapFrame');

      if(photoGrid){
        let filteredPhotos = [];
        if(state.photoFilter === 'all') filteredPhotos = mediaContent.photos;
        else if(state.photoFilter === 'camp') filteredPhotos = mediaContent.photos.filter(item => item.cat === 'camp' || item.cat === 'all');
        else filteredPhotos = mediaContent.photos.filter(item => item.cat === state.photoFilter);
        if(!filteredPhotos.length) filteredPhotos = mediaContent.photos.filter(item => item.cat === 'all');
        if(!filteredPhotos.length) filteredPhotos = mediaContent.photos;
        if(state.photoFilter !== 'all' && state.photoFilter !== 'camp'){
          if(state.photoFilter === 'study' && filteredPhotos.length > 4){
            const featuredRightSlot = filteredPhotos[filteredPhotos.length - 1];
            filteredPhotos = [filteredPhotos[0], filteredPhotos[1], filteredPhotos[2], featuredRightSlot];
          } else {
            filteredPhotos = filteredPhotos.slice(0, 4);
          }
        }
        setPhotoLists(filteredPhotos.slice());
        photoGrid.innerHTML = filteredPhotos.map((item, idx) => `
          <div class="photo-card ${idx === 0 ? 'hero' : ''}" data-action="open-photo" data-photo-index="${idx}">
            <img src="${item.src}" alt="${item.alt}">
            <div class="photo-title">АйДаКемп</div>
            <div class="photo-badge">${photoCatLabel(item.cat)}</div>
          </div>
        `).join('');
      }

      if(videoList){
        videoList.innerHTML = mediaContent.videos.map((item) => `
          <div class="video-card" data-video="${item.url}">
            <div class="video-poster">
              <img src="${item.cover || '/assets/video-covers/cover-week-change.jpg'}" alt="${item.title}">
              <div class="video-play"><span>▶</span></div>
            </div>
            <h4>${item.title}</h4>
          </div>
        `).join('');
      }

      if(bookLinkBtn) bookLinkBtn.href = mediaContent.references.programmingBookUrl;
      if(yandexReviewsBtn){
        yandexReviewsBtn.textContent = mediaContent.references.yandexReviewsLabel;
        yandexReviewsBtn.href = mediaContent.references.yandexReviewsUrl;
      }
      if(locationMapBtn) locationMapBtn.href = mediaContent.references.locationMapUrl;
      if(locationMapFrame) locationMapFrame.src = mediaContent.references.locationMapEmbedUrl || '';

      if(reviewsGrid){
        reviewsGrid.innerHTML = mediaContent.reviews.map(item => `
          <div class="review-real">
            <div class="review-head-real">
              <div class="review-avatar"><img src="${item.avatar}" alt="${item.name}"></div>
              <div class="review-person">
                <strong>${item.name}</strong>
                <div class="review-source">Яндекс Карты</div>
                <div class="review-stars">★★★★★</div>
                <div class="review-meta">${item.meta}</div>
              </div>
            </div>
            <div class="review-quote">«${item.quote}»</div>
          </div>
        `).join('');
      }

      if(contactsGrid){
        contactsGrid.innerHTML = mediaContent.contacts.map(item => `
          <a class="contact-link" href="${item.href}" target="_blank" rel="noopener noreferrer">
            <div class="contact-icon">${contactIconMarkup(item.label)}</div>
            <strong>${item.text}</strong>
          </a>
        `).join('');
      }
      if(socialsGrid){
        socialsGrid.innerHTML = mediaContent.socials.map(item => `
          <a class="social-link" href="${item.href}" target="_blank" rel="noopener noreferrer" data-network="${item.key}">
            <span class="social-badge-mark">${socialBadgeMark(item)}</span>
            <span class="social-label">${socialDisplayName(item)}</span>
          </a>
        `).join('');
      }
      if(footerSocialsList){
        footerSocialsList.innerHTML = mediaContent.socials.map(item => `
          <a href="${item.href}" target="_blank" rel="noopener noreferrer">${item.key}</a>
        `).join('');
      }

      if(faqGroups){
        const filteredFaq = state.faqFilter === 'all'
          ? mediaContent.faq
          : mediaContent.faq.filter(group => group.group === state.faqFilter);
        faqGroups.innerHTML = filteredFaq.map(group => `
          <div class="faq-group">
            <div class="faq-group-head">
              <div class="faq-icon">${faqGlyph(group.icon, group.group)}</div>
              <strong>${group.group}</strong>
            </div>
            <div class="faq-list">
              ${group.items.map(item => `<div class="faq-line"><strong>${item.q}</strong><span>${item.a}</span></div>`).join('')}
            </div>
          </div>
        `).join('');
        const faqEmpty = document.getElementById('faqEmptyState');
        if(faqEmpty) faqEmpty.classList.toggle('visible', filteredFaq.length === 0);
      }

      const faqFilters = document.getElementById('faqFilters');
      if(faqFilters){
        faqFilters.querySelectorAll('[data-faq-filter]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.faqFilter === state.faqFilter);
        });
      }

      if(teamGrid){
        const renderTeamCard = (item) => `
          <div class="team-card">
            <div class="team-avatar"><img src="${item.avatarUrl}" alt="${item.fio}"></div>
            <strong>${item.fio}</strong>
            <span class="team-role">${item.role}</span>
            <span>${item.bio}</span>
          </div>
        `;
        const byName = new Map(mediaContent.team.map(item => [item.fio, item]));
        const coreNames = [bookingText('teamCoreLeadName'), bookingText('teamCoreMentorName')];
        const coreCards = coreNames.map((name) => byName.get(name)).filter(Boolean).map(renderTeamCard).join('');
        const carouselCards = mediaContent.team.filter((item) => !coreNames.includes(item.fio)).map(renderTeamCard).join('');
        const bookCard = `
        <div class="team-card book-team-card">
          <div class="book-team-cover-wrap">
            <img class="book-team-cover" src="/assets/images/cdn-cache/8fc8172e_8991804334.webp" alt="${bookingText('bookCoverAlt')}">
          </div>
          <div class="book-team-title">${bookingText('bookTeamTitle')}</div>
          <div class="book-team-sub">${bookingText('bookTeamSub')}</div>
          <div class="book-team-proof">${bookingText('bookTeamProof')}</div>
          <a class="book-team-cta" href="${bookingText('bookTeamHref')}" target="_blank" rel="noopener noreferrer">${bookingText('bookTeamWatchCta')}</a>
        </div>`;
        teamGrid.innerHTML = `
          <div class="team-layout">
            ${bookCard}
            <div class="team-right">
              <div class="team-core-grid">${coreCards}</div>
              <div class="team-carousel-shell">
                <button class="team-carousel-nav prev" type="button" data-action="team-carousel-prev" aria-label="${bookingText('teamPrevAria')}"><img class="ac-icon" src="/assets/icons/chevron-left.svg" alt="" aria-hidden="true"></button>
                <div class="team-carousel" id="teamCarousel">${carouselCards}</div>
                <button class="team-carousel-nav next" type="button" data-action="team-carousel-next" aria-label="${bookingText('teamNextAria')}"><img class="ac-icon" src="/assets/icons/chevron-right.svg" alt="" aria-hidden="true"></button>
              </div>
            </div>
          </div>
        `;
      }

      const photoFilters = document.getElementById('photoFilters');
      if(photoFilters){
        photoFilters.querySelectorAll('[data-photo-filter]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.photoFilter === state.photoFilter);
        });
      }

      prepareStayGalleryTriggers();
      renderCompactTrustPanelContent();
    }

    return Object.freeze({ renderMediaSections });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.mediaSectionsFlow = Object.freeze({ create: createMediaSectionsFlow });
})();


/* src/scripts/features/menu.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.menu = window.AC_FEATURES.menu || {};
})();


/* src/scripts/features/modal-media-flow.js */
(function(){
  function createModalMediaFlow(ctx = {}){
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const getMediaContent = typeof ctx.getMediaContent === 'function' ? ctx.getMediaContent : (() => ({}));
    const getActivePhotoList = typeof ctx.getActivePhotoList === 'function' ? ctx.getActivePhotoList : (() => []);
    const setMediaContext = typeof ctx.setMediaContext === 'function' ? ctx.setMediaContext : (() => {});
    const getMediaContext = typeof ctx.getMediaContext === 'function' ? ctx.getMediaContext : (() => ({mediaType: 'photo', mediaIndex: 0}));
    const track = typeof ctx.track === 'function' ? ctx.track : (() => {});
    const photoCatLabel = typeof ctx.photoCatLabel === 'function' ? ctx.photoCatLabel : ((v) => String(v || ''));
    const resolveVideoSource = typeof ctx.resolveVideoSource === 'function' ? ctx.resolveVideoSource : (() => ({
      canEmbed: false,
      embedUrl: '',
      externalUrl: '',
      sourceName: 'источнике'
    }));

    function closeTransientModals(except = '', options = {}){
      const keepSection = !!options.keepSection;
      if(except !== 'section' && !keepSection){
        document.getElementById('sectionModal')?.classList.add('hidden');
      }
      if(except !== 'media'){
        document.getElementById('mediaLightbox')?.classList.add('hidden');
      }
      if(except !== 'video'){
        const iframe = document.getElementById('videoFrame');
        const inner = document.getElementById('videoInner');
        const fallback = document.getElementById('videoFallback');
        if(iframe){
          iframe.src = '';
          iframe.classList.remove('vertical');
          iframe.classList.remove('hidden');
        }
        if(inner){
          inner.classList.remove('vertical');
        }
        if(fallback){
          fallback.classList.add('hidden');
        }
        document.getElementById('videoModal')?.classList.add('hidden');
      }
      if(except !== 'calendar'){
        document.getElementById('calendarModal')?.classList.add('hidden');
      }
    }

    function renderMediaViewer(){
      const { mediaType, mediaIndex } = getMediaContext();
      const content = document.getElementById('mediaContent');
      const caption = document.getElementById('mediaCaption');
      const mediaContent = getMediaContent();

      if(!content || !caption) return;

      if(mediaType === 'photo'){
        const sourceList = getActivePhotoList();
        const source = sourceList.length ? sourceList : (Array.isArray(mediaContent.photos) ? mediaContent.photos : []);
        const item = source[mediaIndex];
        if(!item) return;
        content.innerHTML = `<img class="media-image" src="${item.src}" />`;
        caption.textContent = `${photoCatLabel(item.cat)} · ${mediaIndex + 1}/${source.length}`;
      }

      if(mediaType === 'video'){
        const videos = Array.isArray(mediaContent.videos) ? mediaContent.videos : [];
        const item = videos[mediaIndex];
        if(!item || !item.url) return;
        const source = resolveVideoSource(item.url);
        if(!source.canEmbed){
          content.innerHTML = `
            <div class="video-fallback">
              <strong>Видео доступно во внешнем источнике</strong>
              <p>Откройте ролик в отдельной вкладке, если встраивание недоступно.</p>
              <a class="inline-link-btn primary" href="${source.externalUrl}" target="_blank" rel="noopener noreferrer">Смотреть на ${source.sourceName}</a>
            </div>
          `;
          caption.textContent = `${mediaIndex + 1}/${videos.length}`;
          return;
        }
        content.innerHTML = `
          <iframe
            class="media-video"
            src="${source.embedUrl}"
            frameborder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>`;
        caption.textContent = `${mediaIndex + 1}/${videos.length}`;
      }
    }

    function openMedia(type, index){
      closeTransientModals('media', {keepSection: true});
      setMediaContext({ mediaType: type, mediaIndex: index });
      const mediaContent = getMediaContent();
      if(type === 'photo'){
        const sourceList = getActivePhotoList();
        const source = sourceList.length ? sourceList : (Array.isArray(mediaContent.photos) ? mediaContent.photos : []);
        const item = source[index];
        track('photo_open', {
          category: item?.cat || '',
          index: index + 1
        });
      }
      if(type === 'video'){
        const videos = Array.isArray(mediaContent.videos) ? mediaContent.videos : [];
        const item = videos[index];
        track('video_open', {
          title: item?.title || '',
          index: index + 1
        });
      }
      renderMediaViewer();
      document.getElementById('mediaLightbox')?.classList.remove('hidden');
    }

    function closeMedia(){
      document.getElementById('mediaLightbox')?.classList.add('hidden');
      const content = document.getElementById('mediaContent');
      if(content) content.innerHTML = '';
    }

    function openVideo(url){
      const modal = document.getElementById('videoModal');
      const iframe = document.getElementById('videoFrame');
      const inner = document.getElementById('videoInner');
      const fallback = document.getElementById('videoFallback');
      const fallbackLink = document.getElementById('videoFallbackLink');
      if(!modal || !iframe || !inner || !fallback || !fallbackLink || !url) return;

      closeTransientModals('video', {keepSection: true});
      const source = resolveVideoSource(url);
      const isVertical = source.orientation === 'vertical';
      inner.classList.toggle('vertical', isVertical);
      iframe.classList.toggle('vertical', isVertical);

      if(source.canEmbed){
        iframe.classList.remove('hidden');
        fallback.classList.add('hidden');
        iframe.src = source.embedUrl;
      } else {
        iframe.src = '';
        iframe.classList.add('hidden');
        fallback.classList.remove('hidden');
        fallbackLink.href = source.externalUrl;
        fallbackLink.textContent = `Смотреть на ${source.sourceName}`;
      }
      modal.classList.remove('hidden');
    }

    function closeVideo(){
      const modal = document.getElementById('videoModal');
      const iframe = document.getElementById('videoFrame');
      const inner = document.getElementById('videoInner');
      const fallback = document.getElementById('videoFallback');
      if(!modal || !iframe || !inner || !fallback) return;

      iframe.src = '';
      inner.classList.remove('vertical');
      iframe.classList.remove('vertical');
      iframe.classList.remove('hidden');
      fallback.classList.add('hidden');
      modal.classList.add('hidden');
    }

    function closeSectionModal(){
      const modal = document.getElementById('sectionModal');
      if(!modal) return;
      const card = modal.querySelector('.section-modal-card');
      modal.classList.add('hidden');
      modal.classList.remove('section-modal-compact');
      modal.classList.remove('section-modal-mobile');
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
      if(card){
        card.style.left = '';
        card.style.top = '';
        card.style.right = '';
        card.style.width = '';
        card.style.height = '';
      }
    }

    function applyCompactSectionModalLayout(){
      const modal = document.getElementById('sectionModal');
      const hero = document.getElementById('hero') || document.querySelector('#desktopView .hero-shell');
      const booking = document.getElementById('desktop-booking-card');
      const topbar = hero?.querySelector('.hero-topbar');
      const card = modal?.querySelector('.section-modal-card');
      if(!modal || !hero || !card || !modal.classList.contains('section-modal-compact')) return;
      const isNarrowViewport = window.innerWidth <= 900;
      if(isNarrowViewport){
        modal.style.removeProperty('--section-modal-compact-runtime-left');
        modal.style.removeProperty('--section-modal-compact-runtime-top');
        modal.style.removeProperty('--section-modal-compact-runtime-right');
        modal.style.removeProperty('--section-modal-compact-runtime-width');
        modal.style.removeProperty('--section-modal-compact-runtime-height');
        card.style.left = '';
        card.style.top = '';
        card.style.right = '';
        card.style.width = '';
        card.style.height = '';
        return;
      }

      const heroRect = hero.getBoundingClientRect();
      const bookingRoot = booking?.closest('.hero-booking-card') || booking;
      const bookingRect = bookingRoot ? bookingRoot.getBoundingClientRect() : null;
      const topbarRect = topbar ? topbar.getBoundingClientRect() : null;
      const inset = 14;
      const bookingGap = 14;
      const maxCompactWidth = 980;
      const minCompactWidth = 460;

      const left = Math.max(inset, Math.floor(heroRect.left + inset));
      const topAnchor = Math.floor(topbarRect ? (topbarRect.bottom + 8) : (heroRect.top + 10));
      const top = Math.max(inset, topAnchor);

      const heroRight = Math.floor(heroRect.right - inset);
      let slotRight = heroRight;
      if(bookingRect && bookingRect.width > 140 && bookingRect.left > left){
        slotRight = Math.min(slotRight, Math.floor(bookingRect.left - bookingGap));
      }

      const slotWidth = Math.floor(slotRight - left);
      if(slotWidth <= 0) return;

      const width = Math.max(Math.min(maxCompactWidth, slotWidth), Math.min(minCompactWidth, slotWidth));
      const rightEdge = left + width;
      const runtimeRight = Math.max(inset, Math.floor(window.innerWidth - rightEdge));
      const availableHeight = Math.floor((heroRect.bottom - inset) - top);
      if(availableHeight <= 0) return;

      modal.style.setProperty('--section-modal-compact-runtime-left', `${left}px`);
      modal.style.setProperty('--section-modal-compact-runtime-top', `${top}px`);
      modal.style.setProperty('--section-modal-compact-runtime-right', `${runtimeRight}px`);
      modal.style.setProperty('--section-modal-compact-runtime-width', `${width}px`);
      modal.style.setProperty('--section-modal-compact-runtime-height', `${availableHeight}px`);
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      card.style.right = 'auto';
      card.style.width = `${width}px`;
      card.style.height = `${availableHeight}px`;
    }

    function openSectionModal(sectionId){
      const modal = document.getElementById('sectionModal');
      const titleEl = document.getElementById('sectionModalTitle');
      const bodyEl = document.getElementById('sectionModalBody');
      const sourceSection = document.getElementById(sectionId);
      if(!modal || !titleEl || !bodyEl || !sourceSection) return false;
      closeTransientModals('section');
      const state = getState();
      const isCompactDesktop = state.previewView === 'desktop' && state.desktopMode === 'compact';
      const isMobilePanel = state.previewView === 'mobile';
      modal.classList.toggle('section-modal-compact', isCompactDesktop);
      modal.classList.toggle('section-modal-mobile', isMobilePanel);

      const sourceTitle = sourceSection.querySelector('h3')?.textContent?.trim() || 'Раздел';
      titleEl.textContent = sourceTitle;

      const clone = sourceSection.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      clone.classList.remove('section-modal-contacts');
      if(sectionId === 'section-contacts'){
        clone.classList.add('section-modal-contacts');
      }

      bodyEl.innerHTML = '';
      bodyEl.appendChild(clone);
      modal.classList.remove('hidden');
      document.documentElement.style.overflowX = 'hidden';
      document.body.style.overflowX = 'hidden';
      applyCompactSectionModalLayout();
      return true;
    }

    return Object.freeze({
      openMedia,
      closeMedia,
      closeTransientModals,
      openVideo,
      closeVideo,
      renderMediaViewer,
      closeSectionModal,
      applyCompactSectionModalLayout,
      openSectionModal
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.modalMediaFlow = Object.freeze({ create: createModalMediaFlow });
})();


/* src/scripts/features/modal.block.js */
/* src/scripts/features/modal.block.js */
(function registerModalBlock(windowObj){
  'use strict';
  if(!windowObj || typeof windowObj.createAidacampBlock !== 'function') return;
  windowObj.AIDACAMP_BLOCKS.modal = windowObj.createAidacampBlock('modal');
})(window);


/* src/scripts/features/navigation-flow.js */
(function(){
  function createNavigationFlow(ctx = {}){
    const trackFaqOpen = typeof ctx.trackFaqOpen === 'function' ? ctx.trackFaqOpen : (() => {});
    const isMobilePreviewView = typeof ctx.isMobilePreviewView === 'function' ? ctx.isMobilePreviewView : (() => false);
    const hasSelectedAge = typeof ctx.hasSelectedAge === 'function' ? ctx.hasSelectedAge : (() => false);
    const track = typeof ctx.track === 'function' ? ctx.track : (() => {});
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const showHint = typeof ctx.showHint === 'function' ? ctx.showHint : (() => {});
    const bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : (() => '');
    const focusMobileAgeGate = typeof ctx.focusMobileAgeGate === 'function' ? ctx.focusMobileAgeGate : (() => {});
    const isCompactDesktopMode = typeof ctx.isCompactDesktopMode === 'function' ? ctx.isCompactDesktopMode : (() => false);
    const isCompactMobileMode = typeof ctx.isCompactMobileMode === 'function' ? ctx.isCompactMobileMode : (() => false);
    const compactModalSections = ctx.compactModalSections instanceof Set ? ctx.compactModalSections : new Set();
    const openSectionModal = typeof ctx.openSectionModal === 'function' ? ctx.openSectionModal : (() => false);
    const buildLegalDocUrl = typeof ctx.buildLegalDocUrl === 'function' ? ctx.buildLegalDocUrl : (() => 'legal.html');

    function scrollToSection(id){
      const cleanId = String(id || '').replace(/^#/, '');
      if(!cleanId) return false;
      const el = document.getElementById(cleanId);
      if(!el) return false;
      el.scrollIntoView({behavior:'smooth', block:'start'});
      return true;
    }

    function navigateToSection(id){
      const cleanId = String(id || '').replace(/^#/, '');
      if(!cleanId) return;
      cleanId === 'section-faq' && trackFaqOpen();

      const isMobilePreview = isMobilePreviewView();
      const isProgramsSection = cleanId === 'section-programs';
      const isProgramsMobilePreview = isMobilePreview && isProgramsSection;
      const state = getState();

      if(isProgramsMobilePreview && !hasSelectedAge()){
        track('mobile_shifts_click_without_age', { mode: state.mobileMode || 'full' });
        showHint(bookingText('mobileProgramsAgeRequired'), 'age');
        focusMobileAgeGate();
        return;
      }

      if(isProgramsMobilePreview && hasSelectedAge()){
        track('mobile_shifts_opened_after_age', {
          mode: state.mobileMode || 'full',
          age: state.age || ''
        });
      }

      const isDesktopCompact = !isMobilePreview && isCompactDesktopMode();
      const isMobileCompact = isCompactMobileMode();
      if(isDesktopCompact || isMobileCompact){
        if(compactModalSections.has(cleanId) && openSectionModal(cleanId)){
          return;
        }
        if(!scrollToSection(cleanId) && cleanId === 'section-legal'){
          window.open(buildLegalDocUrl('#legal-info'), '_blank', 'noopener');
        }
        return;
      }

      if(!scrollToSection(cleanId) && cleanId === 'section-legal'){
        window.open(buildLegalDocUrl('#legal-info'), '_blank', 'noopener');
      }
    }

    return Object.freeze({
      scrollToSection,
      navigateToSection
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.navigationFlow = Object.freeze({ create: createNavigationFlow });
})();


/* src/scripts/features/notice-flow.js */
(function registerNoticeFlow(windowObj){
  "use strict";

  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  windowObj.AC_FEATURES.noticeFlow = windowObj.AC_FEATURES.noticeFlow || {};

  var noticeConfirmHandler = null;

  function safeText(bookingText, key, fallback){
    if(typeof bookingText === 'function'){
      return bookingText(key) || fallback;
    }
    return fallback;
  }

  function openNoticeModal(options){
    var opts = options || {};
    var message = opts.message || '';
    var title = opts.title;
    var bookingText = opts.bookingText || function () { return ''; };
    var document = opts.document || windowObj.document;
    var noticeTitle = document.getElementById('noticeTitle');
    var noticeMessage = document.getElementById('noticeMessage');
    var actionsEl = document.getElementById('noticeActions');
    var noticeOverlay = document.getElementById('noticeOverlay');

    if(!noticeOverlay) return false;

    noticeConfirmHandler = null;
    if(noticeTitle) noticeTitle.textContent = title || safeText(bookingText, 'noticeTitleDefault', '');
    if(noticeMessage) noticeMessage.textContent = message || '';
    if(actionsEl){
      actionsEl.classList.add('hidden');
      actionsEl.classList.remove('notice-actions--reset-booking');
    }
    noticeOverlay.classList.remove('hidden');
    return true;
  }

  function closeNoticeModal(options){
    var opts = options || {};
    var document = opts.document || windowObj.document;
    var actionsEl = document.getElementById('noticeActions');
    noticeConfirmHandler = null;
    if(actionsEl){
      actionsEl.classList.add('hidden');
      actionsEl.classList.remove('notice-actions--reset-booking');
    }
    var overlay = document.getElementById('noticeOverlay');
    if(overlay){
      overlay.classList.add('hidden');
    }
    return true;
  }

  function ensureNoticeActions(options){
    var opts = options || {};
    var document = opts.document || windowObj.document;
    var bookingText = opts.bookingText || function () { return ''; };
    var noticeOverlay = document.getElementById('noticeOverlay');
    var noticeCard = noticeOverlay ? noticeOverlay.querySelector('.notice-card') : null;
    if(!noticeOverlay || !noticeCard) return null;

    var actionsEl = document.getElementById('noticeActions');
    if(actionsEl) return actionsEl;

    actionsEl = document.createElement('div');
    actionsEl.id = 'noticeActions';
    actionsEl.className = 'notice-actions hidden';
    actionsEl.innerHTML = '\n        <button class="secondary-outline notice-cancel-btn" type="button" data-action="close-notice">'
      + safeText(bookingText, 'noticeCancel', '')
      + '</button>\n'
      + '        <button class="cta-main notice-confirm-btn" type="button" data-action="confirm-notice">'
      + safeText(bookingText, 'noticeConfirm', '')
      + '</button>\n      ';
    noticeCard.appendChild(actionsEl);
    return actionsEl;
  }

  function getNoticeConfirmHandler(){
    return noticeConfirmHandler;
  }

  function openResetBookingConfirmModal(options){
    var opts = options || {};
    var bookingText = opts.bookingText || function () { return ''; };
    var resetOfferState = opts.resetOfferState || function () {};
    var applyStatePatch = opts.applyStatePatch || function () {};
    var persist = opts.persist || function () {};
    var renderAll = opts.renderAll || function () {};
    var document = opts.document || windowObj.document;

    openNoticeModal({
      message: safeText(bookingText, 'noticeResetBookingMessage', ''),
      title: safeText(bookingText, 'noticeResetBookingTitle', ''),
      bookingText: bookingText,
      document: document
    });

    var actionsEl = ensureNoticeActions({
      bookingText: bookingText,
      document: document
    });
    if(!actionsEl) return false;

    var cancelBtn = actionsEl.querySelector('.notice-cancel-btn');
    var confirmBtn = actionsEl.querySelector('.notice-confirm-btn');
    if(cancelBtn) cancelBtn.textContent = safeText(bookingText, 'noticeCancel', '');
    if(confirmBtn) confirmBtn.textContent = safeText(bookingText, 'noticeConfirmReset', '');
    actionsEl.classList.add('notice-actions--reset-booking');
    noticeConfirmHandler = function(){
      resetOfferState({ preserveShift: false });
      applyStatePatch({
        age: null,
        ageSelected: false
      });
      persist();
      renderAll();
    };
    actionsEl.classList.remove('hidden');
    return true;
  }

  function setNoticeConfirmHandler(handler){
    noticeConfirmHandler = typeof handler === 'function' ? handler : null;
  }

  Object.assign(windowObj.AC_FEATURES.noticeFlow, {
    openNoticeModal: openNoticeModal,
    closeNoticeModal: closeNoticeModal,
    ensureNoticeActions: ensureNoticeActions,
    getNoticeConfirmHandler: getNoticeConfirmHandler,
    setNoticeConfirmHandler: setNoticeConfirmHandler,
    openResetBookingConfirmModal: openResetBookingConfirmModal
  });
})(window);


/* src/scripts/features/offer-flow.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.offerFlow = window.AC_FEATURES.offerFlow || {};

  function buildSearchMarkup(useLegacyLayout) {
    if (useLegacyLayout) {
      return '\n'
        + '  <div class="offer-state-shell offer-state-shell--search offer-state-shell--search-legacy">\n'
        + '    <div class="offer-headline">\n'
        + "      <h3>Ищем лучшую цену</h3>\n"
        + '      <button class="form-close offer-close-btn offer-close-placeholder" type="button" aria-hidden="true" tabindex="-1">\n'
        + '        <img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">\n'
        + "      </button>\n"
        + "    </div>\n"
        + '    <div class="offer-legacy-search-icon" aria-hidden="true">\n'
        + '      <img class="offer-legacy-search-icon__asset" src="/assets/icons/search.svg" alt="">\n'
        + "    </div>\n"
        + '    <div class="offer-legacy-status" id="offerProgressLead">Смотрим текущие бронирования...</div>\n'
        + '    <div class="offer-progress-track offer-progress-track--legacy">\n'
        + '      <div class="offer-progress-fill" id="offerProgressFillLine"></div>\n'
        + "    </div>\n"
        + '    <p class="offer-legacy-note">Проверяем доступные условия по выбранной смене.</p>\n'
        + "  </div>\n";
    }

    return '\n'
      + '  <div class="offer-state-shell offer-state-shell--search">\n'
      + '    <div class="offer-headline">\n'
      + "      <h3>Ищем лучшую цену</h3>\n"
      + '      <button class="form-close offer-close-btn offer-close-placeholder" type="button" aria-hidden="true" tabindex="-1">\n'
      + '        <img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">\n'
      + "      </button>\n"
      + "    </div>\n"
      + '    <p id="offerProgressLead">Проверяем остаток мест и доступные условия для выбранной смены.</p>\n'
      + '    <div class="offer-progress-track">\n'
      + '      <div class="offer-progress-fill" id="offerProgressFillLine"></div>\n'
      + "    </div>\n"
      + '    <div class="offer-progress-steps">\n'
      + '      <div class="offer-progress-step active" id="offerStepA">Проверяем смену</div>\n'
      + '      <div class="offer-progress-step" id="offerStepB">Сверяем цену</div>\n'
      + '      <div class="offer-progress-step" id="offerStepC">Генерируем код</div>\n'
      + "    </div>\n"
      + "  </div>\n";
  }

  function getSearchProgressSteps(options) {
    var opts = options || {};
    if (opts.useLegacyLayout) {
      return [
        { delay: 900, lead: "Смотрим текущие бронирования..." },
        { delay: 2700, lead: "Ищем свободные места..." },
        { delay: 4700, lead: "Проверяем отказы и неоплаты..." },
        { delay: 6400, lead: "Считаем максимально доступную цену..." }
      ];
    }
    return [
      {
        delay: 2300,
        lead: "Сверяем цену и проверяем, можно ли зафиксировать условия.",
        from: opts.stepA || null,
        to: opts.stepB || null
      },
      {
        delay: 4700,
        lead: "Готовим персональный код бронирования и закрепляем цену.",
        from: opts.stepB || null,
        to: opts.stepC || null
      }
    ];
  }

  function computeOfferState(options) {
    var opts = options || {};
    var basePrice = Number(opts.basePrice || 0);
    if (!basePrice) return null;

    var offerUtils = opts.featureOfferUtils;
    if (offerUtils && typeof offerUtils.buildOfferState === "function") {
      return offerUtils.buildOfferState({
        basePrice: basePrice,
        discountFactor: Number(opts.discountFactor || 0.95),
        now: Number(opts.now || Date.now()),
        ttlHours: Number(opts.ttlHours || 72)
      });
    }

    return {
      offerPrice: Math.round(basePrice * Number(opts.discountFactor || 0.95)),
      expiresAt: Number(opts.now || Date.now()) + Number(opts.ttlHours || 72) * 60 * 60 * 1000,
      offerStage: 1
    };
  }

  function buildResultMarkup(options) {
    var opts = options || {};
    var codeMarkup = opts.code
      ? '<span class="offer-benefit-chip"><strong>Код бронирования:</strong> ' + opts.code + "</span>"
      : "";
    if (opts.useLegacyLayout) {
      return '\n'
        + '  <div class="offer-state-shell offer-state-shell--result offer-state-shell--result-legacy">\n'
        + '    <div class="offer-headline">\n'
        + "      <h3>Нашли лучшие условия</h3>\n"
        + '      <button class="form-close offer-close-btn" type="button" data-action="close-offer" aria-label="Закрыть">\n'
        + '        <img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">\n'
        + "      </button>\n"
        + "    </div>\n"
        + '    <div class="offer-legacy-result-banner">\n'
        + '      <div class="offer-legacy-result-banner__icon" aria-hidden="true">\n'
        + '        <img class="offer-legacy-result-banner__asset" src="/assets/icons/search.svg" alt="">\n'
        + "      </div>\n"
        + '      <div class="offer-legacy-result-banner__text">\n'
        + "        <strong>Цена закреплена за вами</strong>\n"
        + "        <span>На ограниченное время</span>\n"
        + "      </div>\n"
        + "    </div>\n"
        + '    <div class="offer-legacy-price-box">\n'
        + "      <small>Ваша цена</small>\n"
        + "      <strong>" + opts.newPriceText + "</strong>\n"
        + "      <span>Вместо " + opts.oldPriceText + "</span>\n"
        + "    </div>\n"
        + '    <div class="offer-price-compare__benefits">\n'
        + "      <span class=\"offer-benefit-chip\"><strong>Выгода:</strong> " + opts.savingsText + "</span>\n"
        + "      <span class=\"offer-benefit-chip\"><strong>Разница:</strong> " + opts.savingsPercent + "</span>\n"
        + codeMarkup + "\n"
        + "    </div>\n"
        + '    <div class="offer-booking-block">\n'
        + '      <p class="offer-booking-note">Действует 72 часа. Вы можете спокойно подумать и вернуться.</p>\n'
        + "    </div>\n"
        + '    <div class="overlay-actions">\n'
        + '      <button class="cta-main" id="offerApplyBtn" data-action="apply-offer" type="button">Забронировать</button>\n'
        + "    </div>\n"
        + '    <div class="inline-lead-host hidden" id="offerInlineLeadHost"></div>\n'
        + "  </div>\n";
    }

    return '\n'
      + '  <div class="offer-state-shell offer-state-shell--result">\n'
      + '    <div class="offer-headline">\n'
      + "      <h3>Нашли лучшие условия</h3>\n"
      + '      <button class="form-close offer-close-btn" type="button" data-action="close-offer" aria-label="Закрыть">\n'
      + '        <img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">\n'
      + "      </button>\n"
      + "    </div>\n"
      + '    <div class="offer-price-compare">\n'
      + '      <div class="offer-price-compare__new">\n'
      + "        <small>Новая цена после проверки</small>\n"
      + "        <strong>" + opts.newPriceText + "</strong>\n"
      + "      </div>\n"
      + '      <div class="offer-price-compare__old">\n'
      + "        <small>Старая цена</small>\n"
      + "        <span>" + opts.oldPriceText + "</span>\n"
      + "      </div>\n"
      + '      <div class="offer-price-compare__benefits">\n'
      + "        <span class=\"offer-benefit-chip\"><strong>Выгода:</strong> " + opts.savingsText + "</span>\n"
      + "        <span class=\"offer-benefit-chip\"><strong>Разница:</strong> " + opts.savingsPercent + "</span>\n"
      + codeMarkup + "\n"
      + "      </div>\n"
      + "    </div>\n"
      + '    <div class="offer-booking-block">\n'
      + '      <p class="offer-booking-note">Действует 72 часа. Вы можете спокойно подумать и вернуться.</p>\n'
      + "    </div>\n"
      + '    <div class="overlay-actions">\n'
      + '      <button class="cta-main" id="offerApplyBtn" data-action="apply-offer" type="button">Забронировать</button>\n'
      + "    </div>\n"
      + '    <div class="inline-lead-host hidden" id="offerInlineLeadHost"></div>\n'
      + "  </div>\n";
  }

  function buildBookingSummaryHtml(options) {
    var opts = options || {};
    var state = opts.state || {};
    var getSelectedShift = opts.getSelectedShift || function () { return null; };
    var isOfferActive = opts.isOfferActive || function () { return false; };
    var formatPrice = opts.formatPrice || function (value) { return String(value || "—"); };
    var shift = getSelectedShift();
    if (!shift) return "";
    var ageLabel = opts.ageLabel || function () { return ""; };
    var bookingText = opts.bookingText || function () { return ""; };
    var stripRemainingPrefix = opts.stripRemainingPrefix || function (value) { return String(value || ""); };
    var formatRemainingCompact = opts.formatRemainingCompact || function (value) { return "" + Math.max(0, Number(value || 0)); };
    var showTimer = !!opts.showTimer;
    var shouldShowTimer = showTimer && isOfferActive();
    var timeLeft = shouldShowTimer ? stripRemainingPrefix(formatRemainingCompact(Number(state.expiresAt || 0) - Date.now())) : "";

    return "\n"
      + '  <div class="booking-summary-line">'
      + '    <span class="booking-summary-line__segment booking-summary-line__segment--price"><span class="booking-summary-price">' + formatPrice(state.offerPrice || state.basePrice || shift.price) + "</span></span>"
      + '    <span class="booking-summary-sep" aria-hidden="true">•</span>'
      + '    <span class="booking-summary-line__segment">'
      + '      <span class="booking-summary-selection">' + ageLabel(state.age) + "</span>"
      + "    </span>"
      + '    <span class="booking-summary-sep" aria-hidden="true">•</span>'
      + '    <span class="booking-summary-line__segment booking-summary-line__segment--date">'
      + '      <span class="booking-summary-selection booking-summary-selection--date">' + shift.dates + "</span>"
      + "    </span>"
      + "  </div>"
      + (timeLeft ? "\n"
      + '        <div class="booking-summary-timer">' +
      '        <div class="booking-summary-timer-title">' + bookingText("bookingTimerPinnedTitle") + "</div>" +
      '        <div class="booking-timer-line booking-timer-line--summary" data-live-timer="true">' + timeLeft + "</div>" +
      '      </div>'
      : "");
  }

  function openOfferCheck(options) {
    var opts = options || {};
    var runOfferSearch = opts.runOfferSearch;
    if (typeof runOfferSearch === "function") {
      runOfferSearch();
    }
  }

  function saveOfferAndClose(options) {
    var opts = options || {};
    var syncGuidedState = opts.syncGuidedState || function () {};
    var clearOfferTimeout = opts.clearOfferTimeout || function () {};
    var renderSummary = opts.renderSummary || function () {};
    var renderBookingPanels = opts.renderBookingPanels || function () {};
    var document = opts.document || window.document;

    syncGuidedState();
    clearOfferTimeout();
    var overlay = document.getElementById("offerOverlay");
    if (overlay) overlay.classList.add("hidden");
    renderSummary();
    renderBookingPanels();
  }

  function resetOfferProgressUI(options) {
    var opts = options || {};
    var clearOfferTimeout = opts.clearOfferTimeout || function () {};
    var state = opts.state || null;
    clearOfferTimeout();
    if (state) {
      state.offerSearching = false;
    }
  }

  function buildSelectedShiftPayload(options) {
    var opts = options || {};
    var state = opts.state || {};
    var getSelectedShift = opts.getSelectedShift || function () { return null; };
    var shiftDaysLabel = opts.shiftDaysLabel || function () { return ""; };
    var shift = getSelectedShift();
    return {
      shift_id: state.shiftId || "",
      shift_title: shift ? shift.title : "",
      shift_dates: shift ? shift.dates : "",
      shift_days: shift ? shiftDaysLabel(shift) : "",
      age: state.age || "",
      price: state.offerPrice || state.basePrice || (shift ? shift.price : "")
    };
  }

  function clearOfferTimeout(options) {
    var opts = options || {};
    var getTimeoutIds = opts.getTimeoutIds || function () { return []; };
    var setTimeoutIds = opts.setTimeoutIds || function () {};
    var clearTimeoutFn = opts.clearTimeoutFn || window.clearTimeout;
    var ids = getTimeoutIds();
    if (!Array.isArray(ids) || !ids.length) return;
    ids.forEach(function (id) {
      clearTimeoutFn(id);
    });
    setTimeoutIds([]);
  }

  function resetOfferState(options) {
    var opts = options || {};
    var state = opts.state || {};
    clearOfferTimeout({
      getTimeoutIds: opts.getTimeoutIds,
      setTimeoutIds: opts.setTimeoutIds,
      clearTimeoutFn: opts.clearTimeoutFn
    });
    state.offerStage = 0;
    state.offerPrice = null;
    state.code = null;
    state.expiresAt = null;
    state.offerSearching = false;
    state.bookingCompleted = false;
    if (!opts.preserveShift) {
      state.shiftId = null;
      state.basePrice = null;
    }
  }

  function runOfferSearch(options) {
    var opts = options || {};
    var state = opts.state || {};
    var shift = opts.getSelectedShift ? opts.getSelectedShift() : null;
    if (!shift) {
      if (typeof opts.nudgeUserToNextStep === "function" && typeof opts.bookingText === "function") {
        opts.nudgeUserToNextStep(opts.bookingText("selectShiftForPrice"));
      }
      return true;
    }

    var document = opts.document || window.document;
    var wrap = document.getElementById("offerOverlay");
    var card = document.getElementById("offerCard");
    if (!card) return true;

    card.classList.add("offer-card-stable");
    var currentRunId = typeof opts.bumpOfferRunId === "function" ? opts.bumpOfferRunId() : 0;
    state.offerSearching = true;
    if (typeof opts.clearOfferTimeout === "function") opts.clearOfferTimeout();

    if (typeof opts.track === "function" && typeof opts.selectedShiftPayload === "function") {
      opts.track("offer_open", opts.selectedShiftPayload());
      opts.track("offer_start", opts.selectedShiftPayload());
    }

    if (wrap) wrap.classList.remove("hidden");
    if (typeof opts.applyOfferModalTheme === "function") {
      opts.applyOfferModalTheme(card);
    }

    var useLegacyLayout = false;
    card.innerHTML = buildSearchMarkup(useLegacyLayout);

    if (typeof opts.normalizeCloseIconButtons === "function") {
      opts.normalizeCloseIconButtons(card);
    }
    card.querySelectorAll('[data-action="close-offer"]').forEach(function (btn) {
      btn.remove();
    });

    var fillEl = document.getElementById("offerProgressFillLine");
    var leadEl = document.getElementById("offerProgressLead");
    var stepA = document.getElementById("offerStepA");
    var stepB = document.getElementById("offerStepB");
    var stepC = document.getElementById("offerStepC");
    var progressDurationMs = 7000;

    if (fillEl) {
      fillEl.style.transition = "none";
      fillEl.style.width = "0%";
      window.requestAnimationFrame(function () {
        if (typeof opts.isOfferRunCurrent === "function" && !opts.isOfferRunCurrent(currentRunId)) return;
        fillEl.style.transition = "width " + progressDurationMs + "ms linear";
        fillEl.style.width = "100%";
      });
    }

    var progressSteps = getSearchProgressSteps({
      useLegacyLayout: useLegacyLayout,
      stepA: stepA,
      stepB: stepB,
      stepC: stepC
    });

    progressSteps.forEach(function (step) {
      var timeoutId = window.setTimeout(function () {
        if (typeof opts.isOfferRunCurrent === "function" && !opts.isOfferRunCurrent(currentRunId)) return;
        if (leadEl && step.lead) leadEl.textContent = step.lead;
        if (step.from && step.from.classList) step.from.classList.remove("active");
        if (step.to && step.to.classList) step.to.classList.add("active");
      }, step.delay);
      if (typeof opts.pushOfferTimeout === "function") {
        opts.pushOfferTimeout(timeoutId);
      }
    });

    var finalTimeoutId = window.setTimeout(function () {
      if (typeof opts.isOfferRunCurrent === "function" && !opts.isOfferRunCurrent(currentRunId)) return;
      if (typeof opts.clearOfferTimeout === "function") opts.clearOfferTimeout();
      if (typeof opts.showOffer === "function") opts.showOffer();
    }, progressDurationMs + 160);
    if (typeof opts.pushOfferTimeout === "function") {
      opts.pushOfferTimeout(finalTimeoutId);
    }
    return true;
  }

  function showOffer(options) {
    var opts = options || {};
    var state = opts.state || {};
    var document = opts.document || window.document;
    var card = document.getElementById("offerCard");
    var selectedShift = opts.getSelectedShift ? opts.getSelectedShift() : null;
    var basePrice = state.basePrice || (selectedShift ? selectedShift.price : null);
    var featureOfferUtils = opts.featureOfferUtils || (window.AC_FEATURES && window.AC_FEATURES.offerUtils) || null;

    if (basePrice) {
      var nextOfferState = computeOfferState({
        basePrice: basePrice,
        discountFactor: Number(opts.discountFactor || 0.95),
        now: Date.now(),
        ttlHours: Number(opts.ttlHours || 72),
        featureOfferUtils: featureOfferUtils
      });
      if (nextOfferState) {
        state.offerPrice = nextOfferState.offerPrice;
        state.expiresAt = nextOfferState.expiresAt;
        state.offerStage = nextOfferState.offerStage;
      }
    }

    if (state.code) state.previousCode = state.code;
    if (typeof opts.generateCode === "function") {
      state.code = opts.generateCode();
    }
    state.nextCodePreview = null;
    state.offerSearching = false;

    if (typeof opts.persist === "function") opts.persist();
    if (typeof opts.track === "function" && typeof opts.selectedShiftPayload === "function") {
      opts.track("offer_complete", opts.selectedShiftPayload());
    }

    if (card) {
      card.classList.add("offer-card-stable");
      if (typeof opts.applyOfferModalTheme === "function") {
        opts.applyOfferModalTheme(card);
      }
      var formatPrice = opts.formatPrice || function (v) { return String(v || "—"); };
      var oldPriceText = basePrice ? formatPrice(basePrice) : "—";
      var newPriceText = formatPrice(state.offerPrice);
      var appliedPrice = state.offerPrice || basePrice || 0;
      var savingsValue = Math.max(0, (basePrice || 0) - appliedPrice);
      var savingsText = formatPrice(savingsValue);
      var savingsPercent = basePrice ? String(Math.max(0, Math.round((savingsValue / basePrice) * 100))) + "%" : "0%";

      card.innerHTML = buildResultMarkup({
        useLegacyLayout: false,
        newPriceText: newPriceText,
        oldPriceText: oldPriceText,
        savingsText: savingsText,
        savingsPercent: savingsPercent,
        code: state.code || ""
      });
      if (typeof opts.normalizeCloseIconButtons === "function") {
        opts.normalizeCloseIconButtons(card);
      }
    }

    if (typeof opts.startTimer === "function") opts.startTimer();
    if (typeof opts.renderSummary === "function") opts.renderSummary();
    if (typeof opts.renderBookingPanels === "function") opts.renderBookingPanels();
    return true;
  }

  function applyOfferModalTheme(options) {
    var opts = options || {};
    var state = opts.state || {};
    var normalizeMode = opts.normalizeMode || function (value) { return value; };
    var themes = opts.themes || ["light", "dark"];
    var mode = normalizeMode(state.offerModalTheme, themes, "light");
    var document = opts.document || window.document;
    var lightBtn = document.getElementById("offerThemeLightBtn");
    var darkBtn = document.getElementById("offerThemeDarkBtn");
    if (lightBtn) lightBtn.classList.toggle("active", mode === "light");
    if (darkBtn) darkBtn.classList.toggle("active", mode === "dark");
    var card = opts.cardEl || document.getElementById("offerCard");
    if (card) card.classList.toggle("dark", mode === "dark");
  }

  function switchOfferModalTheme(options) {
    var opts = options || {};
    var state = opts.state || {};
    var normalizeMode = opts.normalizeMode || function (value) { return value; };
    var themes = opts.themes || ["light", "dark"];
    state.offerModalTheme = normalizeMode(opts.mode, themes, "light");
    applyOfferModalTheme({
      state: state,
      normalizeMode: normalizeMode,
      themes: themes,
      document: opts.document
    });
    var persist = opts.persist || function () {};
    persist();
  }

  function applyOfferLayoutMode(options) {
    var opts = options || {};
    var state = opts.state || {};
    var normalizeMode = opts.normalizeMode || function (value) { return value; };
    var modes = opts.modes || ["current"];
    var mode = normalizeMode(state.offerLayout, modes, "current");
    var document = opts.document || window.document;
    var currentBtn = document.getElementById("offerLayoutCurrentBtn");
    var legacyBtn = document.getElementById("offerLayoutLegacyBtn");
    if (currentBtn) currentBtn.classList.toggle("active", mode === "current");
    if (legacyBtn) legacyBtn.classList.toggle("active", false);
    var card = document.getElementById("offerCard");
    if (card) card.dataset.offerLayout = mode;
  }

  function switchOfferLayout(options) {
    var opts = options || {};
    var state = opts.state || {};
    var normalizeMode = opts.normalizeMode || function (value) { return value; };
    var modes = opts.modes || ["current"];
    var normalizedMode = normalizeMode(opts.mode, modes, "current");
    state.offerLayout = normalizedMode;
    applyOfferLayoutMode({
      state: state,
      normalizeMode: normalizeMode,
      modes: modes,
      document: opts.document
    });
    var persist = opts.persist || function () {};
    persist();
    var document = opts.document || window.document;
    var overlay = document.getElementById("offerOverlay");
    if (overlay && !overlay.classList.contains("hidden") && !state.offerSearching && state.offerStage > 0) {
      var showOffer = opts.showOffer || function () {};
      showOffer();
    }
  }

  window.AC_FEATURES.offerFlow.buildSearchMarkup = buildSearchMarkup;
  window.AC_FEATURES.offerFlow.getSearchProgressSteps = getSearchProgressSteps;
  window.AC_FEATURES.offerFlow.computeOfferState = computeOfferState;
  window.AC_FEATURES.offerFlow.buildResultMarkup = buildResultMarkup;
  window.AC_FEATURES.offerFlow.buildBookingSummaryHtml = buildBookingSummaryHtml;
  window.AC_FEATURES.offerFlow.openOfferCheck = openOfferCheck;
  window.AC_FEATURES.offerFlow.saveOfferAndClose = saveOfferAndClose;
  window.AC_FEATURES.offerFlow.resetOfferProgressUI = resetOfferProgressUI;
  window.AC_FEATURES.offerFlow.applyOfferModalTheme = applyOfferModalTheme;
  window.AC_FEATURES.offerFlow.switchOfferModalTheme = switchOfferModalTheme;
  window.AC_FEATURES.offerFlow.applyOfferLayoutMode = applyOfferLayoutMode;
  window.AC_FEATURES.offerFlow.switchOfferLayout = switchOfferLayout;
  window.AC_FEATURES.offerFlow.runOfferSearch = runOfferSearch;
  window.AC_FEATURES.offerFlow.showOffer = showOffer;
  window.AC_FEATURES.offerFlow.clearOfferTimeout = clearOfferTimeout;
  window.AC_FEATURES.offerFlow.resetOfferState = resetOfferState;
  window.AC_FEATURES.offerFlow.buildSelectedShiftPayload = buildSelectedShiftPayload;
})();


/* src/scripts/features/overlays.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.overlays = window.AC_FEATURES.overlays || {};
})();


/* src/scripts/features/runtime-quality-pipeline.js */
(function registerRuntimeQualityPipeline(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  windowObj.AC_FEATURES.runtimeQualityPipeline = windowObj.AC_FEATURES.runtimeQualityPipeline || {};

  function create(context){
    var ctx = context || {};
    var doc = ctx.document || windowObj.document;
    var runtimeStore = ctx.runtimeStore || windowObj.__AIDACAMP_RUNTIME || {};
    runtimeStore.quality = runtimeStore.quality || {};

    var buildVersionLabel = String(ctx.buildVersionLabel || '');
    var versionMonotonicKey = String(ctx.versionMonotonicKey || 'aidacamp_build_version_last_v1');
    var qualityBaselineKey = String(ctx.qualityBaselineKey || 'aidacamp_quality_baseline_v1');
    var debtRegisterKey = String(ctx.debtRegisterKey || 'aidacamp_debt_register_v1');
    var requiredSelectors = Array.isArray(ctx.requiredSelectors) ? ctx.requiredSelectors : [];
    var qualitySoftGates = (ctx.qualitySoftGates && typeof ctx.qualitySoftGates === 'object')
      ? ctx.qualitySoftGates
      : {};
    var architecturePolicy = (ctx.architecturePolicy && typeof ctx.architecturePolicy === 'object')
      ? ctx.architecturePolicy
      : { id:'unknown', version:'unknown' };
    var useDesktopBaseForMobile = ctx.useDesktopBaseForMobile !== false;
    var shouldUseLegacyMobile = (typeof ctx.shouldUseLegacyMobile === 'function')
      ? ctx.shouldUseLegacyMobile
      : function(){ return false; };
    var trackOnce = (typeof ctx.trackOnce === 'function')
      ? ctx.trackOnce
      : function(){};
    var isPipelineEnabled = (typeof ctx.isPipelineEnabled === 'function')
      ? ctx.isPipelineEnabled
      : function(){ return false; };

    function parseBuildVersionNumber(label){
      var match = String(label || '').trim().match(/^v(\d+)\.(\d+)\.(\d+)/i);
      if(!match) return null;
      var major = Number(match[1]);
      var minor = Number(match[2]);
      var patch = Number(match[3]);
      if(!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return null;
      return (major * 1000000) + (minor * 1000) + patch;
    }

    function runBuildVersionGuardrail(){
      var currentLabel = buildVersionLabel.trim();
      var currentValue = parseBuildVersionNumber(currentLabel);
      var previousLabel = String(windowObj.localStorage.getItem(versionMonotonicKey) || '').trim();
      var previousValue = parseBuildVersionNumber(previousLabel);
      var monotonic = true;

      if(previousValue !== null && currentValue !== null && currentValue < previousValue){
        monotonic = false;
        console.error('[GUARDRAIL] Version regression detected', {
          previous: previousLabel,
          current: currentLabel
        });
        trackOnce('guardrail_version_regression', {
          previous: previousLabel,
          current: currentLabel
        });
      } else if(currentValue !== null){
        windowObj.localStorage.setItem(versionMonotonicKey, currentLabel);
      }

      return {
        ok: monotonic,
        previous: previousLabel || null,
        current: currentLabel,
        previousValue: previousValue,
        currentValue: currentValue
      };
    }

    function runRuntimeSmokeGuardrail(){
      var missing = [];
      requiredSelectors.forEach(function(selector){
        if(!doc || !doc.querySelector(selector)){
          missing.push(selector);
        }
      });
      var ok = missing.length === 0;
      if(!ok){
        console.error('[GUARDRAIL] Smoke check failed', { missing: missing });
        trackOnce('guardrail_smoke_failed', {
          missing: missing.slice(0, 6).join(',')
        });
      }
      return {
        ok: ok,
        checked: requiredSelectors.length,
        missing: missing
      };
    }

    function runUnifiedArchitectureGuardrail(){
      var issues = [];
      if(!useDesktopBaseForMobile){
        issues.push('USE_DESKTOP_BASE_FOR_MOBILE=false');
      }
      var desktopView = doc ? doc.getElementById('desktopView') : null;
      if(!desktopView){
        issues.push('desktopView_missing');
      }
      var mobileView = doc ? doc.getElementById('mobileView') : null;
      if(mobileView && shouldUseLegacyMobile()){
        var styles = windowObj.getComputedStyle(mobileView);
        var legacyVisible = styles.display !== 'none' && styles.visibility !== 'hidden' && !mobileView.hidden;
        if(legacyVisible){
          issues.push('legacy_mobile_view_visible');
        }
      }
      var ok = issues.length === 0;
      if(!ok){
        console.error('[GUARDRAIL] Unified architecture check failed', { issues: issues });
        trackOnce('guardrail_architecture_failed', {
          issues: issues.slice(0, 4).join(',')
        });
      }
      return {
        ok: ok,
        policy: architecturePolicy.id,
        policyVersion: architecturePolicy.version,
        issues: issues
      };
    }

    function runGuardrails(){
      var version = runBuildVersionGuardrail();
      var smoke = runRuntimeSmokeGuardrail();
      var architecture = runUnifiedArchitectureGuardrail();
      var summary = {
        timestamp: new Date().toISOString(),
        build: buildVersionLabel,
        version: version,
        smoke: smoke,
        architecture: architecture,
        ok: !!(version.ok && smoke.ok && architecture.ok)
      };
      runtimeStore.quality.guardrails = summary;
      return summary;
    }

    function pickMainScriptText(){
      if(!doc) return '';
      var scripts = Array.from(doc.querySelectorAll('script:not([type="application/json"])'));
      var candidate = '';
      scripts.forEach(function(node){
        var text = String(node && node.textContent || '');
        if(text.length > candidate.length){
          candidate = text;
        }
      });
      return candidate;
    }

    function collectDuplicateSelectors(cssText){
      var map = new Map();
      var cleaned = String(cssText || '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      var blocks = cleaned.split('{');
      blocks.forEach(function(left){
        var selectorRaw = String(left || '').trim();
        if(!selectorRaw || selectorRaw.startsWith('@')) return;
        selectorRaw
          .split(',')
          .map(function(item){ return item.trim().replace(/\s+/g, ' '); })
          .filter(Boolean)
          .forEach(function(selector){
            var current = map.get(selector) || 0;
            map.set(selector, current + 1);
          });
      });
      var duplicates = 0;
      map.forEach(function(count){
        if(count > 1) duplicates += 1;
      });
      return {
        uniqueSelectors: map.size,
        duplicateSelectors: duplicates
      };
    }

    function runQualityBaselineAudit(){
      var previousBaseline = null;
      try {
        previousBaseline = JSON.parse(windowObj.localStorage.getItem(qualityBaselineKey) || 'null');
      } catch (_error){
        previousBaseline = null;
      }

      var cssNode = doc ? doc.querySelector('style') : null;
      var cssText = String(cssNode && cssNode.textContent || '');
      var jsText = pickMainScriptText();
      var cssRules = (cssText.match(/{/g) || []).length;
      var jsFunctions = (jsText.match(/\bfunction\s+[a-zA-Z0-9_$]+\s*\(/g) || []).length;
      var jsBranches = (jsText.match(/\bif\s*\(|\bswitch\s*\(/g) || []).length;
      var jsListeners = (jsText.match(/addEventListener\s*\(/g) || []).length;
      var selectorStats = collectDuplicateSelectors(cssText);
      var makeDelta = function(current, previous){
        if(!Number.isFinite(Number(current)) || !Number.isFinite(Number(previous))) return null;
        return Number(current) - Number(previous);
      };

      var delta = Object.freeze({
        versionFrom: previousBaseline && previousBaseline.version || null,
        css: Object.freeze({
          bytes: makeDelta(cssText.length, previousBaseline && previousBaseline.css && previousBaseline.css.bytes),
          rules: makeDelta(cssRules, previousBaseline && previousBaseline.css && previousBaseline.css.rules),
          uniqueSelectors: makeDelta(selectorStats.uniqueSelectors, previousBaseline && previousBaseline.css && previousBaseline.css.uniqueSelectors),
          duplicateSelectors: makeDelta(selectorStats.duplicateSelectors, previousBaseline && previousBaseline.css && previousBaseline.css.duplicateSelectors)
        }),
        js: Object.freeze({
          bytes: makeDelta(jsText.length, previousBaseline && previousBaseline.js && previousBaseline.js.bytes),
          functions: makeDelta(jsFunctions, previousBaseline && previousBaseline.js && previousBaseline.js.functions),
          branchPoints: makeDelta(jsBranches, previousBaseline && previousBaseline.js && previousBaseline.js.branchPoints),
          listeners: makeDelta(jsListeners, previousBaseline && previousBaseline.js && previousBaseline.js.listeners)
        })
      });

      var snapshot = Object.freeze({
        version: buildVersionLabel,
        timestamp: new Date().toISOString(),
        delta: delta,
        css: Object.freeze({
          bytes: cssText.length,
          rules: cssRules,
          uniqueSelectors: selectorStats.uniqueSelectors,
          duplicateSelectors: selectorStats.duplicateSelectors
        }),
        js: Object.freeze({
          bytes: jsText.length,
          functions: jsFunctions,
          branchPoints: jsBranches,
          listeners: jsListeners
        })
      });

      runtimeStore.quality.baseline = snapshot;
      runtimeStore.quality.baselineDelta = delta;
      try {
        windowObj.localStorage.setItem(qualityBaselineKey, JSON.stringify(snapshot));
      } catch (error){
        console.warn('[QUALITY] baseline persist failed', error);
      }
      return snapshot;
    }

    function evaluateSoftQualityGates(snapshot){
      var data = snapshot || runtimeStore.quality.baseline;
      if(!data) return { ok:false, warnings:['baseline_missing'], thresholds: qualitySoftGates };

      var warnings = [];
      var pushWarn = function(key, value, max){
        warnings.push(key + ':' + value + '>' + max);
      };

      if((data.css && data.css.duplicateSelectors || 0) > qualitySoftGates.cssDuplicateSelectorsMax){
        pushWarn('css.duplicateSelectors', data.css.duplicateSelectors, qualitySoftGates.cssDuplicateSelectorsMax);
      }
      if((data.css && data.css.bytes || 0) > qualitySoftGates.cssBytesMax){
        pushWarn('css.bytes', data.css.bytes, qualitySoftGates.cssBytesMax);
      }
      if((data.js && data.js.branchPoints || 0) > qualitySoftGates.jsBranchPointsMax){
        pushWarn('js.branchPoints', data.js.branchPoints, qualitySoftGates.jsBranchPointsMax);
      }
      if((data.js && data.js.listeners || 0) > qualitySoftGates.jsListenersMax){
        pushWarn('js.listeners', data.js.listeners, qualitySoftGates.jsListenersMax);
      }
      if((data.js && data.js.bytes || 0) > qualitySoftGates.jsBytesMax){
        pushWarn('js.bytes', data.js.bytes, qualitySoftGates.jsBytesMax);
      }

      var result = {
        ok: warnings.length === 0,
        warnings: warnings,
        thresholds: qualitySoftGates,
        version: buildVersionLabel
      };
      runtimeStore.quality.softGates = result;

      if(!result.ok){
        console.warn('[QUALITY] soft gates warnings', result);
        trackOnce('quality_soft_gates_warn', {
          count: warnings.length,
          top: warnings[0] || ''
        });
      }
      return result;
    }

    function buildDebtRegister(guardrails, baseline, gates){
      var items = [];
      var addItem = function(id, severity, source, detail){
        items.push({
          id: id,
          severity: severity,
          source: source,
          detail: detail
        });
      };

      if(!(guardrails && guardrails.version && guardrails.version.ok)){
        addItem(
          'version-regression',
          'critical',
          'guardrails.version',
          'Версия откатилась: ' + ((guardrails && guardrails.version && guardrails.version.previous) || 'n/a') +
            ' -> ' + ((guardrails && guardrails.version && guardrails.version.current) || 'n/a')
        );
      }

      if(!(guardrails && guardrails.smoke && guardrails.smoke.ok)){
        var missing = (guardrails && guardrails.smoke && guardrails.smoke.missing || []).slice(0, 6).join(', ');
        addItem(
          'runtime-smoke-missing-selectors',
          'high',
          'guardrails.smoke',
          'Отсутствуют критические селекторы: ' + missing
        );
      }

      var warnings = gates && gates.warnings || [];
      warnings.forEach(function(warning){
        var key = String(warning || '').split(':')[0];
        var severity = key.includes('bytes') ? 'medium' : 'high';
        addItem(
          'quality-gate-' + (key || 'unknown'),
          severity,
          'quality.soft-gates',
          warning
        );
      });

      if((baseline && baseline.css && baseline.css.duplicateSelectors || 0) > 280){
        addItem(
          'css-duplicate-selector-pressure',
          'medium',
          'quality.baseline.css',
          'Дубли селекторов=' + baseline.css.duplicateSelectors + ', желательно < 280'
        );
      }

      var scoreMap = { low: 1, medium: 2, high: 3, critical: 4 };
      var pressure = items.reduce(function(sum, item){
        return sum + (scoreMap[item.severity] || 0);
      }, 0);

      var summary = {
        version: buildVersionLabel,
        timestamp: new Date().toISOString(),
        debtItems: items,
        pressureScore: pressure,
        pressureLevel: pressure >= 9 ? 'high' : (pressure >= 4 ? 'medium' : 'low')
      };

      runtimeStore.quality.debtRegister = summary;
      try {
        windowObj.localStorage.setItem(debtRegisterKey, JSON.stringify(summary));
      } catch (error){
        console.warn('[DEBT] register persist failed', error);
      }
      return summary;
    }

    function buildRuntimeQualityScore(baseline, gates, debtRegister){
      var globalAidacampExports = Object.keys(windowObj).filter(function(key){
        return key.startsWith('__AIDACAMP_');
      }).length;
      var cssDupPenalty = Math.min(2.2, Math.max(0, ((baseline && baseline.css && baseline.css.duplicateSelectors || 0) - 220) / 120));
      var cssSizePenalty = Math.min(1.8, Math.max(0, ((baseline && baseline.css && baseline.css.bytes || 0) - 180000) / 80000));
      var cssRulePenalty = Math.min(1.4, Math.max(0, ((baseline && baseline.css && baseline.css.rules || 0) - 1100) / 400));
      var jsBranchPenalty = Math.min(2.2, Math.max(0, ((baseline && baseline.js && baseline.js.branchPoints || 0) - 620) / 220));
      var jsFunctionPenalty = Math.min(1.6, Math.max(0, ((baseline && baseline.js && baseline.js.functions || 0) - 180) / 80));
      var jsListenerPenalty = Math.min(1.6, Math.max(0, ((baseline && baseline.js && baseline.js.listeners || 0) - 170) / 90));
      var jsSizePenalty = Math.min(1.8, Math.max(0, ((baseline && baseline.js && baseline.js.bytes || 0) - 280000) / 120000));
      var gatesPenalty = Math.min(1.5, ((gates && gates.warnings || []).length) * 0.3);
      var globalFootprintPenalty = Math.min(1.1, Math.max(0, ((globalAidacampExports - 2) / 6) * 0.9));
      var architectureSignals = Object.freeze({
        runtimeStore: !!runtimeStore,
        qualityStore: !!(runtimeStore && runtimeStore.quality),
        pipelineNamespace: !!(runtimeStore && runtimeStore.quality && runtimeStore.quality.pipeline),
        runAllOrchestrator: typeof (runtimeStore && runtimeStore.quality && runtimeStore.quality.pipeline && runtimeStore.quality.pipeline.runAll) === 'function',
        lowGlobalExports: globalAidacampExports <= 2
      });
      var architectureSignalCount = Object.values(architectureSignals).filter(Boolean).length;
      var architectureBonus = Math.min(1.2, architectureSignalCount * 0.24);

      var cssScore = Math.max(0, Math.min(10, Number((10 - cssDupPenalty - cssSizePenalty - gatesPenalty * 0.35).toFixed(1))));
      var jsScore = Math.max(0, Math.min(10, Number((10 - jsBranchPenalty - jsListenerPenalty - jsSizePenalty - gatesPenalty * 0.4).toFixed(1))));
      var debtScore = Math.max(
        0,
        Math.min(
          10,
          Number(((((debtRegister && debtRegister.pressureScore) || 0) * 0.55) + ((gates && gates.warnings || []).length) * 0.35).toFixed(1))
        )
      );
      var pipelineBonus = runtimeStore.quality.pipeline ? 0.6 : 0;
      var monolithScore = Math.max(
        0,
        Math.min(
          10,
          Number((
            10
            - cssRulePenalty * 0.8
            - cssSizePenalty * 0.4
            - jsFunctionPenalty * 0.9
            - jsBranchPenalty * 0.8
            - jsSizePenalty * 0.5
            - globalFootprintPenalty
            + architectureBonus
            + pipelineBonus
          ).toFixed(1))
        )
      );

      var runtimeScore = Object.freeze({
        version: buildVersionLabel,
        timestamp: new Date().toISOString(),
        css: cssScore,
        js: jsScore,
        techDebt: debtScore,
        debtScale: '0 best .. 10 worst',
        monolithness: monolithScore,
        monolithScale: '0 monolith .. 10 modular',
        globalExports: globalAidacampExports,
        architectureSignals: architectureSignals
      });
      runtimeStore.quality.runtimeScore = runtimeScore;
      return runtimeScore;
    }

    function buildQualityTrendSummary(delta){
      var d = delta || runtimeStore.quality.baselineDelta || {};
      var probes = [
        { key:'css.bytes', value:d && d.css && d.css.bytes },
        { key:'css.duplicateSelectors', value:d && d.css && d.css.duplicateSelectors },
        { key:'js.bytes', value:d && d.js && d.js.bytes },
        { key:'js.branchPoints', value:d && d.js && d.js.branchPoints },
        { key:'js.listeners', value:d && d.js && d.js.listeners }
      ];
      var better = 0;
      var worse = 0;
      var details = [];
      probes.forEach(function(probe){
        var value = Number(probe.value);
        if(!Number.isFinite(value) || value === 0) return;
        if(value < 0){
          better += 1;
          details.push(probe.key + ': ' + value);
        } else {
          worse += 1;
          details.push(probe.key + ': +' + value);
        }
      });
      var trend = worse > better ? 'worse' : (better > worse ? 'better' : 'flat');
      var summary = Object.freeze({
        version: buildVersionLabel,
        fromVersion: d.versionFrom || null,
        trend: trend,
        better: better,
        worse: worse,
        details: details
      });
      runtimeStore.quality.trend = summary;
      return summary;
    }

    function runReleaseIntegrityChecks(){
      var required = Object.freeze([
        'guardrails',
        'baseline',
        'softGates',
        'debtRegister',
        'runtimeScore'
      ]);
      var missing = required.filter(function(key){
        return typeof runtimeStore.quality[key] === 'undefined' || runtimeStore.quality[key] === null;
      });
      var result = Object.freeze({
        version: buildVersionLabel,
        timestamp: new Date().toISOString(),
        ok: missing.length === 0,
        required: required,
        missing: missing
      });
      runtimeStore.quality.releaseIntegrity = result;

      if(!result.ok){
        console.error('[RELEASE] integrity failed', result);
        trackOnce('release_integrity_failed', {
          count: missing.length,
          first: missing[0] || ''
        });
      }
      return result;
    }

    function printRuntimeStatusReport(){
      var runtime = runtimeStore.quality.runtimeScore || {};
      var integrity = runtimeStore.quality.releaseIntegrity || {};
      var gates = runtimeStore.quality.softGates || {};
      var trend = runtimeStore.quality.trend || {};
      var reportLine =
        '[AIDACAMP][STATUS] ' + buildVersionLabel + ' | css=' + (runtime.css ?? 'n/a') +
        ' | js=' + (runtime.js ?? 'n/a') +
        ' | debt=' + (runtime.techDebt ?? 'n/a') + '(0 best)' +
        ' | monolith=' + (runtime.monolithness ?? 'n/a') + '(10 best)' +
        ' | integrity=' + (integrity.ok ? 'ok' : 'fail') +
        ' | softWarnings=' + (Array.isArray(gates.warnings) ? gates.warnings.length : 'n/a') +
        ' | trend=' + (trend.trend || 'n/a');
      console.info(reportLine);
      runtimeStore.quality.statusLine = reportLine;
      return reportLine;
    }

    function runAll(){
      var guardrailReport = runGuardrails();
      var qualityBaseline = runQualityBaselineAudit();
      var qualityGates = evaluateSoftQualityGates(qualityBaseline);
      var debtRegister = buildDebtRegister(guardrailReport, qualityBaseline, qualityGates);
      buildRuntimeQualityScore(qualityBaseline, qualityGates, debtRegister);
      buildQualityTrendSummary(qualityBaseline && qualityBaseline.delta);
      runReleaseIntegrityChecks();
      printRuntimeStatusReport();
      return {
        guardrailReport: guardrailReport,
        qualityBaseline: qualityBaseline,
        qualityGates: qualityGates,
        debtRegister: debtRegister
      };
    }

    var namespace = Object.freeze({
      runGuardrails: runGuardrails,
      runQualityBaselineAudit: runQualityBaselineAudit,
      evaluateSoftQualityGates: evaluateSoftQualityGates,
      buildDebtRegister: buildDebtRegister,
      buildRuntimeQualityScore: buildRuntimeQualityScore,
      buildQualityTrendSummary: buildQualityTrendSummary,
      runReleaseIntegrityChecks: runReleaseIntegrityChecks,
      printRuntimeStatusReport: printRuntimeStatusReport,
      runAll: runAll
    });

    function schedule(){
      if(!isPipelineEnabled()) return;
      var run = function(){
        try {
          runAll();
        } catch (error){
          console.warn('[QUALITY] deferred pipeline failed', error);
        }
      };
      if('requestIdleCallback' in windowObj){
        windowObj.requestIdleCallback(run, { timeout: 12000 });
      } else {
        windowObj.setTimeout(run, 8000);
      }
    }

    return Object.freeze({
      namespace: namespace,
      schedule: schedule
    });
  }

  windowObj.AC_FEATURES.runtimeQualityPipeline.create = create;
})(window);


/* src/scripts/features/summary-flow.js */
(function(){
  function createSummaryFlow(ctx = {}){
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const getShifts = typeof ctx.getShifts === 'function' ? ctx.getShifts : (() => []);
    const getTimerId = typeof ctx.getTimerId === 'function' ? ctx.getTimerId : (() => null);
    const setTimerId = typeof ctx.setTimerId === 'function' ? ctx.setTimerId : (() => {});
    const getDismissUntilTs = typeof ctx.getDismissUntilTs === 'function' ? ctx.getDismissUntilTs : (() => 0);
    const setDismissUntilTs = typeof ctx.setDismissUntilTs === 'function' ? ctx.setDismissUntilTs : (() => {});
    const getDismissTimerId = typeof ctx.getDismissTimerId === 'function' ? ctx.getDismissTimerId : (() => null);
    const setDismissTimerId = typeof ctx.setDismissTimerId === 'function' ? ctx.setDismissTimerId : (() => {});
    const resetOfferState = typeof ctx.resetOfferState === 'function' ? ctx.resetOfferState : (() => {});
    const persist = typeof ctx.persist === 'function' ? ctx.persist : (() => {});
    const formatRemaining = typeof ctx.formatRemaining === 'function' ? ctx.formatRemaining : (() => '');
    const formatRemainingCompact = typeof ctx.formatRemainingCompact === 'function' ? ctx.formatRemainingCompact : (() => '');
    const normalizeCompactTimerText = typeof ctx.normalizeCompactTimerText === 'function' ? ctx.normalizeCompactTimerText : ((v) => String(v || ''));
    const stripRemainingPrefix = typeof ctx.stripRemainingPrefix === 'function' ? ctx.stripRemainingPrefix : ((v) => String(v || ''));
    const renderBookingPanels = typeof ctx.renderBookingPanels === 'function' ? ctx.renderBookingPanels : (() => {});
    const syncGuidedState = typeof ctx.syncGuidedState === 'function' ? ctx.syncGuidedState : (() => {});
    const getBookingStage = typeof ctx.getBookingStage === 'function' ? ctx.getBookingStage : (() => 1);
    const getPrimaryActionState = typeof ctx.getPrimaryActionState === 'function' ? ctx.getPrimaryActionState : (() => null);
    const getResolvedPrimaryActionText = typeof ctx.getResolvedPrimaryActionText === 'function' ? ctx.getResolvedPrimaryActionText : (() => '');
    const splitPrimaryActionText = typeof ctx.splitPrimaryActionText === 'function' ? ctx.splitPrimaryActionText : (() => ({stacked:false, main:'', gainText:''}));
    const bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : (() => '');
    const labelAge = typeof ctx.labelAge === 'function' ? ctx.labelAge : ((v) => String(v || ''));
    const formatPrice = typeof ctx.formatPrice === 'function' ? ctx.formatPrice : ((v) => String(v || ''));
    const getPrimaryBookingViewConfig = typeof ctx.getPrimaryBookingViewConfig === 'function' ? ctx.getPrimaryBookingViewConfig : (() => ({cardId:''}));
    const isCompactCurrentMode = typeof ctx.isCompactCurrentMode === 'function' ? ctx.isCompactCurrentMode : (() => false);

    function startTimer(){
      const state = getState();
      const prevTimerId = getTimerId();
      prevTimerId && clearInterval(prevTimerId);

      const updateTimers = () => {
        const liveState = getState();
        if(!liveState.expiresAt) return;

        const diff = liveState.expiresAt - Date.now();
        const offerTimer = document.getElementById('offerTimer');
        const summaryTimer = document.getElementById('summaryTimer');
        const bookingTimers = document.querySelectorAll('.booking-timer-line[data-live-timer="true"]');

        if(diff <= 0){
          const activeTimerId = getTimerId();
          activeTimerId && clearInterval(activeTimerId);
          resetOfferState({preserveShift:true});
          persist();
          offerTimer && (offerTimer.textContent = '');
          summaryTimer && (summaryTimer.textContent = '');
          bookingTimers.forEach((node) => {
            const timerValueNode = node.querySelector('.booking-timer-value');
            if(timerValueNode){
              timerValueNode.textContent = '';
            } else {
              node.textContent = '';
            }
          });
          renderBookingPanels();
          return;
        }

        const fullText = formatRemaining(diff);
        const compactText = normalizeCompactTimerText(formatRemainingCompact(diff));

        offerTimer && (offerTimer.textContent = fullText);
        summaryTimer && (summaryTimer.textContent = compactText);
        bookingTimers.forEach((node) => {
          const timerValueNode = node.querySelector('.booking-timer-value');
          if(timerValueNode){
            timerValueNode.textContent = stripRemainingPrefix(compactText);
          } else {
            node.textContent = compactText;
          }
        });
      };

      updateTimers();
      setTimerId(setInterval(updateTimers, 1000));
    }

    function isSummaryBelowHero(){
      const hero = document.querySelector('#desktopView .hero-shell');
      const rect = (hero && hero.getBoundingClientRect && hero.getBoundingClientRect()) || null;
      return !rect || rect.bottom <= 8;
    }

    function isBookingPrimaryCtaVisibleInViewport(){
      const cardSelector = `#${getPrimaryBookingViewConfig().cardId}`;
      const card = document.querySelector(cardSelector);
      if(!card || card.classList.contains('hidden')) return false;
      const ctaButtons = Array.from(card.querySelectorAll('[data-action="primary-cta"]'));
      if(!ctaButtons.length) return false;

      return ctaButtons.some((button) => {
        if(!button || button.disabled) return false;
        const style = window.getComputedStyle(button);
        if(style.display === 'none' || style.visibility === 'hidden') return false;
        if(Number(style.opacity || 1) === 0) return false;
        if(Number(style.height || 0) === 0 || Number(style.width || 0) === 0) return false;
        const rect = button.getBoundingClientRect();
        if(rect.width < 2 || rect.height < 2) return false;
        return !(rect.bottom <= -16 || rect.top >= window.innerHeight + 16);
      });
    }

    function updateSummaryBarVisibility(){
      const state = getState();
      const bar = document.getElementById('summaryBar');
      if(!bar) return;
      const action = getPrimaryActionState();
      const shouldHide = (
        state.bookingCompleted
        || !state.shiftId
        || isCompactCurrentMode()
        || Date.now() < getDismissUntilTs()
        || !action
        || action.disabled
      );

      if(shouldHide){
        bar.classList.remove('is-visible');
        bar.classList.add('hidden');
        document.body.classList.remove('summary-visible');
        return;
      }

      const shouldShow = isSummaryBelowHero() && !isBookingPrimaryCtaVisibleInViewport();
      bar.classList.remove('hidden');
      bar.classList.toggle('is-visible', shouldShow);
      document.body.classList.toggle('summary-visible', shouldShow);
    }

    function dismissSummaryBarTemporarily(ms = 30000){
      const timeoutMs = Math.max(1000, Number(ms) || 30000);
      setDismissUntilTs(Date.now() + timeoutMs);
      const prevDismissTimer = getDismissTimerId();
      prevDismissTimer && clearTimeout(prevDismissTimer);
      const nextTimer = setTimeout(() => {
        setDismissUntilTs(0);
        setDismissTimerId(null);
        updateSummaryBarVisibility();
      }, timeoutMs);
      setDismissTimerId(nextTimer);
      updateSummaryBarVisibility();
    }

    function renderSummary(){
      const state = getState();
      const shifts = getShifts();
      syncGuidedState();
      if(state.expiresAt && Date.now() >= state.expiresAt){
        resetOfferState({preserveShift:true});
        persist();
      }
      const bar = document.getElementById('summaryBar');
      bar && bar.classList.remove('summary-bar--stage4');

      if(!state.shiftId){
        updateSummaryBarVisibility();
        renderBookingPanels();
        return;
      }

      const shift = shifts.find((entry) => entry.id === state.shiftId);
      const price = state.offerPrice || state.basePrice || (shift && shift.price);
      const summaryStage = getBookingStage();
      const isStageFourSummary = summaryStage === 4 && !state.bookingCompleted;
      bar.classList.toggle('summary-bar--stage4', isStageFourSummary);

      document.getElementById('summaryMain').textContent = isStageFourSummary ? '' : `${labelAge(state.age)}`;
      document.getElementById('summaryMeta').textContent = isStageFourSummary
        ? ''
        : `${shift.dates}${state.code ? ` · Код ${state.code}` : ''}`;
      document.getElementById('summaryPrice').textContent = formatPrice(price);
      const summaryCtaBtn = bar.querySelector('[data-action="primary-cta"]');
      if(summaryCtaBtn){
        const action = getPrimaryActionState();
        const actionText = getResolvedPrimaryActionText(action, shift);
        const splitResult = isStageFourSummary
          ? splitPrimaryActionText(actionText)
          : {stacked:false, main: actionText, gainText:''};
        if(splitResult.stacked){
          summaryCtaBtn.innerHTML = `
            <span class="cta-main-line cta-main-line--primary">${splitResult.main}</span>
            <span class="cta-main-line cta-main-line--accent">${bookingText('bookingFinalizeBenefitLine')} ${splitResult.gainText}</span>
          `;
          summaryCtaBtn.setAttribute('aria-label', `${splitResult.main} · ${bookingText('bookingFinalizeBenefitLine')} ${splitResult.gainText}`);
        } else {
          summaryCtaBtn.textContent = actionText;
          summaryCtaBtn.removeAttribute('aria-label');
        }
        summaryCtaBtn.classList.toggle('is-disabled', !!action.disabled);
        summaryCtaBtn.setAttribute('aria-disabled', action.disabled ? 'true' : 'false');
        summaryCtaBtn.disabled = false;
      }

      updateSummaryBarVisibility();
      renderBookingPanels();
    }

    return Object.freeze({
      startTimer,
      updateSummaryBarVisibility,
      dismissSummaryBarTemporarily,
      renderSummary,
      isSummaryBelowHero,
      isBookingPrimaryCtaVisibleInViewport
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.summaryFlow = Object.freeze({ create: createSummaryFlow });
})();


/* src/scripts/features/team.block.js */
/* src/scripts/features/team.block.js */
(function registerTeamBlock(windowObj){
  'use strict';
  if(!windowObj || typeof windowObj.createAidacampBlock !== 'function') return;
  windowObj.AIDACAMP_BLOCKS.team = windowObj.createAidacampBlock('team');
})(window);


/* src/scripts/features/telemetry-flow.js */
(function registerTelemetryFlow(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  windowObj.AC_FEATURES.telemetryFlow = windowObj.AC_FEATURES.telemetryFlow || {};

  function create(context){
    var ctx = context || {};
    var doc = ctx.document || windowObj.document;
    var metrikaId = Number(ctx.metrikaId) || 0;
    var abEventEndpointDefault = String(ctx.abEventEndpointDefault || '').trim();
    var abVisitorKey = String(ctx.abVisitorKey || 'aidacamp_ab_visitor_id_v1');
    var abSessionKey = String(ctx.abSessionKey || 'aidacamp_ab_session_id_v1');
    var legalRepoSlug = String(ctx.legalRepoSlug || '');
    var getHeroAbVariant = (typeof ctx.getHeroAbVariant === 'function')
      ? ctx.getHeroAbVariant
      : function(){ return 'A'; };
    var getHeroAbTestId = (typeof ctx.getHeroAbTestId === 'function')
      ? ctx.getHeroAbTestId
      : function(){ return 'hero_primary_block_v1'; };
    var isAllowedAbEvent = (typeof ctx.isAllowedAbEvent === 'function')
      ? ctx.isAllowedAbEvent
      : function(){ return false; };

    var abSessionSeq = 0;

    function randomId(prefix){
      try {
        if(windowObj.crypto && typeof windowObj.crypto.randomUUID === 'function'){
          return prefix + '_' + windowObj.crypto.randomUUID();
        }
      } catch (_error){
      }
      return prefix + '_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
    }

    function getOrCreateStorageId(storage, key, prefix){
      try {
        var current = String(storage.getItem(key) || '').trim();
        if(current) return current;
        var created = randomId(prefix);
        storage.setItem(key, created);
        return created;
      } catch (_error){
        return randomId(prefix);
      }
    }

    function getAbVariantLabel(){
      var current = String(getHeroAbVariant() || '').toUpperCase();
      if(current === 'A' || current === 'B') return current;
      return 'A';
    }

    function buildAbMeta(extra){
      var variant = getAbVariantLabel();
      var testId = String(getHeroAbTestId() || 'hero_primary_block_v1');
      var payload = {
        ab_test_id: testId,
        ab_variant: variant,
        test_id: testId,
        variant: variant
      };
      if(extra && typeof extra === 'object'){
        Object.assign(payload, extra);
      }
      return payload;
    }

    function shouldSendAbEvent(eventName){
      var cfg = windowObj.AC_NOTIFY_CONFIG || {};
      if(cfg.abTrackAllEvents === true) return true;
      return isAllowedAbEvent(String(eventName || ''));
    }

    function getCurrentSearchParams(){
      try {
        return new URLSearchParams(windowObj.location.search || '');
      } catch (_error){
        return new URLSearchParams('');
      }
    }

    function sendAbEvent(eventName, params){
      if(!shouldSendAbEvent(eventName)) return;
      var cfg = windowObj.AC_NOTIFY_CONFIG || {};
      var endpoint = String(cfg.abEventEndpoint || abEventEndpointDefault).trim();
      if(!endpoint) return;
      var visitorId = getOrCreateStorageId(windowObj.localStorage, abVisitorKey, 'abv');
      var sessionId = getOrCreateStorageId(windowObj.sessionStorage, abSessionKey, 'abs');
      abSessionSeq += 1;
      var search = getCurrentSearchParams();
      var payload = {
        event: String(eventName || ''),
        payload: Object.assign(
          {},
          (params && typeof params === 'object') ? params : {},
          buildAbMeta(),
          {
            event_ts: new Date().toISOString(),
            event_seq: abSessionSeq,
            session_id: sessionId,
            visitor_id: visitorId,
            page_url: windowObj.location.href,
            page_path: windowObj.location.pathname || '/',
            referrer: doc && doc.referrer || '',
            utm_source: String(search.get('utm_source') || ''),
            utm_medium: String(search.get('utm_medium') || ''),
            utm_campaign: String(search.get('utm_campaign') || ''),
            utm_content: String(search.get('utm_content') || ''),
            utm_term: String(search.get('utm_term') || ''),
            screen: String(windowObj.innerWidth || 0) + 'x' + String(windowObj.innerHeight || 0),
            device_type: windowObj.innerWidth < 768 ? 'mobile' : 'desktop'
          }
        )
      };
      var raw = JSON.stringify(payload);
      try {
        if(windowObj.navigator && windowObj.navigator.sendBeacon){
          var body = new Blob([raw], { type:'application/json' });
          var sent = windowObj.navigator.sendBeacon(endpoint, body);
          if(sent) return;
        }
      } catch (_error){
      }
      fetch(endpoint, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:raw,
        keepalive:true
      }).catch(function(){});
    }

    function track(event, params){
      var trackedParams = Object.assign(
        {},
        (params && typeof params === 'object') ? params : {},
        buildAbMeta()
      );
      try {
        if(typeof ym !== 'undefined'){
          ym(metrikaId, 'reachGoal', event, trackedParams);
        }
      } catch (err){
        console.warn('Metrika track error:', event, err);
      }
      sendAbEvent(event, trackedParams);
    }

    function getLoaderCommitRef(){
      try {
        var marker = doc ? doc.querySelector('script[data-aida-loader-inline="1"]') : null;
        if(!marker || !marker.textContent) return '';
        var parsed = JSON.parse(marker.textContent);
        var raw = String(parsed && parsed.commit || '').trim();
        if(!raw) return '';
        if(/^[a-zA-Z0-9._/-]{1,80}$/.test(raw)){
          return raw;
        }
      } catch (_error){
      }
      return '';
    }

    function resolveLegalDocBaseUrl(){
      var host = String(windowObj.location.hostname || '').toLowerCase();
      if(host === 'localhost' || host === '127.0.0.1'){
        return 'legal.html';
      }
      var ref = getLoaderCommitRef() || 'dev';
      return 'https://cdn.jsdelivr.net/gh/' + legalRepoSlug + '@' + ref + '/legal.html';
    }

    function buildLegalDocUrl(hash){
      var base = resolveLegalDocBaseUrl();
      var safeHash = String(hash || '').trim();
      if(!safeHash) return base;
      if(safeHash.startsWith('#')) return base + safeHash;
      return base + '#' + safeHash;
    }

    function syncLegalDocLinks(scope){
      var root = scope || doc;
      if(!root || typeof root.querySelectorAll !== 'function') return;
      var links = root.querySelectorAll(
        'a[href^="legal.html"],a[href^="/legal.html"],a[href*="legal.html#"]'
      );
      links.forEach(function(link){
        var href = String(link.getAttribute('href') || '').trim();
        if(!href) return;
        if(/^https?:\/\//i.test(href) && !/legal\.html/i.test(href)) return;
        var hashIndex = href.indexOf('#');
        var hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
        link.setAttribute('href', buildLegalDocUrl(hash));
      });
    }

    return Object.freeze({
      buildAbMeta: buildAbMeta,
      sendAbEvent: sendAbEvent,
      track: track,
      getCurrentSearchParams: getCurrentSearchParams,
      buildLegalDocUrl: buildLegalDocUrl,
      syncLegalDocLinks: syncLegalDocLinks
    });
  }

  windowObj.AC_FEATURES.telemetryFlow.create = create;
})(window);


/* src/scripts/features/toggle.js */
(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.toggle = window.AC_FEATURES.toggle || {};
})();


/* src/scripts/features/ui-init-flow.js */
(function(){
  function createUiInitFlow(ctx = {}){
    const closeIconHtml = String(ctx.closeIconHtml || '');
    const getScrollMarks = typeof ctx.getScrollMarks === 'function'
      ? ctx.getScrollMarks
      : (() => ({25:false,50:false,75:false,90:false}));
    const track = typeof ctx.track === 'function' ? ctx.track : (() => {});
    const trackOnce = typeof ctx.trackOnce === 'function' ? ctx.trackOnce : (() => {});
    const updateSummaryBarVisibility = typeof ctx.updateSummaryBarVisibility === 'function'
      ? ctx.updateSummaryBarVisibility
      : (() => {});

    function normalizeCloseIconButtons(scope = document){
      const root = scope || document;
      const nodes = root.querySelectorAll(
        [
          '.version-badge-close',
          '.media-close',
          '.video-close',
          '.form-close',
          "[data-action='close-version-badge']",
          "[data-action='close-debug-controls']",
          "[data-action='close-form']",
          "[data-action='close-success']",
          "[data-action='close-section-modal']",
          "[data-action='close-video-modal']",
          "[data-action='close-calendar']"
        ].join(',')
      );

      nodes.forEach((btn) => {
        if(!btn || btn.dataset.closeIconNormalized === '1') return;
        const raw = (btn.textContent || '').trim();
        const shouldNormalize = (
          raw === '×'
          || raw === '✕'
          || btn.classList.contains('version-badge-close')
          || btn.classList.contains('media-close')
          || btn.classList.contains('video-close')
          || btn.classList.contains('form-close')
          || btn.classList.contains('offer-close-btn')
        );
        if(shouldNormalize && !btn.querySelector('img.ac-icon')){
          btn.innerHTML = closeIconHtml;
        }
        btn.dataset.closeIconNormalized = '1';
      });
    }

    function initScrollTracking(){
      window.addEventListener('scroll', () => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        if(max <= 0) return;
        const marks = getScrollMarks();
        const scrolled = (h.scrollTop / max) * 100;
        [25,50,75,90].forEach((p) => {
          if(scrolled >= p && !marks[p]){
            marks[p] = true;
            track(`scroll_${p}`);
          }
        });
        updateSummaryBarVisibility();
      }, {passive:true});
    }

    function initSummaryBarViewportSync(){
      const sync = () => {
        updateSummaryBarVisibility();
      };
      window.addEventListener('scroll', sync, {passive:true});
      window.addEventListener('orientationchange', sync, {passive:true});
      document.addEventListener('visibilitychange', () => {
        if(document.hidden) return;
        sync();
      });
    }

    function initSectionViewTracking(){
      const targets = [
        {id:'section-stay', event:'stay_view'},
        {id:'section-reviews', event:'eviews_view'},
        {id:'section-team', event:'team_view'}
      ];

      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if(!entry.isIntersecting) return;
          const found = targets.find((item) => item.id === entry.target.id);
          if(found) trackOnce(found.event);
        });
      }, {threshold:0.35});

      targets.forEach((target) => {
        const el = document.getElementById(target.id);
        if(el) io.observe(el);
      });
    }

    return Object.freeze({
      normalizeCloseIconButtons,
      initScrollTracking,
      initSummaryBarViewportSync,
      initSectionViewTracking
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.uiInitFlow = Object.freeze({ create: createUiInitFlow });
})();


/* src/scripts/features/variant-flow.js */
(function(){
  function createVariantFlow(ctx = {}){
    const state = ctx.state || {};
    const getBookingStage = typeof ctx.getBookingStage === 'function' ? ctx.getBookingStage : (() => 0);
    const hasSelectedAge = typeof ctx.hasSelectedAge === 'function' ? ctx.hasSelectedAge : (() => false);
    const resolveHeroVariantFromUtm = typeof ctx.resolveHeroVariantFromUtm === 'function' ? ctx.resolveHeroVariantFromUtm : (() => ({}));
    const getVariantFlowView = typeof ctx.getVariantFlowView === 'function' ? ctx.getVariantFlowView : (() => 'desktop');
    const getPrimaryBookingViewConfig = typeof ctx.getPrimaryBookingViewConfig === 'function' ? ctx.getPrimaryBookingViewConfig : (() => ({}));
    const setHeroMenuOpen = typeof ctx.setHeroMenuOpen === 'function' ? ctx.setHeroMenuOpen : (() => {});
    const getHeroVariantState = typeof ctx.getHeroVariantState === 'function' ? ctx.getHeroVariantState : (() => null);
    const getDefaultTier = typeof ctx.getDefaultTier === 'function' ? ctx.getDefaultTier : (() => 'tier1');
    const getFingerTimer = typeof ctx.getFingerTimer === 'function' ? ctx.getFingerTimer : (() => null);
    const setFingerTimer = typeof ctx.setFingerTimer === 'function' ? ctx.setFingerTimer : (() => {});
    const getRunId = typeof ctx.getRunId === 'function' ? ctx.getRunId : (() => 0);
    const setRunId = typeof ctx.setRunId === 'function' ? ctx.setRunId : (() => {});
    const getCompletedKey = typeof ctx.getCompletedKey === 'function' ? ctx.getCompletedKey : (() => '');
    const setCompletedKey = typeof ctx.setCompletedKey === 'function' ? ctx.setCompletedKey : (() => {});

    function clearVariantFlowFingerTimer(){
      const timer = getFingerTimer();
      if(!timer) return;
      window.clearTimeout(timer);
      setFingerTimer(null);
    }

    function waitVariantFlow(ms, runId){
      return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
          setFingerTimer(null);
          resolve(runId === getRunId());
        }, ms);
        setFingerTimer(timer);
      });
    }

    function ensureVariantFlowFinger(){
      let node = document.getElementById('variantFlowFinger');
      if(!node){
        node = document.createElement('div');
        node.id = 'variantFlowFinger';
        node.className = 'variant-flow-finger';
        node.setAttribute('aria-hidden', 'true');
        document.body.appendChild(node);
      }
      if(!node.querySelector('.variant-flow-finger-glyph')){
        node.innerHTML = `
          <span class="variant-flow-finger-glyph" aria-hidden="true"></span>
          <span class="variant-flow-finger-ripple" aria-hidden="true"></span>
          <span class="variant-flow-finger-ripple delay" aria-hidden="true"></span>
        `;
      }
      return node;
    }

    function hideVariantFlowFinger(){
      const node = document.getElementById('variantFlowFinger');
      if(node){
        node.classList.remove('visible', 'is-tapping');
      }
      document.querySelectorAll('.variant-flow-target').forEach((el) => {
        el.classList.remove('variant-flow-target');
      });
    }

    function stopVariantFlowScenario(){
      setRunId(getRunId() + 1);
      clearVariantFlowFingerTimer();
      hideVariantFlowFinger();
    }

    function placeVariantFlowFinger(finger, targetEl){
      if(!finger || !targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      const x = rect.left + (rect.width * 0.5);
      const y = rect.top + (rect.height * 0.5);
      finger.style.setProperty('--variant-flow-x', `${Math.round(x)}px`);
      finger.style.setProperty('--variant-flow-y', `${Math.round(y)}px`);
      finger.classList.add('visible');
    }

    async function runVariantFlowForTargets(targets, runId){
      const finger = ensureVariantFlowFinger();
      if(!finger || !targets.length) return;
      for(const target of targets){
        if(runId !== getRunId()) return;
        if(!target || !target.isConnected) continue;
        document.querySelectorAll('.variant-flow-target').forEach((el) => el.classList.remove('variant-flow-target'));
        target.classList.add('variant-flow-target');
        placeVariantFlowFinger(finger, target);
        const warmupOk = await waitVariantFlow(260, runId);
        if(!warmupOk) return;
        for(let tap = 0; tap < 3; tap += 1){
          if(runId !== getRunId()) return;
          finger.classList.remove('is-tapping');
          void finger.offsetWidth;
          finger.classList.add('is-tapping');
          const tapOk = await waitVariantFlow(360, runId);
          if(!tapOk) return;
          if(tap < 2){
            const pauseOk = await waitVariantFlow(220, runId);
            if(!pauseOk) return;
          }
        }
        const settleOk = await waitVariantFlow(360, runId);
        if(!settleOk) return;
      }
    }

    function getVariantFlowKey(){
      const variant = getHeroVariantState() || resolveHeroVariantFromUtm();
      const tier = variant.tier || getDefaultTier();
      const mode = (tier === 'tier2' || tier === 'tier4') ? 'menu' : 'info';
      const view = getVariantFlowView();
      return `${tier}:${mode}:${view}`;
    }

    async function runVariantFlowScenario(){
      if(!hasSelectedAge() || !!state.shiftId || getBookingStage() !== 2 || state.bookingCompleted){
        hideVariantFlowFinger();
        return;
      }
      const variant = getHeroVariantState() || resolveHeroVariantFromUtm();
      const tier = variant.tier || getDefaultTier();
      const mode = (tier === 'tier2' || tier === 'tier4') ? 'menu' : 'info';
      const runId = getRunId() + 1;
      setRunId(runId);
      const flowKey = getVariantFlowKey();
      if(getCompletedKey() === flowKey){
        return;
      }
      hideVariantFlowFinger();
      const preWaitOk = await waitVariantFlow(320, runId);
      if(!preWaitOk || runId !== getRunId()) return;

      if(mode === 'info'){
        const cfg = getPrimaryBookingViewConfig();
        const host = document.getElementById(cfg.shiftOptionsId || '');
        const infoButtons = host ? [...host.querySelectorAll('[data-action="toggle-shift-about"]')].slice(0, 2) : [];
        await runVariantFlowForTargets(infoButtons, runId);
      } else if(getVariantFlowView() === 'mobile'){
        setHeroMenuOpen(true);
        const openOk = await waitVariantFlow(280, runId);
        if(!openOk || runId !== getRunId()) return;
        const shiftsMenuBtn = document.querySelector('#serviceMenu [data-nav="section-programs"]');
        await runVariantFlowForTargets(shiftsMenuBtn ? [shiftsMenuBtn] : [], runId);
        if(runId === getRunId()){
          setHeroMenuOpen(false);
        }
      } else {
        const cfg = getPrimaryBookingViewConfig();
        const card = document.getElementById(cfg.cardId || '');
        const allShiftsBtn = card?.querySelector('.booking-all-shifts-link');
        await runVariantFlowForTargets(allShiftsBtn ? [allShiftsBtn] : [], runId);
      }

      if(runId === getRunId()){
        hideVariantFlowFinger();
        setCompletedKey(flowKey);
      }
    }

    function scheduleVariantFlowScenario(){
      if(!hasSelectedAge() || !!state.shiftId || getBookingStage() !== 2 || state.bookingCompleted){
        stopVariantFlowScenario();
        return;
      }
      runVariantFlowScenario().catch(() => {
        stopVariantFlowScenario();
      });
    }

    return Object.freeze({
      clearVariantFlowFingerTimer,
      waitVariantFlow,
      ensureVariantFlowFinger,
      hideVariantFlowFinger,
      stopVariantFlowScenario,
      placeVariantFlowFinger,
      runVariantFlowForTargets,
      getVariantFlowKey,
      runVariantFlowScenario,
      scheduleVariantFlowScenario
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.variantFlow = Object.freeze({ create: createVariantFlow });
})();


/* src/scripts/features/video-meta-flow.js */
(function(){
  function createVideoMetaFlow(ctx = {}){
    const mediaText = typeof ctx.mediaText === 'function' ? ctx.mediaText : (() => 'Источник');
    const mediaContent = (ctx.mediaContent && typeof ctx.mediaContent === 'object') ? ctx.mediaContent : { videos: [] };
    const cacheKey = String(ctx.videoMetaCacheKey || 'aidacamp_video_meta_cache_v1');
    const cacheTtlMs = Number(ctx.videoMetaCacheTtlMs || 1000 * 60 * 60 * 4);
    const refreshIntervalMs = Number(ctx.videoMetaRefreshIntervalMs || 1000 * 60 * 60 * 4);
    const renderMediaSections = typeof ctx.renderMediaSections === 'function' ? ctx.renderMediaSections : (() => {});
    const getTimer = typeof ctx.getVideoMetaRefreshTimer === 'function' ? ctx.getVideoMetaRefreshTimer : (() => null);
    const setTimer = typeof ctx.setVideoMetaRefreshTimer === 'function' ? ctx.setVideoMetaRefreshTimer : (() => {});

    function isVerticalVideoUrl(url){
      const value = String(url || '').toLowerCase();
      return (
        value.includes('/shorts/') ||
        value.includes('shortvideo') ||
        value.includes('/reel') ||
        value.includes('vertical') ||
        value.includes('story')
      );
    }

    function normalizeKinescopeShareUrl(url){
      const raw = String(url || '').trim();
      if(!raw) return '';
      try{
        const u = new URL(raw, window.location.origin);
        const host = (u.hostname || '').replace(/^www\./, '');
        if(!host.includes('kinescope.io')) return '';
        const parts = u.pathname.split('/').filter(Boolean);
        if(!parts.length) return '';
        const id = parts[0] === 'embed' ? parts[1] : parts[0];
        return id ? `https://kinescope.io/${id}` : '';
      }catch(e){
        return '';
      }
    }

    function resolveVideoSource(url){
      const externalUrl = String(url || '').trim();
      const fallback = {
        canEmbed: false,
        embedUrl: '',
        externalUrl,
        orientation: isVerticalVideoUrl(externalUrl) ? 'vertical' : 'horizontal',
        sourceName: mediaText('genericSourceName')
      };
      if(!externalUrl) return fallback;
      try {
        const u = new URL(externalUrl, window.location.origin);
        const host = (u.hostname || '').replace(/^www\./, '');
        const parts = u.pathname.split('/').filter(Boolean);
        if(host.includes('rutube.ru')) fallback.sourceName = 'Rutube';
        if(host.includes('youtube.com') || host === 'youtu.be') fallback.sourceName = 'YouTube';
        if(host.includes('vkvideo.ru') || host === 'vk.com' || host.endsWith('.vk.com')){
          fallback.sourceName = mediaText('vkVideoSourceName');
        }
        if(host.includes('kinescope.io')) fallback.sourceName = 'Kinescope';

        if(host.includes('kinescope.io') && parts[0] === 'embed' && parts[1]){
          return {
            canEmbed: true,
            embedUrl: externalUrl,
            externalUrl,
            orientation: 'vertical',
            sourceName: 'Kinescope'
          };
        }

        if(host.includes('rutube.ru')){
          if(parts[0] === 'play' && parts[1] === 'embed' && parts[2]){
            return {
              canEmbed: true,
              embedUrl: `https://rutube.ru/play/embed/${parts[2]}`,
              externalUrl,
              orientation: fallback.orientation,
              sourceName: 'Rutube'
            };
          }
          if(parts[0] === 'shorts' && parts[1]){
            return {
              canEmbed: true,
              embedUrl: `https://rutube.ru/play/embed/${parts[1]}`,
              externalUrl,
              orientation: 'vertical',
              sourceName: 'Rutube'
            };
          }
          if(parts[0] === 'video' && parts[1]){
            return {
              canEmbed: true,
              embedUrl: `https://rutube.ru/play/embed/${parts[1]}`,
              externalUrl,
              orientation: 'horizontal',
              sourceName: 'Rutube'
            };
          }
        }

        if(host === 'youtu.be' && parts[0]){
          return {
            canEmbed: true,
            embedUrl: `https://www.youtube.com/embed/${parts[0]}`,
            externalUrl,
            orientation: fallback.orientation,
            sourceName: 'YouTube'
          };
        }

        if(host.includes('youtube.com')){
          if(parts[0] === 'watch' && u.searchParams.get('v')){
            return {
              canEmbed: true,
              embedUrl: `https://www.youtube.com/embed/${u.searchParams.get('v')}`,
              externalUrl,
              orientation: 'horizontal',
              sourceName: 'YouTube'
            };
          }
          if(parts[0] === 'shorts' && parts[1]){
            return {
              canEmbed: true,
              embedUrl: `https://www.youtube.com/embed/${parts[1]}`,
              externalUrl,
              orientation: 'vertical',
              sourceName: 'YouTube'
            };
          }
          if(parts[0] === 'embed' && parts[1]){
            return {
              canEmbed: true,
              embedUrl: externalUrl,
              externalUrl,
              orientation: fallback.orientation,
              sourceName: 'YouTube'
            };
          }
        }

        if(parts[0] === 'embed'){
          return {
            canEmbed: true,
            embedUrl: externalUrl,
            externalUrl,
            orientation: fallback.orientation,
            sourceName: fallback.sourceName
          };
        }
      } catch(e){
      }
      return fallback;
    }

    function applyVideoMetaMap(videoMetaMap = {}){
      let changed = false;
      mediaContent.videos = mediaContent.videos.map((item) => {
        const meta = videoMetaMap[item.url];
        if(!meta) return item;
        const nextTitle = String(meta.title || '').trim() || item.title;
        const nextCover = String(meta.cover || '').trim() || item.cover;
        if(nextTitle === item.title && nextCover === item.cover) return item;
        changed = true;
        return {
          ...item,
          title: nextTitle,
          cover: nextCover
        };
      });
      return changed;
    }

    function loadVideoMetaCache(){
      try{
        const raw = localStorage.getItem(cacheKey);
        if(!raw) return;
        const cached = JSON.parse(raw);
        const map = cached && typeof cached === 'object' ? cached.map : null;
        if(!map || typeof map !== 'object') return;
        applyVideoMetaMap(map);
      }catch(e){
      }
    }

    function getVideoMetaCacheAgeMs(){
      try{
        const raw = localStorage.getItem(cacheKey);
        if(!raw) return Number.POSITIVE_INFINITY;
        const cached = JSON.parse(raw);
        const ts = Number(cached?.ts || 0);
        if(!ts) return Number.POSITIVE_INFINITY;
        return Date.now() - ts;
      }catch(e){
        return Number.POSITIVE_INFINITY;
      }
    }

    function saveVideoMetaCache(videoMetaMap){
      try{
        let existingMap = {};
        const raw = localStorage.getItem(cacheKey);
        if(raw){
          const cached = JSON.parse(raw);
          if(cached && typeof cached.map === 'object' && cached.map){
            existingMap = cached.map;
          }
        }

        localStorage.setItem(cacheKey, JSON.stringify({
          ts: Date.now(),
          map: {...existingMap, ...videoMetaMap}
        }));
      }catch(e){
      }
    }

    async function fetchKinescopeMeta(videoUrl){
      const shareUrl = normalizeKinescopeShareUrl(videoUrl);
      if(!shareUrl) return null;
      const endpoint = `https://kinescope.io/oembed?url=${encodeURIComponent(shareUrl)}&format=json`;
      const response = await fetch(endpoint, {method:'GET', credentials:'omit'});
      if(!response.ok) return null;
      const data = await response.json();
      const title = String(data?.title || '').trim();
      const cover = String(data?.thumbnail_url || '').trim();
      return (title || cover) ? {title, cover} : null;
    }

    async function refreshVideoMeta({force = false} = {}){
      const age = getVideoMetaCacheAgeMs();
      if(!force && age <= cacheTtlMs) return;

      const updates = {};
      const tasks = mediaContent.videos.map(async (item) => {
        try{
          const meta = await fetchKinescopeMeta(item.url);
          if(meta) updates[item.url] = meta;
        }catch(e){
        }
      });

      await Promise.all(tasks);
      if(!Object.keys(updates).length) return;

      const changed = applyVideoMetaMap(updates);
      saveVideoMetaCache(updates);
      if(changed){
        renderMediaSections();
      }
    }

    function scheduleVideoMetaRefresh(){
      const timer = getTimer();
      if(timer) clearInterval(timer);
      setTimer(setInterval(() => {
        refreshVideoMeta();
      }, refreshIntervalMs));
    }

    return Object.freeze({
      resolveVideoSource,
      isVerticalVideoUrl,
      normalizeKinescopeShareUrl,
      applyVideoMetaMap,
      loadVideoMetaCache,
      getVideoMetaCacheAgeMs,
      saveVideoMetaCache,
      fetchKinescopeMeta,
      refreshVideoMeta,
      scheduleVideoMetaRefresh
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.videoMetaFlow = Object.freeze({ create: createVideoMetaFlow });
})();


/* src/scripts/features/view-mode-flow.js */
(function(){
  function createViewModeFlow(ctx = {}){
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const useDesktopBaseForMobile = !!ctx.useDesktopBaseForMobile;
    const normalizeMode = typeof ctx.normalizeMode === 'function' ? ctx.normalizeMode : ((value, allowed, fallback) => {
      const list = Array.isArray(allowed) ? allowed : [];
      return list.includes(value) ? value : fallback;
    });
    const heroContrastModes = Array.isArray(ctx.heroContrastModes) ? ctx.heroContrastModes : [];
    const heroMicroModes = Array.isArray(ctx.heroMicroModes) ? ctx.heroMicroModes : [];
    const offerModalThemes = Array.isArray(ctx.offerModalThemes) ? ctx.offerModalThemes : [];
    const offerLayoutModes = Array.isArray(ctx.offerLayoutModes) ? ctx.offerLayoutModes : [];
    const setHeroMenuOpen = typeof ctx.setHeroMenuOpen === 'function' ? ctx.setHeroMenuOpen : (() => {});
    const closeSectionModal = typeof ctx.closeSectionModal === 'function' ? ctx.closeSectionModal : (() => {});
    const applyHeroAbVariant = typeof ctx.applyHeroAbVariant === 'function' ? ctx.applyHeroAbVariant : (() => {});
    const applyMobileTemplatesToDesktopSections = typeof ctx.applyMobileTemplatesToDesktopSections === 'function' ? ctx.applyMobileTemplatesToDesktopSections : (() => {});
    const renderMediaSections = typeof ctx.renderMediaSections === 'function' ? ctx.renderMediaSections : (() => {});
    const renderDesktopMobileDocsBlock = typeof ctx.renderDesktopMobileDocsBlock === 'function' ? ctx.renderDesktopMobileDocsBlock : (() => {});
    const updateSummaryBarVisibility = typeof ctx.updateSummaryBarVisibility === 'function' ? ctx.updateSummaryBarVisibility : (() => {});
    const persist = typeof ctx.persist === 'function' ? ctx.persist : (() => {});
    const applyOfferLayoutMode = typeof ctx.applyOfferLayoutMode === 'function' ? ctx.applyOfferLayoutMode : (() => {});
    const showOffer = typeof ctx.showOffer === 'function' ? ctx.showOffer : (() => {});
    const applyMobileSectionAccordion = typeof ctx.applyMobileSectionAccordion === 'function' ? ctx.applyMobileSectionAccordion : (() => {});

    function getViewportPreviewView(){
      if(window.AC_VIEW_MODE && typeof window.AC_VIEW_MODE.getViewportView === 'function'){
        return window.AC_VIEW_MODE.getViewportView();
      }
      return window.matchMedia('(max-width: 900px)').matches ? 'mobile' : 'desktop';
    }

    function applyDesktopMode(){
      const state = getState();
      const desktopView = document.getElementById('desktopView');
      const fullBtn = document.getElementById('fullModeBtn');
      const compactBtn = document.getElementById('compactModeBtn');
      if(!desktopView || !fullBtn || !compactBtn) return;

      desktopView.classList.toggle('compact-mode', state.desktopMode === 'compact');
      fullBtn.classList.toggle('active', state.desktopMode === 'full');
      compactBtn.classList.toggle('active', state.desktopMode === 'full');
      compactBtn.setAttribute('aria-pressed', state.desktopMode === 'full' ? 'true' : 'false');
    }

    function applyMobileMode(){
      const state = getState();
      if(useDesktopBaseForMobile){
        return;
      }
      const mobileView = document.getElementById('mobileView');
      const fullBtn = document.getElementById('mobileFullModeBtn');
      const compactBtn = document.getElementById('mobileCompactModeBtn');
      const modeToggle = document.getElementById('mobileModeToggle');
      const modeToggleLabel = modeToggle?.querySelector('.mobile-mode-toggle-label');
      if(!mobileView) return;

      mobileView.classList.toggle('mobile-compact-mode', state.mobileMode === 'compact');
      if(fullBtn) fullBtn.classList.toggle('active', state.mobileMode === 'full');
      if(compactBtn) compactBtn.classList.toggle('active', state.mobileMode === 'compact');
      if(modeToggle){
        const isFull = state.mobileMode === 'full';
        modeToggle.setAttribute('aria-checked', isFull ? 'true' : 'false');
        modeToggle.classList.toggle('is-compact', !isFull);
        if(modeToggleLabel){
          modeToggleLabel.textContent = isFull ? 'Подробный' : 'Кратко';
        }
      }
      applyMobileSectionAccordion();
    }

    function switchDesktopMode(mode){
      const state = getState();
      Object.assign(state, { desktopMode: mode });
      applyDesktopMode();
      if(mode !== 'compact'){
        closeSectionModal();
      }
      updateSummaryBarVisibility();
      persist();
    }

    function switchMobileMode(mode){
      const state = getState();
      Object.assign(state, { mobileMode: mode });
      applyMobileMode();
      updateSummaryBarVisibility();
      persist();
    }

    function switchView(view){
      const state = getState();
      const requestedView = view === 'mobile' ? 'mobile' : 'desktop';
      const effectiveView = (requestedView === 'mobile' && useDesktopBaseForMobile) ? 'desktop' : requestedView;
      setHeroMenuOpen(false);
      if(requestedView === 'mobile'){
        Object.assign(state, { mobileDocsExpanded: false });
      }
      Object.assign(state, {
        previewView: requestedView,
        view: effectiveView
      });
      const desktopView = document.getElementById('desktopView');
      const mobileView = document.getElementById('mobileView');
      if(desktopView){
        desktopView.classList.toggle('hidden', effectiveView !== 'desktop');
        desktopView.classList.toggle('mobile-preview-active', requestedView === 'mobile' && useDesktopBaseForMobile);
      }
      document.body.classList.toggle('mobile-preview-active', requestedView === 'mobile' && useDesktopBaseForMobile);
      if(mobileView){
        const showLegacyMobile = requestedView === 'mobile' && !useDesktopBaseForMobile;
        mobileView.classList.toggle('hidden', !showLegacyMobile);
      }
      applyHeroAbVariant();
      const desktopModeWrap = document.getElementById('desktopModeWrap');
      if(desktopModeWrap){
        desktopModeWrap.classList.toggle('hidden', effectiveView !== 'desktop');
      }
      if(effectiveView !== 'desktop'){
        closeSectionModal();
      }
      if(requestedView === 'mobile' && !useDesktopBaseForMobile){
        applyMobileMode();
      }
      if(effectiveView === 'desktop'){
        applyDesktopMode();
      }
      applyMobileTemplatesToDesktopSections();
      renderMediaSections();
      renderDesktopMobileDocsBlock();
      updateSummaryBarVisibility();
      persist();
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }

    function applyHeroContrastMode(){
      const state = getState();
      const desktopView = document.getElementById('desktopView');
      const beforeBtn = document.getElementById('heroContrastBeforeBtn');
      const afterBtn = document.getElementById('heroContrastAfterBtn');
      const afterSoftBtn = document.getElementById('heroContrastAfterSoftBtn');
      if(!desktopView) return;
      const mode = normalizeMode(state.heroContrastMode, heroContrastModes, 'after-soft');
      desktopView.classList.toggle('hero-contrast-before', mode === 'before');
      desktopView.classList.toggle('hero-contrast-after', mode === 'after');
      desktopView.classList.toggle('hero-contrast-after-soft', mode === 'after-soft');
      if(beforeBtn) beforeBtn.classList.toggle('active', mode === 'before');
      if(afterBtn) afterBtn.classList.toggle('active', mode === 'after');
      if(afterSoftBtn) afterSoftBtn.classList.toggle('active', mode === 'after-soft');
    }

    function switchHeroContrastMode(mode){
      const state = getState();
      Object.assign(state, { heroContrastMode: normalizeMode(mode, heroContrastModes, 'after-soft') });
      applyHeroContrastMode();
      persist();
    }

    function applyHeroMicroMode(){
      const state = getState();
      const desktopView = document.getElementById('desktopView');
      const offBtn = document.getElementById('heroMicroOffBtn');
      const onBtn = document.getElementById('heroMicroOnBtn');
      const demoBtn = document.getElementById('heroMicroDemoBtn');
      if(!desktopView) return;
      const mode = normalizeMode(state.heroMicroMode, heroMicroModes, 'off');
      desktopView.classList.toggle('hero-micro-on', mode === 'on');
      desktopView.classList.toggle('hero-micro-demo', mode === 'demo');
      desktopView.classList.toggle('hero-micro-off', mode === 'off');
      if(offBtn) offBtn.classList.toggle('active', mode === 'off');
      if(onBtn) onBtn.classList.toggle('active', mode === 'on');
      if(demoBtn) demoBtn.classList.toggle('active', mode === 'demo');
    }

    function switchHeroMicroMode(mode){
      const state = getState();
      Object.assign(state, { heroMicroMode: normalizeMode(mode, heroMicroModes, 'off') });
      applyHeroMicroMode();
      persist();
    }

    function applyOfferModalTheme(cardEl = null){
      const state = getState();
      const mode = normalizeMode(state.offerModalTheme, offerModalThemes, 'light');
      const lightBtn = document.getElementById('offerThemeLightBtn');
      const darkBtn = document.getElementById('offerThemeDarkBtn');
      if(lightBtn) lightBtn.classList.toggle('active', mode === 'light');
      if(darkBtn) darkBtn.classList.toggle('active', mode === 'dark');
      const card = cardEl || document.getElementById('offerCard');
      if(card) card.classList.toggle('dark', mode === 'dark');
    }

    function switchOfferModalTheme(mode){
      const state = getState();
      Object.assign(state, { offerModalTheme: normalizeMode(mode, offerModalThemes, 'light') });
      applyOfferModalTheme();
      persist();
    }

    function switchOfferLayout(mode){
      const state = getState();
      const normalizedMode = normalizeMode(mode, offerLayoutModes, 'current');
      Object.assign(state, { offerLayout: normalizedMode });
      applyOfferLayoutMode();
      persist();
      const overlay = document.getElementById('offerOverlay');
      if(overlay && !overlay.classList.contains('hidden') && !state.offerSearching && state.offerStage > 0){
        showOffer();
      }
    }

    return Object.freeze({
      getViewportPreviewView,
      switchView,
      applyDesktopMode,
      switchDesktopMode,
      applyMobileMode,
      switchMobileMode,
      applyHeroContrastMode,
      switchHeroContrastMode,
      applyHeroMicroMode,
      switchHeroMicroMode,
      applyOfferModalTheme,
      switchOfferModalTheme,
      switchOfferLayout
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.viewModeFlow = Object.freeze({ create: createViewModeFlow });
})();


/* src/scripts/main.js */
/* src/scripts/main.js */
    // SECTION 1: Config and runtime constants.
    const OFFER_DISCOUNT_FACTOR = 0.95;

    const shifts = [
      {
        id:'shift-1',
        title:'1',
        label:'Смена 1',
        dates:'30 мая — 8 июня',
        start:'2025-05-30',
        end:'2025-06-08',
        price:74900,
        left:12,
        occupied:33,
        badge:'HIT',
        isShort:false,
        desc:'Стартовая смена с мягким входом в программирование и знакомством с ИИ.',
        fullDesc:[
          'Мягкий вход в программирование через понятные и быстрые результаты.',
          'Для 7–9 лет: ребёнок работает в Scratch и Minecraft, делает первые проекты и понимает базовую логику через игру.',
          'Для 10–12 лет: начинает писать код на Python, создаёт простые программы и видит, как работает логика внутри.',
          'Для 13–14 лет: пробует первые проекты с элементами AI, знакомится с нейросетями и делает первые осмысленные шаги в сторону современных технологий.',
          'Главное — ребёнок не слушает, а делает и получает результат уже в первые дни.'
        ].join(' ')
      },
      {
        id:'shift-2',
        title:'2',
        label:'Смена 2',
        dates:'10 июня — 23 июня',
        start:'2025-06-10',
        end:'2025-06-23',
        price:95000,
        left:8,
        occupied:37,
        badge:'',
        isShort:false,
        desc:'Полная смена на 13 дней: проекты, логика и первые шаги в нейросетях.',
        fullDesc:[
          'Смена, где ребёнок начинает реально понимать, как всё устроено.',
          'Для 7–9 лет: усложняются проекты, появляется больше самостоятельности, ребёнок начинает осознанно собирать логику.',
          'Для 10–12 лет: работает с Python, делает игры и ботов, начинает понимать структуру кода и алгоритмы.',
          'Для 13–14 лет: разбирается с более сложными задачами, пробует нейросети и делает проекты с логикой «как в реальных IT-продуктах».',
          'Результат — не просто интерес, а ощущение «я могу и понимаю».'
        ].join(' ')
      },
      {
        id:'shift-2-1',
        title:'2.1',
        label:'Смена 2.1',
        dates:'10 июня — 16 июня',
        start:'2025-06-10',
        end:'2025-06-16',
        price:48000,
        left:8,
        occupied:37,
        badge:'',
        isShort:true,
        sourceId:'shift-2',
        desc:'Короткая смена 7 дней: проекты, логика и быстрый вход в программу.',
        fullDesc:[
          'Короткая смена на 7 дней.',
          'Ускоренный формат с фокусом на практике: ребёнок делает проект, прокачивает логику и закрепляет базовые навыки программирования через понятные задачи.',
          'Для 7–9 лет — упор на Scratch и визуальную логику; для 10–12 лет — первые уверенные шаги в Python и структуре кода;',
          'для 13–14 лет — проектная сборка с элементами AI.',
          'Формат короткий, но результатный.'
        ].join(' ')
      },
      {
        id:'shift-2-2',
        title:'2.2',
        label:'Смена 2.2',
        dates:'16 июня — 23 июня',
        start:'2025-06-16',
        end:'2025-06-23',
        price:65000,
        left:8,
        occupied:37,
        badge:'',
        isShort:true,
        sourceId:'shift-2',
        desc:'Короткая смена 8 дней: интенсив по проектам, логике и закреплению навыков.',
        fullDesc:[
          'Короткая смена на 8 дней.',
          'Интенсивное продолжение проектной работы: ребёнок усиливает логику, доводит задачи до результата и закрепляет навыки программирования в прикладном формате.',
          'Для 7–9 лет — развитие проектов в Scratch; для 10–12 лет — практический Python и алгоритмы;',
          'для 13–14 лет — более сложные задачи и работа с AI-инструментами.',
          'Короткий цикл с фокусом на конкретный прогресс.'
        ].join(' ')
      },
      {
        id:'shift-4',
        title:'4',
        label:'Смена 4',
        dates:'3 августа — 15 августа',
        start:'2025-08-03',
        end:'2025-08-15',
        price:89400,
        left:5,
        occupied:40,
        badge:'',
        isShort:false,
        desc:'Летняя смена с акцентом на проекты, командную работу и уверенность.',
        fullDesc:[
          'Баланс между программированием, командной работой и лагерной жизнью.',
          'Для 7–9 лет: ребёнок продолжает делать проекты, но больше взаимодействует с другими, учится работать в команде.',
          'Для 10–12 лет: объединяет навыки кода и общения, участвует в командных задачах и учится доводить идеи до результата.',
          'Для 13–14 лет: работает над более цельными проектами, распределяет роли в команде и понимает, как создаются продукты.',
          'Смена даёт уверенность: ребёнок не просто учится, а начинает действовать.'
        ].join(' ')
      },
      {
        id:'shift-5',
        title:'5',
        label:'Смена 5',
        dates:'17 августа — 26 августа',
        start:'2025-08-17',
        end:'2025-08-26',
        price:69600,
        left:14,
        occupied:31,
        badge:'',
        isShort:false,
        desc:'Финальная смена: закрепление навыков и защита мини-проектов.',
        fullDesc:[
          'Смена, где ребёнок собирает всё, чему научился, в понятный результат.',
          'Для 7–9 лет: заканчивает проекты и начинает объяснять, как они работают.',
          'Для 10–12 лет: делает законченные программы и может показать, что именно он сделал и как.',
          'Для 13–14 лет: создаёт более сложные проекты, оформляет их и презентует как готовый продукт.',
          'Итог — ребёнок уезжает не с эмоциями, а с реальным результатом и пониманием своего прогресса.'
        ].join(' ')
      }
    ];

    const mediaContent = {
      references: {
        yandexReviewsLabel: 'Отзывы на Яндекс Картах',
        yandexReviewsUrl: 'https://yandex.ru/maps/org/aydakemp/35558479035/reviews/',
        locationMapUrl: 'https://yandex.ru/maps/-/CPR0vYMT',
        locationMapEmbedUrl: 'https://yandex.ru/map-widget/v1/?ll=36.719422%2C55.261573&z=8&pt=36.719422,55.261573,pm2rdm',
        programmingBookUrl: 'https://www.codims.ru/python-book'
      },
      faq: [
        {
          group:'Медицина',
          icon:'/assets/icons/med.svg',
          items:[
            {q:'Есть ли медик в лагере?',a:'Медработник на территории 24/7 всю смену.'},
            {q:'Что если ребёнок заболеет?',a:'Медик осматривает, при необходимости вызывает скорую. Вы получите звонок сразу.'},
            {q:'Можно давать лекарства?',a:'Передайте медику с инструкцией — будет выдавать по расписанию.'}
          ]
        },
        {
          group:'Безопасность',
          icon:'/assets/icons/lock.svg',
          items:[
            {q:'Территория закрыта?',a:'Да, огорожена, КПП с охраной. Посторонние не допускаются.'},
            {q:'Сколько детей на вожатого?',a:'Не более 8–10 детей, вожатые работают в парах.'}
          ]
        },
        {
          group:'Питание',
          icon:'/assets/icons/food.svg',
          items:[
            {q:'Сколько раз кормят?',a:'5 раз в день: завтрак, второй завтрак, обед, полдник, ужин. Всё горячее.'},
            {q:'Учитываются аллергии?',a:'Да. В лагере гипоаллергенная среда: минимум растений, которые вызывают аллергию.'}
          ]
        },
        {
          group:'Проживание',
          icon:'/assets/icons/check.svg',
          items:[
            {q:'Сколько детей в комнате?',a:'2-4 человека, оборудованные санузлы в каждой комнате.'}
          ]
        },
        {
          group:'Связь',
          icon:'/assets/icons/phone-mobile.svg',
          items:[
            {
              q:'Будет ли телефон у ребёнка?',
              a:[
                'Лагерь «без телефонов». Телефон сдаётся на хранение: звонки родителям — раз в день или по запросу в любое время.',
                'В любое время можно связаться с вожатым, вожатые и старшие смены на связи 24/7.'
              ].join(' ')
            },
            {q:'Как следить что происходит?',a:'Родительский Telegram-чат, фото каждый день.'}
          ]
        }
      ],
      team: [
        {
          teamId:'team_01',
          bindKey:'дарья_афанасьева',
          fio:'Дарья Афанасьева',
          role:'основатель и вдохновитель АйДаКемп',
          avatarUrl:'/assets/images/cdn-cache/15b41072_photo.png',
          bio:'предприниматель в сфере детского IT-образования и мама подростка, которая строит лагерь таким, каким сама хотела бы видеть обучение своего ребёнка.'
        },
        {
          teamId:'team_02',
          bindKey:'никита_брагин',
          fio:'Никита Брагин',
          role:'преподаватель Scratch, Minecraft и Python',
          avatarUrl:'/assets/images/cdn-cache/dc9ef9b6_photo.png',
          bio:'автор учебника по разработке игр; специализируется на геймдеве и помогает детям создавать собственные игровые миры.'
        },
        {
          teamId:'team_03',
          bindKey:'александр_ташкин',
          fio:'Александр Ташкин',
          role:'преподаватель Scratch, Minecraft и Python',
          avatarUrl:'/assets/images/cdn-cache/1e93e3b8_photo.png',
          bio:'соавтор учебника по разработке игр; умеет зажигать интерес к программированию через практические задачи и командные проекты.'
        },
        {
          teamId:'team_04',
          bindKey:'омар_алхамви',
          fio:'Омар Алхамви',
          role:'преподаватель Python и нейросетей',
          avatarUrl:'/assets/images/cdn-cache/67852b0a_photo.png',
          bio:'работает со старшими и продвинутыми группами, часть занятий ведёт на английском и показывает, как применять AI в реальных проектах.'
        },
        {
          teamId:'team_05',
          bindKey:'дарья_воронцова',
          fio:'Дарья Воронцова',
          role:'преподаватель Python и Scratch',
          avatarUrl:'/assets/images/cdn-cache/791a236a_ChatGPT_Image_18__20.png',
          bio:'помогает детям легко войти в программирование через игры, логику и первые самостоятельные программы.'
        }
      ],
      photos: [
        {cat:'all',src:'/assets/images/atmosphere-pool-kids.jpeg',alt:'Атмосфера лагеря'},
        {cat:'all',src:'/assets/images/cdn-cache/a5f92a14_photo_2025-06-14_08-.jpg',alt:'all'},
        {cat:'all',src:'/assets/images/cdn-cache/8cca10f8_photo.jpg',alt:'all'},
        {cat:'all',src:'/assets/images/cdn-cache/1ac9b8f7_photo_2025-06-14_08-.jpg',alt:'all'},
        {cat:'all',src:'/assets/images/cdn-cache/1063273d_photo_2025-06-17_13-.jpg',alt:'all'},
        {cat:'study',src:'/assets/images/cdn-cache/a591ceb9_IMG_1543.JPG',alt:'study'},
        {cat:'food',src:'/assets/images/cdn-cache/9e4f4646_photo_2025-06-14_08-.jpg',alt:'food'},
        {cat:'food',src:'/assets/images/cdn-cache/8aee104b_photo_2025-06-14_08-.jpg',alt:'food'},
        {cat:'food',src:'/assets/images/cdn-cache/5babf9c8_photo.jpg',alt:'food'},
        {cat:'study',src:'/assets/images/cdn-cache/d8b90de0_photo_2025-06-14_08-.jpg',alt:'study'},
        {cat:'study',src:'/assets/images/cdn-cache/7e509c20_photo_2025-06-14_08-.jpg',alt:'study'},
        {cat:'study',src:'/assets/images/cdn-cache/81652cd9_photo_2025-06-14_08-.jpg',alt:'study'},
        {cat:'study',src:'/assets/images/cdn-cache/0e2e55a2_photo_2025-06-14_08-.jpg',alt:'study'},
        {cat:'pool',src:'/assets/images/pool-kids-training.webp',alt:'Бассейн'},
        {cat:'pool',src:'/assets/images/cdn-cache/0d2ab9ef_photo_2025-06-14_08-.jpg',alt:'pool'},
        {cat:'pool',src:'/assets/images/cdn-cache/6a17713f_photo_2025-06-14_08-.jpg',alt:'pool'},
        {cat:'sport',src:'/assets/images/cdn-cache/cab7c193_photo.jpg',alt:'sport'},
        {cat:'sport',src:'/assets/images/cdn-cache/841dac3d_photo_2025-06-14_07-.jpg',alt:'sport'},
        {cat:'sport',src:'/assets/images/cdn-cache/e7095a88_photo_2025-06-14_08-.jpg',alt:'sport'}
      ],
      videos: [
        {
          title:'IT-лагерь — это не “сидеть за компьютером”. Вот что происходит на самом деле',
          url:'https://kinescope.io/embed/qmLxu2S7uaS44CKkhoV1Jj',
          cover:'https://edge-msk-11.kinescopecdn.net/14f5f68a-5403-49e7-9854-07f3d37b31cd/posters/f4189828-d218-4a2e-a103-dec988cca42a/poster_lg/35865925-2d43-426a-84f3-74989b3a65bb.jpg',
          orientation:'vertical'
        },
        {
          title:'За неделю в лагере ребёнок меняется больше, чем за год дома #результаты #АйДаКемп',
          url:'https://kinescope.io/embed/tJAaAnvCYYJ5vRz7uyUepj',
          cover:'https://edge-msk-1.kinescopecdn.net/14f5f68a-5403-49e7-9854-07f3d37b31cd/posters/3ffb469d-184c-4a4d-8944-184414a40d55/poster_lg/88340cab-36d7-4e68-bb7c-c4e8eec1eac0.jpg',
          orientation:'vertical'
        },
        {
          title:'Не хочу в лагерь… Через 3 дня_ ХОЧУ ЕЩЁ!',
          url:'https://kinescope.io/embed/naDfzrei9duApz3AnaencH',
          cover:'https://edge-msk-1.kinescopecdn.net/14f5f68a-5403-49e7-9854-07f3d37b31cd/posters/6401a850-e417-4313-92b9-f2a4ac8ac1bb/poster_lg/200d335b-73b4-43e3-b427-c6b270ebc01f.jpg',
          orientation:'vertical'
        },
        {
          title:'Ребенок сам откажется от телефона за 3 дня_! лагерь АйДаКемп #детскийлагерь #лагерьбезтелефонов',
          url:'https://kinescope.io/embed/eTmCgZHcwhcWQQs3HLCz1S',
          cover:'https://edge-msk-11.kinescopecdn.net/14f5f68a-5403-49e7-9854-07f3d37b31cd/posters/76e9a3e0-91a2-4019-a9fb-8ef54eaf76ff/poster_lg/e8cae335-b421-461d-bd90-5aa553717a05.jpg',
          orientation:'vertical'
        },
        {
          title:'Зачем детям копить деньги в лагере_ Узнай ответ!',
          url:'https://kinescope.io/embed/s1SCYKqLx6C94fMRumitHF',
          cover:'https://edge-msk-1.kinescopecdn.net/14f5f68a-5403-49e7-9854-07f3d37b31cd/posters/e78e019c-d1a6-47de-8b49-fbb13185c0c5/poster_lg/1487d473-8463-4b3e-8e41-f327343c7fc4.jpg',
          orientation:'vertical'
        }
      ],
      contacts: [
        {label:'city_phone',href:'tel:+74951284429',text:'+7 (495) 128-44-29'},
        {label:'mobile_phone',href:'tel:+79688086455',text:'+7 (968) 808-64-55'},
        {label:'whatsapp',href:'https://wa.me/79688086455',text:'WhatsApp'},
        {label:'telegram',href:'https://t.me/Progaschool',text:'@Progaschool'}
      ],
      socials: [
        { key:'VK', label:'VK', href:'https://vk.com/aidacamp' },
        { key:'Rutube', label:'RT', href:'https://rutube.ru/channel/53394996/' },
        { key:'Instagram', label:'IG', href:'https://www.instagram.com/aida_codit' },
        { key:'Одноклассники', label:'OK', href:'https://ok.ru/group/64689601773621' },
        { key:'YouTube', label:'YT', href:'https://www.youtube.com/@aidacamp' },
        { key:'LinkedIn', label:'LI', href:'https://www.linkedin.com/company/%D0%B8%D1%82-%D0%BB%D0%B0%D0%B3%D0%B5%D1%80%D1%8C-%D0%B4%D0%BB%D1%8F-%D0%B4%D0%B5%D1%82%D0%B5%D0%B9-%D0%B0%D0%B9%D0%B4%D0%B0%D0%BA%D0%B5%D0%BC%D0%BF/?viewAsMember=true' },
        { key:'TikTok', label:'TT', href:'https://www.tiktok.com/@aidacodit0' },
        { key:'Pinterest', label:'PI', href:'https://ru.pinterest.com/pbalgoritmika/' },
        { key:'Yappy', label:'YA', href:'https://yappy.media/n/acceptable.lizardxw?utm_source=url&utm_medium=share&utm_campaign=profile' }
      ],
      reviews: [
        {
          name:'Сергей Найденов',
          meta:'Яндекс Карты · 2 февраля 2026',
          avatar:'https://avatars.mds.yandex.net/get-yapic/27503/0r-4/islands-68',
          quote:'Отличное расположение в живописном месте, большие просторные аудитории для занятий. Большое значение придавалось и активностям вне аудиторных занятий: футбол, бадминтон и прочее.'
        },
        {
          name:'виктория',
          meta:'Яндекс Карты · 13 ноября 2024',
          avatar:'https://avatars.mds.yandex.net/get-yapic/54535/fsnR7nvUqoioiSqyIVRArH7QSFs-1/islands-68',
          quote:'Лагерь «Айдакемп» — это круто. Была там несколько раз, и каждый раз это был незабываемый опыт.'
        },
        {
          name:'Natalia Savenkova',
          meta:'Яндекс Карты · 10 ноября 2024',
          avatar:'https://avatars.mds.yandex.net/get-yapic/68143/0s-4/islands-68',
          quote:'Хочу поблагодарить АйДаКемп за отличную организацию и правильный подход в общении и воспитании детей в лагере. Потрясающие вожатые и педагоги.'
        },
        {
          name:'Надежда Ш.',
          meta:'Яндекс Карты · 12 августа 2025',
          avatar:'https://avatars.mds.yandex.net/get-yapic/58107/0f-1/islands-68',
          quote:'Сын в 9 лет этим летом побывал в первый раз в этом лагере. Остался в полном восторге и сказал, что обязательно поедет ещё.'
        },
        {
          name:'Кристина',
          meta:'Яндекс Карты · 8 ноября 2024',
          avatar:'https://avatars.mds.yandex.net/get-yapic/49368/enc-f5d05dcd44e9fc6a6283d03f5fc4dfbadc08d6b278aedeb06cfa14e5027cfb80/islands-68',
          quote:'Дочери лагерь понравился, с удовольствием провела время на каникулах. Интересные занятия, вкусная еда, комфортное размещение.'
        },
        {
          name:'Мария Григорьева',
          meta:'Яндекс Карты · 13 ноября 2024',
          avatar:'https://avatars.mds.yandex.net/get-yapic/56823/XGlOg8N65vTR91xedCasHKXWqI-1/islands-68',
          quote:'Отправляла детей 10 и 14 лет, оба остались довольны и готовы снова ехать на следующий год. Благодарна за опыт и пользу для детей.'
        }
      ]
    };

    const STORAGE_KEY = 'aidacamp_proto_state_v3';
    const BOOKING_SCARCITY_KEY = 'aidacamp_booking_scarcity_v1';
    const BOOKING_SCARCITY_BASE = 63;
    const BOOKING_SCARCITY_STEP = 7;
    const BOOKING_SCARCITY_MAX = 98;

    let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {
      age:null,
      shiftId:null,
      basePrice:null,
      offerPrice:null,
      code:null,
      previousCode:null,
      nextCodePreview:null,
      expiresAt:null,
      offerStage:0,
      view:'desktop',
      phone:'',
      debugBookingBlocks:false
    };

    const METRIKA_ID = 96499295;
    const MAX_CONTACT_URL = 'https://web.max.ru/185807479';
    const LEGAL_REPO_SLUG = 'afanasevvlad829-cyber/aidaplus-landing-dev';
    const HERO_VARIANT_BANNER_TIER = Object.freeze({
      '212861185':'tier1',
      '212861186':'tier1',
      '212861188':'tier1',
      '212861189':'tier2',
      '212861195':'tier2',
      '212861200':'tier2',
      '212861205':'tier3',
      '212861206':'tier3',
      '212861207':'tier3',
      '212861210':'tier4',
      '212861211':'tier4',
      '212861212':'tier4',
      '212861214':'broad',
      '212861215':'broad',
      '212861216':'broad'
    });
    const HERO_VARIANT_COPY = Object.freeze({
      tier1: Object.freeze({
        tier:'tier1',
        variant:'v1',
        title:'Выездной IT-лагерь в Подмосковье: гаджеты под контролем',
        sub:'Ребёнок 10–12 лет сделает проект за смену, а вы будете спокойны за безопасность.',
        cta:'Получить программу смен',
        hintStage1:'Чтобы получить программу смен, выберите возраст.',
        hintStage1Followup:'Нажмите на возраст — сразу откроем программу смен.',
        hintStage2:'На втором шаге нажмите кнопку i у смены, чтобы получить программу смен.'
      }),
      tier2: Object.freeze({
        tier:'tier2',
        variant:'v1',
        title:'IT-лагерь, где ребёнок возвращается из экрана в проект',
        sub:'Сравните формат: проектная работа, команда, бассейн, природа Подмосковья.',
        cta:'Сравнить смены и цены',
        hintStage1:'Чтобы сравнить смены и цены, выберите возраст.',
        hintStage1Followup:'Выберите возраст — и откроем все смены с ценами.',
        hintStage2:'Нажмите «Все смены для {{age}}», чтобы сравнить смены и цены.'
      }),
      tier3: Object.freeze({
        tier:'tier3',
        variant:'v1',
        title:'Не просто лагерь: IT-смена с результатом за 14 дней',
        sub:'Проект, презентация, наставники-айтишники и режим гаджетов по правилам.',
        cta:'Посмотреть программу',
        hintStage1:'Чтобы посмотреть программу, выберите возраст.',
        hintStage1Followup:'Выберите возраст — и покажем программу смен на шаге 2.',
        hintStage2:'На втором шаге нажмите кнопку i у смены, чтобы посмотреть программу.'
      }),
      tier4: Object.freeze({
        tier:'tier4',
        variant:'v1',
        title:'Если нужен форматный IT-лагерь, а не “просто отдых”',
        sub:'Выездные смены в Подмосковье для 10–12 лет: IT + спорт + командная среда.',
        cta:'Выбрать формат смены',
        hintStage1:'Чтобы выбрать формат смены, выберите возраст.',
        hintStage1Followup:'Выберите возраст — откроем форматы смен под ребёнка.',
        hintStage2:'Нажмите «Все смены для {{age}}», чтобы выбрать формат смены.'
      }),
      broad: Object.freeze({
        tier:'broad',
        variant:'v1',
        title:'Летние IT-смены в Подмосковье для детей 10–12 лет',
        sub:'Программирование, проекты, бассейн, природа и меньше экранного времени.',
        cta:'Узнать условия',
        hintStage1:'Чтобы узнать условия, выберите возраст.',
        hintStage1Followup:'Выберите возраст — подберём смену и условия.',
        hintStage2:'Выберите подходящую смену.'
      })
    });
    const HERO_VARIANT_DEFAULT_TIER = 'broad';
    const USE_DESKTOP_BASE_FOR_MOBILE = true;
    const BUILD_VERSION_LABEL = 'v0.0.288 (ab-analytics-endpoint)';
    const ARCHITECTURE_POLICY = Object.freeze({
      id: 'desktop-source-mobile-presentation',
      version: '2026-03-30',
      desktopSourceOfTruth: true,
      sharedStatePipeline: true,
      mobileUsesDesktopTemplates: true
    });
    const QUALITY_SCORE_MODEL = Object.freeze({
      scale: '0..10',
      debtScale: '0 best .. 10 worst',
      baselineVersion: 'v0.0.112 (debug-offer-layout-switch)',
      css: Object.freeze({
        start: 10,
        penalties: Object.freeze({
          duplicateSelectors: 0.25,
          deadRules: 0.2,
          highSpecificityHotspots: 0.35,
          stageLeakage: 0.4,
          mobileDesktopDivergence: 0.35
        })
      }),
      js: Object.freeze({
        start: 10,
        penalties: Object.freeze({
          branchComplexity: 0.35,
          stateCoupling: 0.35,
          duplicateHandlers: 0.25,
          magicNumbers: 0.15,
          legacyFlagsInProdPath: 0.35
        })
      }),
      debt: Object.freeze({
        start: 0,
        increments: Object.freeze({
          noGuardrails: 0.8,
          monolithEdits: 0.7,
          duplicatedUiLogic: 0.7,
          unresolvedStageRegressions: 0.9,
          debugArtifactsInProdPath: 0.7
        })
      })
    });
    const AIDACAMP_RUNTIME = (window.__AIDACAMP_RUNTIME && typeof window.__AIDACAMP_RUNTIME === 'object')
      ? window.__AIDACAMP_RUNTIME
      : {};
    window.__AIDACAMP_RUNTIME = AIDACAMP_RUNTIME;
    AIDACAMP_RUNTIME.quality = AIDACAMP_RUNTIME.quality || {};
    AIDACAMP_RUNTIME.quality.scoreModel = QUALITY_SCORE_MODEL;
    AIDACAMP_RUNTIME.architecture = ARCHITECTURE_POLICY;
    AIDACAMP_RUNTIME.quality.scoreSnapshot = Object.freeze({
      version: BUILD_VERSION_LABEL,
      css: 8.8,
      js: 8.6,
      techDebt: 1.5,
      debtScale: '0 best .. 10 worst',
      baselineVersion: QUALITY_SCORE_MODEL.baselineVersion
    });
    const HERO_CONTRAST_MODES = Object.freeze(['before', 'after', 'after-soft']);
    const HERO_MICRO_MODES = Object.freeze(['on', 'demo']);
    const OFFER_MODAL_THEMES = Object.freeze(['light', 'dark']);
    const OFFER_LAYOUT_MODES = Object.freeze(['current']);
    const normalizeMode = (value, allowedModes, fallbackMode) => (
      allowedModes.includes(value) ? value : fallbackMode
    );
    const VERSION_MONOTONIC_KEY = 'aidacamp_build_version_last_v1';
    const PROD_DEBUGLESS_DOMAINS = Object.freeze(['aidacamp.ru']);
    const QUALITY_BASELINE_KEY = 'aidacamp_quality_baseline_v1';
    const DEBT_REGISTER_KEY = 'aidacamp_debt_register_v1';
    const QUALITY_SOFT_GATES = Object.freeze({
      cssDuplicateSelectorsMax: 320,
      jsBranchPointsMax: 760,
      jsListenersMax: 220,
      jsBytesMax: 360000,
      cssBytesMax: 240000
    });
    const GUARDRAIL_REQUIRED_SELECTORS = Object.freeze([
      '#desktopView',
      '#mobileView',
      '.hero-shell',
      '#desktop-booking-card',
      '#mobileBookingCard',
      '#summaryBar',
      '#offerOverlay',
      '#offerCard',
      '#sectionModal',
      '#videoModal',
      '#calendarModal'
    ]);
    const VERSION_BADGE_HIDDEN_KEY = 'aidacamp_version_badge_hidden_v1';
    const VIDEO_META_CACHE_KEY = 'aidacamp_video_meta_cache_v2';
    const VIDEO_META_CACHE_TTL_MS = 1000 * 60 * 60 * 4;
    const VIDEO_META_REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 4;
    const COMPACT_MODAL_SECTIONS = new Set([
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
    ]);
    let timerId = null;
    let mediaIndex = 0;
    let mediaType = 'photo';
    let activePhotoList = [];
    let photoGalleryList = [];
    // SECTION 2: State normalization and hydration.
    const normalizedPreviewView = state.previewView || state.view || 'desktop';
    Object.assign(state, {
      previewView: normalizedPreviewView,
      view: (USE_DESKTOP_BASE_FOR_MOBILE && normalizedPreviewView === 'mobile') ? 'desktop' : state.view,
      desktopMode: 'full',
      mobileMode: 'full',
      heroContrastMode: 'after-soft',
      heroMicroMode: 'off',
      offerModalTheme: 'light',
      offerLayout: 'current',
      ageSelected: typeof state.ageSelected === 'boolean' ? state.ageSelected : false,
      bookingCompleted: !!state.bookingCompleted
    });
    let stateWasNormalized = false;
    if(!state.age){
      if(state.ageSelected || state.shiftId || state.basePrice || state.offerPrice || state.code || state.expiresAt || state.offerStage || state.bookingCompleted){
        stateWasNormalized = true;
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
        stateWasNormalized = true;
      }
      Object.assign(state, { ageSelected: true });
      if(!state.shiftId){
        if(state.basePrice || state.offerPrice || state.code || state.expiresAt || state.offerStage || state.bookingCompleted){
          stateWasNormalized = true;
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
    const normalizedOfferStage = Number(state.offerStage);
    if(!Number.isFinite(normalizedOfferStage) || normalizedOfferStage < 0){
      Object.assign(state, { offerStage: 0 });
      stateWasNormalized = true;
    } else if(normalizedOfferStage > 4){
      Object.assign(state, { offerStage: 4 });
      stateWasNormalized = true;
    }
    if(stateWasNormalized){
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error){
        console.warn('[STATE] normalize persist failed', error);
      }
    }
    Object.assign(state, {
      photoFilter: state.photoFilter || 'camp',
      previousCode: state.previousCode || null,
      nextCodePreview: state.nextCodePreview || null,
      faqFilter: state.faqFilter || 'Медицина',
      mobileJourneyStep: Number.isFinite(Number(state.mobileJourneyStep)) ? Number(state.mobileJourneyStep) : 0,
      mobileProgramShiftId: state.mobileProgramShiftId || '',
      mobilePhotoIndex: Number.isFinite(Number(state.mobilePhotoIndex)) ? Number(state.mobilePhotoIndex) : 0,
      mobileVideoIndex: Number.isFinite(Number(state.mobileVideoIndex)) ? Number(state.mobileVideoIndex) : 0,
      mobileReviewIndex: Number.isFinite(Number(state.mobileReviewIndex)) ? Number(state.mobileReviewIndex) : 0,
      mobileStayIndex: Number.isFinite(Number(state.mobileStayIndex)) ? Number(state.mobileStayIndex) : 0,
      mobileFaqGroup: state.mobileFaqGroup || 'Медицина',
      mobileFaqOpenKey: state.mobileFaqOpenKey || '',
      mobileTeamIndex: Number.isFinite(Number(state.mobileTeamIndex)) ? Number(state.mobileTeamIndex) : 0,
      // Mobile docs block must stay compact by default: requisites visible, legal links collapsed.
      mobileDocsExpanded: false,
      debugBookingBlocks: !!state.debugBookingBlocks
    });
    const metrikaSeen = new Set();
    const scrollMarks = {25:false,50:false,75:false,90:false};
    let offerTimeoutIds = [];
    let offerRunId = 0;
    let leadSubmitInProgress = false;
    let noticeConfirmHandler = null;
    let lastRenderedBookingStage = 0;
    let bookingScarcityState = (() => {
      try {
        const saved = JSON.parse(localStorage.getItem(BOOKING_SCARCITY_KEY) || 'null');
        const visits = Number(saved && saved.visits);
        return {
          visits: Number.isFinite(visits) && visits > 0 ? Math.floor(visits) : 0
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
    let heroV3SimpleFlowApi = null;
    let offerFlowApi = null;
    let actionDispatcherApi = null;
    let bookingInlineLeadApi = null;
    let mediaGestureBindingsApi = null;
    let globalUiBindingsApi = null;
    let runtimeQualityPipelineApi = null;
    let bookingRuntimeBridgeApi = null;

    function ensureTelemetryFlow(){
      if(telemetryFlowApi) return telemetryFlowApi;
      const create = window.AC_FEATURES?.telemetryFlow?.create;
      if(typeof create !== 'function') return null;
      telemetryFlowApi = create({
        document,
        metrikaId: METRIKA_ID,
        abEventEndpointDefault: AB_EVENT_ENDPOINT_DEFAULT,
        abVisitorKey: AB_VISITOR_ID_KEY,
        abSessionKey: AB_SESSION_ID_KEY,
        legalRepoSlug: LEGAL_REPO_SLUG,
        getHeroAbVariant: () => heroAbVariant,
        getHeroAbTestId: () => HERO_AB_TEST_ID,
        isAllowedAbEvent: (eventName) => AB_TEST_EVENT_ALLOWLIST.has(String(eventName || ''))
      });
      return telemetryFlowApi;
    }

    function ensureHeroVariantFlow(){
      if(heroVariantFlowApi) return heroVariantFlowApi;
      const create = window.AC_FEATURES?.heroVariantFlow?.create;
      if(typeof create !== 'function') return null;
      heroVariantFlowApi = create({
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
        trackOnce,
        getBookingViewConfig
      });
      return heroVariantFlowApi;
    }

    function ensureCalendarFlow(){
      if(calendarFlowApi) return calendarFlowApi;
      const create = window.AC_FEATURES?.calendarFlow?.create;
      if(typeof create !== 'function') return null;
      calendarFlowApi = create({
        getShifts: () => shifts,
        bookingText,
        calendarWeekdaysShort: () => ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
        calendarMonthNames: () => ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'],
        closeTransientModals,
        emitModularEvent,
        track,
        getShiftOptionPanels: () => shiftOptionPanels,
        setShiftOptionPanels: (nextPanels) => {
          shiftOptionPanels = nextPanels;
        },
        renderShiftOptions
      });
      return calendarFlowApi;
    }

    function ensureNavigationFlow(){
      if(navigationFlowApi) return navigationFlowApi;
      const create = window.AC_FEATURES?.navigationFlow?.create;
      if(typeof create !== 'function') return null;
      navigationFlowApi = create({
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
            USE_DESKTOP_BASE_FOR_MOBILE
              ? state.desktopMode === 'compact'
              : state.mobileMode === 'compact'
          )
        ),
        compactModalSections: COMPACT_MODAL_SECTIONS,
        openSectionModal,
        buildLegalDocUrl
      });
      return navigationFlowApi;
    }

    function ensureVideoMetaFlow(){
      if(videoMetaFlowApi) return videoMetaFlowApi;
      const create = window.AC_FEATURES?.videoMetaFlow?.create;
      if(typeof create !== 'function') return null;
      videoMetaFlowApi = create({
        mediaText: (key) => {
          if(key === 'genericSourceName') return 'источнике';
          if(key === 'vkVideoSourceName') return 'VK Видео';
          return '';
        },
        mediaContent,
        videoMetaCacheKey: VIDEO_META_CACHE_KEY,
        videoMetaCacheTtlMs: VIDEO_META_CACHE_TTL_MS,
        videoMetaRefreshIntervalMs: VIDEO_META_REFRESH_INTERVAL_MS,
        renderMediaSections,
        getVideoMetaRefreshTimer: () => videoMetaRefreshTimer,
        setVideoMetaRefreshTimer: (timerId) => {
          videoMetaRefreshTimer = timerId;
        }
      });
      return videoMetaFlowApi;
    }

    function ensureMediaSectionsFlow(){
      if(mediaSectionsFlowApi) return mediaSectionsFlowApi;
      const create = window.AC_FEATURES?.mediaSectionsFlow?.create;
      if(typeof create !== 'function') return null;
      mediaSectionsFlowApi = create({
        getState: () => state,
        getMediaContent: () => mediaContent,
        photoCatLabel,
        contactIconMarkup,
        socialBadgeMark,
        socialDisplayName,
        faqGlyph,
        bookingText,
        setPhotoLists: (list = []) => {
          const next = cloneArrayOrEmpty(list);
          photoGalleryList = next.slice();
          activePhotoList = next.slice();
        },
        prepareStayGalleryTriggers,
        renderCompactTrustPanelContent
      });
      return mediaSectionsFlowApi;
    }

    function ensureModalMediaFlow(){
      if(modalMediaFlowApi) return modalMediaFlowApi;
      const create = window.AC_FEATURES?.modalMediaFlow?.create;
      if(typeof create !== 'function') return null;
      modalMediaFlowApi = create({
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
      });
      return modalMediaFlowApi;
    }

    function ensureGuidedStateFlow(){
      if(guidedStateFlowApi) return guidedStateFlowApi;
      const create = window.AC_FEATURES?.guidedStateFlow?.create;
      if(typeof create !== 'function') return null;
      guidedStateFlowApi = create({
        getBookingViewConfig,
        syncGuidedState,
        getBookingStage,
        placeStage2ContentForView,
        syncCompletedBookingScaffold,
        stopVariantFlowScenario,
        bookingText,
        hideVariantCoachBadge,
        hasSelectedAge,
        ageLabel,
        getState: () => state,
        getSelectedShift,
        scheduleVariantFlowScenario
      });
      return guidedStateFlowApi;
    }

    function ensureBookingViewFlow(){
      if(bookingViewFlowApi) return bookingViewFlowApi;
      const create = window.AC_FEATURES?.bookingViewFlow?.create;
      if(typeof create !== 'function') return null;
      bookingViewFlowApi = create({
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
        applyBookingStructureSchema,
        syncBookingHints,
        updateBookingScarcityUi,
        scheduleBookingCardMinHeightSync,
        closeInlineLead
      });
      return bookingViewFlowApi;
    }

    function ensureBookingHintFlow(){
      if(bookingHintFlowApi) return bookingHintFlowApi;
      const create = window.AC_FEATURES?.bookingHintFlow?.create;
      if(typeof create !== 'function') return null;
      bookingHintFlowApi = create({
        getActiveBookingViewKeys,
        getRenderableBookingViewKeys,
        getBookingViewConfig,
        getBookingStage,
        hasSelectedAge,
        getState: () => state
      });
      return bookingHintFlowApi;
    }

    function ensureSummaryFlow(){
      if(summaryFlowApi) return summaryFlowApi;
      const create = window.AC_FEATURES?.summaryFlow?.create;
      if(typeof create !== 'function') return null;
      summaryFlowApi = create({
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
      });
      return summaryFlowApi;
    }

    function ensureViewModeFlow(){
      if(viewModeFlowApi) return viewModeFlowApi;
      const create = window.AC_FEATURES?.viewModeFlow?.create;
      if(typeof create !== 'function') return null;
      viewModeFlowApi = create({
        getState: () => state,
        useDesktopBaseForMobile: USE_DESKTOP_BASE_FOR_MOBILE,
        normalizeMode,
        heroContrastModes: HERO_CONTRAST_MODES,
        heroMicroModes: HERO_MICRO_MODES,
        offerModalThemes: OFFER_MODAL_THEMES,
        offerLayoutModes: OFFER_LAYOUT_MODES,
        setHeroMenuOpen,
        closeSectionModal,
        applyHeroAbVariant,
        applyMobileTemplatesToDesktopSections,
        renderMediaSections,
        renderDesktopMobileDocsBlock,
        updateSummaryBarVisibility,
        persist,
        applyOfferLayoutMode,
        showOffer,
        applyMobileSectionAccordion
      });
      return viewModeFlowApi;
    }

    function ensureHeroV3SimpleFlow(){
      if(heroV3SimpleFlowApi) return heroV3SimpleFlowApi;
      const create = window.AC_FEATURES?.heroV3SimpleFlow?.create;
      if(typeof create !== 'function') return null;
      heroV3SimpleFlowApi = create({
        document,
        getEnabled: () => HERO_V3_SIMPLE_ENABLED,
        setHeroPhoneDropdownOpen
      });
      return heroV3SimpleFlowApi;
    }

    function ensureOfferFlow(){
      if(offerFlowApi) return offerFlowApi;
      const api = window.AC_FEATURES?.offerFlow || null;
      offerFlowApi = asFeatureApi(api);
      return offerFlowApi;
    }

    function ensureBookingRuntimeBridge(){
      if(bookingRuntimeBridgeApi) return bookingRuntimeBridgeApi;
      const createBridge = window.AC_RUNTIME_BOOKING_BRIDGE?.createBridge;
      if(typeof createBridge !== 'function') return null;
      bookingRuntimeBridgeApi = createBridge({
        getState: () => state,
        getSelectedShift,
        shiftDaysLabel,
        clearShiftOptionPanels,
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
      });
      return bookingRuntimeBridgeApi;
    }

    function ensureActionDispatcher(){
      if(actionDispatcherApi) return actionDispatcherApi;
      const create = window.AC_FEATURES?.actionDispatcher?.createActionDispatcher;
      if(typeof create !== 'function') return null;
      actionDispatcherApi = create({
        bookingText,
        getState: () => state,
        getMediaContent: () => mediaContent,
        getPhotoGalleryList: () => photoGalleryList.slice(),
        setActivePhotoList: (next = []) => {
          activePhotoList = cloneArrayOrEmpty(next);
        },
        openMedia,
        getStayGallery,
        openVideo,
        scrollVideoCarousel,
        openShiftAboutModal,
        openCalendar,
        toggleShiftOptionPanel,
        navigateToSection,
        focusMobileAgeGate,
        dismissSummaryBarTemporarily,
        applyStatePatch: (patch = {}) => {
          Object.assign(state, patch);
        },
        renderCompactTrustPanelContent,
        persist,
        syncMobileDocsExpandedUi,
        renderDesktopMobileDocsBlock,
        scrollTeamCarousel,
        openSeasonCalendar,
        handlePrimaryCTA,
        resetAgeSelection,
        resetShiftSelection,
        openResetBookingConfirmModal,
        bumpOfferRunId: () => {
          offerRunId += 1;
        },
        clearOfferTimeout,
        resetOfferProgressUI,
        saveOfferAndClose,
        openNoticeModal,
        renderAll,
        syncGuidedState,
        buildBookingSummaryHtml,
        isOfferActive,
        startTimer,
        track,
        selectedShiftPayload,
        buildHeroVariantMeta,
        submitLead,
        closeSuccessModal,
        closeNoticeModal,
        hideVariantCoachBadge,
        getPrimaryBookingViewConfig,
        getNoticeConfirmHandler: () => noticeConfirmHandler,
        closeCalendar,
        closeSectionModal,
        closeVideo,
        buildInviteClipboardText,
        setHeroMenuOpen,
        isHeroMenuOpen,
        setHeroPhoneDropdownOpen,
        isHeroPhoneDropdownOpen
      });
      return actionDispatcherApi;
    }

    function ensureBookingInlineLeadApi(){
      if(bookingInlineLeadApi) return bookingInlineLeadApi;
      const api = window.AC_FEATURES?.bookingInlineLead || null;
      bookingInlineLeadApi = asFeatureApi(api);
      return bookingInlineLeadApi;
    }

    function ensureMediaGestureBindingsApi(){
      if(mediaGestureBindingsApi) return mediaGestureBindingsApi;
      const api = window.AC_FEATURES?.mediaGestureBindings || null;
      mediaGestureBindingsApi = asFeatureApi(api);
      return mediaGestureBindingsApi;
    }

    function ensureGlobalUiBindingsApi(){
      if(globalUiBindingsApi) return globalUiBindingsApi;
      const api = window.AC_FEATURES?.globalUiBindings || null;
      globalUiBindingsApi = asFeatureApi(api);
      return globalUiBindingsApi;
    }

    function asObject(value){
      return (value && typeof value === 'object' && value) || {};
    }

    function asFeatureApi(value){
      return (value && typeof value === 'object' && value) || null;
    }

    function cloneArrayOrEmpty(value){
      return (Array.isArray(value) && value.slice()) || [];
    }

    function resolveBookingViewCfg(viewCfg){
      return (viewCfg && viewCfg.key && viewCfg) || getBookingViewConfig('desktop');
    }

    function resolveScopeRoot(scopeRoot){
      return (scopeRoot && scopeRoot.nodeType === 1 && scopeRoot) || document;
    }

    function resolveViewKey(viewKey){
      return (viewKey === 'mobile' && 'mobile') || 'desktop';
    }

    function resolveVariantCoachMode(tier){
      return ((tier === 'tier2' || tier === 'tier4') && 'menu') || 'info';
    }

    function toHeroAbVariant(value){
      return ((String(value || 'A').toUpperCase() === 'B') && 'B') || 'A';
    }

    function hasQueryFlag(name){
      try{
        const params = new URLSearchParams(window.location.search || '');
        return params.get(name) === '1';
      } catch (error){
        return false;
      }
    }

    function getHeroAbAssets(value){
      return HERO_AB_ASSETS[toHeroAbVariant(value)] || HERO_AB_ASSETS.A;
    }

    function buildAbMeta(extra = {}){
      const fallback = {
        ab_test_id: HERO_AB_TEST_ID,
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
            ym(METRIKA_ID, 'reachGoal', event, trackedParams);
          }
        } catch (error){
          console.warn('Metrika track error:', event, error);
        }
      });
    }

    function getCurrentSearchParams(){
      return safeInvoke(ensureTelemetryFlow(), 'getCurrentSearchParams', [], () => {
        try {
          return new URLSearchParams(window.location.search || '');
        } catch (error){
          return new URLSearchParams('');
        }
      });
    }

    function buildLegalDocUrl(hash = ''){
      return safeInvoke(ensureTelemetryFlow(), 'buildLegalDocUrl', [hash], 'legal.html');
    }

    function syncLegalDocLinks(scope = document){
      return safeInvoke(ensureTelemetryFlow(), 'syncLegalDocLinks', [scope], null);
    }

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

    function applyHeroVariantCopy(){
      return safeInvoke(ensureHeroVariantFlow(), 'applyHeroVariantCopy', [], () => {
        const variant = heroVariantState || resolveHeroVariantFromUtm();
        const copy = variant.copy || HERO_VARIANT_COPY[HERO_VARIANT_DEFAULT_TIER];
        document.querySelectorAll('.hero-slogan').forEach((node) => {
          if(node) node.textContent = copy.title;
        });
      });
    }

    function injectHeroSeasonOfferCta(){
      return safeInvoke(ensureHeroVariantFlow(), 'injectHeroSeasonOfferCta');
    }

    function formatVariantHint(template){
      return safeInvoke(ensureHeroVariantFlow(), 'formatVariantHint', [template], () => {
        const source = String(template || '').trim();
        if(!source) return '';
        return source.replace('{{age}}', ageLabel(state.age || '10-12'));
      });
    }

    function clearVariantCoachReminderTimer(){
      return safeInvoke(ensureHeroVariantFlow(), 'clearVariantCoachReminderTimer');
    }

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

    function initHeroVariantPersonalization(){
      return safeInvoke(ensureHeroVariantFlow(), 'initHeroVariantPersonalization', [], () => {
        heroVariantState = resolveHeroVariantFromUtm();
        const fallbackReason = heroVariantState.fallbackReason || '';
        trackOnce('hero_variant_shown_new', buildHeroVariantMeta());
        if(fallbackReason){
          trackOnce('hero_variant_fallback_new', buildHeroVariantMeta({reason:fallbackReason}));
        }
        applyHeroVariantCopy();
      });
    }

    function trackOnce(event, params = {}){
      const key = `${event}:${JSON.stringify(params)}`;
      if(metrikaSeen.has(key)) return;
      metrikaSeen.add(key);
      track(event, params);
    }

    function ensureRuntimeQualityPipeline(){
      if(runtimeQualityPipelineApi) return runtimeQualityPipelineApi;
      const create = window.AC_FEATURES?.runtimeQualityPipeline?.create;
      if(typeof create !== 'function') return null;
      runtimeQualityPipelineApi = create({
        document,
        runtimeStore: AIDACAMP_RUNTIME,
        buildVersionLabel: BUILD_VERSION_LABEL,
        versionMonotonicKey: VERSION_MONOTONIC_KEY,
        qualityBaselineKey: QUALITY_BASELINE_KEY,
        debtRegisterKey: DEBT_REGISTER_KEY,
        requiredSelectors: GUARDRAIL_REQUIRED_SELECTORS,
        qualitySoftGates: QUALITY_SOFT_GATES,
        architecturePolicy: ARCHITECTURE_POLICY,
        useDesktopBaseForMobile: USE_DESKTOP_BASE_FOR_MOBILE,
        shouldUseLegacyMobile: () => state.previewView === 'mobile',
        trackOnce,
        isPipelineEnabled: () => isFeatureEnabled('runtimeQualityPipeline')
      });
      if(runtimeQualityPipelineApi?.namespace){
        AIDACAMP_RUNTIME.quality.pipeline = runtimeQualityPipelineApi.namespace;
      }
      return runtimeQualityPipelineApi;
    }

    function getRuntimeQualityNamespace(){
      const pipeline = ensureRuntimeQualityPipeline();
      return pipeline?.namespace || null;
    }

    function runGuardrails(){
      return safeInvoke(getRuntimeQualityNamespace(), 'runGuardrails', [], {
        ok: false,
        policy: ARCHITECTURE_POLICY.id
      });
    }

    function runQualityBaselineAudit(){
      return safeInvoke(getRuntimeQualityNamespace(), 'runQualityBaselineAudit', [], null);
    }

    function evaluateSoftQualityGates(snapshot){
      return safeInvoke(getRuntimeQualityNamespace(), 'evaluateSoftQualityGates', [snapshot], {
        ok: false,
        warnings: ['pipeline_unavailable']
      });
    }

    function buildDebtRegister(guardrails, baseline, gates){
      return safeInvoke(getRuntimeQualityNamespace(), 'buildDebtRegister', [guardrails, baseline, gates], {
        debtItems: [],
        pressureScore: 0,
        pressureLevel: 'low'
      });
    }

    function buildRuntimeQualityScore(baseline, gates, debtRegister){
      return safeInvoke(getRuntimeQualityNamespace(), 'buildRuntimeQualityScore', [baseline, gates, debtRegister], {
        css: 0,
        js: 0,
        techDebt: 0,
        monolithness: 0
      });
    }

    function buildQualityTrendSummary(delta){
      return safeInvoke(getRuntimeQualityNamespace(), 'buildQualityTrendSummary', [delta], {
        trend: 'flat',
        better: 0,
        worse: 0
      });
    }

    function runReleaseIntegrityChecks(){
      return safeInvoke(getRuntimeQualityNamespace(), 'runReleaseIntegrityChecks', [], {
        ok: false,
        missing: ['runtime_quality_pipeline']
      });
    }

    function printRuntimeStatusReport(){
      return safeInvoke(getRuntimeQualityNamespace(), 'printRuntimeStatusReport', [], '');
    }

    function runQualityPipelineAll(){
      const qualityResult = safeInvoke(getRuntimeQualityNamespace(), 'runAll', [], null);
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

    const QUALITY_PIPELINE_NAMESPACE = Object.freeze({
      runGuardrails,
      runQualityBaselineAudit,
      evaluateSoftQualityGates,
      buildDebtRegister,
      buildRuntimeQualityScore,
      buildQualityTrendSummary,
      runReleaseIntegrityChecks,
      printRuntimeStatusReport,
      runAll: runQualityPipelineAll
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

    function normalizeCloseIconButtons(scope = document){
      const root = scope || document;
      const nodes = root.querySelectorAll(
        [
          '.version-badge-close',
          '.media-close',
          '.video-close',
          '.form-close',
          "[data-action='close-version-badge']",
          "[data-action='close-form']",
          "[data-action='close-success']",
          "[data-action='close-section-modal']",
          "[data-action='close-video-modal']",
          "[data-action='close-calendar']"
        ].join(',')
      );

      nodes.forEach((btn) => {
        if(!btn || btn.dataset.closeIconNormalized === '1') return;

        const raw = (btn.textContent || '').trim();

        if(
          raw === '×' ||
          raw === '✕' ||
          btn.classList.contains('version-badge-close') ||
          btn.classList.contains('media-close') ||
          btn.classList.contains('video-close') ||
          btn.classList.contains('form-close') ||
          btn.classList.contains('offer-close-btn')
        ){
          if(!btn.querySelector('img.ac-icon')){
            btn.innerHTML = CLOSE_ICON_HTML;
          }
        }

        btn.dataset.closeIconNormalized = '1';
      });
    }

    function initScrollTracking(){
      window.addEventListener('scroll', () => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        if(max <= 0) return;
        const scrolled = (h.scrollTop / max) * 100;
        [25,50,75,90].forEach((p) => {
          if(scrolled >= p && !scrollMarks[p]){
            scrollMarks[p] = true;
            track(`scroll_${p}`);
          }
        });
        safeInvoke({updateSummaryBarVisibility}, 'updateSummaryBarVisibility');
      }, {passive:true});
    }

    function initSummaryBarViewportSync(){
      const sync = () => {
        safeInvoke({updateSummaryBarVisibility}, 'updateSummaryBarVisibility');
      };
      window.addEventListener('scroll', sync, {passive:true});
      window.addEventListener('orientationchange', sync, {passive:true});
      document.addEventListener('visibilitychange', () => {
        if(document.hidden) return;
        sync();
      });
    }

    function initSectionViewTracking(){
      const targets = [
        {id:'section-stay', event:'stay_view'},
        {id:'section-reviews', event:'eviews_view'},
        {id:'section-team', event:'team_view'}
      ];

      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if(!entry.isIntersecting) return;
          const found = targets.find(t => t.id === entry.target.id);
          if(found) trackOnce(found.event);
        });
      }, {threshold:0.35});

      targets.forEach((t) => {
        const el = document.getElementById(t.id);
        if(el) io.observe(el);
      });
    }

    function trackFaqOpen(){
      trackOnce('faq_open');
    }

    const HERO_IMAGES = [
      '/assets/images/hero-camp-sunset-20260328.png'
    ];

    const HERO_MOBILE =
      '/assets/images/hero-camp-sunset-20260328.png';
    const HERO_IMAGES_B = [
      '/assets/images/hero-ab-pool-20260401.jpeg'
    ];
    const HERO_MOBILE_B =
      '/assets/images/hero-ab-pool-20260401.jpeg';
    const HERO_AB_ASSETS = Object.freeze({
      A: Object.freeze({images:HERO_IMAGES, mobile:HERO_MOBILE}),
      B: Object.freeze({images:HERO_IMAGES_B, mobile:HERO_MOBILE_B})
    });
    const HERO_AB_TEST_KEY = 'aidacamp_hero_ab_v1';
    const HERO_AB_TEST_ID = 'hero_primary_block_v1';
    const HERO_AB_VARIANT_LABELS = Object.freeze({
      A: 'Control',
      B: 'Pool Motion'
    });
    const HERO_AB_SHIFT_UP_MS = 7000;
    const HERO_AB_BENEFIT_REVEAL_DELAY_MS = 7600;
    const HERO_AB_BENEFIT_STEP_MS = 4000;
    const HERO_AB_DESKTOP_SHIFT_UP_MS = 5000;
    const HERO_AB_DESKTOP_BENEFIT_REVEAL_DELAY_MS = 5000;
    const HERO_AB_DESKTOP_BG_ONLY = false;
    const HERO_AB_MOBILE_EFFECTS_ENABLED = false;
    const HERO_V3_SIMPLE_QUERY_KEY = 'hero_v3_simple';
    const HERO_V3_SIMPLE_ENABLED = hasQueryFlag(HERO_V3_SIMPLE_QUERY_KEY);
    const AB_EVENT_ENDPOINT_DEFAULT = 'https://adacamp-ab-analytics.afanasevvlad829.workers.dev/api/ab-event';
    const AB_VISITOR_ID_KEY = 'aidacamp_ab_visitor_id_v1';
    const AB_SESSION_ID_KEY = 'aidacamp_ab_session_id_v1';
    const AB_TEST_EVENT_ALLOWLIST = new Set([
      'page_view',
      'hero_ab_assigned_v1',
      'hero_variant_shown_new',
      'hero_variant_fallback_new',
      'form_submit',
      'hero_variant_form_submit_new',
      'telegram_click',
      'hero_variant_telegram_click_new'
    ]);
    const HERO_BENEFITS_LAYOUT_EXPERIMENT = true;
    const HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS = Object.freeze([
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
    ]);

    let heroIndex = 0;
    let heroTimer = null;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function persistBookingScarcity(){
      try {
        localStorage.setItem(BOOKING_SCARCITY_KEY, JSON.stringify({
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

    function initHero(){
      const isMobile = window.innerWidth < 768;
      const heroAssets = getHeroAbAssets(heroAbVariant);
      const heroImages = heroAssets.images;
      const heroMobile = heroAssets.mobile;

      const bg1 = document.getElementById('heroBg1');
      const bg2 = document.getElementById('heroBg2');
      const desktopView = document.getElementById('desktopView');
      const mobileView = document.getElementById('mobileView');
      if(!bg1) return;
      if(heroTimer){
        clearInterval(heroTimer);
        heroTimer = null;
      }
      if(desktopView){
        desktopView.classList.toggle('hero-static-bg', HERO_IMAGES.length <= 1);
        desktopView.classList.remove('hero-ready');
        desktopView.classList.add('hero-loading');
      }
      if(mobileView){
        mobileView.classList.remove('hero-ready');
        mobileView.classList.add('hero-loading');
      }
      const markHeroReady = () => {
        if(desktopView){
          desktopView.classList.remove('hero-loading');
          desktopView.classList.add('hero-ready');
        }
        if(mobileView){
          mobileView.classList.remove('hero-loading');
          mobileView.classList.add('hero-ready');
        }
      };
      const applySingleHeroFrame = (src) => {
        bg1.style.backgroundImage = `url(${src})`;
        bg1.classList.add('active');
        bg1.classList.remove('hidden');
        if(bg2){
          bg2.style.backgroundImage = `url(${src})`;
          bg2.classList.remove('active');
          bg2.classList.add('hidden');
        }
      };
      const preloadAndApplyFirstFrame = (src) => {
        let done = false;
        const finish = () => {
          if(done) return;
          done = true;
          applySingleHeroFrame(src);
          requestAnimationFrame(markHeroReady);
        };
        try{
          const img = new Image();
          img.decoding = 'async';
          img.onload = finish;
          img.onerror = finish;
          img.src = src;
          if(img.complete){
            finish();
          } else {
            window.setTimeout(finish, 1200);
          }
        } catch (error){
          finish();
        }
      };

      if(isMobile){
        preloadAndApplyFirstFrame(heroMobile);
        return;
      }

      heroIndex = 0;
      preloadAndApplyFirstFrame(heroImages[heroIndex]);
      if(!bg2) return;

      if(heroImages.length <= 1){
        bg2.style.backgroundImage = 'none';
        return;
      }

      heroTimer = setInterval(() => {
        heroIndex = (heroIndex + 1) % heroImages.length;

        const next = heroImages[heroIndex];

        if(bg1.classList.contains('active')){
          bg2.style.backgroundImage = `url(${next})`;
          bg2.classList.remove('hidden');
          bg2.classList.add('active');
          bg1.classList.remove('active');
          bg1.classList.add('hidden');
        } else {
          bg1.style.backgroundImage = `url(${next})`;
          bg1.classList.remove('hidden');
          bg1.classList.add('active');
          bg2.classList.remove('active');
          bg2.classList.add('hidden');
        }
      }, 5500);
    }

    function applyHeroV3SimpleMode(){
      return safeInvoke(ensureHeroV3SimpleFlow(), 'applyMode', [], null);
    }

    function preloadHeroAssets(){
      const heroAssets = getHeroAbAssets(heroAbVariant);
      const heroImages = heroAssets.images;
      const heroMobile = heroAssets.mobile;
      const preloadList = [...heroImages, heroMobile].filter(Boolean);
      preloadList.forEach((src) => {
        try{
          const img = new Image();
          img.decoding = 'async';
          img.src = src;
        } catch (error){
          // ignore preload failures
        }
      });
    }

    function ensureHeroAbFlow(){
      if(heroAbFlowApi) return heroAbFlowApi;
      const create = window.AC_FEATURES?.heroAbFlow?.create;
      if(typeof create !== 'function') return null;
      heroAbFlowApi = create({
        heroAbTestKey: HERO_AB_TEST_KEY,
        heroAbTestId: HERO_AB_TEST_ID,
        heroAbDesktopBgOnly: HERO_AB_DESKTOP_BG_ONLY,
        heroAbMobileEffectsEnabled: HERO_AB_MOBILE_EFFECTS_ENABLED,
        heroAbBenefitStepMs: HERO_AB_BENEFIT_STEP_MS,
        heroAbShiftUpMs: HERO_AB_SHIFT_UP_MS,
        heroAbBenefitRevealDelayMs: HERO_AB_BENEFIT_REVEAL_DELAY_MS,
        heroAbDesktopShiftUpMs: HERO_AB_DESKTOP_SHIFT_UP_MS,
        heroAbDesktopBenefitRevealDelayMs: HERO_AB_DESKTOP_BENEFIT_REVEAL_DELAY_MS,
        useDesktopBaseForMobile: USE_DESKTOP_BASE_FOR_MOBILE,
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
        applyHeroBenefitsLayoutExperiment,
        resolveDesktopView: () => document.getElementById('desktopView'),
        resolveMobileView: () => document.getElementById('mobileView')
      });
      return heroAbFlowApi;
    }

    function clearHeroAbTimers(){
      const cleared = safeInvoke(ensureHeroAbFlow(), 'clearHeroAbTimers', [], null);
      if(cleared !== null) return;
      heroAbTimers.forEach((timerId) => window.clearTimeout(timerId));
      heroAbTimers = [];
    }

    function getForcedHeroAbVariant(){
      const search = getCurrentSearchParams();
      const forcedRaw = String(search.get('hero_ab') || search.get('hero_mode') || '').trim();
      const normalized = forcedRaw.toUpperCase();
      if(normalized === 'A' || normalized === 'CONTROL') return 'A';
      if(normalized === 'B' || normalized === 'POOL' || normalized === 'POOL_MOTION') return 'B';
      return '';
    }

    function resolveHeroAbVariant(){
      const forced = getForcedHeroAbVariant();
      if(forced){
        localStorage.setItem(HERO_AB_TEST_KEY, forced);
        return forced;
      }
      localStorage.setItem(HERO_AB_TEST_KEY, 'B');
      return 'B';
    }

    function applyHeroAbAnimationForRoot(root){
      safeInvoke(ensureHeroAbFlow(), 'applyHeroAbAnimationForRoot', [root], null);
    }

    function applyHeroBenefitsLayoutExperiment(root){
      if(!root) return;
      const grid = root.querySelector('.hero-benefits-grid');
      if(!grid) return;

      if(!grid.dataset.heroBenefitsOriginalHtml){
        grid.dataset.heroBenefitsOriginalHtml = grid.innerHTML;
      }

      if(!HERO_BENEFITS_LAYOUT_EXPERIMENT){
        root.classList.remove('hero-benefits-exp-3');
        grid.classList.remove('hero-benefits-grid--compact3');
        if(grid.dataset.heroBenefitsOriginalHtml){
          grid.innerHTML = grid.dataset.heroBenefitsOriginalHtml;
        }
        return;
      }

      root.classList.add('hero-benefits-exp-3');
      grid.classList.add('hero-benefits-grid--compact3');
      grid.innerHTML = HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS.map((item) => `
        <article class="hero-benefit-card hero-benefit-card--compact">
          <span class="hero-benefit-icon-wrap ${item.iconClass || ''}">
            <img class="ac-icon hero-benefit-icon" src="${item.icon}" alt="" aria-hidden="true">
          </span>
          <strong>${item.title}</strong>
        </article>
      `).join('');
    }

    function applyHeroAbVariant(){
      safeInvoke(ensureHeroAbFlow(), 'applyHeroAbVariant', [], null);
    }

    function initHeroAbDevPanel(){
      const host = String(window.location.hostname || '').toLowerCase();
      const isDevHost = (
        host === 'localhost' ||
        host === '127.0.0.1'
      );
      if(!isDevHost) return;
      if(document.getElementById('heroAbDevPanel')) return;
      const panel = document.createElement('div');
      panel.id = 'heroAbDevPanel';
      panel.className = 'hero-ab-dev-panel';
      panel.innerHTML = `
        <div class="hero-ab-dev-title">Hero A/B (Dev)</div>
        <div class="hero-ab-dev-status">Current: <span data-hero-ab-current></span></div>
        <div class="hero-ab-dev-modes">
          <button type="button" class="hero-ab-dev-btn" data-hero-ab-set="A">A · ${HERO_AB_VARIANT_LABELS.A || 'A'}</button>
          <button type="button" class="hero-ab-dev-btn" data-hero-ab-set="B">B · ${HERO_AB_VARIANT_LABELS.B || 'B'}</button>
        </div>
      `;
      document.body.appendChild(panel);
      const currentNode = panel.querySelector('[data-hero-ab-current]');
      const syncPanelState = () => {
        if(currentNode){
          currentNode.textContent = HERO_AB_VARIANT_LABELS[heroAbVariant] || heroAbVariant;
        }
        panel.querySelectorAll('[data-hero-ab-set]').forEach((button) => {
          const value = String(button.getAttribute('data-hero-ab-set') || '').toUpperCase();
          button.classList.toggle('is-active', value === heroAbVariant);
        });
      };
      syncPanelState();
      panel.querySelectorAll('[data-hero-ab-set]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const next = String(btn.getAttribute('data-hero-ab-set') || '').toUpperCase();
          if(next !== 'A' && next !== 'B') return;
          if(next === heroAbVariant){
            syncPanelState();
            return;
          }
          heroAbVariant = next;
          localStorage.setItem(HERO_AB_TEST_KEY, next);
          const url = new URL(window.location.href);
          url.searchParams.set('hero_ab', next);
          window.history.replaceState({}, '', url.toString());
          initHero();
          applyHeroAbVariant();
          syncPanelState();
        });
      });
      trackOnce('hero_ab_dev_panel_shown_v1', {
        test_id: HERO_AB_TEST_ID,
        variant: heroAbVariant,
        mode_label: HERO_AB_VARIANT_LABELS[heroAbVariant] || ''
      });
    }

    function openMedia(type, index){
      return safeInvoke(ensureModalMediaFlow(), 'openMedia', [type, index], null);
    }

    function closeMedia(){
      return safeInvoke(ensureModalMediaFlow(), 'closeMedia', [], null);
    }

    function closeTransientModals(except = '', options = {}){
      return safeInvoke(ensureModalMediaFlow(), 'closeTransientModals', [except, options], null);
    }

    function openVideo(url){
      return safeInvoke(ensureModalMediaFlow(), 'openVideo', [url], null);
    }

    function closeVideo(){
      return safeInvoke(ensureModalMediaFlow(), 'closeVideo', [], null);
    }

    function resolveVideoSource(url){
      return safeInvoke(ensureVideoMetaFlow(), 'resolveVideoSource', [url], {
        canEmbed: false,
        embedUrl: '',
        externalUrl: String(url || '').trim(),
        orientation: 'horizontal',
        sourceName: 'источнике'
      });
    }

    function isVerticalVideoUrl(url){
      return safeInvoke(ensureVideoMetaFlow(), 'isVerticalVideoUrl', [url], false);
    }

    function normalizeKinescopeShareUrl(url){
      return safeInvoke(ensureVideoMetaFlow(), 'normalizeKinescopeShareUrl', [url], '');
    }

    function applyVideoMetaMap(videoMetaMap = {}){
      return safeInvoke(ensureVideoMetaFlow(), 'applyVideoMetaMap', [videoMetaMap], false);
    }

    function loadVideoMetaCache(){
      return safeInvoke(ensureVideoMetaFlow(), 'loadVideoMetaCache', [], null);
    }

    function getVideoMetaCacheAgeMs(){
      return safeInvoke(ensureVideoMetaFlow(), 'getVideoMetaCacheAgeMs', [], Number.POSITIVE_INFINITY);
    }

    function saveVideoMetaCache(videoMetaMap){
      return safeInvoke(ensureVideoMetaFlow(), 'saveVideoMetaCache', [videoMetaMap], null);
    }

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

    function scheduleVideoMetaRefresh(){
      return safeInvoke(ensureVideoMetaFlow(), 'scheduleVideoMetaRefresh', [], null);
    }

    function closeSectionModal(){
      return safeInvoke(ensureModalMediaFlow(), 'closeSectionModal', [], null);
    }

    function setHeroMenuOpen(isOpen){
      const wrap = document.getElementById('heroMenuWrap');
      const toggle = document.getElementById('heroMenuToggle');
      const menu = document.getElementById('serviceMenu');
      if(!wrap || !toggle || !menu) return;
      const next = !!isOpen;
      wrap.dataset.open = String(Number(!!next));
      toggle.setAttribute('aria-expanded', String(!!next));
      menu.classList.toggle('is-open', next);
      menu.hidden = !next;
    }

    function isHeroMenuOpen(){
      return document.getElementById('heroMenuWrap')?.dataset.open === '1';
    }

    function setHeroPhoneDropdownOpen(isOpen){
      const trigger = document.getElementById('heroPhoneTrigger');
      const dropdown = document.getElementById('heroPhoneDropdown');
      return (trigger && dropdown && (() => {
        const next = !!isOpen;
        trigger.dataset.open = String(Number(next));
        trigger.setAttribute('aria-expanded', String(next));
        dropdown.classList.toggle('is-open', next);
        dropdown.hidden = !next;
        return next;
      })()) || false;
    }

    function isHeroPhoneDropdownOpen(){
      return document.getElementById('heroPhoneTrigger')?.dataset.open === '1';
    }

    function scrollVideoCarousel(direction = 1, scopeRoot = null){
      const scope = resolveScopeRoot(scopeRoot);
      const list = scope.querySelector('#videoList, .video-list');
      if(!list) return;
      const card = list.querySelector('.video-card');
      const gap = 12;
      const step = (card && (card.getBoundingClientRect().width + gap)) || 260;
      list.scrollBy({left: step * direction, behavior:'smooth'});
    }

    function scrollTeamCarousel(direction = 1, scopeRoot = null){
      const scope = resolveScopeRoot(scopeRoot);
      const list = scope.querySelector('#teamCarousel, .team-carousel');
      if(!list) return;
      const card = list.querySelector('.team-card');
      const gap = 12;
      const step = (card && (card.getBoundingClientRect().width + gap)) || 320;
      list.scrollBy({left: step * direction, behavior:'smooth'});
    }

    function applyCompactSectionModalLayout(){
      return safeInvoke(ensureModalMediaFlow(), 'applyCompactSectionModalLayout', [], null);
    }

    function openSectionModal(sectionId){
      const opened = safeInvoke(ensureModalMediaFlow(), 'openSectionModal', [sectionId], false);
      if(opened && sectionId === 'section-faq'){
        trackFaqOpen();
      }
      return !!opened;
    }

    function renderMediaViewer(){
      return safeInvoke(ensureModalMediaFlow(), 'renderMediaViewer', [], null);
    }

    function nextMedia(){
      const list = mediaType === 'photo'
        ? (activePhotoList.length ? activePhotoList : mediaContent.photos)
        : mediaContent.videos;
      mediaIndex = (mediaIndex + 1) % list.length;
      renderMediaViewer();
    }

    function prevMedia(){
      const list = mediaType === 'photo'
        ? (activePhotoList.length ? activePhotoList : mediaContent.photos)
        : mediaContent.videos;
      mediaIndex = (mediaIndex - 1 + list.length) % list.length;
      renderMediaViewer();
    }

    function getPhotoTagsByFilter(filter){
      const photoByFilter = {
        all: ['all', 'camp', 'pool', 'sport', 'study', 'food'],
        camp: ['all', 'camp'],
        pool: ['pool'],
        sport: ['sport'],
        study: ['study'],
        food: ['food']
      };
      return photoByFilter[String(filter || '').trim()] || ['all', 'camp'];
    }

    function getPhotosForActiveFilter(filter = state.photoFilter){
      const tags = getPhotoTagsByFilter(filter);
      let list = mediaContent.photos.filter((item) => tags.includes(item.cat));
      if(!list.length){
        list = mediaContent.photos.filter((item) => item.cat === 'all' || item.cat === 'camp');
      }
      return list.length ? list : mediaContent.photos.slice();
    }

    function handleDataActionClick(target){
      const dispatcher = ensureActionDispatcher();
      return !!safeInvoke(dispatcher, 'handleAction', [target], false);
    }

    async function notifyLead(eventName, payload){
      const cfg = window.AC_NOTIFY_CONFIG || {};
      const enrichedPayload = {
        ...asObject(payload),
        ...buildAbMeta()
      };
      const body = {event: eventName, payload: enrichedPayload};
      const endpoint = cfg.leadEndpoint || '/api/lead';

      try {
        const response = await fetch(endpoint, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(body),
          keepalive:true
        });
        if(response.ok){
          return {ok: true, delivered: true, endpoint};
        }

        const telegramResult = await sendLeadToTelegram(eventName, enrichedPayload, cfg);
        if(telegramResult.ok){
          saveLeadFallbackMeta(eventName, endpoint, `http_${response.status}_telegram_ok`);
          return telegramResult;
        }

        saveLeadFallbackMeta(eventName, endpoint, `http_${response.status}`);
        console.warn('[LEAD_MOCK_FALLBACK]', {endpoint, body});
        return {ok: false, delivered: false, fallback: true};
      } catch(error){
        const telegramResult = await sendLeadToTelegram(eventName, enrichedPayload, cfg);
        if(telegramResult.ok){
          saveLeadFallbackMeta(eventName, endpoint, 'network_telegram_ok');
          return telegramResult;
        }
        console.error('notifyLead error', error);
        saveLeadFallbackMeta(eventName, endpoint, String(error));
        return {ok: false, delivered: false, fallback: true, error: String(error)};
      }
    }

    async function sendLeadToTelegram(eventName, payload, cfg){
      const token = String(cfg?.telegramBotToken || '');
      const chatId = String(cfg?.telegramChatId || '');
      if(!token || !chatId){
        return {ok:false, delivered:false, fallback:true, reason:'telegram_not_configured'};
      }
      try {
        const formBody = new URLSearchParams();
        formBody.set('chat_id', chatId);
        formBody.set('text', formatTelegramMessage(eventName, payload));
        formBody.set('disable_web_page_preview', 'true');
        const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method:'POST',
          body: formBody,
          keepalive:true
        });
        if(tgResponse.ok){
          return {ok:true, delivered:true, endpoint:'telegram_bot', fallback:true};
        }
      } catch(error){
      }
      return {ok:false, delivered:false, fallback:true};
    }

    function isAdminDebugSession(){
      try {
        // Production must never expose debug controls via query/localStorage toggles.
        if(isProductionRuntime()) return false;
        if(window.AC_DEBUG === true) return true;
        const search = new URLSearchParams(window.location.search || '');
        const adminFlag = (search.get('admin') || search.get('debug') || '').toLowerCase();
        if(['1', 'true', 'yes', 'on'].includes(adminFlag)) return true;
        const storedFlag = String(localStorage.getItem('aidacamp_admin_debug') || '').toLowerCase();
        return ['1', 'true', 'yes', 'on'].includes(storedFlag);
      } catch(error){
        return false;
      }
    }

    function isProductionRuntime(){
      try {
        const host = String(window.location.hostname || '').toLowerCase().replace(/^www\./, '');
        if(!host) return false;
        return PROD_DEBUGLESS_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
      } catch(error){
        return false;
      }
    }

    function isLocalRuntime(){
      try {
        const host = String(window.location.hostname || '').toLowerCase();
        return host === 'localhost' || host === '127.0.0.1';
      } catch(error){
        return false;
      }
    }

    function formatTelegramMessage(eventName, payload){
      const lines = [];

      if(eventName === 'promo_fixed'){
        lines.push('AiDaCamp • Фиксация цены');
        lines.push('');
        lines.push(`Тип: ${payload.promo_status === 'improved_again' ? 'повторное улучшение' : 'первая фиксация'}`);
        lines.push(`Телефон: ${payload.phone || 'не указан'}`);
        lines.push(`Возраст: ${payload.age || '—'}`);
        lines.push(`Смена: ${payload.shift_name || '—'}`);
        lines.push(`Даты: ${payload.shift_date || '—'}`);
        lines.push(`Цена: ${payload.price_final ? formatPrice(payload.price_final) : '—'}`);
        lines.push(`Код: ${payload.promo_code || '—'}`);
        lines.push(`Действует до: ${payload.promo_expires_at_local || '—'}`);
        lines.push('');
        lines.push(`Режим: ${payload.mode || '—'}`);
        lines.push(`Отправлено: ${payload.sent_at_local || '—'}`);
      }

      if(eventName === 'booking_submitted'){
        lines.push('AiDaCamp • Новая заявка');
        lines.push('');
        lines.push(`Имя: ${payload.name || '—'}`);
        lines.push(`Телефон: ${payload.phone || '—'}`);
        lines.push(`Возраст: ${payload.age || '—'}`);
        lines.push(`Смена: ${payload.shift_name || '—'}`);
        lines.push(`Даты: ${payload.shift_date || '—'}`);
        lines.push(`Цена: ${payload.price_text || '—'}`);
        lines.push(`Код: ${payload.promo_code || '—'}`);
        lines.push(`Статус промо: ${payload.promo_status || '—'}`);
        lines.push('');
        lines.push(`Режим: ${payload.mode || '—'}`);
        lines.push(`Отправлено: ${payload.sent_at_local || '—'}`);
      }

      if(eventName === 'booking_draft_saved'){
        lines.push('AiDaCamp • Черновик заявки');
        lines.push('');
        lines.push(`Имя: ${payload.name || '—'}`);
        lines.push(`Телефон: ${payload.phone || '—'}`);
        lines.push(`Смена: ${payload.shift_name || payload.shift_text || '—'}`);
        lines.push(`Цена: ${payload.price_text || '—'}`);
        lines.push(`Код: ${payload.promo_code || '—'}`);
        lines.push('');
        lines.push(`Отправлено: ${payload.sent_at_local || '—'}`);
      }

      if(eventName === 'promo_cancelled'){
        lines.push('AiDaCamp • Отмена промо / брони');
        lines.push('');
        lines.push(`Имя: ${payload.name || '—'}`);
        lines.push(`Телефон: ${payload.phone || '—'}`);
        lines.push(`Смена: ${payload.shift_name || '—'}`);
        lines.push(`Код: ${payload.promo_code || '—'}`);
        lines.push(`Цена: ${payload.price_final ? formatPrice(payload.price_final) : '—'}`);
        lines.push('');
        lines.push(`Отправлено: ${payload.sent_at_local || '—'}`);
      }

      if(lines.length === 0){
        lines.push('AiDaCamp lead');
        lines.push(`Event: ${eventName}`);
        lines.push(JSON.stringify(payload, null, 2));
      }

      return lines.join('\n');
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
      if(value === '7-9') return '7–9 лет';
      if(value === '10-12') return '10–12 лет';
      if(value === '13-14') return '13–14 лет';
      return '—';
    }

    function photoCatLabel(cat){
      if(cat === 'pool') return 'Бассейн';
      if(cat === 'sport') return 'Спорт';
      if(cat === 'study') return 'Учёба';
      if(cat === 'food') return 'Питание';
      if(cat === 'all') return 'Атмосфера';
      if(cat === 'camp') return 'Атмосфера';
      if(cat === 'stay') return 'Размещение';
      return cat;
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

    function clearBookingCookies(){
      const isBookingCookie = (name) => /(aidacamp|booking|promo|lead|aida|ac_)/i.test(name);
      const pairs = (document.cookie && document.cookie.split(';')) || [];
      const host = window.location.hostname || '';
      const hostParts = host.split('.').filter(Boolean);
      const baseDomain = (hostParts.length >= 2 && `.${hostParts.slice(-2).join('.')}`) || '';
      const domains = ['', host ? `;domain=${host}` : '', baseDomain ? `;domain=${baseDomain}` : ''];
      const paths = [';path=/', ';path=/;SameSite=Lax'];

      pairs.forEach((pair) => {
        const name = pair.split('=')[0].trim();
        if(!name || !isBookingCookie(name)) return;
        domains.forEach((domain) => {
          paths.forEach((path) => {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT${path}${domain}`;
          });
        });
      });
    }

    function clearProjectStorage(){
      const isProjectKey = (key) => /(aidacamp|booking|promo|lead|aida|ac_)/i.test(String(key || ''));

      try {
        const keys = [];
        for(let i = 0; i < localStorage.length; i += 1){
          const key = localStorage.key(i);
          if(key && isProjectKey(key)) keys.push(key);
        }
        keys.forEach((key) => localStorage.removeItem(key));
      } catch(e){
      }

      try {
        const keys = [];
        for(let i = 0; i < sessionStorage.length; i += 1){
          const key = sessionStorage.key(i);
          if(key && isProjectKey(key)) keys.push(key);
        }
        keys.forEach((key) => sessionStorage.removeItem(key));
      } catch(e){
      }
    }

    function saveLeadFallbackMeta(eventName, endpoint, reason = ''){
      try {
        const key = 'aidacamp_lead_fallback_meta';
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

    function resetBookingFlowDebug(){
      clearOfferTimeout();
      clearShiftOptionPanels();
      if(timerId){
        clearInterval(timerId);
        timerId = null;
      }
      offerRunId += 1;
      leadSubmitInProgress = false;
      setLeadSubmitState(false);
      closeTransientModals();

      clearProjectStorage();
      clearBookingCookies();
      metrikaSeen.clear();
      Object.keys(scrollMarks).forEach((k) => {
        scrollMarks[k] = false;
      });
      activePhotoList = [];

      const keepView = state.previewView || state.view || 'desktop';
      const keepDesktopMode = state.desktopMode || 'full';
      const keepMobileMode = state.mobileMode || 'full';
      const keepOfferModalTheme = ((state.offerModalTheme === 'dark') && 'dark') || 'light';
      const keepOfferLayout = 'current';
      state = {
        age: null,
        ageSelected: false,
        bookingCompleted: false,
        shiftId: null,
        basePrice: null,
        offerPrice: null,
        code: null,
        expiresAt: null,
        offerStage: 0,
        view: keepView,
        previewView: keepView,
        phone: '',
        desktopMode: keepDesktopMode,
        mobileMode: keepMobileMode,
        offerModalTheme: keepOfferModalTheme,
        offerLayout: keepOfferLayout,
        photoFilter: 'camp',
        faqFilter: 'Медицина',
        mobileJourneyStep: 0,
        mobileProgramShiftId: '',
        mobilePhotoIndex: 0,
        mobileVideoIndex: 0,
        mobileReviewIndex: 0,
        mobileStayIndex: 0,
        mobileFaqGroup: 'Медицина',
        mobileFaqOpenKey: '',
        mobileTeamIndex: 0,
        mobileDocsExpanded: false,
        offerSearching: false,
        debugBookingBlocks: false
      };

      ['parentName','parentPhone'].forEach((id) => {
        const input = document.getElementById(id);
        if(input) input.value = '';
      });
      const consentCheck = document.getElementById('consentCheck');
      if(consentCheck) consentCheck.checked = false;
      setPhoneError(false);
      ['desktop', 'mobile'].forEach((viewKey) => {
        const hostId = getLeadScopeConfig(getBookingViewConfig(viewKey).inlineLeadScope)?.hostId;
        const host = (hostId && document.getElementById(hostId)) || null;
        if(host){
          host.classList.add('hidden');
          host.innerHTML = '';
        }
      });
      ['desktop', 'mobile'].forEach((viewKey) => {
        const cfg = getBookingViewConfig(viewKey);
        [cfg.inlineHintId, cfg.guidedInlineHintId].forEach((id) => {
          const el = document.getElementById(id);
          if(!el) return;
          el.textContent = '';
          el.classList.remove('visible');
          delete el.dataset.requiredStep;
        });
      });
      document.querySelectorAll('[data-age].active').forEach((el) => el.classList.remove('active'));
      document.querySelectorAll('#serviceMenu [data-nav]').forEach((el) => el.classList.remove('active'));
      document.querySelector('#serviceMenu [data-nav="section-about"]')?.classList.add('active');
      if(window.history?.replaceState){
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      renderShiftCards();
      renderAll();
      switchView(keepView);
      applyDesktopMode();
      applyMobileMode();
      persist();
      showHint('Сценарий бронирования сброшен. Начните с выбора возраста.');
    }

    function getShiftContextLine(shift){
      if(!shift) return '';
      if(!hasSelectedAge()){
        return '';
      }
      const age = ageLabel(state.age);
      return `Подходит для ${age}.`;
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

    function getResolvedPrimaryActionText(actionState, shift){
      if(!actionState) return '';
      if(!shift || state.offerStage < 1){
        return actionState.text || '';
      }
      const baseForGain = state.basePrice || shift.price || 0;
      const gainValue = Math.max(0, baseForGain - (state.offerPrice || baseForGain));
      return gainValue > 0
        ? `Завершить бронирование · выгода ${formatPrice(gainValue)}`
        : 'Завершить бронирование';
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
    const BOOKING_STAGE2_VERTICAL_ALIGN = Object.freeze({
      top: Object.freeze({flex: 'flex-start', grid: 'start'}),
      center: Object.freeze({flex: 'center', grid: 'center'}),
      bottom: Object.freeze({flex: 'flex-end', grid: 'end'})
    });
    const BOOKING_STAGE2_HORIZONTAL_ALIGN = Object.freeze({
      left: Object.freeze({flex: 'flex-start', grid: 'start'}),
      center: Object.freeze({flex: 'center', grid: 'center'}),
      right: Object.freeze({flex: 'flex-end', grid: 'end'}),
      stretch: Object.freeze({flex: 'stretch', grid: 'stretch'})
    });

    const BOOKING_VIEWS = Object.freeze({
      desktop: Object.freeze({
        key: 'desktop',
        cardId: 'desktop-booking-card',
        shiftOptionsId: 'desktop-shift-options',
        infoId: 'desktop-booking-info',
        titleId: 'desktopBookingTitle',
        leadId: 'desktopBookingLead',
        startBtnId: 'desktopStartBtn',
        hintId: 'desktopBookingHint',
        stepsId: 'desktopBookingSteps',
        inlineHintId: 'desktopBookingHintInline',
        shiftListId: 'desktopShiftList',
        ctaWrapId: 'desktopCtaWrap',
        ageTabsId: 'desktopAgeTabs',
        summaryChipsId: 'desktopBookingSummaryChips',
        ageChipId: 'desktopAgeChip',
        ageChipTextId: 'desktopAgeChipText',
        shiftChipId: 'desktopShiftChip',
        shiftChipTextId: 'desktopShiftChipText',
        guidedInlineHintId: 'desktopInlineHint',
        inlineLeadScope: 'booking-desktop',
        stage2Align: Object.freeze({
          vertical: 'center',
          horizontal: 'stretch'
        })
      }),
      mobile: Object.freeze({
        key: 'mobile',
        cardId: 'mobileBookingCard',
        shiftOptionsId: 'mobileShiftOptions',
        infoId: 'mobile-booking-info',
        titleId: 'mobileBookingTitle',
        leadId: 'mobileBookingLead',
        startBtnId: 'mobileStartBtn',
        hintId: 'mobileBookingHint',
        stepsId: 'mobileBookingSteps',
        inlineHintId: 'mobileBookingHintInline',
        shiftListId: 'mobileShiftList',
        ctaWrapId: 'mobileCtaWrap',
        ageTabsId: 'mobileAgeTabs',
        summaryChipsId: 'mobileBookingSummaryChips',
        ageChipId: 'mobileAgeChip',
        ageChipTextId: 'mobileAgeChipText',
        shiftChipId: 'mobileShiftChip',
        shiftChipTextId: 'mobileShiftChipText',
        guidedInlineHintId: 'mobileInlineHint',
        inlineLeadScope: 'booking-mobile',
        stage2Align: Object.freeze({
          vertical: 'center',
          horizontal: 'stretch'
        })
      })
    });
    let bookingCardMinHeightFrame = 0;

    function getBookingViewConfig(viewKey){
      if(viewKey === 'mobile') return BOOKING_VIEWS.mobile;
      return BOOKING_VIEWS.desktop;
    }

    function getRenderableBookingViewKeys(){
      if(USE_DESKTOP_BASE_FOR_MOBILE){
        return ['desktop'];
      }
      return ['desktop', 'mobile'];
    }

    function getActiveBookingViewKeys(){
      if(state.previewView === 'mobile' && !USE_DESKTOP_BASE_FOR_MOBILE){
        return ['mobile'];
      }
      return ['desktop'];
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
      if(value === 'center') return BOOKING_STAGE2_VERTICAL_ALIGN.center;
      if(value === 'bottom') return BOOKING_STAGE2_VERTICAL_ALIGN.bottom;
      return BOOKING_STAGE2_VERTICAL_ALIGN.top;
    }

    function resolveStage2HorizontalAlign(value){
      if(value === 'left') return BOOKING_STAGE2_HORIZONTAL_ALIGN.left;
      if(value === 'center') return BOOKING_STAGE2_HORIZONTAL_ALIGN.center;
      if(value === 'right') return BOOKING_STAGE2_HORIZONTAL_ALIGN.right;
      return BOOKING_STAGE2_HORIZONTAL_ALIGN.stretch;
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

    function applyBookingStructureSchema(viewCfg){
      const cfg = resolveBookingViewCfg(viewCfg);
      const card = document.getElementById(cfg.cardId);
      if(!card) return;
      const stage = getBookingStage();

      card.querySelectorAll('[data-booking-region]').forEach((node) => {
        delete node.dataset.bookingRegion;
        delete node.dataset.bookingRegionLabel;
        delete node.dataset.bookingRegionZero;
        delete node.dataset.bookingRegionLabelSide;
      });

      const mainSelector = (() => {
        if(stage === 2) return '.booking-step-2';
        if(stage >= 3) return `#${cfg.infoId}`;
        return '.booking-step-1';
      })();

      const structureMap = Object.freeze({
        top: `#${cfg.stepsId}`,
        chips: `#${cfg.summaryChipsId}`,
        header: `#${cfg.titleId}`,
        main: mainSelector,
        bottom: '.booking-step-3'
      });
      const regionLabelSideMap = Object.freeze({
        top: 'right',
        chips: 'right',
        header: 'left',
        main: 'right',
        bottom: 'left'
      });

      const resolveRegionLabel = (regionName, node) => {
        if(!node) return regionName;
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const isZeroHeight = style.display === 'none' || style.visibility === 'hidden' || node.offsetHeight === 0 || rect.height < 1;
        return (isZeroHeight && `${regionName} 0`) || regionName;
      };

      const isRegionZero = (node) => {
        if(!node) return false;
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return style.display === 'none' || style.visibility === 'hidden' || node.offsetHeight === 0 || rect.height < 1;
      };

      Object.entries(structureMap).forEach(([regionName, selector]) => {
        const node = card.querySelector(selector);
        if(!node) return;
        node.dataset.bookingRegion = regionName;
        node.dataset.bookingRegionLabel = resolveRegionLabel(regionName, node);
        node.dataset.bookingRegionZero = String(Number(isRegionZero(node)));
        node.dataset.bookingRegionLabelSide = regionLabelSideMap[regionName] || 'left';
      });
    }

    function ensureStage2TransferHost(stepThree){
      if(!stepThree) return null;
      let host = stepThree.querySelector('.booking-stage2-transfer-host');
      if(!host){
        host = document.createElement('div');
        host.className = 'booking-stage2-transfer-host';
      }
      return host;
    }

    function placeStage2ContentForView(cfg, stage, bookingCard){
      if(!cfg || !bookingCard) return;
      const stepTwo = bookingCard.querySelector('.booking-step-2');
      const stepThree = bookingCard.querySelector('.booking-step-3');
      if(!stepTwo || !stepThree) return;

      const allShiftsBtn = bookingCard.querySelector('.booking-all-shifts-link');
      const host = ensureStage2TransferHost(stepThree);
      if(!host) return;

      const toTransfer = [allShiftsBtn].filter(Boolean);
      const insertBackToStepTwo = (node) => {
        const anchor = stepTwo.querySelector('.guided-inline-hint');
        if(anchor && anchor.parentElement === stepTwo){
          if(anchor.nextSibling){
            stepTwo.insertBefore(node, anchor.nextSibling);
          } else {
            stepTwo.appendChild(node);
          }
          return;
        }
        stepTwo.appendChild(node);
      };

      if(stage === 2){
        if(host.parentElement !== stepThree){
          stepThree.prepend(host);
        }
        toTransfer.forEach((node) => host.appendChild(node));
        stepThree.classList.add('booking-stage2-transfer-enabled');
        return;
      }

      if(host.parentElement){
        toTransfer.forEach((node) => insertBackToStepTwo(node));
        host.remove();
      }
      stepThree.classList.remove('booking-stage2-transfer-enabled');
    }

    function syncCompletedBookingScaffold(viewCfg, bookingCard){
      const cfg = resolveBookingViewCfg(viewCfg);
      const card = bookingCard || document.getElementById(cfg.cardId);
      if(!card) return;
      const stepsRoot = document.getElementById(cfg.stepsId);
      const chipHost = document.getElementById(cfg.summaryChipsId);
      const stepThree = card.querySelector('.booking-step-3');
      if(!stepsRoot || !stepThree) return;

      let topClose = stepsRoot.querySelector('.booking-completed-top-close');
      let chipBar = chipHost?.querySelector('.booking-completed-chipbar');
      let bottomWrap = stepThree.querySelector('.booking-completed-bottom');

      if(state.bookingCompleted){
        stepsRoot.classList.add('booking-steps-completed');
        if(topClose){
          topClose.remove();
        }
        if(chipHost){
          chipHost.classList.add('visible', 'booking-summary-chips--completed');
          if(!chipBar){
            chipBar = document.createElement('div');
            chipBar.className = 'booking-completed-chipbar';
            chipHost.appendChild(chipBar);
          }
          chipBar.innerHTML = `
            <span class="booking-completed-chipbar-title">Что дальше?</span>
            <button type="button" class="booking-completed-top-close booking-completed-chipbar-close" data-action="reset-booking-all" aria-label="Сбросить бронирование">
              <img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">
            </button>
          `;
        }
        if(!bottomWrap){
          bottomWrap = document.createElement('div');
          bottomWrap.className = 'booking-completed-bottom';
          stepThree.appendChild(bottomWrap);
        }
        bottomWrap.innerHTML = '<a class="completed-followup-link completed-followup-link--bottom cta-main" href="#" data-action="copy-invite-link">Копировать ссылку приглашение</a>';
        stepThree.classList.add('booking-completed-bottom-step');
        return;
      }

      stepsRoot.classList.remove('booking-steps-completed');
      if(topClose) topClose.remove();
      if(chipBar) chipBar.remove();
      if(chipHost){
        chipHost.classList.remove('booking-summary-chips--completed');
      }
      if(bottomWrap) bottomWrap.remove();
      stepThree.classList.remove('booking-completed-bottom-step');
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

    function renderGuidedState(viewCfg){
      return safeInvoke(ensureGuidedStateFlow(), 'renderGuidedState', [viewCfg], null);
    }

    function pulseNode(node){
      return safeInvoke(ensureBookingHintFlow(), 'pulseNode', [node], null);
    }

    function nudgeUserToNextStep(message = 'Сначала завершите предыдущий шаг.'){
      return safeInvoke(ensureBookingHintFlow(), 'nudgeUserToNextStep', [message], null);
    }

    function showHint(message, requiredStep = ''){
      return safeInvoke(ensureBookingHintFlow(), 'showHint', [message, requiredStep], null);
    }

    function syncBookingHints(){
      return safeInvoke(ensureBookingHintFlow(), 'syncBookingHints', [], null);
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

      const days = extract(/(\d+)\s*(?:д(?:ень|ня|ней)?|[dDД])/);
      const hours = extract(/(\d+)\s*(?:час(?:а|ов)?|[hHчЧ])/);
      const minutes = extract(/(\d+)\s*(?:мин(?:ут(?:а|ы)?|ут)?|[mMмМ])/);
      const seconds = extract(/(\d+)\s*(?:сек(?:унд(?:а|ы)?|унд)?|[sSсС])/);
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

    function formatOfferDeadline(ts){
      if(!ts) return '';
      const date = new Date(ts);
      if(Number.isNaN(date.getTime())) return '';
      const formatted = date.toLocaleString('ru-RU', {
        day:'numeric',
        month:'long',
        hour:'numeric',
        minute:'2-digit'
      });
      return formatted.replace(/\b0(\d):(\d{2})\b/, '$1:$2');
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
        node.innerHTML = `
          <span class="booking-scarcity-progress" aria-hidden="true">
            <span class="booking-scarcity-progress-fill"></span>
          </span>
          <span class="booking-scarcity-text"><strong>${percent}%</strong> мест уже занято</span>
        `;
        if(enteredStageFour){
          node.classList.remove('is-animating');
          void node.offsetWidth;
          node.classList.add('is-animating');
        }
      });
    }

    function stopBookingStage1TitleTypewriter(){
      return safeInvoke(ensureBookingViewFlow(), 'stopBookingStage1TitleTypewriter', [], null);
    }

    function runBookingStage1TitleTypewriter(target, text){
      return safeInvoke(ensureBookingViewFlow(), 'runBookingStage1TitleTypewriter', [target, text], null);
    }

    function renderBookingInfo(viewCfg){
      return safeInvoke(ensureBookingViewFlow(), 'renderBookingInfo', [viewCfg], null);
    }

    function renderBookingPanels(){
      return safeInvoke(ensureBookingViewFlow(), 'renderBookingPanels', [], null);
    }

    function getViewportPreviewView(){
      return safeInvoke(ensureViewModeFlow(), 'getViewportPreviewView', [], () => {
        return (window.matchMedia('(max-width: 900px)').matches && 'mobile') || 'desktop';
      });
    }

    function switchView(view){
      return safeInvoke(ensureViewModeFlow(), 'switchView', [view], null);
    }

    function applyHeroContrastMode(){
      return safeInvoke(ensureViewModeFlow(), 'applyHeroContrastMode', [], null);
    }

    function switchHeroContrastMode(mode){
      return safeInvoke(ensureViewModeFlow(), 'switchHeroContrastMode', [mode], null);
    }

    function applyHeroMicroMode(){
      return safeInvoke(ensureViewModeFlow(), 'applyHeroMicroMode', [], null);
    }

    function switchHeroMicroMode(mode){
      return safeInvoke(ensureViewModeFlow(), 'switchHeroMicroMode', [mode], null);
    }

    function applyOfferModalTheme(cardEl = null){
      return safeInvoke(ensureViewModeFlow(), 'applyOfferModalTheme', [cardEl], null);
    }

    function switchOfferModalTheme(mode){
      return safeInvoke(ensureViewModeFlow(), 'switchOfferModalTheme', [mode], null);
    }

    function applyOfferLayoutMode(){
      const mode = normalizeMode(state.offerLayout, OFFER_LAYOUT_MODES, 'current');
      const currentBtn = document.getElementById('offerLayoutCurrentBtn');
      if(currentBtn){
        currentBtn.classList.toggle('active', mode === 'current');
      }
      const card = document.getElementById('offerCard');
      if(card){
        card.dataset.offerLayout = mode;
      }
    }

    function switchOfferLayout(mode){
      return safeInvoke(ensureViewModeFlow(), 'switchOfferLayout', [mode], null);
    }

    function applyDesktopMode(){
      return safeInvoke(ensureViewModeFlow(), 'applyDesktopMode', [], null);
    }

    function switchDesktopMode(mode){
      return safeInvoke(ensureViewModeFlow(), 'switchDesktopMode', [mode], null);
    }

    function applyMobileMode(){
      return safeInvoke(ensureViewModeFlow(), 'applyMobileMode', [], () => {
        if(USE_DESKTOP_BASE_FOR_MOBILE){
          return;
        }
        applyMobileSectionAccordion();
      });
    }

    function switchMobileMode(mode){
      return safeInvoke(ensureViewModeFlow(), 'switchMobileMode', [mode], null);
    }

    // SECTION 6: View mode controls (desktop/mobile, full/compact).
    document.getElementById('fullModeBtn')?.addEventListener('click', () => switchDesktopMode('full'));
    document.getElementById('compactModeBtn')?.addEventListener('click', () => {
      const nextMode = (state.desktopMode === 'compact' && 'full') || 'compact';
      switchDesktopMode(nextMode);
    });
    if(!USE_DESKTOP_BASE_FOR_MOBILE){
      document.getElementById('mobileFullModeBtn')?.addEventListener('click', () => switchMobileMode('full'));
      document.getElementById('mobileCompactModeBtn')?.addEventListener('click', () => switchMobileMode('compact'));
      document.getElementById('mobileModeToggle')?.addEventListener('click', () => {
        switchMobileMode((state.mobileMode === 'full' && 'compact') || 'full');
      });
    }

    // SECTION 7: Event bindings (single action pipeline, no direct business logic in handlers).
    document.addEventListener('click', (e) => {
      if(handleDataActionClick(e.target)){
        return;
      }
    });

    function formatPrice(v){
      return new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
    }

    function labelAge(v){
      if(v === '7-9') return '7–9 лет';
      if(v === '10-12') return '10–12 лет';
      return '13–14 лет';
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

    function toggleShiftOptionPanel(viewKey, panelType, shiftId){
      const safeView = resolveViewKey(viewKey);
      safeInvoke(ensureCalendarFlow(), 'toggleShiftOptionPanel', [safeView, panelType, shiftId], () => {
        const current = shiftOptionPanels[safeView]?.[panelType] || null;
        shiftOptionPanels[safeView][panelType] = (current !== shiftId && shiftId) || null;
        renderShiftOptions(safeView);
      });
    }

    function clearShiftOptionPanels(){
      safeInvoke(ensureCalendarFlow(), 'clearShiftOptionPanels', [], () => {
        shiftOptionPanels = {
          desktop:{aboutId:null, calendarId:null},
          mobile:{aboutId:null, calendarId:null}
        };
      });
    }

    function parseShiftDate(dateStr){
      return safeInvoke(ensureCalendarFlow(), 'parseShiftDate', [dateStr], () => {
        const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if(!m) return null;
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      });
    }

    function renderCalendar(shift){
      return safeInvoke(ensureCalendarFlow(), 'renderCalendar', [shift], null);
    }

    function renderSeasonCalendar(){
      return safeInvoke(ensureCalendarFlow(), 'renderSeasonCalendar', [], null);
    }

    function openCalendar(shiftId){
      return safeInvoke(ensureCalendarFlow(), 'openCalendar', [shiftId], null);
    }

    function openSeasonCalendar(){
      return safeInvoke(ensureCalendarFlow(), 'openSeasonCalendar', [], null);
    }

    function closeCalendar(){
      return safeInvoke(ensureCalendarFlow(), 'closeCalendar', [], null);
    }

    function selectedShiftPayload(){
      return safeInvoke(ensureBookingRuntimeBridge(), 'selectedShiftPayload', [{
        state,
        getSelectedShift,
        shiftDaysLabel
      }], () => ({}));
    }

    function clearOfferTimeout(){
      return safeInvoke(ensureBookingRuntimeBridge(), 'clearOfferTimeout', [{
        getTimeoutIds: () => offerTimeoutIds,
        setTimeoutIds: (next = []) => {
          offerTimeoutIds = Array.isArray(next) ? next : [];
        },
        clearTimeoutFn: clearTimeout
      }], null);
    }

    function resetOfferState({preserveShift = true} = {}){
      return safeInvoke(ensureBookingRuntimeBridge(), 'resetOfferState', [{
        preserveShift,
        state,
        getTimeoutIds: () => offerTimeoutIds,
        setTimeoutIds: (next = []) => {
          offerTimeoutIds = Array.isArray(next) ? next : [];
        },
        clearTimeoutFn: clearTimeout
      }], null);
    }

    function buildBookingSummaryHtml({showTimer = false} = {}){
      return safeInvoke(ensureBookingRuntimeBridge(), 'buildBookingSummaryHtml', [{
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

    function generateCode(){
      return 'AC-' + Math.random().toString(36).slice(2,6).toUpperCase();
    }

    function buildInviteClipboardText(){
      const currentCode = String(state.code || 'aidacamp').trim();
      const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(currentCode)}`;
      return `Ссылка: ${inviteUrl}`;
    }

    function bindAgeTabs(rootId){
      const root = document.getElementById(rootId);
      if(!root) return;
      root.querySelectorAll('[data-age]').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('[data-age]').forEach(x => x.classList.remove('active'));
          btn.classList.add('active');
          Object.assign(state, {
            age: btn.dataset.age,
            ageSelected: true,
            shiftId: null,
            basePrice: null,
            offerPrice: null,
            code: null,
            expiresAt: null,
            offerStage: 0,
            bookingCompleted: false
          });
          renderAll();
          persist();
          const scope = state.previewView === 'mobile' ? 'booking-mobile' : 'booking-desktop';
          HERO_V3_SIMPLE_ENABLED && window.setTimeout(() => openInlineLead(scope), 0);
        });
      });
    }

    function focusMobileAgeGate(){
      const gate = (USE_DESKTOP_BASE_FOR_MOBILE
        ? document.getElementById('desktopAgeTabs')
        : (document.getElementById('mobileAgeGateCard') || document.getElementById('mobileAgeTabs')));
      if(!gate) return;
      gate.scrollIntoView({behavior:'smooth', block:'center'});
      gate.classList.add('guided-pulse');
      setTimeout(() => gate.classList.remove('guided-pulse'), 1100);
    }

    function waitDesktopAgeTapHint(ms){
      return new Promise(resolve => {
        setTimeout(resolve, ms);
      });
    }

    function canRunDesktopAgeTapHint(){
      const card = document.getElementById('desktop-booking-card');
      if(HERO_V3_SIMPLE_ENABLED || !card || !card.classList.contains('booking-stage-1')) return false;
      if(state.previewView === 'mobile') return false;
      if(state.previewView !== 'desktop') return false;
      if(hasSelectedAge() || state.ageSelected) return false;
      const tabs = document.getElementById('desktopAgeTabs');
      if(!tabs) return false;
      return tabs.querySelectorAll('.age-tab[data-age]').length >= 3;
    }

    function ensureDesktopAgeTapHintNode(){
      const tabs = document.getElementById('desktopAgeTabs');
      if(!tabs) return null;
      let hint = tabs.querySelector('.age-tap-hint');
      if(hint) return hint;
      hint = document.createElement('div');
      hint.className = 'age-tap-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML = '<span class="age-tap-finger"></span><span class="age-tap-ripple"></span><span class="age-tap-ripple delay"></span>';
      tabs.appendChild(hint);
      return hint;
    }

    function placeDesktopAgeTapHint(hintNode, ageRow){
      if(!hintNode || !ageRow) return;
      const host = hintNode.parentElement;
      if(!host) return;
      const hostRect = host.getBoundingClientRect();
      const rowRect = ageRow.getBoundingClientRect();
      const x = Math.max(8, rowRect.right - hostRect.left - 60);
      const y = Math.max(6, rowRect.top - hostRect.top - 2);
      hintNode.style.setProperty('--age-hint-x', `${Math.round(x)}px`);
      hintNode.style.setProperty('--age-hint-y', `${Math.round(y)}px`);
    }

    function clearDesktopAgeTapHintRows(){
      const tabs = document.getElementById('desktopAgeTabs');
      if(!tabs) return;
      tabs.querySelectorAll('.age-tab.is-hint-target, .age-tab.is-hint-tapping').forEach((row) => {
        row.classList.remove('is-hint-target', 'is-hint-tapping');
      });
    }

    function pulseDesktopAgeTapHint(hintNode, ageRow){
      if(!hintNode) return;
      hintNode.classList.remove('is-tapping');
      void hintNode.offsetWidth;
      hintNode.classList.add('is-tapping');
      if(ageRow){
        ageRow.classList.add('is-hint-target');
        ageRow.classList.remove('is-hint-tapping');
        void ageRow.offsetWidth;
        ageRow.classList.add('is-hint-tapping');
        setTimeout(() => {
          ageRow.classList.remove('is-hint-tapping');
        }, 680);
      }
    }

    function hideDesktopAgeTapHint(){
      const hintNode = document.querySelector('#desktopAgeTabs .age-tap-hint');
      if(!hintNode) return;
      hintNode.classList.remove('is-visible', 'is-tapping');
      clearDesktopAgeTapHintRows();
    }

    async function runDesktopAgeTapHint(){
      if(desktopAgeTapHintPlayed || desktopAgeTapHintRunning) return;
      if(!canRunDesktopAgeTapHint()) return;
      const hintNode = ensureDesktopAgeTapHintNode();
      const tabs = document.getElementById('desktopAgeTabs');
      if(!hintNode || !tabs) return;
      const ageRows = [...tabs.querySelectorAll('.age-tab[data-age]')];
      if(!ageRows.length) return;

      desktopAgeTapHintRunning = true;
      const runToken = ++desktopAgeTapHintToken;
      hintNode.classList.add('is-visible');

      for(let rowIndex = 0; rowIndex < ageRows.length; rowIndex += 1){
        const ageRow = ageRows[rowIndex];
        if(runToken !== desktopAgeTapHintToken || !canRunDesktopAgeTapHint()) break;
        clearDesktopAgeTapHintRows();
        ageRow.classList.add('is-hint-target');
        placeDesktopAgeTapHint(hintNode, ageRow);
        await waitDesktopAgeTapHint((rowIndex === 0 && 320) || 1000);
        for(let tapIndex = 0; tapIndex < 3; tapIndex += 1){
          if(runToken !== desktopAgeTapHintToken || !canRunDesktopAgeTapHint()) break;
          pulseDesktopAgeTapHint(hintNode, ageRow);
          await waitDesktopAgeTapHint(680);
          if(tapIndex < 2){
            await waitDesktopAgeTapHint(120);
          }
        }
        hintNode.classList.remove('is-tapping');
        await waitDesktopAgeTapHint(120);
      }

      hintNode.classList.remove('is-visible', 'is-tapping');
      clearDesktopAgeTapHintRows();
      desktopAgeTapHintRunning = false;
      desktopAgeTapHintPlayed = true;
    }

    function syncDesktopAgeTapHintVisibility(){
      const hintNode = document.querySelector('#desktopAgeTabs .age-tap-hint');
      if(!hintNode) return;
      if(desktopAgeTapHintRunning && canRunDesktopAgeTapHint()){
        hintNode.classList.add('is-visible');
        return;
      }
      hintNode.classList.remove('is-visible', 'is-tapping');
      clearDesktopAgeTapHintRows();
    }

    function scheduleDesktopAgeTapHint(){
      if(desktopAgeTapHintPlayed || desktopAgeTapHintRunning) return;
      if(!canRunDesktopAgeTapHint()) return;
      if(desktopAgeTapHintTimer){
        return;
      }
      const elapsedMs = Date.now() - desktopAgeTapHintStartedAt;
      const isFirstRun = desktopAgeTapHintToken === 0;
      const delayMs = isFirstRun
        ? Math.max(0, 7000 - elapsedMs)
        : 7000;
      desktopAgeTapHintTimer = setTimeout(() => {
        desktopAgeTapHintTimer = null;
        runDesktopAgeTapHint().catch(() => {
          desktopAgeTapHintRunning = false;
          hideDesktopAgeTapHint();
        });
      }, delayMs);
    }

    function clearVariantFlowFingerTimer(){
      if(!variantFlowFingerTimer) return;
      window.clearTimeout(variantFlowFingerTimer);
      variantFlowFingerTimer = null;
    }

    function waitVariantFlow(ms, runId){
      return new Promise((resolve) => {
        variantFlowFingerTimer = window.setTimeout(() => {
          variantFlowFingerTimer = null;
          resolve(runId === variantFlowRunId);
        }, ms);
      });
    }

    function ensureVariantFlowFinger(){
      let node = document.getElementById('variantFlowFinger');
      if(!node){
        node = document.createElement('div');
        node.id = 'variantFlowFinger';
        node.className = 'variant-flow-finger';
        node.setAttribute('aria-hidden', 'true');
        document.body.appendChild(node);
      }
      if(!node.querySelector('.variant-flow-finger-glyph')){
        node.innerHTML = `
          <span class="variant-flow-finger-glyph" aria-hidden="true"></span>
          <span class="variant-flow-finger-ripple" aria-hidden="true"></span>
          <span class="variant-flow-finger-ripple delay" aria-hidden="true"></span>
        `;
      }
      return node;
    }

    function hideVariantFlowFinger(){
      const node = document.getElementById('variantFlowFinger');
      if(node){
        node.classList.remove('visible', 'is-tapping');
      }
      document.querySelectorAll('.variant-flow-target').forEach((el) => {
        el.classList.remove('variant-flow-target');
      });
    }

    function stopVariantFlowScenario(){
      variantFlowRunId += 1;
      clearVariantFlowFingerTimer();
      hideVariantFlowFinger();
    }

    function placeVariantFlowFinger(finger, targetEl){
      if(!finger || !targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      const x = rect.left + (rect.width * 0.5);
      const y = rect.top + (rect.height * 0.5);
      finger.style.setProperty('--variant-flow-x', `${Math.round(x)}px`);
      finger.style.setProperty('--variant-flow-y', `${Math.round(y)}px`);
      finger.classList.add('visible');
    }

    async function runVariantFlowForTargets(targets, runId){
      const finger = ensureVariantFlowFinger();
      if(!finger || !targets.length) return;
      for(const target of targets){
        if(runId !== variantFlowRunId) return;
        if(!target || !target.isConnected) continue;
        document.querySelectorAll('.variant-flow-target').forEach((el) => el.classList.remove('variant-flow-target'));
        target.classList.add('variant-flow-target');
        placeVariantFlowFinger(finger, target);
        const warmupOk = await waitVariantFlow(260, runId);
        if(!warmupOk) return;
        for(let tap = 0; tap < 3; tap += 1){
          if(runId !== variantFlowRunId) return;
          finger.classList.remove('is-tapping');
          void finger.offsetWidth;
          finger.classList.add('is-tapping');
          const tapOk = await waitVariantFlow(360, runId);
          if(!tapOk) return;
          if(tap < 2){
            const pauseOk = await waitVariantFlow(220, runId);
            if(!pauseOk) return;
          }
        }
        const settleOk = await waitVariantFlow(360, runId);
        if(!settleOk) return;
      }
    }

    function getVariantFlowKey(){
      const variant = heroVariantState || resolveHeroVariantFromUtm();
      const tier = variant.tier || HERO_VARIANT_DEFAULT_TIER;
      const mode = resolveVariantCoachMode(tier);
      const view = resolveViewKey(state.previewView);
      return `${tier}:${mode}:${view}`;
    }

    async function runVariantFlowScenario(){
      if(!hasSelectedAge() || !!state.shiftId || getBookingStage() !== 2 || state.bookingCompleted){
        hideVariantFlowFinger();
        return;
      }
      const variant = heroVariantState || resolveHeroVariantFromUtm();
      const tier = variant.tier || HERO_VARIANT_DEFAULT_TIER;
      const mode = resolveVariantCoachMode(tier);
      const runId = ++variantFlowRunId;
      const flowKey = getVariantFlowKey();
      if(variantFlowCompletedKey === flowKey){
        return;
      }
      hideVariantFlowFinger();
      const preWaitOk = await waitVariantFlow(320, runId);
      if(!preWaitOk || runId !== variantFlowRunId) return;

      if(mode === 'info'){
        const cfg = getPrimaryBookingViewConfig();
        const host = document.getElementById(cfg.shiftOptionsId || '');
        const infoButtons = (host && [...host.querySelectorAll('[data-action="toggle-shift-about"]')].slice(0, 2)) || [];
        await runVariantFlowForTargets(infoButtons, runId);
      } else if(state.previewView === 'mobile'){
        setHeroMenuOpen(true);
        const openOk = await waitVariantFlow(280, runId);
        if(!openOk || runId !== variantFlowRunId) return;
        const shiftsMenuBtn = document.querySelector('#serviceMenu [data-nav="section-programs"]');
        await runVariantFlowForTargets([].concat(shiftsMenuBtn || []), runId);
        if(runId === variantFlowRunId){
          setHeroMenuOpen(false);
        }
      } else {
        const cfg = getPrimaryBookingViewConfig();
        const card = document.getElementById(cfg.cardId || '');
        const allShiftsBtn = card?.querySelector('.booking-all-shifts-link');
        await runVariantFlowForTargets([].concat(allShiftsBtn || []), runId);
      }

      if(runId === variantFlowRunId){
        hideVariantFlowFinger();
        variantFlowCompletedKey = flowKey;
      }
    }

    function scheduleVariantFlowScenario(){
      if(HERO_V3_SIMPLE_ENABLED || !hasSelectedAge() || !!state.shiftId || getBookingStage() !== 2 || state.bookingCompleted){
        stopVariantFlowScenario();
        return;
      }
      runVariantFlowScenario().catch(() => {
        stopVariantFlowScenario();
      });
    }

    function resetAgeSelection(){
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

      ['desktopAgeTabs','mobileAgeTabs'].forEach(id => {
        const root = document.getElementById(id);
        if(root){
          root.querySelectorAll('[data-age]').forEach(x => x.classList.remove('active'));
        }
      });

      renderAll();
      persist();
    }

    function resetShiftSelection(){
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

    bindAgeTabs('desktopAgeTabs');
    if(!USE_DESKTOP_BASE_FOR_MOBILE){
      bindAgeTabs('mobileAgeTabs');
    }

    function getShiftSummaryLines(ageKey){
      const summaryByAge = {
        '7-9': [
          'IT-проекты: Scratch / Python',
          'Бассейн каждый день',
          'Живая среда без гаджетного залипания',
          'Подходит для 7–9 лет'
        ],
        '10-12': [
          'Python и командные мини-спринты',
          'Бассейн и спорт ежедневно',
          'Командные роли и самостоятельность',
          'Подходит для 10–12 лет'
        ],
        '13-14': [
          'AI-практика и проектная защита',
          'Спорт + живая лагерная среда',
          'Меньше телефонов, больше результата',
          'Подходит для 13–14 лет'
        ]
      };
      return summaryByAge[ageKey] || summaryByAge['7-9'];
    }

    function getShiftCardTagline(shift){
      if(!shift) return '';
      return shift.desc || '';
    }

    function getShiftDisplayDescription(shift){
      if(!shift) return '';
      if(!hasSelectedAge()) return shift.desc || '';
      return getShiftAgeFocusedDescription(shift, state.age || '7-9');
    }

    function normalizeShiftText(value){
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function getShiftAgeFocusedDescription(shift, ageKey){
      if(!shift) return '';
      const full = String(shift.fullDesc || '').replace(/\r/g, '').trim();
      if(!full) return shift.desc || '';
      const compact = normalizeShiftText(full);
      const firstPart = normalizeShiftText(
        compact.split(/Для\s+(?:7[–-]9|10[–-]12|13[–-]14)\s+лет:/i)[0] || ''
      );

      const markerPatternByAge = {
        '7-9': 'Для\\s+7[–-]9\\s+лет:',
        '10-12': 'Для\\s+10[–-]12\\s+лет:',
        '13-14': 'Для\\s+13[–-]14\\s+лет:'
      };
      const ageLabelByAge = {
        '7-9': 'Для 7–9 лет:',
        '10-12': 'Для 10–12 лет:',
        '13-14': 'Для 13–14 лет:'
      };
      const markerPattern = markerPatternByAge[ageKey] || markerPatternByAge['7-9'];
      const ageLabel = ageLabelByAge[ageKey] || ageLabelByAge['7-9'];
      const agePartMatch = compact.match(
        new RegExp(`${markerPattern}\\s*([\\s\\S]*?)(?=\\s*Для\\s+(?:7[–-]9|10[–-]12|13[–-]14)\\s+лет:|$)`, 'i')
      );
      const agePart = normalizeShiftText(agePartMatch?.[1] || '');

      const sentences = compact.match(/[^.!?]+[.!?]?/g) || [];
      const finalPart = normalizeShiftText((sentences.length && sentences[sentences.length - 1]) || '');

      const result = [];
      if(firstPart) result.push(firstPart);
      if(agePart) result.push(`${ageLabel} ${agePart}`);
      if(finalPart && !result.includes(finalPart)){
        result.push(finalPart);
      }
      return result.join(' ').trim();
    }

    function openShiftAboutModal(shiftId){
      const modal = document.getElementById('sectionModal');
      const titleEl = document.getElementById('sectionModalTitle');
      const bodyEl = document.getElementById('sectionModalBody');
      const shift = shifts.find((item) => item.id === shiftId);
      if(!modal || !titleEl || !bodyEl || !shift) return false;

      closeTransientModals('section');
      const isCompactDesktop = state.previewView === 'desktop' && state.desktopMode === 'compact';
      const isMobilePanel = state.previewView === 'mobile';
      modal.classList.toggle('section-modal-compact', isCompactDesktop);
      modal.classList.toggle('section-modal-mobile', isMobilePanel);

      const start = parseShiftDate(shift.start);
      const end = parseShiftDate(shift.end);
      const startText = (start && start.toLocaleDateString('ru-RU')) || shift.start;
      const endText = (end && end.toLocaleDateString('ru-RU')) || shift.end;
      const summaryLines = getShiftSummaryLines(state.age || '7-9');

      titleEl.textContent = `${shift.label || `Смена ${shift.title}`}: программа`;
      bodyEl.innerHTML = `
        <article class="shift-modal-content">
          <div class="shift-modal-content__meta">
            <strong>${shift.dates}</strong>
            <span>${formatPrice(shift.price)} · ${shiftDaysLabel(shift)} · осталось ${shift.left} мест</span>
          </div>
          <p class="shift-modal-content__desc"><strong>Коротко:</strong> ${shift.desc}</p>
          <p class="shift-modal-content__desc"><strong>Подробно:</strong> ${getShiftDisplayDescription(shift)}</p>
          <ul class="shift-modal-content__list">
            ${summaryLines.map((line) => `<li>${line}</li>`).join('')}
          </ul>
          <div class="shift-modal-content__dates">
            <div><strong>Заезд:</strong> ${startText}</div>
            <div><strong>Выезд:</strong> ${endText}</div>
          </div>
        </article>
      `;

      modal.classList.remove('hidden');
      applyCompactSectionModalLayout();
      return true;
    }

    function renderShiftOptions(viewKey){
      const safeViewKey = resolveViewKey(viewKey);
      const targetId = resolveShiftOptionsTargetId(safeViewKey);
      const box = document.getElementById(targetId);
      if(!box) return;

      const selectedAge = state.age || '7-9';
      const summaryLines = getShiftSummaryLines(selectedAge);

      box.innerHTML = shifts.slice(0,2).map(s => {
        const isInlineView = safeViewKey === 'mobile';
        const showAbout = isInlineView && shiftOptionPanels[safeViewKey]?.aboutId === s.id;
        const showCalendar = isInlineView && shiftOptionPanels[safeViewKey]?.calendarId === s.id;
        const start = parseShiftDate(s.start);
        const end = parseShiftDate(s.end);
        const startText = (start && start.toLocaleDateString('ru-RU')) || s.start;
        const endText = (end && end.toLocaleDateString('ru-RU')) || s.end;

        return `
        <div class="shift-option ${state.shiftId === s.id ? 'active' : ''}" data-id="${s.id}">
          <div class="shift-option-head">
            <strong>
              <span class="shift-option-dates">${s.dates}</span>
            </strong>
            <small>
              <span class="shift-option-seats">осталось ${s.left} мест</span>
              <span class="shift-option-price-row">
                <span class="shift-option-price">${formatPrice(s.price)}</span>
                <span class="shift-option-inline-actions">
                  <button class="shift-option-action shift-option-action-info" type="button" data-action="toggle-shift-about" data-shift-id="${s.id}" data-shift-view="${safeViewKey}" aria-label="Описание смены ${s.dates}">
                    <img class="ac-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/info-circle.svg" alt="" aria-hidden="true">
                  </button>
                  <button class="shift-option-action shift-option-action-calendar" type="button" data-action="toggle-shift-calendar-inline" data-shift-id="${s.id}" data-shift-view="${safeViewKey}" aria-label="Календарь ${s.dates}">
                    <img class="ac-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/calendar3.svg" alt="" aria-hidden="true">
                  </button>
                  <button class="shift-option-select-indicator" type="button" aria-label="Выбрать смену ${s.dates}">
                    <img class="ac-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-right.svg" alt="" aria-hidden="true">
                  </button>
                </span>
              </span>
            </small>
          </div>
          <div class="shift-inline-panel ${showAbout ? 'visible' : ''}">
            <ul>
              ${summaryLines.map((line) => `<li>${line}</li>`).join('')}
            </ul>
          </div>
          <div class="shift-inline-panel shift-inline-calendar ${showCalendar ? 'visible' : ''}">
            <div><strong>Заезд:</strong> ${startText}</div>
            <div><strong>Выезд:</strong> ${endText}</div>
            <div><strong>Длительность:</strong> ${shiftDaysLabel(s)}</div>
          </div>
        </div>
      `;
      }).join('');

      box.querySelectorAll('.shift-option').forEach(el => {
        el.addEventListener('click', (event) => {
          if(event.target.closest('.shift-option-action')){
            return;
          }
          if(!hasSelectedAge()){
            showHint('Сначала выберите возраст ребёнка', 'age');
            nudgeUserToNextStep('Сначала выберите возраст ребёнка — тогда откроется список смен.');
            return;
          }
          selectShift(el.dataset.id);
        });
      });
    }

    function renderShiftCards(){
      syncGuidedState();
      const grid = document.getElementById('shiftCardsGrid');
      if(!grid) return;
      const shortGrid = document.getElementById('shortShiftCards');
      const mainShifts = shifts.filter((s) => !s.isShort);
      const shortShifts = shifts.filter((s) => !!s.isShort);
      const showExtendedDescription = hasSelectedAge();
      const cleanShiftCardTitle = (title) => {
        const raw = String(title || '').trim();
        const cleaned = raw
          .replace(/^\s*\d+(?:[.,]\d+)?\s*[\])}.:\-–—,]?\s*/u, '')
          .replace(/^(?:TT|ТТ)\s*[\d.]+[\s:.\-–—]*/iu, '')
          .trim();
        return cleaned || raw;
      };

      grid.innerHTML = mainShifts.map(s => `
        <div class="mini-card">
          <h4>${cleanShiftCardTitle(s.title)}</h4>
          <div class="price-row">
            <strong>${formatPrice(s.price)}</strong>
            <span class="price-row-actions">
              <button class="shift-calendar-btn shift-about-btn" type="button" data-action="toggle-shift-about" data-shift-id="${s.id}" aria-label="Описание смены ${s.title}">
                <img class="ac-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/info-circle.svg" alt="" aria-hidden="true">
              </button>
              <button class="shift-calendar-btn" type="button" data-action="open-calendar" data-shift-id="${s.id}" aria-label="Календарь ${s.title}">
                <img class="ac-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/calendar3.svg" alt="" aria-hidden="true">
              </button>
            </span>
          </div>
          <div class="price-row-meta">${s.dates} · ${shiftDaysLabel(s)}</div>
          ${showExtendedDescription
            ? `
              <p><strong>Коротко:</strong> ${s.desc || ''}</p>
              <p><strong>Подробно:</strong> ${getShiftDisplayDescription(s)}</p>
            `
            : `<p>${s.desc || ''}</p>`
          }
        </div>
      `).join('');

      if(shortGrid){
        shortGrid.innerHTML = shortShifts.map((s) => `
          <div class="mini-card short-shift-card">
            <div class="short-shift-head">
              <h4>${cleanShiftCardTitle(s.title)}</h4>
              <span class="short-shift-tag">короткая смена</span>
            </div>
            <div class="price-row">
              <strong>${formatPrice(s.price)}</strong>
              <span class="price-row-actions">
                <button class="shift-calendar-btn shift-about-btn" type="button" data-action="toggle-shift-about" data-shift-id="${s.id}" aria-label="Описание смены ${s.title}">
                  <img class="ac-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/info-circle.svg" alt="" aria-hidden="true">
                </button>
                <button class="shift-calendar-btn" type="button" data-action="open-calendar" data-shift-id="${s.id}" aria-label="Календарь ${s.title}">
                  <img class="ac-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/calendar3.svg" alt="" aria-hidden="true">
                </button>
              </span>
            </div>
            <div class="price-row-meta">${s.dates}</div>
            ${showExtendedDescription
              ? `
                <p><strong>Коротко:</strong> ${s.desc || ''}</p>
              `
              : `<p>${s.desc || ''}</p>`
            }
          </div>
        `).join('');
        shortGrid.closest('.programs-short-block')?.classList.remove('hidden');
      }
    }

    function contactIconMarkup(label){
      const map = {
        city_phone:'/assets/icons/phone-city.svg',
        mobile_phone:'/assets/icons/phone-mobile.svg',
        whatsapp:'/assets/icons/whatsapp.svg',
        telegram:'/assets/icons/telegram.svg'
      };
      const src = map[label];
      return ((src && `<img class="ac-icon" src="${src}" alt="" aria-hidden="true">`) || '•');
    }

    function resolveFloatingContactLinks(){
      const contacts = (Array.isArray(mediaContent.contacts) && mediaContent.contacts) || [];
      const mobilePhone = contacts.find((item) => item.label === 'mobile_phone');
      const cityPhone = contacts.find((item) => item.label === 'city_phone');
      const whatsapp = contacts.find((item) => item.label === 'whatsapp');
      const telegram = contacts.find((item) => item.label === 'telegram');
      return {
        cityPhoneHref: (cityPhone && cityPhone.href) || 'tel:+74951284429',
        cityPhoneLabel: (cityPhone && cityPhone.text) || '+7 (495) 128-44-29',
        mobilePhoneHref: (mobilePhone && mobilePhone.href) || 'tel:+79688086455',
        mobilePhoneLabel: (mobilePhone && mobilePhone.text) || '+7 (968) 808-64-55',
        whatsappHref: (whatsapp && whatsapp.href) || 'https://wa.me/79688086455',
        telegramHref: (telegram && telegram.href) || 'https://t.me/Progaschool',
      };
    }

    function initFloatingContactsWidget(){
      if(document.getElementById('floatingContactsWidget')) return;
      const links = resolveFloatingContactLinks();
      const host = document.createElement('div');
      host.id = 'floatingContactsWidget';
      host.className = 'floating-contacts';
      host.innerHTML = `
        <div class="floating-contacts-panel" id="floatingContactsPanel" aria-label="Быстрые контакты">
          <a class="floating-contacts-link" href="${links.cityPhoneHref}">
            <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/telephone.svg" alt="" aria-hidden="true">
            <span class="floating-contacts-label">${links.cityPhoneLabel}</span>
          </a>
          <a class="floating-contacts-link" href="${links.mobilePhoneHref}">
            <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/telephone-fill.svg" alt="" aria-hidden="true">
            <span class="floating-contacts-label">${links.mobilePhoneLabel}</span>
          </a>
          <a class="floating-contacts-link" href="${links.whatsappHref}" target="_blank" rel="noopener noreferrer">
            <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/whatsapp.svg" alt="" aria-hidden="true">
            <span class="floating-contacts-label">WhatsApp</span>
          </a>
          <a class="floating-contacts-link" href="${links.telegramHref}" target="_blank" rel="noopener noreferrer">
            <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/telegram.svg" alt="" aria-hidden="true">
            <span class="floating-contacts-label">Telegram</span>
          </a>
        </div>
        <button type="button" class="floating-contacts-toggle" id="floatingContactsToggle" aria-expanded="false" aria-controls="floatingContactsPanel" aria-label="Открыть контакты">
          <svg class="floating-contacts-glyph" viewBox="0 0 24 24" aria-hidden="true">
            <path class="floating-contacts-glyph-outline" d="M4.5 5.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3v-3H4.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"></path>
            <circle class="floating-contacts-dot floating-contacts-dot-left" cx="8" cy="11.5" r="1.35"></circle>
            <circle class="floating-contacts-dot floating-contacts-dot-center" cx="12" cy="11.5" r="1.35"></circle>
            <circle class="floating-contacts-dot floating-contacts-dot-right" cx="16" cy="11.5" r="1.35"></circle>
          </svg>
        </button>
      `;
      document.body.appendChild(host);

      const toggle = host.querySelector('#floatingContactsToggle');
      if(!toggle) return;
      toggle.addEventListener('click', () => {
        const isOpen = host.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(!!isOpen));
        track('floating_contacts_toggle', {open:Number(!!isOpen)});
      });

      host.querySelectorAll('.floating-contacts-link').forEach((link) => {
        link.addEventListener('click', () => {
          host.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          const label = String(link.querySelector('.floating-contacts-label')?.textContent || '').toLowerCase();
          track('floating_contacts_click', {channel: label});
        });
      });

      document.addEventListener('click', (event) => {
        if(!host.classList.contains('is-open')) return;
        if(host.contains(event.target)) return;
        host.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });

      document.addEventListener('keydown', (event) => {
        if(event.key !== 'Escape') return;
        if(!host.classList.contains('is-open')) return;
        host.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }

    function socialBadgeMark(item){
      const mark = String(item?.label || '').trim().toUpperCase();
      const allowed = new Set(['VK','RT','IG','OK','YT','LI','TT','PI','YA']);
      return ((allowed.has(mark) && mark) || '•');
    }

    function socialDisplayName(item){
      const key = String(item?.key || '').trim();
      const badge = socialBadgeMark(item);
      if(!key) return badge;
      if(key.toUpperCase() !== badge) return key;
      if(key === 'VK') return 'ВКонтакте';
      return key;
    }

    function faqGlyph(iconPath, groupName){
      if(iconPath && iconPath.includes('med')) return 'MED';
      if(iconPath && iconPath.includes('lock')) return 'SAFE';
      if(iconPath && iconPath.includes('food')) return 'FOOD';
      if(iconPath && iconPath.includes('check')) return 'ROOM';
      if(iconPath && iconPath.includes('phone')) return 'CALL';
      return groupName.slice(0,3).toUpperCase();
    }

    function renderStars(){
      return '<div class="stars">★★★★★</div>';
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
        getPhotosForActiveFilter,
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

    function renderDesktopMobileDocsBlock(){
      const footer = document.getElementById('section-legal');
      if(!footer) return;

      if(!footer.dataset.originalMarkup){
        footer.dataset.originalMarkup = footer.innerHTML;
      }

      const useMobileDocs = USE_DESKTOP_BASE_FOR_MOBILE && state.previewView === 'mobile';
      if(!useMobileDocs){
        if(footer.dataset.mobileDocsApplied === '1'){
          footer.innerHTML = footer.dataset.originalMarkup || footer.innerHTML;
          footer.dataset.mobileDocsApplied = '0';
        }
        footer.classList.remove('mobile-docs-inline');
        return;
      }

      footer.classList.add('mobile-docs-inline');
      footer.dataset.mobileDocsApplied = '1';
      footer.innerHTML = `
        <div class="mobile-docs-shell">
          <article class="mobile-docs-accordion-item ${state.mobileDocsExpanded ? 'open' : ''}">
            <button type="button" class="mobile-docs-toggle" data-action="mobile-docs-toggle">
              <span class="mobile-docs-toggle-copy">
                <span class="mobile-docs-toggle-main">ООО «ВОИП КОННЕКТ»</span>
                <span class="mobile-docs-toggle-meta">ИНН 7729713637 · РТО 025773</span>
              </span>
              <img class="ac-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-right.svg" alt="" aria-hidden="true">
            </button>
            <div class="mobile-docs-links">
              <a href="legal.html#education-license" target="_blank" rel="noopener noreferrer">Образовательная лицензия Л035-01298-77/01082973</a>
              <a href="mailto:hello@codims.ru">hello@codims.ru</a>
              <a href="https://www.codims.ru/privacy" target="_blank" rel="noopener noreferrer">Политика обработки персональных данных</a>
              <a href="legal.html#legal-info" target="_blank" rel="noopener noreferrer">Юридическая информация</a>
              <a href="legal.html#org-info" target="_blank" rel="noopener noreferrer">Сведения об организации</a>
              <a href="legal.html#children-rest" target="_blank" rel="noopener noreferrer">Отдых и оздоровление детей</a>
              <a href="legal.html#partners-info" target="_blank" rel="noopener noreferrer">Условия для партнёров</a>
              <a href="legal.html#bloggers-info" target="_blank" rel="noopener noreferrer">Сотрудничество с блогерами</a>
            </div>
          </article>
          <div class="footer-copyright-mini">© 2019–2026</div>
        </div>
      `;
    }

    function syncMobileDocsExpandedUi(){
      document.querySelectorAll('.mobile-docs-accordion-item').forEach((item) => {
        item.classList.toggle('open', !!state.mobileDocsExpanded);
      });
    }

    const DESKTOP_MOBILE_SECTION_TEMPLATES = {
      'section-about': `
        <h3>О лагере</h3>
        <p class="section-lead">AiDaCamp — место, где ребёнок создаёт, двигается, работает в команде и уезжает со смены с понятным результатом.</p>
        <div class="mobile-about-features" id="mobileAboutFeaturesDesktop"></div>
      `,
      'section-journey': `
        <h3>Как проходит смена</h3>
        <p class="section-lead">4 шага: от быстрого включения к понятному результату за смену.</p>
        <div class="mobile-journey-flow" id="mobileJourneyContentDesktop"></div>
      `,
      'section-programs': `
        <h3>Описание смен</h3>
        <p class="section-lead">Выберите смену в селекторе — ниже покажем одну карточку с ключевыми деталями.</p>
        <div class="mobile-programs-flow" id="mobileProgramsContentDesktop"></div>
      `,
      'section-photos': `
        <h3>Фото</h3>
        <p class="section-lead">Живые кадры лагеря: занятия, бассейн, спорт, питание, команда и атмосфера.</p>
        <div class="mobile-media-filter-row" id="mobilePhotoFiltersDesktop">
          <button class="mobile-media-filter active" type="button" data-photo-filter="camp">Атмосфера</button>
          <button class="mobile-media-filter" type="button" data-photo-filter="pool">Бассейн</button>
          <button class="mobile-media-filter" type="button" data-photo-filter="sport">Спорт</button>
          <button class="mobile-media-filter" type="button" data-photo-filter="study">Учёба</button>
          <button class="mobile-media-filter" type="button" data-photo-filter="food">Питание</button>
        </div>
        <div id="mobilePhotoGalleryDesktop"></div>
      `,
      'section-videos': `
        <h3>Видео</h3>
        <p class="section-lead">Короткие видео, которые быстро объясняют, почему дети в лагере меняются сильнее, чем родители ожидают.</p>
        <div id="mobileVideoGalleryDesktop"></div>
      `,
      'section-reviews': `
        <h3>Отзывы</h3>
        <p class="section-lead">Сильный внешний social proof: реальные отзывы родителей на Яндекс Картах.</p>
        <div id="mobileReviewsGalleryDesktop"></div>
      `,
      'section-faq': `
        <h3>FAQ</h3>
        <p class="section-lead">Ключевые вопросы по медицине, безопасности, питанию и проживанию.</p>
        <div class="mobile-faq-filter-row" id="mobileFaqFiltersDesktop"></div>
        <div class="mobile-faq-accordion" id="mobileFaqListDesktop"></div>
      `,
      'section-team': `
        <h3>Команда</h3>
        <p class="section-lead">Люди, которые ведут смены и работают с детьми в проектном формате.</p>
        <div class="mobile-team-list" id="mobileInlineTeamListDesktop"></div>
      `,
      'section-stay': `
        <h3>Размещение</h3>
        <p class="section-lead">Комнаты, бытовые зоны и территория лагеря.</p>
        <div class="mobile-stay-list" id="mobileInlineStayListDesktop"></div>
      `,
      'section-contacts': `
        <h3>Контакты</h3>
        <p class="section-lead">Быстрая связь и маршрут до лагеря.</p>
        <div class="mobile-contacts-list" id="mobileInlineContactsListDesktop"></div>
        <div class="mobile-socials-row" id="mobileInlineSocialsDesktop"></div>
      `
    };

    function applyMobileTemplatesToDesktopSections(){
      const useMobileTemplates = USE_DESKTOP_BASE_FOR_MOBILE && state.previewView === 'mobile';
      Object.entries(DESKTOP_MOBILE_SECTION_TEMPLATES).forEach(([sectionId, template]) => {
        const section = document.getElementById(sectionId);
        if(!section) return;
        if(!section.dataset.desktopOriginalMarkup){
          section.dataset.desktopOriginalMarkup = section.innerHTML;
        }
        if(useMobileTemplates){
          section.innerHTML = template;
          section.classList.add('mobile-template');
        } else if(section.dataset.desktopOriginalMarkup){
          section.innerHTML = section.dataset.desktopOriginalMarkup;
          section.classList.remove('mobile-template');
        }
      });
    }

    function applyMobileSectionAccordion(){
      return;
    }

    // SECTION 8: Global orchestrator.
    function renderAll(){
      applyMobileTemplatesToDesktopSections();
      renderShiftOptionsForRenderableViews();
      renderBookingPanels();
      syncDesktopAgeTapHintVisibility();
      scheduleDesktopAgeTapHint();
      renderMediaSections();
      if(!USE_DESKTOP_BASE_FOR_MOBILE){
        applyMobileSectionAccordion();
      }
      renderDesktopMobileDocsBlock();
      renderSummary();
      syncLegalDocLinks();
    }

    function selectShift(id){
      const shift = shifts.find(s => s.id === id);
      clearShiftOptionPanels();
      Object.assign(state, {
        shiftId: id,
        basePrice: shift.price,
        offerPrice: null,
        code: null,
        expiresAt: null,
        offerStage: 0
      });
      renderAll();
      persist();
    }

    function handlePrimaryCTA(){
      return safeInvoke(ensureBookingRuntimeBridge(), 'handlePrimaryCTA', [{
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
        openInlineLead
      }], null);
    }

    function runOfferSearch(){
      return safeInvoke(ensureOfferFlow(), 'runOfferSearch', [{
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
        applyOfferModalTheme,
        normalizeCloseIconButtons,
        showOffer,
        discountFactor: OFFER_DISCOUNT_FACTOR,
        ttlHours: 72
      }], null);
    }

    function openOfferCheck(){
      return safeInvoke(ensureOfferFlow(), 'openOfferCheck', [{
        runOfferSearch
      }], () => runOfferSearch());
    }

    function showOffer(){
      return safeInvoke(ensureOfferFlow(), 'showOffer', [{
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
        applyOfferModalTheme,
        formatPrice,
        normalizeCloseIconButtons,
        startTimer,
        renderSummary,
        renderBookingPanels
      }], null);
    }

    function saveOfferAndClose(){
      return safeInvoke(ensureOfferFlow(), 'saveOfferAndClose', [{
        syncGuidedState,
        clearOfferTimeout,
        document,
        renderSummary,
        renderBookingPanels
      }], null);
    }

    function resetOfferProgressUI(){
      return safeInvoke(ensureOfferFlow(), 'resetOfferProgressUI', [{
        clearOfferTimeout,
        state
      }], () => {
        clearOfferTimeout();
        Object.assign(state, { offerSearching: false });
      });
    }

    function startTimer(){
      return safeInvoke(ensureSummaryFlow(), 'startTimer', [], null);
    }

    function isSummaryCompactMode(){
      if(state.previewView === 'mobile' && !USE_DESKTOP_BASE_FOR_MOBILE){
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

    function updateSummaryBarVisibility(){
      return safeInvoke(ensureSummaryFlow(), 'updateSummaryBarVisibility', [], null);
    }

    function dismissSummaryBarTemporarily(ms = 30000){
      return safeInvoke(ensureSummaryFlow(), 'dismissSummaryBarTemporarily', [ms], null);
    }

    function renderSummary(){
      return safeInvoke(ensureSummaryFlow(), 'renderSummary', [], null);
    }

    function onlyDigits(value){
      return safeInvoke(ensureBookingInlineLeadApi(), 'onlyDigits', [value], (value || '').replace(/\D/g, ''));
    }

    function formatPhoneInput(value){
      return safeInvoke(ensureBookingInlineLeadApi(), 'formatPhoneInput', [value], () => String(value || ''));
    }

    function normalizePhone(value){
      return safeInvoke(ensureBookingInlineLeadApi(), 'normalizePhone', [value], '');
    }

    function isValidPhone(value){
      return !!safeInvoke(ensureBookingInlineLeadApi(), 'isValidPhone', [value], () => !!normalizePhone(value));
    }

    function getLeadScopeConfig(scope = 'drawer'){
      return safeInvoke(ensureBookingInlineLeadApi(), 'getLeadScopeConfig', [scope], null);
    }

    function getLeadSubmitDefaultText(scope = 'drawer'){
      return safeInvoke(ensureBookingInlineLeadApi(), 'getLeadSubmitDefaultText', [scope], 'Забронировать');
    }

    function setLeadPhoneError(scope = 'drawer', show = false, message = ''){
      safeInvoke(ensureBookingInlineLeadApi(), 'setLeadPhoneError', [{
        scope,
        show,
        message,
        document
      }], null);
    }

    function setPhoneError(show){
      setLeadPhoneError('drawer', show);
    }

    function setLeadSubmitState(loading, scope = 'drawer'){
      safeInvoke(ensureBookingInlineLeadApi(), 'setLeadSubmitState', [{
        loading,
        scope,
        document
      }], null);
    }

    function bindPhoneMaskForScope(scope = 'drawer'){
      safeInvoke(ensureBookingInlineLeadApi(), 'bindPhoneMaskForScope', [{
        scope,
        document
      }], null);
    }

    function buildInlineLeadFormHtml(scope){
      return safeInvoke(ensureBookingInlineLeadApi(), 'buildInlineLeadFormHtml', [scope], '');
    }

    function openInlineLead(scope){
      safeInvoke(ensureBookingInlineLeadApi(), 'openInlineLead', [{
        scope,
        state,
        document,
        track,
        selectedShiftPayload,
        buildHeroVariantMeta
      }], null);
    }

    function closeInlineLead(scope){
      safeInvoke(ensureBookingInlineLeadApi(), 'closeInlineLead', [{
        scope,
        document
      }], null);
    }

    function openForm(){
      safeInvoke(ensureBookingInlineLeadApi(), 'openForm', [{
        state,
        document,
        syncGuidedState,
        buildBookingSummaryHtml,
        isOfferActive,
        startTimer,
        track,
        selectedShiftPayload,
        buildHeroVariantMeta
      }], null);
    }

    function closeForm(){
      safeInvoke(ensureBookingInlineLeadApi(), 'closeForm', [{ document }], null);
    }

    function openSuccessModal(deliveryResult){
      const box = document.getElementById('successSummaryBox');
      if(box) box.innerHTML = buildBookingSummaryHtml();
      const deliveryState = document.getElementById('successDeliveryState');
      if(deliveryState){
        const isAdmin = isAdminDebugSession();
        if(isAdmin && deliveryResult && deliveryResult.ok === false){
          deliveryState.textContent = 'Заявка сохранена локально, но сейчас нет связи с сервером отправки. Если мы не ответим в течение 15 минут, напишите нам в Telegram.';
          deliveryState.classList.remove('hidden');
          deliveryState.classList.add('error');
        } else {
          deliveryState.textContent = '';
          deliveryState.classList.add('hidden');
          deliveryState.classList.remove('error');
        }
      }
      document.getElementById('successOverlay').classList.remove('hidden');
    }

    function closeSuccessModal(){
      document.getElementById('successOverlay').classList.add('hidden');
    }

    function openNoticeModal(message, title = 'Проверьте данные'){
      const overlay = document.getElementById('noticeOverlay');
      if(!overlay) return;
      const titleEl = document.getElementById('noticeTitle');
      const messageEl = document.getElementById('noticeMessage');
      const actionsEl = document.getElementById('noticeActions');
      noticeConfirmHandler = null;
      if(titleEl) titleEl.textContent = title;
      if(messageEl) messageEl.textContent = message || '';
      if(actionsEl){
        actionsEl.classList.add('hidden');
        actionsEl.classList.remove('notice-actions--reset-booking');
      }
      overlay.classList.remove('hidden');
    }

    function closeNoticeModal(){
      noticeConfirmHandler = null;
      const actionsEl = document.getElementById('noticeActions');
      if(actionsEl){
        actionsEl.classList.add('hidden');
        actionsEl.classList.remove('notice-actions--reset-booking');
      }
      document.getElementById('noticeOverlay')?.classList.add('hidden');
    }

    function ensureNoticeActions(){
      const overlay = document.getElementById('noticeOverlay');
      const card = overlay?.querySelector('.notice-card');
      if(!overlay || !card) return null;
      let actionsEl = document.getElementById('noticeActions');
      if(actionsEl) return actionsEl;
      actionsEl = document.createElement('div');
      actionsEl.id = 'noticeActions';
      actionsEl.className = 'notice-actions hidden';
      actionsEl.innerHTML = `
        <button class="secondary-outline notice-cancel-btn" type="button" data-action="close-notice">Отмена</button>
        <button class="cta-main notice-confirm-btn" type="button" data-action="confirm-notice">Подтвердить</button>
      `;
      card.appendChild(actionsEl);
      return actionsEl;
    }

    function openResetBookingConfirmModal(){
      openNoticeModal(
        'Это действие аннулирует ваше предварительное бронирование. Вы точно хотите продолжить?',
        'Сбросить бронирование?'
      );
      const actionsEl = ensureNoticeActions();
      if(!actionsEl) return;
      const cancelBtn = actionsEl.querySelector('.notice-cancel-btn');
      const confirmBtn = actionsEl.querySelector('.notice-confirm-btn');
      if(cancelBtn) cancelBtn.textContent = 'Отмена';
      if(confirmBtn) confirmBtn.textContent = 'Сбросить';
      actionsEl.classList.add('notice-actions--reset-booking');
      noticeConfirmHandler = () => {
        resetOfferState({preserveShift:false});
        Object.assign(state, {
          age: null,
          ageSelected: false
        });
        persist();
        renderAll();
      };
      actionsEl.classList.remove('hidden');
    }

    async function submitLeadFromScope(scope = 'drawer'){
      await safeInvoke(ensureBookingInlineLeadApi(), 'submitLeadFromScope', [{
        scope,
        state,
        shifts,
        document,
        getInProgress: () => leadSubmitInProgress,
        setInProgress: (next) => {
          leadSubmitInProgress = !!next;
        },
        syncGuidedState,
        normalizePhone,
        isValidPhone,
        setLeadPhoneError,
        setLeadSubmitState,
        openNoticeModal,
        persist,
        labelAge,
        formatPrice,
        buildAbMeta,
        track,
        selectedShiftPayload,
        buildHeroVariantMeta,
        notifyLead,
        closeForm,
        closeInlineLead,
        renderSummary,
        renderBookingPanels,
        updateSummaryBarVisibility,
        isAdminDebugSession
      }], null);
    }

    async function submitLead(){
      return submitLeadFromScope('drawer');
    }

    function scrollToSection(id){
      return safeInvoke(ensureNavigationFlow(), 'scrollToSection', [id], false);
    }

    function navigateToSection(id){
      return safeInvoke(ensureNavigationFlow(), 'navigateToSection', [id], null);
    }

    safeInvoke(ensureMediaGestureBindingsApi(), 'init', [{
      document,
      closeMedia,
      nextMedia,
      prevMedia,
      applyStatePatch: (patch = {}) => {
        Object.assign(state, patch);
      },
      renderCompactTrustPanelContent,
      persist,
      getMediaContent: () => mediaContent,
      getCompactStayCards,
      getPhotosForActiveFilter,
      getState: () => state
    }], null);

    safeInvoke(ensureGlobalUiBindingsApi(), 'init', [{
      document,
      navigateToSection,
      isHeroMenuOpen,
      setHeroMenuOpen,
      isHeroPhoneDropdownOpen,
      setHeroPhoneDropdownOpen,
      closeSuccessModal,
      closeNoticeModal,
      bumpOfferRunId: () => { offerRunId += 1; },
      clearOfferTimeout,
      resetOfferProgressUI,
      closeMedia,
      nextMedia,
      prevMedia,
      closeVideo,
      closeCalendar,
      closeSectionModal,
      openNoticeModal,
      bookingText,
      getViewportPreviewView,
      switchView,
      initHero,
      applyHeroAbVariant,
      applyCompactSectionModalLayout,
      updateSummaryBarVisibility,
      scheduleBookingCardMinHeightSync,
      getState: () => state,
      getHeroResizeTimer: () => heroResizeTimer,
      setHeroResizeTimer: (next) => { heroResizeTimer = next || null; }
      ,
      setPhotoFilter,
      setFaqFilter,
      openSectionModal,
      track,
      showHint,
      nudgeUserToNextStep,
      hasSelectedAge,
      getBookingState: () => state,
      openVideo,
      selectedShiftPayload,
      buildHeroVariantMeta,
      bookingDesktopIds: BOOKING_VIEWS.desktop,
      bookingMobileIds: BOOKING_VIEWS.mobile
    }], null);

    heroAbVariant = resolveHeroAbVariant();
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
    applyHeroContrastMode();
    applyHeroMicroMode();
    applyOfferModalTheme();
    applyOfferLayoutMode();
    applyDesktopMode();
    if(!USE_DESKTOP_BASE_FOR_MOBILE){
      applyMobileMode();
    }
    normalizeCloseIconButtons();
    const deferredInit = () => {
      injectHeroSeasonOfferCta();
      initFloatingContactsWidget();
      initHeroAbDevPanel();
      track('page_view', {
        view: state.view || 'desktop',
        desktop_mode: state.desktopMode || '',
        mobile_mode: state.mobileMode || ''
      });
      initScrollTracking();
      initSummaryBarViewportSync();
      initSectionViewTracking();
      refreshVideoMeta({force:true});
      scheduleVideoMetaRefresh();
      scheduleDesktopAgeTapHint();
      runQualityPipelineAll();
    };
    window.setTimeout(deferredInit, 0);

    if(state.expiresAt && Date.now() < state.expiresAt){
      startTimer();
    }

