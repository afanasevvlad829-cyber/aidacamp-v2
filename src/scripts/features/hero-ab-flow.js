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
    const resolveDesktopView = typeof ctx.resolveDesktopView === 'function' ? ctx.resolveDesktopView : (() => document.getElementById('desktopView'));
    const resolveMobileView = typeof ctx.resolveMobileView === 'function' ? ctx.resolveMobileView : (() => document.getElementById('mobileView'));
    const onHeroVariantChange = typeof ctx.onHeroVariantChange === 'function' ? ctx.onHeroVariantChange : (() => {});

    const HERO_AB_TEST_KEY = String(ctx.heroAbTestKey || 'aidacamp_hero_ab_variant_v1');
    const HERO_AB_TEST_ID = String(ctx.heroAbTestId || 'hero-ab-v1');
    const HERO_AB_DESKTOP_BG_ONLY = !!ctx.heroAbDesktopBgOnly;
    const HERO_AB_MOBILE_EFFECTS_ENABLED = !!ctx.heroAbMobileEffectsEnabled;
    const HERO_AB_BENEFIT_STEP_MS = Number(ctx.heroAbBenefitStepMs || 1100);
    const HERO_AB_SHIFT_UP_MS = Number(ctx.heroAbShiftUpMs || 4200);
    const HERO_AB_BENEFIT_REVEAL_DELAY_MS = Number(ctx.heroAbBenefitRevealDelayMs || 4700);
    const HERO_AB_DESKTOP_SHIFT_UP_MS = Number(ctx.heroAbDesktopShiftUpMs || HERO_AB_SHIFT_UP_MS);
    const HERO_AB_DESKTOP_BENEFIT_REVEAL_DELAY_MS = Number(ctx.heroAbDesktopBenefitRevealDelayMs || HERO_AB_BENEFIT_REVEAL_DELAY_MS);
    const HERO_BENEFITS_LAYOUT_EXPERIMENT = !!ctx.heroBenefitsLayoutExperiment;
    const HERO_BENEFITS_LAYOUT_EXPERIMENT_ITEMS = Array.isArray(ctx.heroBenefitsLayoutExperimentItems)
      ? ctx.heroBenefitsLayoutExperimentItems.filter((item) => item && typeof item === 'object')
      : [];
    const HERO_AB_VARIANT_LABELS = (ctx.heroAbVariantLabels && typeof ctx.heroAbVariantLabels === 'object')
      ? ctx.heroAbVariantLabels
      : Object.freeze({ A: 'A', B: 'B' });

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

    function initHeroAbDevPanel(){
      const host = String(window.location.hostname || '').toLowerCase();
      const isDevHost = host === 'localhost' || host === '127.0.0.1';
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
        const current = getHeroAbVariant();
        if(currentNode){
          currentNode.textContent = HERO_AB_VARIANT_LABELS[current] || current;
        }
        panel.querySelectorAll('[data-hero-ab-set]').forEach((button) => {
          const value = String(button.getAttribute('data-hero-ab-set') || '').toUpperCase();
          button.classList.toggle('is-active', value === current);
        });
      };
      syncPanelState();
      panel.querySelectorAll('[data-hero-ab-set]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const next = String(btn.getAttribute('data-hero-ab-set') || '').toUpperCase();
          if(next !== 'A' && next !== 'B') return;
          if(next === getHeroAbVariant()){
            syncPanelState();
            return;
          }
          localStorage.setItem(HERO_AB_TEST_KEY, next);
          setHeroAbVariant(next);
          onHeroVariantChange(next);
          applyHeroAbVariant();
          syncPanelState();
        });
      });
      window.addEventListener('hero-ab:changed', syncPanelState);
    }

    return Object.freeze({
      clearHeroAbTimers,
      getForcedHeroAbVariant,
      resolveHeroAbVariant,
      applyHeroAbAnimationForRoot,
      applyHeroAbVariant,
      initHeroAbDevPanel
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.heroAbFlow = Object.freeze({ create: createHeroAbFlow });
})();
    function applyHeroBenefitsLayoutExperiment(root, enabledOverride){
      if(!root) return;
      const grid = root.querySelector('.hero-benefits-grid');
      if(!grid) return;
      if(!grid.dataset.heroBenefitsOriginalHtml){
        grid.dataset.heroBenefitsOriginalHtml = grid.innerHTML;
      }
      const enabled = typeof enabledOverride === 'boolean'
        ? enabledOverride
        : HERO_BENEFITS_LAYOUT_EXPERIMENT;
      if(!enabled){
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
