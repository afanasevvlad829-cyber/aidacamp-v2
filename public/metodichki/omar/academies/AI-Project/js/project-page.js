/* === КодКидс: Страница проекта === */
(() => {
  const $ = s => document.querySelector(s);
  const langNames = {
    python:'🐍 Python', tkinter:'🪟 Tkinter', pygame:'🎮 Pygame',
    javascript:'⚡ JavaScript', java:'☕ Java', web:'🌐 Web + API'
  };
  const levelLabel = l => l==='easy'?'🌱 лёгкий':l==='medium'?'🔥 средний':'🚀 сложный';
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // theme
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

  // progress helpers
  const getDone = () => JSON.parse(localStorage.getItem('ck-done')||'[]');
  const setDone = arr => localStorage.setItem('ck-done', JSON.stringify(arr));
  const toggleDone = id => {
    const d = getDone();
    const i = d.indexOf(id);
    if(i>=0) d.splice(i,1); else d.push(id);
    setDone(d);
  };

  function toast(msg){
    const t = document.createElement('div');
    t.className='toast'; t.textContent=msg;
    document.body.appendChild(t);
    setTimeout(()=> t.remove(), 2200);
  }

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const p = PROJECTS.find(x => x.id === id);
  const root = $('#projectRoot');

  if(!p){
    root.innerHTML = `<div class="not-found"><h1>😕 Проект не найден</h1><p>Возможно ссылка устарела. <a href="index.html#projects">Вернуться к списку</a>.</p></div>`;
    return;
  }

  document.title = `${p.title} — КодКидс`;
  const isDone = getDone().includes(id);

  // index for prev/next
  const idx = PROJECTS.indexOf(p);
  const prev = PROJECTS[idx-1];
  const next = PROJECTS[idx+1];

  root.innerHTML = `
    <article class="project-detail">
      <header class="pd-hero ${p.lang}">
        <div class="pd-emoji">${p.emoji}</div>
        <div>
          <div class="pd-meta">
            <span class="tag ${p.level}">${levelLabel(p.level)}</span>
            <span class="tag">⏱️ ${p.time}</span>
            <span class="tag">${langNames[p.lang]||p.lang}</span>
            ${isDone ? '<span class="tag done">✅ Выполнено</span>' : ''}
          </div>
          <h1>${escapeHtml(p.title)}</h1>
          <p class="lead">${escapeHtml(p.short)}</p>
        </div>
      </header>

      <section class="pd-block pd-why">
        <h2>💡 Почему этот проект интересный и важный</h2>
        <p>${escapeHtml(p.why||'')}</p>
      </section>

      <div class="pd-grid">
        <section class="pd-block">
          <h2>🎯 Чему ты научишься</h2>
          <ul class="check-list">${p.learn.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>
        </section>
        <section class="pd-block">
          <h2>🧰 Что понадобится</h2>
          <ul class="check-list">${(p.requirements||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>
        </section>
      </div>

      <section class="pd-block pd-structure">
        <h2>🏗️ Структура проекта и как он устроен</h2>
        <pre class="struct-box">${escapeHtml(p.structure||'')}</pre>
      </section>

      <section class="pd-block pd-how">
        <h2>⚙️ Как это работает</h2>
        <pre class="struct-box">${escapeHtml(p.howItWorks||'')}</pre>
      </section>

      <section class="pd-block">
        <h2>📋 Пошаговая инструкция</h2>
        <ol class="steps-list">${p.steps.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol>
      </section>

      <section class="pd-block pd-starter">
        <h2>👨‍💻 Стартовый код (базовая структура)</h2>
        <p class="muted">Это скелет — заполни TODO и расширь под себя. Скопируй в свой редактор и запускай!</p>
        <div class="code-box">
          <button class="copy-btn small" id="copyCode">📋 Скопировать код</button>
          <pre><code id="starterCode">${escapeHtml(p.starter||'')}</code></pre>
        </div>
      </section>

      <section class="pd-block pd-hints">
        <h2>💡 Подсказки</h2>
        <ul class="hint-list">${(p.hints||[]).map(h=>`<li>💬 ${escapeHtml(h)}</li>`).join('')}</ul>
      </section>

      <section class="pd-block pd-output">
        <h2>🖼️ Что должно получиться</h2>
        <div class="output-box">${escapeHtml(p.output||'—')}</div>
      </section>

      <section class="pd-block pd-testing">
        <h2>🧪 Как протестировать проект</h2>
        <ul class="check-list">${(p.testing||[]).map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul>
      </section>

      <section class="pd-block pd-ai">
        <h2>🧠 Задания с AI (попробуй все 5!)</h2>
        <ol class="ai-tasks">${(p.aiTasks||[p.aiTask]).map(t=>`<li>🤖 ${escapeHtml(t)}</li>`).join('')}</ol>
        <h3>📝 Готовый AI-промпт для старта</h3>
        <p class="muted">Скопируй и вставь в <a href="https://giga.chat/" target="_blank" rel="noopener">🤖 GigaChat — бесплатный российский ChatGPT (работает без VPN)</a>:</p>
        <div class="ai-box">
          <pre id="aiText">${escapeHtml(p.aiPrompt||'')}</pre>
          <button class="copy-btn" id="copyPrompt">📋 Скопировать промпт</button>
        </div>
      </section>

      <div class="pd-cta">
        <button id="doneBtn" class="btn ${isDone?'btn-ghost':'btn-primary'} btn-full">
          ${isDone?'↩️ Снять отметку «Готово»':'✅ Я выполнил этот проект!'}
        </button>
      </div>

      <nav class="pd-nav">
        ${prev ? `<a href="project.html?id=${prev.id}" class="pd-nav-link">← ${prev.emoji} ${escapeHtml(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a href="project.html?id=${next.id}" class="pd-nav-link right">${next.emoji} ${escapeHtml(next.title)} →</a>` : ''}
      </nav>
    </article>
  `;

  $('#copyCode').addEventListener('click', () => {
    navigator.clipboard.writeText(p.starter||'').then(()=> toast('✅ Код скопирован!'));
  });
  $('#copyPrompt').addEventListener('click', () => {
    navigator.clipboard.writeText(p.aiPrompt||'').then(()=> toast('✅ Промпт скопирован!'));
  });
  $('#doneBtn').addEventListener('click', () => {
    toggleDone(id);
    toast(getDone().includes(id) ? '🎉 Засчитано! Так держать!' : 'Отметка снята');
    setTimeout(()=> location.reload(), 600);
  });
})();
