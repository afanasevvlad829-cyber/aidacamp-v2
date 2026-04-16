(function(){
  function createHeroBackgroundFlow(ctx = {}){
    const getHeroAbVariant = typeof ctx.getHeroAbVariant === 'function' ? ctx.getHeroAbVariant : (() => 'A');
    const getHeroAbAssets = typeof ctx.getHeroAbAssets === 'function'
      ? ctx.getHeroAbAssets
      : (() => ({ images: [], mobile: '' }));
    const getHeroImages = typeof ctx.getHeroImages === 'function' ? ctx.getHeroImages : (() => []);

    let heroIndex = 0;
    let heroTimer = null;

    function clearHeroTimer(){
      if(heroTimer){
        window.clearInterval(heroTimer);
        heroTimer = null;
      }
    }

    function markHeroLoading(desktopView, mobileView){
      if(desktopView){
        desktopView.classList.toggle('hero-static-bg', getHeroImages().length <= 1);
        desktopView.classList.remove('hero-ready');
        desktopView.classList.add('hero-loading');
      }
      if(mobileView){
        mobileView.classList.remove('hero-ready');
        mobileView.classList.add('hero-loading');
      }
    }

    function markHeroReady(desktopView, mobileView){
      if(desktopView){
        desktopView.classList.remove('hero-loading');
        desktopView.classList.add('hero-ready');
      }
      if(mobileView){
        mobileView.classList.remove('hero-loading');
        mobileView.classList.add('hero-ready');
      }
    }

    function applySingleFrame(bg1, bg2, src){
      bg1.style.backgroundImage = `url(${src})`;
      bg1.classList.add('active');
      bg1.classList.remove('hidden');
      if(bg2){
        bg2.style.backgroundImage = `url(${src})`;
        bg2.classList.remove('active');
        bg2.classList.add('hidden');
      }
    }

    function preloadAndApplyFirstFrame(bg1, bg2, desktopView, mobileView, src){
      let done = false;
      const finish = () => {
        if(done) return;
        done = true;
        applySingleFrame(bg1, bg2, src);
        window.requestAnimationFrame(() => markHeroReady(desktopView, mobileView));
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
    }

    function initHero(){
      const bg1 = document.getElementById('heroBg1');
      if(!bg1) return;
      const bg2 = document.getElementById('heroBg2');
      const desktopView = document.getElementById('desktopView');
      const mobileView = document.getElementById('mobileView');
      const isMobile = window.innerWidth < 768;
      const assets = getHeroAbAssets(getHeroAbVariant());
      const heroImages = Array.isArray(assets.images) ? assets.images : [];
      const heroMobile = String(assets.mobile || '');

      clearHeroTimer();
      markHeroLoading(desktopView, mobileView);

      if(isMobile){
        preloadAndApplyFirstFrame(bg1, bg2, desktopView, mobileView, heroMobile);
        return;
      }

      heroIndex = 0;
      preloadAndApplyFirstFrame(bg1, bg2, desktopView, mobileView, heroImages[heroIndex] || heroMobile);
      if(!bg2 || heroImages.length <= 1){
        if(bg2){
          bg2.style.backgroundImage = 'none';
        }
        return;
      }

      heroTimer = window.setInterval(() => {
        heroIndex = (heroIndex + 1) % heroImages.length;
        const next = heroImages[heroIndex];
        if(bg1.classList.contains('active')){
          bg2.style.backgroundImage = `url(${next})`;
          bg2.classList.remove('hidden');
          bg2.classList.add('active');
          bg1.classList.remove('active');
          bg1.classList.add('hidden');
          return;
        }
        bg1.style.backgroundImage = `url(${next})`;
        bg1.classList.remove('hidden');
        bg1.classList.add('active');
        bg2.classList.remove('active');
        bg2.classList.add('hidden');
      }, 5500);
    }

    function preloadHeroAssets(){
      const assets = getHeroAbAssets(getHeroAbVariant());
      const heroImages = Array.isArray(assets.images) ? assets.images : [];
      const heroMobile = String(assets.mobile || '');
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

    return Object.freeze({
      initHero,
      preloadHeroAssets
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.heroBackgroundFlow = Object.freeze({ create: createHeroBackgroundFlow });
})();
