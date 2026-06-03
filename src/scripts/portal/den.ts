const root = document.querySelector('.den');
const shiftId = root?.getAttribute('data-shift');
const date = root?.getAttribute('data-date');
const API = {
  eventEdit: '/api/portal/shift/event-edit',
  admin: '/api/portal/shift/admin',
  check: '/api/portal/shift/check',
  contentTasks: '/api/portal/content-tasks',
  copyDay: '/api/portal/shift/copy-day',
  photo: '/api/portal/photo',
};
const SUMMARY_TITLE = root?.getAttribute('data-summary-title') || '📦 Материалы дня';
const SUMMARY_TIME = '23:59';

// Перезагрузка с сохранением места: запоминаем открытую карточку и скролл.
function reloadKeepingPlace(eventId) {
  try {
    const card = eventId ? document.querySelector(`.den-card[data-event="${eventId}"]`) : null;
    const openId = eventId || (document.querySelector('.den-card-body:not([hidden])')?.closest('.den-card')?.getAttribute('data-event'));
    sessionStorage.setItem('den-open', openId || '');
    sessionStorage.setItem('den-scroll', String(window.scrollY));
  } catch {}
  location.reload();
}
// Восстановление после reload
window.addEventListener('DOMContentLoaded', () => {
  const openId = sessionStorage.getItem('den-open');
  const scroll = sessionStorage.getItem('den-scroll');
  if (openId) {
    const card = document.querySelector(`.den-card[data-event="${openId}"]`);
    const body = card?.querySelector('.den-card-body');
    if (body) body.hidden = false;
    sessionStorage.removeItem('den-open');
  }
  if (scroll) {
    window.scrollTo(0, Number(scroll));
    sessionStorage.removeItem('den-scroll');
  }
});

// Единый разбор ответа: всегда возвращает {ok, error?, ...} с понятным текстом.
async function parseResp(r) {
  const text = await r.text().catch(() => '');
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (data && typeof data === 'object') {
    if (data.ok === false && !data.error) data.error = `ошибка сервера (HTTP ${r.status})`;
    return data;
  }
  const map = { 401: 'нужно войти заново', 403: 'нет прав на это действие', 404: 'не найдено', 413: 'файл слишком большой', 500: 'ошибка на сервере', 503: 'база недоступна' };
  return { ok: r.ok, error: r.ok ? undefined : (map[r.status] || `HTTP ${r.status}`) + (text ? ': ' + text.slice(0, 100) : '') };
}

async function post(body) {
  let r;
  try {
    r = await fetch(API.eventEdit, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(body),
    });
  } catch { return { ok: false, error: 'сеть недоступна' }; }
  return parseResp(r);
}

// Развернуть/свернуть карточку
document.querySelectorAll('[data-toggle]').forEach((el) => {
  el.addEventListener('click', () => {
    const body = el.parentElement.querySelector('.den-card-body');
    if (body) body.hidden = !body.hidden;
  });
});

// Сохранить блок
document.querySelectorAll('[data-save]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const card = btn.closest('.den-card');
    if (!card) return;
    const eventId = card.getAttribute('data-event');
    const get = (f) => card.querySelector(`[data-field="${f}"]`)?.value ?? '';
    const status = card.querySelector('[data-status]');
    const res = await post({
      event_id: Number(eventId),
      title: get('title'), start_time: get('start_time'),
      notes: get('notes'),
      responsible_staff_id: get('responsible_staff_id'),
      content_task_template_id: get('content_task_template_id'),
    });
    if (status) status.textContent = res.ok ? 'Сохранено ✓' : ('Ошибка: ' + (res.error || ''));
    if (res.ok) setTimeout(() => reloadKeepingPlace(Number(eventId)), 400);
  });
});

// Удалить блок
document.querySelectorAll('[data-del]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm('Удалить блок?')) return;
    const card = btn.closest('.den-card');
    const res = await post({ event_id: Number(card.getAttribute('data-event')), delete: true });
    if (res.ok) reloadKeepingPlace();
  });
});

// Отметка чек-листа
document.querySelectorAll('[data-check]').forEach((cb) => {
  cb.addEventListener('change', async () => {
    const card = cb.closest('.den-card');
    await fetch(API.check, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        eventId: Number(card.getAttribute('data-event')),
        checklistId: Number(cb.getAttribute('data-cl')),
        itemId: cb.getAttribute('data-item'),
        done: cb.checked,
      }),
    });
  });
});

