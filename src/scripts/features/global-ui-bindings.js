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
