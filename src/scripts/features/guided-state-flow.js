(function(){
  function createGuidedStateFlow(ctx = {}){
    const getBookingViewConfig = typeof ctx.getBookingViewConfig === 'function' ? ctx.getBookingViewConfig : (() => ({}));
    const syncGuidedState = typeof ctx.syncGuidedState === 'function' ? ctx.syncGuidedState : (() => {});
    const getBookingStage = typeof ctx.getBookingStage === 'function' ? ctx.getBookingStage : (() => 1);
    const placeStage2ContentForViewExternal = typeof ctx.placeStage2ContentForView === 'function' ? ctx.placeStage2ContentForView : null;
    const syncCompletedBookingScaffoldExternal = typeof ctx.syncCompletedBookingScaffold === 'function' ? ctx.syncCompletedBookingScaffold : null;
    const stopVariantFlowScenario = typeof ctx.stopVariantFlowScenario === 'function' ? ctx.stopVariantFlowScenario : (() => {});
    const bookingText = typeof ctx.bookingText === 'function' ? ctx.bookingText : (() => '');
    const hideVariantCoachBadge = typeof ctx.hideVariantCoachBadge === 'function' ? ctx.hideVariantCoachBadge : (() => {});
    const hasSelectedAge = typeof ctx.hasSelectedAge === 'function' ? ctx.hasSelectedAge : (() => false);
    const ageLabel = typeof ctx.ageLabel === 'function' ? ctx.ageLabel : (() => '');
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const getSelectedShift = typeof ctx.getSelectedShift === 'function' ? ctx.getSelectedShift : (() => null);
    const scheduleVariantFlowScenario = typeof ctx.scheduleVariantFlowScenario === 'function' ? ctx.scheduleVariantFlowScenario : (() => {});
    const simpleModeEnabled = !!ctx.simpleModeEnabled;

    function ensureStage2TransferHost(stepThree){
      if(!stepThree) return null;
      let host = stepThree.querySelector('.booking-stage2-transfer-host');
      if(!host){
        host = document.createElement('div');
        host.className = 'booking-stage2-transfer-host';
      }
      return host;
    }

    function placeStage2ContentForView(viewCfg, stage, bookingCard){
      if(typeof placeStage2ContentForViewExternal === 'function'){
        placeStage2ContentForViewExternal(viewCfg, stage, bookingCard);
        return;
      }
      if(!viewCfg || !bookingCard) return;
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
      if(typeof syncCompletedBookingScaffoldExternal === 'function'){
        syncCompletedBookingScaffoldExternal(viewCfg, bookingCard);
        return;
      }
      const state = getState();
      const cfg = viewCfg && viewCfg.key ? viewCfg : getBookingViewConfig('desktop');
      if(!cfg) return;
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
        if(topClose) topClose.remove();
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

      if(simpleModeEnabled){
        stopVariantFlowScenario();
        hideVariantCoachBadge(cfg);
        if(allShiftsBtn) allShiftsBtn.classList.add('hidden');
        shiftList.classList.add('hidden', 'disabled');
        shiftList.classList.remove('highlight', 'collapsed');
        if(stepThree){
          stepThree.classList.add('is-force-hidden');
          stepThree.classList.remove('booking-stage2-transfer-enabled');
        }
        ageChip.classList.remove('visible');
        shiftChip.classList.remove('visible');
        if(chipHost){
          chipHost.classList.remove('visible', 'booking-summary-chips--completed');
        }
        if(state.bookingCompleted){
          ageTabs.classList.add('hidden');
          ctaWrap.classList.add('hidden');
        } else if(!hasSelectedAge()){
          ageTabs.classList.remove('hidden');
          ctaWrap.classList.add('hidden');
        } else {
          ageTabs.classList.add('hidden');
          ctaWrap.classList.remove('hidden');
          ctaWrap.classList.add('highlight');
        }
        if(baseHint){
          baseHint.textContent = '';
          baseHint.classList.toggle('is-muted-hidden', !hasSelectedAge());
        }
        if(guidedInlineHint){
          guidedInlineHint.textContent = '';
          guidedInlineHint.classList.remove('visible', 'variant-coach');
        }
        return;
      }

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