// Подсказки контент-заданий по названию блока
document.querySelectorAll('[data-suggest]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const title = btn.getAttribute('data-suggest') || '';
    const r = await fetch(API.contentTasks + '?suggest=' + encodeURIComponent(title), { credentials: 'include' });
    const data = await r.json().catch(() => ({ ok: false, items: [] }));
    const sel = btn.parentElement.querySelector('[data-lib]');
    if (data.items && data.items.length && sel) {
      const names = data.items.map((t) => `[${t.content_type}] ${t.title}`).join('\n');
      alert('Подходящие задания:\n\n' + names + '\n\nВыбери в списке выше.');
    } else {
      alert('Под этот блок подсказок не нашлось — выбери из общего списка.');
    }
  });
});

// Добавить блок
document.getElementById('add-btn')?.addEventListener('click', async () => {
  const title = (document.getElementById('add-title')).value.trim();
  const time = (document.getElementById('add-time')).value;
  if (!title) { alert('Введите название блока'); return; }
  const res = await post({ action: 'create', shift_id: Number(shiftId), date, title, start_time: time });
  if (res.ok) location.reload();
  else alert('Ошибка: ' + (res.error || ''));
});

const ADMIN = API.admin;
async function postForm(fields) {
  // JSON, а не FormData: admin при FormData делает redirect (isForm=true),
  // а нам нужен чистый JSON-ответ для разбора.
  let r;
  try {
    r = await fetch(ADMIN, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(fields),
    });
  } catch { return { ok: false, error: 'сеть недоступна' }; }
  return parseResp(r);
}

// Параллельное событие (копия блока с тем же временем, можно сменить преподавателя)
document.querySelectorAll('[data-dup]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const card = btn.closest('.den-card');
    const res = await postForm({ action: 'duplicateEvent', id: Number(card.getAttribute('data-event')) });
    if (res.ok) reloadKeepingPlace(Number(card.getAttribute('data-event')));
    else alert('Не удалось создать параллельный блок: ' + (res.error || ''));
  });
});

// Привязать существующий чек-лист
document.querySelectorAll('[data-cl-attach]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const card = btn.closest('.den-card');
    const pick = card.querySelector('[data-cl-pick]');
    const checklistId = pick && pick.value;
    if (!checklistId) { alert('Выбери чек-лист из списка'); return; }
    const res = await postForm({ action: 'attachChecklist', event_id: Number(card.getAttribute('data-event')), checklist_id: Number(checklistId) });
    if (res.ok) reloadKeepingPlace(Number(card.getAttribute('data-event')));
    else alert('Ошибка: ' + (res.error || ''));
  });
});

// Создать новый чек-лист и сразу привязать к блоку
// Модалка создания чек-листа
const clModal = document.getElementById('cl-modal');
const clItems = document.getElementById('cl-items');
const clTitle = document.getElementById('cl-title');
const clStatus = document.getElementById('cl-status');
let clTargetEvent = null;

function clAddItemRow(value) {
  const row = document.createElement('div');
  row.className = 'cl-item-row';
  const inp = document.createElement('input');
  inp.type = 'text'; inp.placeholder = 'Текст пункта'; inp.value = value || '';
  const del = document.createElement('button');
  del.type = 'button'; del.className = 'cl-item-del'; del.textContent = '✕';
  del.addEventListener('click', () => row.remove());
  row.appendChild(inp); row.appendChild(del);
  clItems.appendChild(row);
  return inp;
}
let clEditId = null;
const clModalTitle = clModal?.querySelector('h3');
const clCreateBtn = document.getElementById('cl-create');
function clOpen(eventId, edit) {
  clTargetEvent = eventId;
  clEditId = edit?.id || null;
  clTitle.value = edit?.title || '';
  clItems.innerHTML = '';
  if (edit?.items) {
    edit.items.split('\n').filter(Boolean).forEach((t) => clAddItemRow(t));
    if (!edit.items) { clAddItemRow(''); clAddItemRow(''); }
  } else { clAddItemRow(''); clAddItemRow(''); }
  if (clModalTitle) clModalTitle.textContent = clEditId ? 'Редактировать чек-лист' : 'Новый чек-лист';
  if (clCreateBtn) clCreateBtn.textContent = clEditId ? 'Сохранить' : 'Создать и привязать';
  clStatus.textContent = '';
  clModal.hidden = false;
  clTitle.focus();
}
function clClose() { clModal.hidden = true; }

document.querySelectorAll('[data-cl-new]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.den-card');
    clOpen(Number(card.getAttribute('data-event')));
  });
});

