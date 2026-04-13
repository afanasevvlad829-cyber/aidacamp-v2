(function(){
  function createBookingHintFlow(ctx = {}){
    const getActiveBookingViewKeys = typeof ctx.getActiveBookingViewKeys === 'function' ? ctx.getActiveBookingViewKeys : (() => []);
    const getRenderableBookingViewKeys = typeof ctx.getRenderableBookingViewKeys === 'function' ? ctx.getRenderableBookingViewKeys : (() => []);
    const getBookingViewConfig = typeof ctx.getBookingViewConfig === 'function' ? ctx.getBookingViewConfig : (() => ({}));
    const getBookingStage = typeof ctx.getBookingStage === 'function' ? ctx.getBookingStage : (() => 1);
    const hasSelectedAge = typeof ctx.hasSelectedAge === 'function' ? ctx.hasSelectedAge : (() => false);
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const isSimpleModeEnabled = typeof ctx.isSimpleModeEnabled === 'function' ? ctx.isSimpleModeEnabled : (() => false);
    const getHintTimerId = typeof ctx.getHintTimerId === 'function' ? ctx.getHintTimerId : (() => null);
    const setHintTimerId = typeof ctx.setHintTimerId === 'function' ? ctx.setHintTimerId : (() => {});
    const getHintRunning = typeof ctx.getHintRunning === 'function' ? ctx.getHintRunning : (() => false);
    const setHintRunning = typeof ctx.setHintRunning === 'function' ? ctx.setHintRunning : (() => {});
    const getHintPlayed = typeof ctx.getHintPlayed === 'function' ? ctx.getHintPlayed : (() => false);
    const setHintPlayed = typeof ctx.setHintPlayed === 'function' ? ctx.setHintPlayed : (() => {});
    const getHintToken = typeof ctx.getHintToken === 'function' ? ctx.getHintToken : (() => 0);
    const setHintToken = typeof ctx.setHintToken === 'function' ? ctx.setHintToken : (() => {});
    const getHintStartedAt = typeof ctx.getHintStartedAt === 'function' ? ctx.getHintStartedAt : (() => Date.now());

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

    function waitDesktopAgeTapHint(ms){
      return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });
    }

    function canRunDesktopAgeTapHint(){
      const state = getState();
      const card = document.getElementById('desktop-booking-card');
      if(isSimpleModeEnabled() || !card || !card.classList.contains('booking-stage-1')) return false;
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
        window.setTimeout(() => {
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
      if(getHintPlayed() || getHintRunning()) return;
      if(!canRunDesktopAgeTapHint()) return;
      const hintNode = ensureDesktopAgeTapHintNode();
      const tabs = document.getElementById('desktopAgeTabs');
      if(!hintNode || !tabs) return;
      const ageRows = [...tabs.querySelectorAll('.age-tab[data-age]')];
      if(!ageRows.length) return;

      setHintRunning(true);
      const runToken = getHintToken() + 1;
      setHintToken(runToken);
      hintNode.classList.add('is-visible');

      for(let rowIndex = 0; rowIndex < ageRows.length; rowIndex += 1){
        const ageRow = ageRows[rowIndex];
        if(runToken !== getHintToken() || !canRunDesktopAgeTapHint()) break;
        clearDesktopAgeTapHintRows();
        ageRow.classList.add('is-hint-target');
        placeDesktopAgeTapHint(hintNode, ageRow);
        await waitDesktopAgeTapHint((rowIndex === 0 && 320) || 1000);
        for(let tapIndex = 0; tapIndex < 3; tapIndex += 1){
          if(runToken !== getHintToken() || !canRunDesktopAgeTapHint()) break;
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
      setHintRunning(false);
      setHintPlayed(true);
    }

    function syncDesktopAgeTapHintVisibility(){
      const hintNode = document.querySelector('#desktopAgeTabs .age-tap-hint');
      if(!hintNode) return;
      if(getHintRunning() && canRunDesktopAgeTapHint()){
        hintNode.classList.add('is-visible');
        return;
      }
      hintNode.classList.remove('is-visible', 'is-tapping');
      clearDesktopAgeTapHintRows();
    }

    function scheduleDesktopAgeTapHint(){
      if(getHintPlayed() || getHintRunning()) return;
      if(!canRunDesktopAgeTapHint()) return;
      if(getHintTimerId()){
        return;
      }
      const elapsedMs = Date.now() - Number(getHintStartedAt() || Date.now());
      const isFirstRun = Number(getHintToken() || 0) === 0;
      const delayMs = isFirstRun ? Math.max(0, 7000 - elapsedMs) : 7000;
      const timerId = window.setTimeout(() => {
        setHintTimerId(null);
        runDesktopAgeTapHint().catch(() => {
          setHintRunning(false);
          hideDesktopAgeTapHint();
        });
      }, delayMs);
      setHintTimerId(timerId);
    }

    return Object.freeze({
      pulseNode,
      nudgeUserToNextStep,
      showHint,
      syncBookingHints,
      waitDesktopAgeTapHint,
      canRunDesktopAgeTapHint,
      ensureDesktopAgeTapHintNode,
      placeDesktopAgeTapHint,
      clearDesktopAgeTapHintRows,
      pulseDesktopAgeTapHint,
      hideDesktopAgeTapHint,
      runDesktopAgeTapHint,
      syncDesktopAgeTapHintVisibility,
      scheduleDesktopAgeTapHint
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.bookingHintFlow = Object.freeze({ create: createBookingHintFlow });
})();
