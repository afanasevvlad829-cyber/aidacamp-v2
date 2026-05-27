/* ===== Python Academy — Fun Pack v3 (revised) =====
   - ONE general timer for Викторина section, ONE for Задания section
   - Big interactive "✅ Выполнено!" complete button on every task / example
   - Motivational cat that gives programming advice per section
   - Streak system + new-topic celebration
*/
(function(){
  'use strict';

  function sfx(name){ try{ window.PA_SFX && window.PA_SFX[name] && window.PA_SFX[name](); }catch(e){} }
  function confetti(n){ try{ window.PA_confetti && window.PA_confetti(n||60); }catch(e){} }
  function fmt(s){
    const m = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return m + ':' + ss;
  }

  // ---------- General section timer (one per view) ----------
  function makeSectionTimer(kind, title){
    const pill = document.createElement('div');
    pill.className = 'pa-section-timer ' + kind;
    pill.innerHTML = `
      <span class="ic">${kind === 'quiz' ? '🧠' : '🛠️'}</span>
      <div class="meta">
        <div class="lbl">${title}</div>
        <div class="val">00:00</div>
      </div>
      <button class="btn" data-act="toggle">▶ Старт</button>
      <button class="btn small" data-act="reset" title="Сброс">↺</button>
    `;
    let elapsed = 0, running = false, iv = null;
    const val = pill.querySelector('.val');
    const tg  = pill.querySelector('[data-act="toggle"]');
    function tick(){ elapsed++; val.textContent = fmt(elapsed); }
    pill.addEventListener('click', (e)=>{
      const act = e.target.dataset && e.target.dataset.act;
      if (!act) return;
      e.stopPropagation();
      if (act === 'toggle'){
        running = !running;
        tg.textContent = running ? '⏸ Пауза' : '▶ Старт';
        pill.classList.toggle('running', running);
        if (running) iv = setInterval(tick, 1000);
        else clearInterval(iv);
      } else if (act === 'reset'){
        clearInterval(iv); running=false; elapsed=0;
        val.textContent='00:00'; tg.textContent='▶ Старт';
        pill.classList.remove('running');
      }
    });
    return pill;
  }

  function ensureSectionTimer(){
    // Timer disabled by request — also clean up any existing timer pill.
    const main = document.getElementById('main');
    if (!main) return;
    const existing = main.querySelector(':scope > .pa-section-timer');
    if (existing) existing.remove();
  }

  // ---------- Big "Выполнено" button per task / example ----------
  const DONE_MSGS = [
    '🎉 Отличная работа!','🚀 Поехали дальше!','⭐ Супер!','🐍 Питон гордится тобой!',
    '💪 Ты справился(лась)!','🔥 Ещё одна победа!','🎯 В точку!','✨ Магия кода!',
  ];
  function attachCompleteButton(panel, type){
    if (panel._paDone) return;
    panel._paDone = true;
    const wrap = document.createElement('div');
    wrap.className = 'pa-done-wrap';
    const btn = document.createElement('button');
    btn.className = 'pa-done-btn';
    btn.type = 'button';
    btn.innerHTML = '<span class="ic">✅</span><span class="t">Выполнено!</span><span class="spk">🎉</span>';
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      if (btn.classList.contains('done')){
        // toggle off (allow redo)
        btn.classList.remove('done');
        btn.querySelector('.t').textContent = 'Выполнено!';
        btn.querySelector('.ic').textContent = '✅';
        sfx('pop');
        return;
      }
      btn.classList.add('done','pop');
      btn.querySelector('.t').textContent = DONE_MSGS[Math.floor(Math.random()*DONE_MSGS.length)];
      btn.querySelector('.ic').textContent = '🏆';
      sfx('correct'); sfx('coin');
      confetti(50);
      bumpStreak(btn, type || 'task');
      setTimeout(()=>btn.classList.remove('pop'), 600);
    });
    wrap.appendChild(btn);
    panel.appendChild(wrap);
  }

  function scanForPanels(root){
    const main = document.getElementById('main');
    if (!main) return;
    const panels = (root || main).querySelectorAll('.panel');
    panels.forEach(p=>{
      if (p._paDone) return;
      const h3 = p.querySelector('h3');
      const title = h3 ? (h3.textContent||'').trim() : '';
      const editor = p.querySelector('textarea.editor');

      // Skip the section timer or system panels
      if (p.classList.contains('pa-section-timer')) return;

      // Task panel: "Задание ..."
      if (/^Задание\s/i.test(title)){
        attachCompleteButton(p, 'task'); return;
      }
      // Debug panel: has tall editor
      if (editor && (editor.getAttribute('style')||'').includes('260px')){
        attachCompleteButton(p, 'debug'); return;
      }
      // AI / challenge panels
      if (h3 && /AI|челлендж|задач|#\d+/i.test(title) && !editor){
        attachCompleteButton(p, 'task'); return;
      }
      // Code example panel ("Пример", "Пример кода", "Код")
      if (h3 && /Пример|Код|Демо|Try it/i.test(title)){
        attachCompleteButton(p, 'example'); return;
      }
    });
  }

  // ---------- Streak ----------
  let streak = 0, bestStreak = 0;
  try { bestStreak = parseInt(localStorage.getItem('pa_best_streak')||'0',10)||0; }catch(e){}
  function streakBadge(){
    let b = document.getElementById('pa-streak');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'pa-streak'; b.className = 'pa-streak';
    b.innerHTML = `
      <span class="flame">🔥</span>
      <div class="info">
        <div class="num"><span class="cur">0</span></div>
        <div class="lbl">Серия</div>
      </div>
      <div class="best">Рекорд: <strong>${bestStreak}</strong></div>`;
    document.body.appendChild(b);
    return b;
  }
  function renderStreak(){
    const b = streakBadge();
    b.querySelector('.cur').textContent = streak;
    b.querySelector('.best strong').textContent = bestStreak;
    b.classList.toggle('on', streak >= 2);
    b.classList.toggle('hot', streak >= 5);
    b.classList.toggle('fire', streak >= 10);
  }
  function flyMessage(text, color){
    const f = document.createElement('div');
    f.className = 'pa-fly';
    f.textContent = text;
    if (color) f.style.background = color;
    document.body.appendChild(f);
    setTimeout(()=>f.remove(), 1800);
  }
  function bumpStreak(){
    streak++;
    if (streak > bestStreak){
      bestStreak = streak;
      try { localStorage.setItem('pa_best_streak', String(bestStreak)); }catch(e){}
    }
    renderStreak();
    const b = streakBadge();
    b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
    if (streak === 3){ sfx('coin'); flyMessage('🔥 3 в ряд! Так держать!'); confetti(30); }
    else if (streak === 5){ sfx('levelup'); flyMessage('⚡ 5 в ряд! Огонь!'); confetti(60); }
    else if (streak === 10){ sfx('magic'); flyMessage('🌟 10 в ряд! Легенда!'); confetti(120); }
    else if (streak >= 15 && streak%5===0){ sfx('applause'); flyMessage(`💎 ${streak} побед подряд!`); confetti(100); }
    else { sfx('sparkle'); }
  }
  function resetStreak(){
    if (streak >= 3) flyMessage('💔 Серия прервана: ' + streak, 'linear-gradient(135deg,#94a3b8,#64748b)');
    streak = 0; renderStreak();
  }
  document.addEventListener('click', (e)=>{
    const opt = e.target.closest && e.target.closest('.opt');
    if (!opt) return;
    setTimeout(()=>{
      if (opt.classList.contains('correct')) bumpStreak();
      else if (opt.classList.contains('wrong')) resetStreak();
    }, 50);
  }, true);

  // ---------- Motivational programming cat ----------
  const CAT_TIPS = {
    quiz: [
      'Мяу! Читай вопрос дважды — ответ часто спрятан в деталях 🐾',
      'Если сомневаешься — отбрось явно неверные варианты!',
      'В Python отступы важны как усы у кота 🐱',
      'Не торопись: спокойный программист = точный ответ.',
      'Угадал? Запомни *почему* — это и есть знание!',
    ],
    tasks: [
      'Раздели задачу на маленькие шаги — как ловить мышей по одной 🐭',
      'Сначала пиши простой код, потом улучшай. Работает > красиво.',
      'print() — твой лучший друг при отладке!',
      'Имя переменной должно говорить, что в ней лежит.',
      'Не бойся ошибок — даже мудрый кот падает с забора 🐈',
    ],
    debug: [
      'Читай сообщение об ошибке полностью — там часто номер строки!',
      'NameError? Проверь, не опечатался ли ты в имени.',
      'IndentationError = неверные пробелы. Используй 4 пробела.',
      'TypeError? Сравни типы: число и строка — не друзья без int()/str().',
      'Когда застрял — встань, погладь кота, вернись к коду 🐱',
    ],
    lesson: [
      'Кодинг — это спорт для мозга. Тренируйся каждый день!',
      'Лучший способ выучить Python — писать Python 🐍',
      'Каждый эксперт когда-то был новичком. Просто продолжай!',
      'Понял тему — объясни её другу (или коту). Это закрепит знания.',
      'Маленький шаг сегодня = большой проект завтра 🚀',
    ],
  };
  // ---- Cat removed by request: all cat helpers are no-ops ----
  function ensureCat(){ const c = document.getElementById('pa-cat'); if (c) c.remove(); return null; }
  function showCatTip(){ /* disabled */ }
  function startCatRotation(){ /* disabled */ }

  // ---------- New-topic celebration ----------
  const MOTIVATIONS = [
    '🚀 Новая тема — новые суперсилы!','🐍 Поехали покорять Python!',
    '💡 Готов(а) узнать что-то крутое?','🎯 Сфокусируйся — и у тебя всё получится!',
    '⚡ Каждый шаг приближает тебя к мастерству!','🌟 Маленький питонист в работе!',
    '🔥 Время для новых открытий!',
  ];
  let lastTopicKey = '';
  function checkNewTopic(){
    const main = document.getElementById('main');
    if (!main) return;
    const hero = main.querySelector('.hero h1');
    if (!hero){ lastTopicKey=''; return; }
    const title = (hero.textContent||'').trim();
    const tabs = main.querySelector('.tabs, [class*="tab"]');
    if (!tabs && /Debug|AI|Достижения|Добро пожаловать|Python Academy/i.test(title)){
      lastTopicKey = title; return;
    }
    if (title && title !== lastTopicKey){
      lastTopicKey = title;
      sfx('magic'); confetti(50);
      const msg = MOTIVATIONS[Math.floor(Math.random()*MOTIVATIONS.length)];
      flyMessage(msg + ' — ' + title, 'linear-gradient(135deg,#8b5cf6,#ec4899)');
      // cat greets the new section with a relevant tip
      setTimeout(()=>showCatTip(true), 700);
    }
  }

  // ---------- Init ----------
  function init(){
    streakBadge(); renderStreak();
    ensureCat();
    ensureSectionTimer();
    scanForPanels();
    checkNewTopic();
    startCatRotation();
    const main = document.getElementById('main');
    if (main){
      new MutationObserver(()=>{
        ensureSectionTimer();
        scanForPanels();
        checkNewTopic();
      }).observe(main, { childList:true, subtree:true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
