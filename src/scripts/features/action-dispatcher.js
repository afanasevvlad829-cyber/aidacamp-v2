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
