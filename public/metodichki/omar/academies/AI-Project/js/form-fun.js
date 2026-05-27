/* V8 — interactive form behavior + extra sounds */
(function(){
  function S(name){ try{ window.LCSounds && window.LCSounds.play(name); }catch(e){} }
  function burst(x,y,em){ try{ window.LCBurst && window.LCBurst(x,y,em); }catch(e){} }

  // ===== Extra fun sounds bolted onto LCSounds =====
  document.addEventListener('DOMContentLoaded', () => {
    if(!window.LCSounds) return;
    const ctx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
    function play(freq, dur, type, vol, slide){
      if(!window.LCSounds.isOn()) return;
      if(!ctx) return;
      if(ctx.state === 'suspended') ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      if(slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur);
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(vol || 0.12, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    }
    // Extend the existing sound dictionary via a thin wrapper
    const extras = {
      type:   () => play(1400 + Math.random()*400, 0.04, 'square', 0.05),
      focus:  () => play(700, 0.12, 'triangle', 0.1, 1200),
      coin:   () => { play(880,0.08,'square',0.12); setTimeout(()=>play(1320,0.12,'square',0.12),70); },
      cheer:  () => { [659,784,988,1318,1568].forEach((f,i)=>setTimeout(()=>play(f,0.18,'triangle',0.14),i*70)); },
      tada:   () => { [523,659,784].forEach((f,i)=>setTimeout(()=>play(f,0.12,'square',0.13),i*60));
                       setTimeout(()=>[1046,1318,1568].forEach((f,i)=>setTimeout(()=>play(f,0.22,'sine',0.16),i*80)),200); },
      drumroll: () => { for(let i=0;i<8;i++) setTimeout(()=>play(120+Math.random()*40,0.06,'sawtooth',0.1),i*45); },
      select: () => play(600, 0.08, 'triangle', 0.12, 900),
    };
    const origPlay = window.LCSounds.play;
    window.LCSounds.play = (n) => extras[n] ? extras[n]() : origPlay(n);

    // ===== Form interactions =====
    const form = document.getElementById('userForm');
    if(!form) return;

    const card = form;
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--fx', ((e.clientX - r.left)/r.width*100)+'%');
      card.style.setProperty('--fy', ((e.clientY - r.top)/r.height*100)+'%');
    });

    const fields = form.querySelectorAll('input, select');
    fields.forEach(f => {
      const label = f.closest('label');
      f.addEventListener('focus', () => { S('focus'); });
      f.addEventListener('input', () => {
        if(f.tagName === 'INPUT') S('type');
        if(label) label.classList.toggle('filled', !!f.value.trim());
      });
      f.addEventListener('change', () => {
        if(f.tagName === 'SELECT'){ S('select'); S('coin'); }
        if(label) label.classList.toggle('filled', !!f.value);
      });
    });

    // Submit fanfare on top of existing handler
    form.addEventListener('submit', (e) => {
      S('drumroll');
      setTimeout(()=>S('tada'), 380);
      setTimeout(()=>S('cheer'), 900);
      const r = form.getBoundingClientRect();
      const cx = r.left + r.width/2, cy = r.top + r.height/2;
      for(let i=0;i<3;i++) setTimeout(()=>burst(cx, cy, ['🎉','🎊','🥳','⭐','🚀','🌟','💫','🏆']), i*250);
    });
  });
})();
