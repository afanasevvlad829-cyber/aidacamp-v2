/* === КодКидс: Funny walking animals + project timer === */
(() => {
  if (!document.querySelector('.project-detail') && !document.getElementById('projectRoot')) return;
  // Wait until detail rendered
  const init = () => {
    if (!document.querySelector('.project-detail')) { return setTimeout(init, 80); }
    mountAnimals();
    mountTimer();
  };
  setTimeout(init, 100);

  // ---------- Walking animals strip ----------
  const ANIMALS = ['🐶','🐱','🦊','🐼','🐨','🐵','🦁','🐯','🐸','🐻','🐰','🐹','🐧','🦄','🐲','🦖'];
  const SAYINGS = [
    'Ты справишься!','Гав-гав, кодим!','Мяу, красавчик!','Я верю в тебя!',
    'Ещё чуть-чуть!','Топ-топ к цели!','Бан-ан-ас! 🍌','Рр-р-р, мощно!',
    'Прыг-скок!','Поехали!','Не сдавайся!','Ты гений 🤩'
  ];
  function mountAnimals(){
    const strip = document.createElement('div');
    strip.className = 'animal-strip';
    strip.setAttribute('aria-hidden','true');
    strip.innerHTML = `
      <div class="ground"></div>
      <div class="clouds">
        <span class="cloud c1">☁️</span><span class="cloud c2">☁️</span><span class="cloud c3">☁️</span>
      </div>
      <div class="walkers"></div>
    `;
    const detail = document.querySelector('.project-detail');
    detail.parentNode.insertBefore(strip, detail);
    const walkers = strip.querySelector('.walkers');
    const pick = n => {
      const out = [];
      const pool = [...ANIMALS];
      for (let i=0;i<n;i++) out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
      return out;
    };
    const chosen = pick(5);
    chosen.forEach((emoji, i) => {
      const w = document.createElement('div');
      w.className = 'walker';
      w.style.animationDuration = (14 + i*3) + 's';
      w.style.animationDelay = (-i*2.5) + 's';
      w.innerHTML = `
        <div class="bubble">${SAYINGS[Math.floor(Math.random()*SAYINGS.length)]}</div>
        <div class="animal">${emoji}</div>
      `;
      walkers.appendChild(w);
    });

    // Reading-progress animal that walks across the page as you scroll
    const reader = document.createElement('div');
    reader.className = 'reader-pet';
    reader.innerHTML = `<span class="reader-emoji">🐢</span><span class="reader-trail">···</span>`;
    document.body.appendChild(reader);
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      reader.style.left = `calc(${(p*100).toFixed(2)}% - 30px)`;
      const pets = ['🐢','🐇','🐱','🦊','🐶','🦄'];
      reader.querySelector('.reader-emoji').textContent = pets[Math.floor(p*(pets.length-1))];
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();

    // Click an animal to make it jump + funny sound
    strip.addEventListener('click', e => {
      const a = e.target.closest('.walker');
      if (!a) return;
      a.classList.remove('jump'); void a.offsetWidth; a.classList.add('jump');
      try { window.LCSounds && window.LCSounds.play && window.LCSounds.play('pop'); } catch(_){}
    });
  }

  // ---------- Funny timer ----------
  function mountTimer(){
    const meta = document.querySelector('.pd-meta');
    const wrap = document.createElement('div');
    wrap.className = 'fun-timer';
    wrap.innerHTML = `
      <div class="ft-face">🐣</div>
      <div class="ft-body">
        <div class="ft-row">
          <strong class="ft-title">Таймер фокуса</strong>
          <span class="ft-time" id="ftTime">00:00</span>
        </div>
        <div class="ft-track"><div class="ft-fill" id="ftFill"></div><div class="ft-runner" id="ftRunner">🐌</div></div>
        <div class="ft-msg" id="ftMsg">Жми «Старт» — и поехали! 🚀</div>
        <div class="ft-btns">
          <button class="ft-btn ft-start" id="ftStart">▶ Старт</button>
          <button class="ft-btn ft-pause" id="ftPause">⏸ Пауза</button>
          <button class="ft-btn ft-reset" id="ftReset">↺ Сброс</button>
          <select class="ft-sel" id="ftGoal" title="Цель">
            <option value="600">10 мин 🥚</option>
            <option value="1500" selected>25 мин 🐣 (помодоро)</option>
            <option value="2700">45 мин 🐥</option>
            <option value="3600">60 мин 🐔</option>
          </select>
        </div>
      </div>
    `;
    meta.parentNode.parentNode.appendChild(wrap);

    const $ = id => document.getElementById(id);
    let goal = 1500, sec = 0, t = null, running = false;
    const RUNNERS = ['🐌','🐢','🐛','🐞','🐇','🐎','🚀'];
    const MSGS = [
      [0.0,'Только разогреваемся… 🐌'],
      [0.15,'Класс! Глаза в код 👀'],
      [0.30,'Идём ровно, не отвлекаемся 🐢'],
      [0.50,'Половина! Ты молодец 🌟'],
      [0.70,'Финишная прямая! 🐇'],
      [0.90,'Уже почти! 🐎'],
      [1.0,'🎉 Готово! Ты — космос! 🚀']
    ];
    const fmt = s => {
      const m = Math.floor(s/60), r = s%60;
      return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0');
    };
    const render = () => {
      const left = Math.max(0, goal - sec);
      $('ftTime').textContent = fmt(left);
      const p = Math.min(1, sec/goal);
      $('ftFill').style.width = (p*100).toFixed(1)+'%';
      $('ftRunner').style.left = `calc(${(p*100).toFixed(1)}% - 12px)`;
      $('ftRunner').textContent = RUNNERS[Math.min(RUNNERS.length-1, Math.floor(p*RUNNERS.length))];
      let msg = MSGS[0][1];
      for (const [k,m] of MSGS) if (p>=k) msg = m;
      $('ftMsg').textContent = msg;
      const faces = ['🐣','🐤','🐥','🐔','🦅','🚀'];
      wrap.querySelector('.ft-face').textContent = faces[Math.min(faces.length-1, Math.floor(p*faces.length))];
      if (sec>=goal && running) { stop(); celebrate(); }
    };
    const tick = () => { sec++; render(); };
    const start = () => {
      if (running) return; running = true;
      wrap.classList.add('running');
      t = setInterval(tick, 1000);
      try { window.LCSounds && window.LCSounds.play && window.LCSounds.play('click'); } catch(_){}
    };
    const stop = () => { running = false; wrap.classList.remove('running'); clearInterval(t); t=null; };
    const reset = () => { stop(); sec=0; render(); };
    const celebrate = () => {
      try { window.LCSounds && window.LCSounds.play && window.LCSounds.play('win'); } catch(_){}
      const burst = document.createElement('div');
      burst.className='ft-burst';
      burst.innerHTML = ['🎉','✨','🎊','⭐','🥳','🚀'].map(e=>`<span>${e}</span>`).join('');
      wrap.appendChild(burst);
      setTimeout(()=> burst.remove(), 1800);
    };
    $('ftStart').addEventListener('click', start);
    $('ftPause').addEventListener('click', stop);
    $('ftReset').addEventListener('click', reset);
    $('ftGoal').addEventListener('change', e => { goal = parseInt(e.target.value,10); reset(); });
    render();
  }
})();
