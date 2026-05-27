/* ===== Web Academy — KID FUN PACK =====
   Motivating sounds for kids + bouncier, more interactive buttons.
   Layers on top of window.PA_SFX without breaking it.
*/
(function(){
  'use strict';

  // ---------- shared AudioContext ----------
  let AC;
  function ac(){
    if (!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  const soundOn = ()=> localStorage.getItem('pa_sound') !== '0';

  function blip(freq, dur=0.12, type='sine', vol=0.25, slideTo=null){
    if (!soundOn()) return;
    const c = ac();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function melody(notes, type='triangle', step=90){
    notes.forEach((n,i)=>setTimeout(()=>blip(n[0], n[1]||0.18, type, 0.28), i*step));
  }

  // ---------- Voice praise (Speech Synthesis) ----------
  const PRAISES = [
    'Молодец!', 'Супер!', 'Ты звезда!', 'Отлично!',
    'Вау, круто!', 'Ты гений!', 'Так держать!', 'Браво!',
    'Класс!', 'Невероятно!'
  ];
  const TRY_AGAIN = [
    'Попробуй ещё раз!', 'Почти получилось!', 'Не сдавайся!', 'Ты сможешь!'
  ];
  function speak(text, opts={}){
    if (!soundOn()) return;
    if (!('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      u.rate  = opts.rate  ?? 1.15;
      u.pitch = opts.pitch ?? 1.4;   // higher pitch — friendlier for kids
      u.volume= opts.volume?? 0.9;
      // pick a Russian voice if available
      const voices = speechSynthesis.getVoices();
      const ru = voices.find(v=>/ru/i.test(v.lang));
      if (ru) u.voice = ru;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch(_){}
  }
  function praise(){
    const text = PRAISES[Math.floor(Math.random()*PRAISES.length)];
    setTimeout(()=>speak(text), 350);
  }
  function encourage(){
    const text = TRY_AGAIN[Math.floor(Math.random()*TRY_AGAIN.length)];
    setTimeout(()=>speak(text), 280);
  }
  // preload voices on some browsers
  if ('speechSynthesis' in window){
    window.speechSynthesis.onvoiceschanged = ()=>{};
    setTimeout(()=>window.speechSynthesis.getVoices(), 200);
  }

  // ---------- Richer SFX (override PA_SFX kid-style) ----------
  function ensureSfx(){
    const S = window.PA_SFX = window.PA_SFX || {};

    // Cheerful click — short bouncy "boop"
    const baseClick = S.click;
    S.click = function(){
      blip(660, 0.05, 'sine', 0.22, 990);
      setTimeout(()=>blip(1320, 0.04, 'triangle', 0.16), 40);
    };

    // Happy "pop" with sparkle
    S.pop = function(){
      blip(520, 0.08, 'triangle', 0.3, 1040);
      setTimeout(()=>blip(1760, 0.05, 'sine', 0.18), 70);
    };

    // CORRECT — fanfare + voice praise
    S.correct = function(){
      melody([[523,.14],[659,.14],[784,.14],[1046,.22]], 'triangle', 80);
      setTimeout(()=>melody([[1318,.16],[1568,.22]], 'sine', 80), 380);
      praise();
    };

    // WRONG — soft sad blip + gentle encouragement (no scary buzz)
    S.wrong = function(){
      blip(380, 0.18, 'sine', 0.28, 240);
      setTimeout(()=>blip(280, 0.22, 'sine', 0.26, 180), 160);
      encourage();
    };

    // WIN — big fanfare
    S.win = function(){
      melody([[523,.16],[659,.16],[784,.16],[1046,.18],[1318,.2],[1568,.22],[2093,.32]], 'triangle', 90);
      setTimeout(()=>speak('Ура! Победа! Ты молодец!', {pitch:1.6, rate:1.1}), 900);
    };

    // XP — gentle sparkle
    S.xp = function(){
      melody([[988,.1],[1318,.1],[1760,.16]], 'sine', 70);
    };

    // Hover — very quiet
    S.hover = function(){ blip(1500, 0.02, 'sine', 0.08); };

    // New: cheer / level-up
    S.cheer = function(){
      melody([[523,.12],[784,.12],[1046,.12],[1318,.18]], 'triangle', 70);
      setTimeout(()=>speak('Новый уровень!', {pitch:1.5}), 500);
    };
  }
  ensureSfx();
  // re-apply after enhancements*.js have run (they may overwrite PA_SFX)
  setTimeout(ensureSfx, 600);
  setTimeout(ensureSfx, 1500);

  // ---------- Bouncier, more interactive buttons ----------
  const css = `
  /* Bouncy buttons & cards */
  button, .btn, .opt, .chip, .nav-item, .tab, summary, .card {
    transition: transform .15s cubic-bezier(.34,1.56,.64,1),
                box-shadow .2s ease,
                filter .2s ease !important;
  }
  button:hover, .btn:hover, .opt:hover, .chip:hover, .nav-item:hover, .tab:hover, summary:hover {
    transform: translateY(-2px) scale(1.04) !important;
    filter: brightness(1.08) saturate(1.1);
  }
  button:active, .btn:active, .opt:active, .chip:active, .nav-item:active, .tab:active {
    transform: translateY(1px) scale(.96) !important;
    transition-duration: .05s !important;
  }
  .card:hover {
    transform: translateY(-4px) rotate(-.4deg) !important;
    box-shadow: 0 18px 40px rgba(0,0,0,.18) !important;
  }

  /* Sparkle particles on click */
  .kid-spark {
    position: fixed; pointer-events:none; z-index: 9999;
    font-size: 18px; will-change: transform, opacity;
    animation: sparkFly .8s ease-out forwards;
    user-select:none;
  }
  @keyframes sparkFly {
    0%   { transform: translate(-50%,-50%) scale(.6) rotate(0deg); opacity: 1; }
    100% { transform: translate(var(--dx),var(--dy)) scale(1.4) rotate(var(--rot)); opacity: 0; }
  }

  /* Wiggle on hover for big CTA buttons */
  .btn-primary:hover, .btn[data-cheer]:hover {
    animation: kidWiggle .5s ease;
  }
  @keyframes kidWiggle {
    0%,100% { transform: translateY(-2px) scale(1.04) rotate(0); }
    25%     { transform: translateY(-2px) scale(1.04) rotate(-3deg); }
    75%     { transform: translateY(-2px) scale(1.04) rotate(3deg); }
  }

  /* Glow ring around focused input/button — kid-friendly */
  button:focus-visible, input:focus-visible, .opt:focus-visible {
    outline: 3px solid #ffd83d !important;
    outline-offset: 3px !important;
    box-shadow: 0 0 0 6px rgba(255,216,61,.25) !important;
  }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- Sparkle on click ----------
  const EMOJI = ['✨','⭐','🌟','💫','🎉','💖','🪄'];
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('button, .btn, .opt, .chip, .nav-item, .tab, summary, .card');
    if (!t) return;
    const n = 6;
    for (let i=0;i<n;i++){
      const s = document.createElement('div');
      s.className = 'kid-spark';
      s.textContent = EMOJI[Math.floor(Math.random()*EMOJI.length)];
      s.style.left = e.clientX + 'px';
      s.style.top  = e.clientY + 'px';
      const ang = (Math.PI*2 * i)/n + Math.random()*0.5;
      const dist= 40 + Math.random()*40;
      s.style.setProperty('--dx', Math.cos(ang)*dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang)*dist + 'px');
      s.style.setProperty('--rot', (Math.random()*360-180)+'deg');
      document.body.appendChild(s);
      setTimeout(()=>s.remove(), 850);
    }
  }, true);

  // ---------- Hook into quiz answers for voice praise ----------
  // Observe added/changed classes on .opt elements
  const obs = new MutationObserver(muts=>{
    for (const m of muts){
      if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
      const el = m.target;
      if (!el.classList || !el.classList.contains('opt')) continue;
      if (el.classList.contains('correct') && !el._kidPraised){
        el._kidPraised = 1;
        // PA_SFX.correct already triggers praise; nothing extra needed
      } else if (el.classList.contains('wrong') && !el._kidWronged){
        el._kidWronged = 1;
      }
    }
  });
  obs.observe(document.body, { subtree:true, attributes:true, attributeFilter:['class'] });

  // ---------- First-interaction unlock for audio + voice ----------
  function unlock(){
    ac();
    // tiny silent utterance unlocks speech on iOS/Safari
    if ('speechSynthesis' in window){
      try { speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } catch(_){}
    }
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  }
  document.addEventListener('pointerdown', unlock, { once:false });
  document.addEventListener('keydown', unlock, { once:false });

  // ---------- Friendly welcome ----------
  window.addEventListener('load', ()=>{
    setTimeout(()=>{
      if (soundOn()){
        melody([[523,.12],[784,.12],[1046,.18]], 'triangle', 80);
        setTimeout(()=>speak('Привет! Давай учить веб!', {pitch:1.5, rate:1.1}), 500);
      }
    }, 800);
  });

  console.log('[Web Academy] kid-fun.js loaded — motivational sounds & bouncy buttons ready');
})();