// Редактировать существующий чек-лист
document.querySelectorAll('[data-cl-edit]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.den-card');
    clOpen(Number(card.getAttribute('data-event')), {
      id: Number(btn.getAttribute('data-cl-id')),
      title: btn.getAttribute('data-cl-name') || '',
      items: btn.getAttribute('data-cl-items') || '',
    });
  });
});

// Отвязать чек-лист от блока (сам шаблон остаётся в библиотеке)
document.querySelectorAll('[data-cl-detach]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm('Отвязать чек-лист от этого блока?')) return;
    const card = btn.closest('.den-card');
    const res = await post({ event_id: Number(card.getAttribute('data-event')), detach_event_checklist_id: Number(btn.getAttribute('data-ec-id')) });
    if (res.ok) reloadKeepingPlace(Number(card.getAttribute('data-event')));
    else alert('Ошибка: ' + (res.error || ''));
  });
});
document.getElementById('cl-close')?.addEventListener('click', clClose);
clModal?.addEventListener('click', (ev) => { if (ev.target === clModal) clClose(); });
document.getElementById('cl-add-item')?.addEventListener('click', () => clAddItemRow(''));

document.getElementById('cl-create')?.addEventListener('click', async () => {
  const title = clTitle.value.trim();
  if (!title) { clStatus.textContent = 'Введите название'; clTitle.focus(); return; }
  const items = Array.from(clItems.querySelectorAll('input'))
    .map((i) => i.value.trim()).filter(Boolean).join('\n');
  if (!items) { clStatus.textContent = 'Добавьте хотя бы один пункт'; return; }
  clStatus.textContent = clEditId ? 'Сохраняю…' : 'Создаю…';
  const created = await postForm(clEditId ? { action: 'upsertChecklist', id: clEditId, title, items } : { action: 'upsertChecklist', title, items });
  if (!created.ok || !created.id) { clStatus.textContent = 'Ошибка: ' + (created.error || ''); return; }
  if (clEditId) { reloadKeepingPlace(clTargetEvent); return; }
  const att = await postForm({ action: 'attachChecklist', event_id: clTargetEvent, checklist_id: Number(created.id) });
  if (att.ok) reloadKeepingPlace(clTargetEvent);
  else clStatus.textContent = 'Создан, но не привязан: ' + (att.error || '');
});

// Копировать день
document.getElementById('copy-day')?.addEventListener('click', () => {
  const target = prompt('На какую дату скопировать день? (ГГГГ-ММ-ДД)', date);
  if (!target) return;
  fetch(API.copyDay, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ shift_id: Number(shiftId), from_date: date, to_date: target }),
  }).then((r) => r.json()).then((res) => {
    if (res.ok) { alert('Скопировано блоков: ' + (res.count ?? 0)); location.href = '/portal/den?shift=' + shiftId + '&date=' + target; }
    else alert('Ошибка: ' + (res.error || 'copy-day не готов'));
  });
});

// ── Материалы дня: загрузка общих фото/видео ──
(function () {
  const sec = document.querySelector('.den-summary');
  if (!sec) return;
  const fileInput = document.getElementById('day-file');
  const status = document.getElementById('day-status');
  document.getElementById('day-upload')?.addEventListener('click', () => fileInput.click());

  async function ensureSummaryEvent() {
    let id = sec.getAttribute('data-summary-event');
    if (id) return Number(id);
    // Служебного блока ещё нет — создаём
    const res = await post({ action: 'create', shift_id: Number(shiftId), date, title: SUMMARY_TITLE, start_time: SUMMARY_TIME });
    if (res.ok && res.id) { sec.setAttribute('data-summary-event', res.id); return res.id; }
    return null;
  }

  fileInput?.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;
    if (status) status.textContent = 'Создаю контейнер…';
    const eventId = await ensureSummaryEvent();
    if (!eventId) { if (status) status.textContent = 'Ошибка: не создан блок материалов'; return; }
    let done = 0;
    for (const f of files) {
      if (status) status.textContent = `Загрузка ${done + 1}/${files.length}…`;
      const fd = new FormData();
      fd.append('event_id', String(eventId));
      fd.append('file', f);
      let j;
      try {
        const r = await fetch(API.photo, { method: 'POST', credentials: 'include', body: fd });
        j = await parseResp(r);
      } catch { j = { ok: false, error: 'сеть' }; }
      if (j.ok) done++;
      else if (status) status.textContent = `Файл «${f.name}»: ${j.error || 'ошибка'}`;
    }
    if (status && done === files.length) status.textContent = `Готово: ${done}/${files.length}`;
    setTimeout(() => location.reload(), 700);
  });
})();
