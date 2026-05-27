/* Funny WebAudio sounds for kids — no external files needed */
(function(){
  let ctx = null;
  let enabled = localStorage.getItem('soundEnabled') !== 'false';

  function getCtx(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return null; }
    }
    if(ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo){
    if(!enabled) return;
    const c = getCtx(); if(!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(vol || 0.15, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  // Funny sound presets
  const sfx = {
    pop:    () => tone(800, 0.12, 'square', 0.18, 200),         // boing-pop
    boing:  () => { tone(200, 0.18, 'sawtooth', 0.18, 600); setTimeout(()=>tone(600,0.15,'sine',0.12,250),60); },
    click:  () => tone(1200, 0.06, 'square', 0.12, 600),
    magic:  () => {
      [523, 659, 784, 1046].forEach((f,i)=>setTimeout(()=>tone(f,0.15,'triangle',0.14),i*70));
    },
    success:() => {
      [523, 659, 784, 1046, 1318].forEach((f,i)=>setTimeout(()=>tone(f,0.18,'sine',0.16),i*90));
    },
    hover:  () => tone(900, 0.05, 'sine', 0.06, 1100),
    whoosh: () => tone(150, 0.25, 'sawtooth', 0.1, 800)
  };

  window.LCSounds = {
    play: (n) => sfx[n] && sfx[n](),
    isOn: () => enabled,
    toggle: () => {
      enabled = !enabled;
      localStorage.setItem('soundEnabled', enabled);
      if(enabled) sfx.magic();
      return enabled;
    }
  };

  // Burst emoji visual on click
  function burst(x, y, emojis){
    const arr = emojis || ['🎉','⭐','✨','🚀','💥','🎈'];
    for(let i=0;i<6;i++){
      const el = document.createElement('div');
      el.className = 'burst-emoji';
      el.textContent = arr[Math.floor(Math.random()*arr.length)];
      el.style.left = x+'px'; el.style.top = y+'px';
      el.style.setProperty('--dx',((Math.random()-.5)*200)+'px');
      el.style.setProperty('--dy',(-80-Math.random()*120)+'px');
      el.style.setProperty('--rot',(Math.random()*720-360)+'deg');
      document.body.appendChild(el);
      setTimeout(()=>el.remove(), 1100);
    }
  }
  window.LCBurst = burst;

  // Auto wire after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // Ripple coords on buttons
    document.addEventListener('mousemove', (e) => {
      const b = e.target.closest && e.target.closest('.btn');
      if(b){
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', (e.clientX-r.left)+'px');
        b.style.setProperty('--my', (e.clientY-r.top)+'px');
      }
    });

    // Hover sounds
    document.addEventListener('mouseover', (e) => {
      const t = e.target;
      if(!t.closest) return;
      if(t.closest('.btn') || t.closest('.tool-card') || t.closest('.project-card') || t.closest('.badge-mini') || t.closest('.step')){
        sfx.hover();
      }
    });

    // Click sounds + emoji burst on buttons
    document.addEventListener('click', (e) => {
      const t = e.target;
      if(!t.closest) return;
      const btn = t.closest('.btn');
      const tool = t.closest('.tool-card');
      const proj = t.closest('.project-card');
      const nav  = t.closest('.nav a');
      const theme= t.closest('#themeToggle');
      const reset= t.closest('#resetProgress');

      if(btn){
        if(btn.classList.contains('btn-primary')){
          sfx.success();
          burst(e.clientX, e.clientY);
        } else {
          sfx.boing();
        }
      } else if(tool){
        sfx.magic();
        burst(e.clientX, e.clientY, ['🛠️','⚙️','💻','📦','✨']);
      } else if(proj){
        sfx.pop();
      } else if(nav){
        sfx.click();
      } else if(theme){
        sfx.whoosh();
      } else if(reset){
        sfx.whoosh();
      }
    });

    // Sound toggle button injection
    const header = document.querySelector('.header-inner');
    const themeBtn = document.getElementById('themeToggle');
    if(header && themeBtn && !document.getElementById('soundToggle')){
      const sBtn = document.createElement('button');
      sBtn.id = 'soundToggle';
      sBtn.className = 'sound-btn' + (enabled ? '' : ' muted');
      sBtn.setAttribute('aria-label','Включить/выключить звук');
      sBtn.textContent = enabled ? '🔊' : '🔇';
      sBtn.addEventListener('click', () => {
        const on = window.LCSounds.toggle();
        sBtn.textContent = on ? '🔊' : '🔇';
        sBtn.classList.toggle('muted', !on);
      });
      themeBtn.parentNode.insertBefore(sBtn, themeBtn);
    }

    // Form submit celebration
    const form = document.getElementById('userForm');
    if(form){
      form.addEventListener('submit', (e) => {
        sfx.success();
        const r = form.getBoundingClientRect();
        burst(r.left + r.width/2, r.top + 60, ['🎉','🎊','🥳','⭐','🚀','🌟']);
      });
    }
  });
})();
