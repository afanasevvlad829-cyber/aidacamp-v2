(function registerHeroV3SimpleFlow(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};
  windowObj.AC_FEATURES.heroV3SimpleFlow = windowObj.AC_FEATURES.heroV3SimpleFlow || {};

  var DEFAULT_COPY = Object.freeze({});

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
    var navigateToSection = typeof ctx.navigateToSection === 'function' ? ctx.navigateToSection : null;
    var copy = Object.freeze(Object.assign({}, DEFAULT_COPY, ctx.copy || {}));

    function bindReviewsAnchorForSimpleMode(enabled){
      var reviewsBtn = doc.getElementById('yandexReviewsBtn');
      if(!reviewsBtn) return;
      if(enabled){
        reviewsBtn.setAttribute('href', '#section-reviews');
        reviewsBtn.removeAttribute('target');
        reviewsBtn.removeAttribute('rel');
        if(!reviewsBtn.dataset.heroV3ReviewsBound){
          reviewsBtn.addEventListener('click', function(event){
            if(!getEnabled()) return;
            event.preventDefault();
            if(navigateToSection){
              navigateToSection('section-reviews');
              return;
            }
            var node = doc.getElementById('section-reviews');
            if(node && typeof node.scrollIntoView === 'function'){
              node.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
          reviewsBtn.dataset.heroV3ReviewsBound = '1';
        }
        return;
      }
      if(reviewsBtn.dataset.heroV3ReviewsBound){
        reviewsBtn.removeAttribute('data-hero-v3-reviews-bound');
      }
      reviewsBtn.setAttribute('href', 'https://yandex.ru/maps/org/aydakemp/35558479035/reviews/');
      reviewsBtn.setAttribute('target', '_blank');
      reviewsBtn.setAttribute('rel', 'noopener noreferrer');
    }

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
      bindReviewsAnchorForSimpleMode(enabled);

      var menuToggleText = doc.querySelector('.hero-menu-toggle-text');
      if(menuToggleText){
        if(enabled && typeof copy.menuToggleText === 'string' && copy.menuToggleText){
          menuToggleText.textContent = copy.menuToggleText;
        } else {
          menuToggleText.textContent = 'Меню';
        }
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
      if(Array.isArray(copy.stepLabels)){
        doc.querySelectorAll('#desktop-booking-card .booking-step').forEach(function(node, idx){
          if(node && typeof copy.stepLabels[idx] === 'string' && copy.stepLabels[idx]){
            node.textContent = copy.stepLabels[idx];
          }
        });
      }
    }

    return Object.freeze({
      applyMode: applyMode
    });
  }

  windowObj.AC_FEATURES.heroV3SimpleFlow.create = create;
})(window);
