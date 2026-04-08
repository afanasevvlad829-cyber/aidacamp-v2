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
    var getSimpleModeEnabled = ctx.getSimpleModeEnabled || function(){ return false; };
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
      if(getSimpleModeEnabled()){
        hintNode.classList.remove('visible', 'variant-coach');
        hintNode.textContent = '';
        return;
      }

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
