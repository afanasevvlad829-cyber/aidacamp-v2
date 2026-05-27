/* ===== Python Academy — Fun Pack JS (sounds, mascot, timer, confetti) ===== */
(function(){
  'use strict';

  // ---------- Sound engine (Web Audio, no files) ----------
  let AC, masterGain, soundOn = localStorage.getItem('pa_sound') !== '0';
  function ac(){
    if (!AC){
      AC = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = AC.createGain();
      masterGain.gain.value = 0.18;
      masterGain.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(freq, dur=0.12, type='sine', vol=1, slideTo=null){
    if (!soundOn) return;
    const c = ac();
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(masterGain);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function chord(freqs, dur=0.25, type='triangle'){
    freqs.forEach((f,i)=>setTimeout(()=>tone(f,dur,type,0.7), i*60));
  }
  const SFX = {
    click:   ()=>tone(720, 0.06, 'square', 0.6, 880),
    hover:   ()=>tone(1200, 0.03, 'sine', 0.3),
    pop:     ()=>tone(440, 0.1, 'triangle', 0.8, 880),
    correct: ()=>chord([523,659,784,1046], 0.22, 'triangle'),
    wrong:   ()=>{ tone(200,0.18,'sawtooth',0.7,90); setTimeout(()=>tone(140,0.22,'sawtooth',0.7,70),100); },
    tick:    ()=>tone(900, 0.03, 'square', 0.25),
    win:     ()=>chord([523,659,784,1046,1318,1568], 0.3, 'triangle'),
    timeout: ()=>{ tone(300,0.2,'sawtooth',0.8,100); setTimeout(()=>tone(200,0.3,'sawtooth',0.8,60),180); },
    xp:      ()=>chord([784,1046,1318], 0.15, 'sine'),
  };
  window.PA_SFX = SFX;

  // ---------- Sound toggle FAB ----------
  function makeFab(){
    const b = document.createElement('button');
    b.className = 'sound-fab';
    b.title = 'Включить / выключить звук';
    b.textContent = soundOn ? '🔊' : '🔇';
    b.addEventListener('click', ()=>{
      soundOn = !soundOn;
      localStorage.setItem('pa_sound', soundOn ? '1' : '0');
      b.textContent = soundOn ? '🔊' : '🔇';
      if (soundOn) SFX.pop();
    });
    document.body.appendChild(b);
  }

  // ---------- Click ripple + sound on every button ----------
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('button, .opt, .chip, .card, .tab, .nav-item, summary');
    if (!btn) return;
    // ripple
    const r = btn.getBoundingClientRect();
    const burst = document.createElement('span');
    burst.className = 'ripple-burst';
    const size = Math.max(r.width, r.height);
    burst.style.width = burst.style.height = size + 'px';
    burst.style.left = (e.clientX - r.left - size/2) + 'px';
    burst.style.top  = (e.clientY - r.top  - size/2) + 'px';
    btn.appendChild(burst);
    setTimeout(()=>burst.remove(), 650);
    // sound
    if (btn.classList.contains('opt')) return; // quiz options handled by observer
    SFX.click();
  }, true);

  document.addEventListener('mouseover', (e)=>{
    const btn = e.target.closest('button, .nav-item, .card, .chip');
    if (btn && !btn._hoverPlayed){ btn._hoverPlayed = 1; SFX.hover(); setTimeout(()=>btn._hoverPlayed=0, 200); }
  }, true);

  // ---------- Confetti ----------
  function confetti(n=80){
    const colors = ['#ffd83d','#ff7a59','#6ee7ff','#4ade80','#ff4fa3','#a78bfa'];
    for (let i=0;i<n;i++){
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random()*100 + 'vw';
      c.style.background = colors[i%colors.length];
      c.style.animationDuration = (1.6 + Math.random()*1.6) + 's';
      c.style.transform = `rotate(${Math.random()*360}deg)`;
      document.body.appendChild(c);
      setTimeout(()=>c.remove(), 3500);
    }
  }
  window.PA_confetti = confetti;

  // ---------- XP float ----------
  function xpFloat(amount, x, y){
    const f = document.createElement('div');
    f.className = 'xp-float';
    f.textContent = '+' + amount + ' XP';
    f.style.left = (x||window.innerWidth/2) + 'px';
    f.style.top  = (y||120) + 'px';
    document.body.appendChild(f);
    setTimeout(()=>f.remove(), 1300);
  }

  // ---------- Mascot factory ----------
  const READING_MSGS  = ['Читаю вопрос... 🤔','Думаем вместе! 🧠','Какой будет ответ? 👀','Ты сможешь! 💪','Не торопись, подумай 🐌'];
  const THINKING_MSGS = ['Хмм... интересно 🤨','Сложный выбор! 🎯','Доверься себе! ✨','Логика+интуиция 🧩'];
  const WIN_MSGS      = ['Ого! Правильно! 🎉','Гений Python! 🐍','Так держать! 🚀','Ты крут! 🔥'];
  const LOSE_MSGS     = ['Почти! Ещё попытка 💡','Не сдавайся! 💛','Ошибки = опыт 🌱','В след раз получится! 🤗'];
  function rand(a){ return a[Math.floor(Math.random()*a.length)]; }

  function makeMascot(){
    const wrap = document.createElement('div');
    wrap.className = 'mascot-wrap';
    const m = document.createElement('div');
    m.className = 'mascot reading';
    m.textContent = '🐍';
    const b = document.createElement('div');
    b.className = 'mascot-bubble';
    b.textContent = rand(READING_MSGS);
    wrap.append(m, b);
    wrap._setState = (state, msg)=>{
      m.className = 'mascot ' + state;
      if (msg) b.textContent = msg;
    };
    // periodically rotate idle messages
    let iv = setInterval(()=>{
      if (m.className.includes('reading')) b.textContent = rand(READING_MSGS);
      else if (m.className.includes('thinking')) b.textContent = rand(THINKING_MSGS);
    }, 4200);
    wrap._stop = ()=>clearInterval(iv);
    return wrap;
  }

  // ---------- Timer factory ----------
  function makeTimer(seconds, onEnd){
    const t = document.createElement('div');
    t.className = 'fun-timer';
    const emo = document.createElement('span'); emo.className='emoji'; emo.textContent='⏰';
    const ring = document.createElement('div'); ring.className='ring';
    const num = document.createElement('span'); num.textContent = seconds;
    ring.appendChild(num);
    const lbl = document.createElement('span'); lbl.textContent = 'сек';
    t.append(emo, ring, lbl);
    let left = seconds, total = seconds, stopped = false;
    const iv = setInterval(()=>{
      if (stopped) return;
      left--;
      num.textContent = Math.max(0,left);
      const p = (left/total)*100;
      ring.style.setProperty('--p', p + '%');
      if (left <= 10 && left > 5) t.classList.add('warn');
      if (left <= 5){ t.classList.remove('warn'); t.classList.add('danger'); }
      if (left <= 0){
        clearInterval(iv); stopped = true;
        t.classList.remove('warn','danger'); t.classList.add('dead');
        emo.textContent = '💤'; num.textContent = '0';
        onEnd && onEnd();
      }
    }, 1000);
    t.stop = ()=>{ stopped = true; clearInterval(iv); t.classList.add('dead'); emo.textContent='✅'; };
    return t;
  }

  // ---------- Observer: enhance quiz blocks as they appear ----------
  function enhanceQuizBlock(q){
    if (q._enhanced) return; q._enhanced = 1;

    // Per-question timer removed — single section timer is added by enhancements3.js
    q._timer = null;

    // Add mascot before options
    const opts = q.querySelector('.opts');
    const mascot = makeMascot();
    if (opts) q.insertBefore(mascot, opts);

    // Hover on option => thinking
    q.querySelectorAll('.opt').forEach(o=>{
      o.addEventListener('mouseenter', ()=>{
        if (!o.dataset.locked) mascot._setState('thinking', rand(THINKING_MSGS));
      });
      o.addEventListener('mouseleave', ()=>{
        if (!o.dataset.locked) mascot._setState('reading', rand(READING_MSGS));
      });
      o.addEventListener('click', (e)=>{
        // Defer to next tick to let existing handler add correct/wrong class
        setTimeout(()=>{
          if (o.classList.contains('correct')){
            SFX.correct();
            mascot._setState('dancing', rand(WIN_MSGS));
            confetti(40);
            xpFloat(10, e.clientX, e.clientY);
            if (q._timer) q._timer.stop();
          } else if (o.classList.contains('wrong')){
            SFX.wrong();
            mascot._setState('sad', rand(LOSE_MSGS));
            if (q._timer) q._timer.stop();
          }
        }, 30);
      });
    });
  }

  const mo = new MutationObserver((muts)=>{
    muts.forEach(m=>{
      m.addedNodes.forEach(n=>{
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches('.quiz-q')) enhanceQuizBlock(n);
        n.querySelectorAll && n.querySelectorAll('.quiz-q').forEach(enhanceQuizBlock);
      });
    });
    // also catch quiz score milestone toasts → win sound + confetti
  });

  // Toast intercept for win sound
  const _origAppend = document.body.appendChild.bind(document.body);
  document.body.appendChild = function(node){
    const r = _origAppend(node);
    if (node && node.classList && node.classList.contains('toast')){
      const txt = (node.textContent||'').toLowerCase();
      if (txt.includes('квиз') || txt.includes('xp') || txt.includes('пройден')){
        SFX.win(); confetti(120);
      } else {
        SFX.pop();
      }
    }
    return r;
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    makeFab();
    mo.observe(document.body, {childList:true, subtree:true});
    // Enhance any quiz blocks already present
    document.querySelectorAll('.quiz-q').forEach(enhanceQuizBlock);
    // First-click wake audio
    const wake = ()=>{ ac(); SFX.pop(); document.removeEventListener('click', wake); };
    document.addEventListener('click', wake, {once:true});
  });
})();
