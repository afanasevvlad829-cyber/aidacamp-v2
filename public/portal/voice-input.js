/**
 * Универсальный голосовой ввод для портала АйДаКемп.
 *
 * Подключи на странице:
 *   <script src="/portal/voice-input.js" defer></script>
 *
 * И добавь к любому <textarea> или <input>:
 *   <textarea data-voice></textarea>
 *
 * Опциональные атрибуты:
 *   data-voice-lang="ru-RU"   — язык (по умолчанию ru-RU)
 *   data-voice-append         — если есть, надиктованный текст добавляется в конец,
 *                                а не заменяет содержимое
 *
 * Скрипт сам создаёт кнопку-микрофон в правом нижнем углу инпута.
 * Использует Web Speech API (Chrome, Edge, Safari, Yandex).
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.__aidacampVoiceInputInit) return;
  window.__aidacampVoiceInputInit = true;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SR;

  function makeButton(supported) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aida-voice-btn';
    btn.setAttribute('aria-label', supported ? 'Голосовой ввод' : 'Голосовой ввод не поддерживается в этом браузере');
    btn.title = supported
      ? 'Голосовой ввод — нажмите и говорите'
      : 'Голосовой ввод доступен в Chrome / Edge / Safari / Яндекс.Браузере';
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3"/><path d="M3 8a.5.5 0 0 1 .5.5 4.5 4.5 0 0 0 9 0 .5.5 0 0 1 1 0 5.5 5.5 0 0 1-5 5.478V15h2a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h2v-1.022A5.5 5.5 0 0 1 2 8.5.5.5 0 0 1 2.5 8H3z"/></svg>';
    if (!supported) btn.disabled = true;
    return btn;
  }

  // Один раз вставим CSS
  const style = document.createElement('style');
  style.textContent = `
    .aida-voice-wrap { position: relative; display: block; }
    .aida-voice-btn {
      position: absolute; right: 6px; bottom: 6px; z-index: 2;
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; padding: 0;
      border: 1px solid var(--border-color, #e5e7eb);
      background: #fff; color: #475569; border-radius: 8px; cursor: pointer;
      transition: all .15s ease;
    }
    .aida-voice-btn:hover { border-color: #f97316; color: #f97316; }
    .aida-voice-btn.is-recording {
      background: #fee2e2; border-color: #fca5a5; color: #b91c1c;
      animation: aida-voice-pulse 1.4s ease-in-out infinite;
    }
    .aida-voice-btn:disabled { opacity: .4; cursor: not-allowed; }
    @keyframes aida-voice-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, .35); }
      50%      { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
    }
    .aida-voice-status {
      position: absolute; right: 40px; bottom: 10px;
      font-size: 12px; color: #94a3b8;
      pointer-events: none;
    }
    .aida-voice-status.is-recording { color: #b91c1c; }
    /* Чтобы кнопка не лезла на текст — добавим правый padding инпуту */
    textarea[data-voice], input[data-voice] {
      padding-right: 42px !important;
    }
  `;
  document.head.appendChild(style);

  function attach(el) {
    if (el.__aidaVoiceAttached) return;
    el.__aidaVoiceAttached = true;

    // Обёртка чтобы кнопка позиционировалась
    const parent = el.parentElement;
    if (!parent) return;
    let wrap = el;
    // Если родитель не position:relative — добавим обёртку
    const cs = parent && getComputedStyle(parent);
    if (!cs || cs.position === 'static') {
      const w = document.createElement('span');
      w.className = 'aida-voice-wrap';
      parent.insertBefore(w, el);
      w.appendChild(el);
      wrap = w;
    } else {
      // Используем родителя
      wrap = parent;
    }

    const btn = makeButton(supported);
    const status = document.createElement('span');
    status.className = 'aida-voice-status';
    wrap.appendChild(btn);
    wrap.appendChild(status);

    if (!supported) return;

    const lang = el.dataset.voiceLang || 'ru-RU';
    const appendMode = el.hasAttribute('data-voice-append');
    let rec = null;
    let baseText = '';   // что было в инпуте до начала записи
    let finalAcc = '';   // накопленный финальный текст за сессию

    function setText(extra) {
      const sep = baseText && !baseText.endsWith(' ') ? ' ' : '';
      el.value = (baseText + sep + finalAcc + extra).replace(/\s+/g, ' ').trimStart();
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    btn.addEventListener('click', () => {
      if (rec) { try { rec.stop(); } catch {} rec = null; return; }
      try {
        rec = new SR();
      } catch (e) {
        alert('Не удалось запустить голосовой ввод: ' + (e && e.message || e));
        return;
      }
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = true;
      baseText = appendMode ? (el.value || '') : '';
      if (!appendMode) el.value = '';
      finalAcc = '';

      btn.classList.add('is-recording');
      status.classList.add('is-recording');
      status.textContent = 'Слушаю…';

      rec.onresult = (ev) => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) finalAcc += t + ' ';
          else interim += t;
        }
        setText(interim);
      };
      rec.onerror = (e) => {
        const code = e && e.error || 'error';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          status.textContent = 'Нет доступа к микрофону';
          alert('Браузер не разрешил доступ к микрофону. Проверьте настройки сайта.');
        } else if (code === 'no-speech') {
          status.textContent = 'Не услышал';
        } else {
          status.textContent = 'Ошибка: ' + code;
        }
      };
      rec.onend = () => {
        btn.classList.remove('is-recording');
        status.classList.remove('is-recording');
        // на короткое время оставим текст-индикатор
        const last = status.textContent;
        if (!last || last === 'Слушаю…') status.textContent = '';
        else setTimeout(() => { status.textContent = ''; }, 2000);
        setText('');
        rec = null;
      };

      try {
        rec.start();
      } catch (e) {
        // если уже стартовали — игнор
        console.warn('voice start', e);
      }
    });
  }

  function scan(root) {
    (root || document).querySelectorAll('textarea[data-voice], input[data-voice]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan());
  } else {
    scan();
  }

  // Перехватываем динамически добавленные элементы
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes && m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches('textarea[data-voice], input[data-voice]')) attach(n);
        if (n.querySelectorAll) scan(n);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // Публичный API
  window.AidaVoice = { rescan: scan, supported };
})();
