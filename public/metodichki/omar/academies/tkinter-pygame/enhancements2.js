/* ===== Tkinter & Pygame Academy — Fun Pack v2 (timers, sounds, walkers, profile) ===== */
(function(){
  'use strict';
  const STATE_KEY = "pyacademy_state_v1";
  const getState = ()=> { try { return JSON.parse(localStorage.getItem(STATE_KEY))||{}; } catch(e){ return {}; } };

  // ---------- Extra sounds layered on PA_SFX ----------
  function waitSFX(cb){
    if (window.PA_SFX) return cb();
    setTimeout(()=>waitSFX(cb), 80);
  }
  waitSFX(()=>{
    const AC = new (window.AudioContext||window.webkitAudioContext)();
    let mg = AC.createGain(); mg.gain.value = 0.18; mg.connect(AC.destination);
    const soundOn = ()=> localStorage.getItem('pa_sound') !== '0';
    function t(f,d=0.12,type='sine',v=0.7,slide=null){
      if(!soundOn()) return;
      if (AC.state==='suspended') AC.resume();
      const o=AC.createOscillator(), g=AC.createGain();
      o.type=type; o.frequency.value=f;
      if(slide) o.frequency.exponentialRampToValueAtTime(slide, AC.currentTime+d);
      g.gain.value=0;
      g.gain.linearRampToValueAtTime(v, AC.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime+d);
      o.connect(g); g.connect(mg);
      o.start(); o.stop(AC.currentTime+d+0.02);
    }
    function noise(d=0.2,v=0.3){
      if(!soundOn()) return;
      if (AC.state==='suspended') AC.resume();
      const b=AC.createBuffer(1, AC.sampleRate*d, AC.sampleRate);
      const data=b.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
      const s=AC.createBufferSource(); s.buffer=b;
      const g=AC.createGain(); g.gain.value=v;
      s.connect(g); g.connect(mg); s.start();
    }
    Object.assign(window.PA_SFX, {
      coin:    ()=>{ t(988,0.08,'square',0.5); setTimeout(()=>t(1318,0.15,'square',0.5),70); },
      jump:    ()=>t(523,0.15,'square',0.5, 988),
      magic:   ()=>{ [523,659,784,1046,1318,1568,2093].forEach((f,i)=>setTimeout(()=>t(f,0.08,'sine',0.4),i*40)); },
      swoosh:  ()=>noise(0.18, 0.25),
      levelup: ()=>{ [392,523,659,784,1046].forEach((f,i)=>setTimeout(()=>t(f,0.18,'triangle',0.55),i*90)); },
      applause:()=>{ for(let i=0;i<8;i++) setTimeout(()=>noise(0.12,0.2), i*70); },
      meow:    ()=>{ t(700,0.12,'sawtooth',0.4,500); setTimeout(()=>t(500,0.18,'sawtooth',0.4,800),120); },
      bark:    ()=>{ t(280,0.08,'square',0.5,180); setTimeout(()=>t(280,0.08,'square',0.5,180),120); },
      drumroll:()=>{ for(let i=0;i<10;i++) setTimeout(()=>t(120+i*10,0.04,'square',0.4), i*40); },
      whoosh:  ()=>t(1200,0.2,'sine',0.4, 200),
      sparkle: ()=>{ [1500,1800,2200,1900,2400].forEach((f,i)=>setTimeout(()=>t(f,0.06,'sine',0.3),i*50)); },
    });
  });

  // ---------- Walking animal companions ----------
  function makeWalkers(){
    const animals = [
      {emoji:'🐈', cls:'cat',   sound:'meow'},
      {emoji:'🐕', cls:'dog',   sound:'bark'},
      {emoji:'🐍', cls:'snake', sound:'whoosh'},
      {emoji:'🦋', cls:'bfly',  sound:'sparkle'},
      {emoji:'🐇', cls:'bunny', sound:'jump'},
    ];
    animals.forEach((a,i)=>{
      const w = document.createElement('div');
      w.className = 'pa-walker ' + a.cls;
      w.textContent = a.emoji;
      w.style.animationDelay = (i*4) + 's, 0s';
      w.style.pointerEvents = 'auto';
      w.style.cursor = 'pointer';
      w.addEventListener('click', ()=>{
        window.PA_SFX && window.PA_SFX[a.sound] && window.PA_SFX[a.sound]();
        burstSparks(w);
      });
      document.body.appendChild(w);
    });
  }
  function burstSparks(el){
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    ['✨','⭐','💫','🌟','✨'].forEach((s,i)=>{
      const sp = document.createElement('div');
      sp.className = 'pa-spark';
      sp.textContent = s;
      sp.style.left = (cx + (Math.random()*60-30)) + 'px';
      sp.style.top  = cy + 'px';
      document.body.appendChild(sp);
      setTimeout(()=>sp.remove(), 1500);
    });
  }

  // ---------- Session timer DISABLED (removed by request) ----------
  let sessionTimer = null;
  function ensureSessionTimer(){ return null; }
  function _unused_ensureSessionTimer(){
    if (sessionTimer) return sessionTimer;
    const main = document.querySelector('main');
    if (!main) return null;
    const bar = document.createElement('div');
    bar.className = 'pa-session-timer';
    bar.innerHTML = `
      <span class="ic">⏱️</span>
      <div>
        <div class="label">Время на задании</div>
        <div><span class="val">00:00</span></div>
      </div>
      <button class="btn" data-act="toggle">▶ Старт</button>
      <button class="btn" data-act="reset" title="Сброс">↺</button>
    `;
    // insert at top of main
    main.insertBefore(bar, main.firstChild);
    let elapsed = 0, running = false, iv = null;
    const val = bar.querySelector('.val');
    const tg  = bar.querySelector('[data-act="toggle"]');
    function fmt(s){ const m=String(Math.floor(s/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return m+':'+ss; }
    function tick(){
      elapsed++; val.textContent = fmt(elapsed);
      if (elapsed === 300) { bar.classList.add('warn'); }
    }
    bar.addEventListener('click', (e)=>{
      const act = e.target.dataset && e.target.dataset.act;
      if (act === 'toggle'){
        running = !running;
        tg.textContent = running ? '⏸ Пауза' : '▶ Старт';
        if (running){ iv = setInterval(tick, 1000); }
        else { clearInterval(iv); }
      } else if (act === 'reset'){
        clearInterval(iv); running=false; elapsed=0; val.textContent='00:00';
        tg.textContent='▶ Старт'; bar.classList.remove('warn');
      }
    });
    sessionTimer = { bar, show(){bar.style.display='flex';}, hide(){bar.style.display='none';} };
    return sessionTimer;
  }
  function updateSessionTimerVisibility(){ /* timer removed */ }

  // ---------- Profile / progress dashboard ----------
  const ACH_LIST = [
    {id:"first", name:"🎯 Первый шаг", desc:"Открой первую тему"},
    {id:"quiz5", name:"🧠 Викторина", desc:"Пройди 5 квизов"},
    {id:"debug3", name:"🐞 Отладчик", desc:"Реши 3 задачи на отладку"},
    {id:"xp100", name:"⭐ 100 XP", desc:"Заработай 100 XP"},
    {id:"xp500", name:"🌟 500 XP", desc:"Заработай 500 XP"},
    {id:"xp1000", name:"💎 1000 XP", desc:"Заработай 1000 XP"}
  ];
  function buildProfileData(){
    const s = getState();
    const xp = s.xp||0;
    const topicsDone = Object.keys(s.done||{}).filter(k=>k.startsWith('t')).length;
    const quizDone   = Object.keys(s.quizDone||{}).length;
    const debugDone  = Object.keys(s.debugDone||{}).length;
    const aiDone     = Object.keys(s.aiDone||{}).length;
    const ach        = s.achievements||{};
    const name       = (s.profile && (s.profile.fullName || s.profile.name)) || 'Юный питонист';
    const level      = Math.floor(xp/100)+1;
    const nextXp     = level*100;
    const lvlPct     = Math.min(100, Math.round(xp%100));
    const totalAch   = Object.keys(ach).length;
    return {xp, topicsDone, quizDone, debugDone, aiDone, ach, name, level, nextXp, lvlPct, totalAch};
  }

  function renderProfileInto(modal){
    const {xp, topicsDone, quizDone, debugDone, aiDone, ach, name, level, nextXp, lvlPct, totalAch} = buildProfileData();
    const cells = modal.querySelectorAll('.pa-stat .n');
    if (cells[0]) cells[0].textContent = '⚡ ' + xp;
    if (cells[1]) cells[1].textContent = '🎓 ' + level;
    if (cells[2]) cells[2].textContent = '🏆 ' + totalAch + '/' + ACH_LIST.length;
    if (cells[3]) cells[3].textContent = '📚 ' + topicsDone;
    if (cells[4]) cells[4].textContent = '🧠 ' + quizDone;
    if (cells[5]) cells[5].textContent = '🐞 ' + debugDone;
    if (cells[6]) cells[6].textContent = '🤖 ' + aiDone;
    if (cells[7]) cells[7].textContent = '📚 ' + topicsDone;
    const fill = modal.querySelector('.pa-level-bar .fill');
    if (fill){ fill.style.width = lvlPct + '%'; fill.textContent = lvlPct + '%'; }
    const lvlTitle = modal.querySelector('.pa-lvl-title');
    if (lvlTitle) lvlTitle.textContent = 'До уровня ' + (level+1) + ' — ещё ' + (nextXp - xp) + ' XP';
    const badges = modal.querySelector('.pa-badges');
    if (badges) badges.innerHTML = ACH_LIST.map(a=>`<span class="b ${ach[a.id]?'on':''}" title="${a.desc}">${a.name}</span>`).join('');
    const h2 = modal.querySelector('h2');
    if (h2) h2.textContent = '👤 ' + name;
  }

  function openProfile(){
    window.PA_SFX && window.PA_SFX.magic && window.PA_SFX.magic();
    const {xp, topicsDone, quizDone, debugDone, aiDone, ach, name, level, nextXp, lvlPct, totalAch} = buildProfileData();

    const back = document.createElement('div');
    back.className = 'pa-modal-backdrop';
    back.innerHTML = `
      <div class="pa-modal" style="position:relative">
        <button class="pa-close" title="Закрыть">✖</button>
        <h2>👤 ${name}</h2>
        <div class="sub">Твоя личная карта прогресса в Tkinter & Pygame Academy</div>

        <div class="pa-stats">
          <div class="pa-stat s1"><div class="n">⚡ ${xp}</div><div class="l">Очки XP</div></div>
          <div class="pa-stat s2"><div class="n">🎓 ${level}</div><div class="l">Уровень</div></div>
          <div class="pa-stat s3"><div class="n">🏆 ${totalAch}/${ACH_LIST.length}</div><div class="l">Награды</div></div>
          <div class="pa-stat s4"><div class="n">📚 ${topicsDone}</div><div class="l">Тем изучено</div></div>
        </div>

        <div class="pa-section-title pa-lvl-title">До уровня ${level+1} — ещё ${nextXp - xp} XP</div>
        <div class="pa-level-bar"><div class="fill" style="width:${lvlPct}%">${lvlPct}%</div></div>

        <div class="pa-section-title">Активность</div>
        <div class="pa-stats">
          <div class="pa-stat"><div class="n">🧠 ${quizDone}</div><div class="l">Викторин</div></div>
          <div class="pa-stat"><div class="n">🐞 ${debugDone}</div><div class="l">Отладка</div></div>
          <div class="pa-stat"><div class="n">🤖 ${aiDone}</div><div class="l">AI задач</div></div>
          <div class="pa-stat"><div class="n">📚 ${topicsDone}</div><div class="l">Уроков</div></div>
        </div>

        <div class="pa-section-title">Достижения</div>
        <div class="pa-badges">
          ${ACH_LIST.map(a=>`<span class="b ${ach[a.id]?'on':''}" title="${a.desc}">${a.name}</span>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(back);
    const modal = back.querySelector('.pa-modal');

    // Real-time refresh: chain onto PA_refreshProfile while modal is open
    const prevRefresh = window.PA_refreshProfile;
    window.PA_refreshProfile = function(){
      if (prevRefresh) prevRefresh();
      renderProfileInto(modal);
    };

    const close = ()=>{
      window.PA_SFX && window.PA_SFX.swoosh && window.PA_SFX.swoosh();
      window.PA_refreshProfile = prevRefresh;
      back.remove();
    };
    back.querySelector('.pa-close').addEventListener('click', close);
    back.addEventListener('click', e=>{ if(e.target===back) close(); });
  }
  function makeProfileFab(){
    const b = document.createElement('button');
    b.className = 'pa-profile-fab';
    b.title = 'Мой прогресс';
    b.textContent = '👤';
    b.addEventListener('click', openProfile);
    document.body.appendChild(b);
  }

  // ---------- Init ----------
  function init(){
    // makeWalkers(); // disabled by request
    makeProfileFab();
    ensureSessionTimer();
    updateSessionTimerVisibility();
    const main = document.querySelector('#main');
    if (main){
      new MutationObserver(()=> updateSessionTimerVisibility())
        .observe(main, {childList:true, subtree:true});
    }
    // celebrate XP gain by playing levelup at 100/500/1000
    let lastXp = (getState().xp||0);
    setInterval(()=>{
      const cur = getState().xp || 0;
      if (cur > lastXp){
        const crossed = [100,500,1000].some(m => lastXp < m && cur >= m);
        if (crossed) window.PA_SFX && window.PA_SFX.levelup && window.PA_SFX.levelup();
        else window.PA_SFX && window.PA_SFX.coin && window.PA_SFX.coin();
        lastXp = cur;
      } else lastXp = cur;
    }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
