/* === КодКидс: Логика приложения === */
(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];

  const langNames = {
    python:'🐍 Python', tkinter:'🪟 Tkinter', pygame:'🎮 Pygame',
    javascript:'⚡ JavaScript', java:'☕ Java', web:'🌐 Web + API', any:'🎲 любой'
  };
  const levelLabel = l => l==='easy'?'🌱 лёгкий':l==='medium'?'🔥 средний':'🚀 сложный';

  /* ---------- ТЕМА ---------- */
  const themeBtn = $('#themeToggle');
  const savedTheme = localStorage.getItem('ck-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ck-theme', next);
    themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  /* ---------- ПРОГРЕСС ---------- */
  function getDone(){ return JSON.parse(localStorage.getItem('ck-done')||'[]'); }
  function setDone(arr){ localStorage.setItem('ck-done', JSON.stringify(arr)); renderProgress(); renderProjects(); }
  function toggleDone(id){
    const d = getDone();
    const i = d.indexOf(id);
    if(i>=0) d.splice(i,1); else d.push(id);
    setDone(d);
  }

  function renderProgress(){
    const user = JSON.parse(localStorage.getItem('ck-user')||'null');
    $('#progressUser').textContent = user?.name ? `${user.name}, ${user.age||'?'} лет` : 'Гость';
    const done = getDone();
    const total = PROJECTS.length;
    const pct = Math.round((done.length/total)*100);
    $('#progressStats').textContent = `${done.length} из ${total} проектов`;
    $('#progressPercent').textContent = pct+'%';
    $('#progressFill').style.width = pct+'%';

    // by language
    const groups = {};
    PROJECTS.forEach(p => { groups[p.lang] = groups[p.lang] || {total:0,done:0}; groups[p.lang].total++; });
    done.forEach(id => { const p = PROJECTS.find(x=>x.id===id); if(p) groups[p.lang].done++; });
    $('#progressLangs').innerHTML = Object.entries(groups).map(([k,v]) => `
      <div class="lang-stat">
        <div class="lang-stat-top"><span>${langNames[k]||k}</span><span>${v.done}/${v.total}</span></div>
        <div class="progress-bar small"><div class="progress-fill" style="width:${(v.done/v.total)*100}%"></div></div>
      </div>`).join('');

    // done list
    const list = $('#doneList');
    if(!done.length){ list.innerHTML = '<li class="muted">Пока пусто — выбери первый проект ниже!</li>'; return; }
    list.innerHTML = done.map(id => {
      const p = PROJECTS.find(x=>x.id===id);
      if(!p) return '';
      return `<li><span class="done-emoji">${p.emoji}</span> ${p.title} <span class="tag ${p.level}">${levelLabel(p.level)}</span></li>`;
    }).join('');
  }

  $('#resetProgress').addEventListener('click', () => {
    if(confirm('Точно сбросить весь прогресс?')) setDone([]);
  });

  /* ---------- ФОРМА ПРИВЕТСТВИЯ ---------- */
  const form = $('#userForm');
  const greeting = $('#formGreeting');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#fName').value.trim();
    const age = $('#fAge').value;
    const lang = $('#fLang').value;
    const level = $('#fLevel').value;
    if(!name || !lang) return;
    localStorage.setItem('ck-user', JSON.stringify({name, age, lang, level}));
    greeting.classList.remove('hidden');
    greeting.textContent = `🎉 Привет, ${name}! Подобрали проекты: ${langNames[lang]} · уровень "${levelLabel(level)}". Прокрути ниже ⬇️`;
    if(lang !== 'any'){ filterLang.value = lang; }
    filterLevel.value = level;
    renderProjects();
    renderProgress();
    setTimeout(()=> document.getElementById('projects').scrollIntoView({behavior:'smooth'}), 400);
  });

  /* ---------- ПРОЕКТЫ ---------- */
  const grid = $('#projectGrid');
  const search = $('#search');
  const filterLang = $('#filterLang');
  const filterLevel = $('#filterLevel');
  const filterPeriod = $('#filterPeriod');
  const noResults = $('#noResults');

  function timeToMinutes(s){
    s = String(s||'').toLowerCase();
    const nums = s.match(/\d+/g) || [];
    if(!nums.length) return 60;
    let total = 0;
    if(s.includes('ч')){
      total += parseInt(nums[0],10) * 60;
      if(nums[1]) total += parseInt(nums[1],10);
    } else {
      total = parseInt(nums[0],10);
    }
    return total;
  }
  function matchPeriod(p, period){
    if(period === 'all') return true;
    const m = timeToMinutes(p.time);
    if(period === 'short') return m <= 180;
    if(period === 'medium') return m > 180 && m <= 360;
    if(period === 'long') return m > 360;
    return true;
  }

  function renderProjects(){
    const q = search.value.trim().toLowerCase();
    const l = filterLang.value;
    const lv = filterLevel.value;
    const pr = filterPeriod ? filterPeriod.value : 'all';
    const done = getDone();
    const list = PROJECTS.filter(p =>
      (l==='all' || p.lang===l) &&
      (lv==='all' || p.level===lv) &&
      matchPeriod(p, pr) &&
      (!q || p.title.toLowerCase().includes(q) || p.short.toLowerCase().includes(q))
    );
    grid.innerHTML = list.map(p => `
      <article class="project-card ${done.includes(p.id)?'is-done':''}" data-id="${p.id}" data-lang="${p.lang}">
        ${done.includes(p.id)?'<div class="done-badge">✅ Готово</div>':''}
        <div class="emoji">${p.emoji}</div>
        <h3>${p.title}</h3>
        <p class="muted">${p.short}</p>
        <div class="meta">
          <span class="tag ${p.level}">${levelLabel(p.level)}</span>
          <span class="tag">⏱️ ${p.time}</span>
          <span class="tag">${langNames[p.lang]||p.lang}</span>
        </div>
      </article>`).join('');
    noResults.classList.toggle('hidden', list.length>0);
  }

  grid.addEventListener('click', e => {
    const card = e.target.closest('.project-card');
    if(card) location.href = 'project.html?id=' + encodeURIComponent(card.dataset.id);
  });

  [search, filterLang, filterLevel, filterPeriod].filter(Boolean).forEach(el => el.addEventListener('input', renderProjects));

  /* ---------- ВСПОМОГ. ---------- */
  function escapeHtml(s){return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function toast(msg){
    const t = document.createElement('div');
    t.className='toast'; t.textContent=msg;
    document.body.appendChild(t);
    setTimeout(()=> t.remove(), 2200);
  }

  /* ---------- СТАРТ ---------- */
  renderProjects();
  renderProgress();

  const saved = JSON.parse(localStorage.getItem('ck-user')||'null');
  if(saved){
    $('#fName').value = saved.name||'';
    $('#fAge').value = saved.age||'';
    $('#fLang').value = saved.lang||'';
    $('#fLevel').value = saved.level||'easy';
  }
})();
