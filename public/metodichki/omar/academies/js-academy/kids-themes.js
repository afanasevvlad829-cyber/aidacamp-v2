/* ===== JS Academy — Themes (Light / Dark / Monokai) + Profile-in-main ===== */
(function(){
  'use strict';
  const STATE_KEY = "jsacademy_state_v1";
  const THEME_KEY = "pa_kid_theme";
  const THEMES = [
    { id:'light',   label:'Светлая',  emoji:'☀️' },
    { id:'dark',    label:'Тёмная',   emoji:'🌙' },
    { id:'monokai', label:'Monokai',  emoji:'🎨' },
  ];

  function getState(){ try{ return JSON.parse(localStorage.getItem(STATE_KEY))||{}; }catch(e){ return {}; } }

  function applyTheme(id){
    if (!THEMES.find(t=>t.id===id)) id = 'light';
    document.documentElement.setAttribute('data-theme', id);
    // also toggle the legacy .light/.dark class so old CSS still works sanely
    document.documentElement.classList.toggle('light', id === 'light');
    document.documentElement.classList.toggle('dark',  id !== 'light');
    try{ localStorage.setItem(THEME_KEY, id); }catch(e){}
    document.querySelectorAll('.kt-theme-btn').forEach(b=>{
      b.classList.toggle('active', b.dataset.theme === id);
    });
  }

  function installThemeSwitcher(){
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || document.querySelector('.kt-themes')) return;
    const oldToggle = document.getElementById('theme-toggle');
    if (oldToggle) oldToggle.style.display = 'none';

    const label = document.createElement('div');
    label.style.cssText = 'margin-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:800';
    label.textContent = 'Тема';
    sidebar.appendChild(label);

    const wrap = document.createElement('div');
    wrap.className = 'kt-themes';
    THEMES.forEach(t=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kt-theme-btn';
      b.dataset.theme = t.id;
      b.innerHTML = `<span class="em">${t.emoji}</span>${t.label}`;
      b.addEventListener('click', ()=>{
        applyTheme(t.id);
        try{ window.PA_SFX && window.PA_SFX.pop && window.PA_SFX.pop(); }catch(e){}
      });
      wrap.appendChild(b);
    });
    sidebar.appendChild(wrap);

    const saved = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(saved);
  }

  // ---------- Profile card injection at top of #main ----------
  function buildProfileCard(){
    const s = getState();
    const profile = s.profile || null;
    const xp = s.xp || 0;
    const level = Math.floor(xp/100) + 1;
    const topicsDone = Object.keys(s.done||{}).filter(k=>k.startsWith('t')).length;
    const fullName = profile ? (profile.fullName || profile.name || 'Ученик') : 'Гость';
    const className = profile ? (profile.className || '') : '';

    const card = document.createElement('div');
    card.className = 'kt-profile-card';
    card.innerHTML = `
      <div class="kt-profile-avatar">${profile ? '🧑‍🎓' : '👤'}</div>
      <div class="kt-profile-info">
        <div class="kt-profile-name">
          ${fullName}
          ${className ? `<span class="kt-profile-class">${className}</span>` : ''}
        </div>
        <div class="kt-profile-meta">
          <span>⚡ XP: <b>${xp}</b></span>
          <span>🎓 Уровень: <b>${level}</b></span>
          <span>📚 Тем: <b>${topicsDone}</b></span>
        </div>
      </div>
      <button class="kt-profile-edit" type="button">✏️ ${profile ? 'Изменить' : 'Войти'}</button>
    `;
    card.querySelector('.kt-profile-edit').addEventListener('click', ()=>{
      const oldBtn = document.getElementById('edit-profile');
      if (oldBtn) oldBtn.click();
    });
    return card;
  }

  function ensureProfileCard(){
    const main = document.getElementById('main');
    if (!main) return;
    const existing = main.querySelector(':scope > .kt-profile-card');
    const fresh = buildProfileCard();
    if (existing) existing.replaceWith(fresh);
    else main.insertBefore(fresh, main.firstChild);
  }

  // remove any leftover cat element if older script created one before we hid it
  function killCat(){
    document.querySelectorAll('#pa-cat, .pa-cat').forEach(el=>el.remove());
  }

  function init(){
    installThemeSwitcher();
    ensureProfileCard();
    killCat();
    // Register real-time profile refresh hook for script.js notifyStateChange()
    window.PA_refreshProfile = function(){ ensureProfileCard(); };
    const main = document.getElementById('main');
    if (main){
      let scheduled = false;
      new MutationObserver(()=>{
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(()=>{
          scheduled = false;
          const hasOurCard = main.querySelector(':scope > .kt-profile-card');
          if (!hasOurCard || main.firstElementChild !== hasOurCard){
            ensureProfileCard();
          }
        });
      }).observe(main, { childList:true });
    }
    setInterval(()=>{ ensureProfileCard(); killCat(); }, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ===== v8: Show hints as popup modal (intercept 💡 buttons) ===== */
(function(){
  function openHintPopup(html, title){
    const old = document.querySelector('.kt-hint-overlay'); if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.className = 'kt-hint-overlay';
    const headTitle = title || '💡 Подсказка';
    overlay.innerHTML = `
      <div class="kt-hint-modal" role="dialog" aria-modal="true">
        <h3 class="kt-hint-title">${headTitle}</h3>
        <div class="kt-hint-body">${html}</div>
        <button class="kt-hint-close" type="button">Понятно ✨</button>
      </div>`;
    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.kt-hint-close').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e){
      if (e.key === 'Escape'){ close(); document.removeEventListener('keydown', esc); }
    });
    document.body.appendChild(overlay);
  }

  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if (!btn) return;
    const txt = (btn.textContent || '').trim();
    if (!txt.startsWith('💡')) return;
    const panel = btn.closest('.panel'); if (!panel) return;
    // For debug panels: prefer <ol> (error list) over <p class="muted"> (label text)
    // For task/AI panels: use <p class="muted"> (hint text)
    const olEl = panel.querySelector('ol');
    const pEl  = panel.querySelector('p.muted[style*="display:none"], p.muted[style*="display: none"]')
              || panel.querySelector('p.muted:not([style*="margin-top:8px"])');
    // Pick: if ol has content and button text mentions "ошибок" or "список" — it's debug hints
    const isDebugHint = olEl && olEl.children.length > 0 &&
      (txt.toLowerCase().includes('ошиб') || txt.toLowerCase().includes('список') || txt.toLowerCase().includes('подсказк'));
    const hintEl = isDebugHint ? olEl : (olEl && olEl.children.length > 0 ? olEl : pEl);
    if (!hintEl) return;
    // Build popup HTML: for ol wrap items nicely
    let popupHtml;
    let popupTitle = '💡 Подсказка';
    if (hintEl.tagName === 'OL') {
      const items = Array.from(hintEl.querySelectorAll('li'));
      if (items.length === 0) return;
      popupTitle = `🐛 Найди ${items.length} ошибок`;
      popupHtml = '<ol style="margin:0;padding-left:20px;line-height:1.9">' +
        items.map((li, i) => `<li><strong style="color:var(--primary,#ffd83d)">${i+1}.</strong> ${li.textContent}</li>`).join('') +
        '</ol>';
    } else {
      popupHtml = hintEl.innerHTML || hintEl.textContent;
    }
    e.stopPropagation(); e.preventDefault();
    openHintPopup(popupHtml, popupTitle);
  }, true);
})();
