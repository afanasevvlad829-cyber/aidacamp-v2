/**
 * Aida-Overlay JS — общая шапка АйДаКемп для всех инструментов Омара.
 *
 * Делает:
 *  1. Проверяет, что пользователь залогинен в портал — иначе редирект на /portal/login.
 *  2. Вставляет верхнюю плашку «← Назад к методичкам / AidaCamp / Имя пользователя».
 *  3. Если в инструменте есть локальный профиль (Python/Java/JS Academy), —
 *     предзаполняет его именем из portal_session, чтобы ребёнок не вводил «Гость».
 */
(function () {
  // 1. Авто-проверка авторизации портала (через /api/portal/check)
  fetch('/api/portal/whoami', { credentials: 'include' })
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (!data || !data.ok) {
        // не залогинен → отправляем на /portal/login. После входа портал
        // оказывается на /portal/metodichki, откуда снова виден этот инструмент.
        // (open-redirect protection в login.ts разрешает только /portal/* в next)
        location.replace('/portal/login?next=' + encodeURIComponent('/portal/metodichki'));
        return;
      }
      // 2. Уже залогинены — рисуем шапку
      drawBar(data);
      // 3. Заполняем профиль академии, если в localStorage его нет
      prefillProfile(data);
    })
    .catch(() => {
      // если /api/portal/check недоступен (например, прод без портала) —
      // не блокируем работу, рисуем шапку без имени
      drawBar(null);
    });

  function svgArrow() {
    return '<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>';
  }
  function svgUser() {
    return '<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>';
  }

  function drawBar(session) {
    if (document.querySelector('.aida-portal-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'aida-portal-bar';
    const name = (session && (session.name || session.author_name)) || (session && session.role) || '';
    bar.innerHTML =
      '<a class="aida-back" href="/portal/metodichki" title="Назад к методичкам">' +
        svgArrow() + ' Назад к методичкам' +
      '</a>' +
      '<div class="aida-brand"><span class="a-orange">Aida</span>Camp</div>' +
      (name ? '<div class="aida-user">' + svgUser() + '<span>' + escapeHtml(name) + '</span></div>' : '');

    // Вставим в самое начало body
    if (document.body.firstChild) document.body.insertBefore(bar, document.body.firstChild);
    else document.body.appendChild(bar);
  }

  function prefillProfile(session) {
    if (!session) return;
    try {
      // У многих академий Омара профиль хранится в localStorage по разным ключам.
      // Не трогаем, если уже что-то есть (вдруг ребёнок ввёл сам).
      const candidates = ['userProfile', 'profile', 'user', 'aida-profile'];
      const name = session.name || session.author_name || 'Ученик АйДаКемп';
      for (const key of candidates) {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify({ name: name, xp: 0, source: 'portal' }));
        }
      }
    } catch (e) { /* ignore */ }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
})();
