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
    const applyBookingStructureSchemaExternal = typeof ctx.applyBookingStructureSchema === 'function' ? ctx.applyBookingStructureSchema : null;
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

    function applyBookingStructureSchema(viewCfg){
      if(typeof applyBookingStructureSchemaExternal === 'function'){
        applyBookingStructureSchemaExternal(viewCfg);
        return;
      }
      const cfg = (viewCfg && viewCfg.key && viewCfg) || getBookingViewConfig('desktop');
      if(!cfg) return;
      const card = document.getElementById(cfg.cardId);
      if(!card) return;
      const stage = getBookingStage();

      card.querySelectorAll('[data-booking-region]').forEach((node) => {
        delete node.dataset.bookingRegion;
        delete node.dataset.bookingRegionLabel;
        delete node.dataset.bookingRegionZero;
        delete node.dataset.bookingRegionLabelSide;
      });

      const mainSelector = stage === 2 ? '.booking-step-2' : (stage >= 3 ? `#${cfg.infoId}` : '.booking-step-1');
      const structureMap = {
        top: `#${cfg.stepsId}`,
        chips: `#${cfg.summaryChipsId}`,
        header: `#${cfg.titleId}`,
        main: mainSelector,
        bottom: '.booking-step-3'
      };
      const regionLabelSideMap = {
        top: 'right',
        chips: 'right',
        header: 'left',
        main: 'right',
        bottom: 'left'
      };
      const resolveRegionLabel = (regionName, node) => {
        if(!node) return regionName;
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const isZeroHeight = style.display === 'none' || style.visibility === 'hidden' || node.offsetHeight === 0 || rect.height < 1;
        return isZeroHeight ? `${regionName} 0` : regionName;
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
