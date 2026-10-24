import { postJson } from '../../lib/portalApi';

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
function reloadKeepingPlace(eventId?: string | number | null) {
  try {
    const card = eventId ? document.querySelector(`.den-card[data-event="${eventId}"]`) : null;
    const openId = eventId || (document.querySelector('.den-card-body:not([hidden])')?.closest('.den-card')?.getAttribute('data-event'));
    sessionStorage.setItem('den-open', String(openId || ''));
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
    const body = card?.querySelector('.den-card-body') as HTMLElement | null;
    if (body) body.hidden = false;
    if (card && body) card.classList.add('open');
    sessionStorage.removeItem('den-open');
  }
  if (scroll) {
    window.scrollTo(0, Number(scroll));
    sessionStorage.removeItem('den-scroll');
  }
});

// Единый разбор ответа: всегда возвращает {ok, error?, ...} с понятным текстом.
async function parseResp(r: Response) {
  const text = await r.text().catch(() => '');
  let data: any = null;
  try { data = JSON.parse(text); } catch {}
  if (data && typeof data === 'object') {
    if (data.ok === false && !data.error) data.error = `ошибка сервера (HTTP ${r.status})`;
    return data;
  }
  const map: Record<number, string> = { 401: 'нужно войти заново', 403: 'нет прав на это действие', 404: 'не найдено', 413: 'файл слишком большой', 500: 'ошибка на сервере', 503: 'база недоступна' };
  return { ok: r.ok, error: r.ok ? undefined : (map[r.status] || `HTTP ${r.status}`) + (text ? ': ' + text.slice(0, 100) : '') };
}

async function post(body: Record<string, unknown>) {
  let r: Response | undefined;
  try {
    r = await fetch(API.eventEdit, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(body),
    });
  } catch { return { ok: false, error: 'сеть недоступна' }; }
  return parseResp(r);
}

// Развернуть/свернуть карточку.
// При раскрытии помечаем карточку .open — CSS прячет превью чек-листа,
// чтобы на мобильном тап по пунктам не дублировался с реальными чекбоксами в теле.
document.querySelectorAll('[data-toggle]').forEach((el) => {
  el.addEventListener('click', () => {
    const card = el.closest('.den-card');
    const body = el.parentElement!.querySelector('.den-card-body') as HTMLElement | null;
    if (body) body.hidden = !body.hidden;
    if (card && body) card.classList.toggle('open', !body.hidden);
  });
});

// Элементы внутри кликабельной шапки, которые не должны её сворачивать/раскрывать
// (быстрый выбор ответственного). Кнопка-карандаш, наоборот, раскрытие не гасит.
document.querySelectorAll('[data-stop]').forEach((el) => {
  ['click', 'mousedown', 'keydown'].forEach((evt) => {
    el.addEventListener(evt, (ev) => ev.stopPropagation());
  });
});

// Янтарная подсветка «ответственный не назначен» снимается сразу после выбора.
document.querySelectorAll('.den-resp-quick').forEach((sel) => {
  sel.addEventListener('change', () => {
    if ((sel as HTMLSelectElement).value) sel.removeAttribute('data-empty');
    else sel.setAttribute('data-empty', '');
  });
});

// Сохранить блок
// Фоновое автосохранение карточки (debounce). Без reload — обновляем только сводку.
const saveTimers = new WeakMap();
async function autoSaveCard(card: Element, opts: { reload?: boolean } = {}) {
  const eventId = card.getAttribute('data-event');
  const get = (f: string) => (card.querySelector(`[data-field="${f}"]`) as HTMLInputElement | null)?.value ?? '';
  const status = card.querySelector('[data-status]');
  if (status) status.textContent = 'Сохраняю…';
  const res = await post({
    event_id: Number(eventId),
    title: get('title'), start_time: get('start_time'),
    notes: get('notes'),
    responsible_staff_id: get('responsible_staff_id'),
    content_task_template_id: get('content_task_template_id'),
  });
  if (status) {
    status.textContent = res.ok ? 'Сохранено ✓' : ('Ошибка: ' + (res.error || ''));
    if (res.ok) setTimeout(() => { if (status.textContent === 'Сохранено ✓') status.textContent = ''; }, 2000);
  }
  // Обновляем свёрнутую сводку без перезагрузки страницы
  if (res.ok) updateCardSummary(card);
  if (res.ok && opts.reload) reloadKeepingPlace(Number(eventId));
}

function scheduleSave(card: Element) {
  clearTimeout(saveTimers.get(card));
  saveTimers.set(card, setTimeout(() => autoSaveCard(card), 600));
}

// Обновить мини-сводку (название, ответственный, комментарий) в свёрнутом виде
function updateCardSummary(card: Element) {
  const get = (f: string) => card.querySelector(`[data-field="${f}"]`) as HTMLInputElement | null;
  const titleEl = card.querySelector('.den-card-title');
  if (titleEl && get('title')) titleEl.textContent = get('title')!.value || titleEl.textContent;
  const noteVal = get('notes')?.value?.trim() || '';
  const noteEl = card.querySelector('.den-card-note');
  if (noteEl) noteEl.textContent = noteVal;
}

// Навешиваем автосохранение на все поля карточек
document.querySelectorAll('.den-card').forEach((card) => {
  card.querySelectorAll('[data-field]').forEach((field) => {
    const tag = field.tagName.toLowerCase();
    if (tag === 'select') {
      field.addEventListener('change', () => autoSaveCard(card));
    } else {
      field.addEventListener('input', () => scheduleSave(card));
      field.addEventListener('blur', () => autoSaveCard(card));
    }
  });
});

// Кнопка «Сохранить» остаётся как явный триггер (на случай если нужно сразу)
document.querySelectorAll('[data-save]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.den-card');
    if (card) autoSaveCard(card);
  });
});

// Удалить блок
document.querySelectorAll('[data-del]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm('Удалить блок?')) return;
    const card = btn.closest('.den-card');
    const res = await post({ event_id: Number(card!.getAttribute('data-event')), delete: true });
    if (res.ok) reloadKeepingPlace(Number(card!.getAttribute('data-event')));
  });
});

// Пересчёт бейджа «done/total» по реальным чекбоксам тела
function syncChkBadge(card: Element) {
  const boxes = card.querySelectorAll('[data-check]');
  if (!boxes.length) return;
  const done = [...boxes].filter((b) => (b as HTMLInputElement).checked).length;
  const badge = card.querySelector('.den-badge.chk');
  if (badge) badge.innerHTML = '<i class="bi bi-check2-square"></i> ' + done + '/' + boxes.length;
}

// Применить состояние пункта во всех представлениях: превью + чекбокс тела + бейдж.
function applyCheck(card: Element, clId: string | null, itemId: string | null, done: boolean) {
  const sel = '[data-cl="' + clId + '"][data-item="' + itemId + '"]';
  const li = card.querySelector('[data-preview-check]' + sel);
  if (li) {
    li.classList.toggle('done', done);
    li.setAttribute('aria-pressed', done ? 'true' : 'false');
    const icon = li.querySelector('i');
    if (icon) icon.className = 'bi ' + (done ? 'bi-check-square-fill' : 'bi-square');
  }
  const cb = card.querySelector('[data-check]' + sel) as HTMLInputElement | null;
  if (cb) cb.checked = done;
  syncChkBadge(card);
}

// Сохранить отметку: оптимистичный UI + откат при ошибке. Единая точка для тела и превью.
async function saveCheck(card: Element, clId: string | null, itemId: string | null, done: boolean) {
  applyCheck(card, clId, itemId, done);
  const r = await postJson(API.check, {
    eventId: Number(card.getAttribute('data-event')),
    checklistId: Number(clId), itemId, done,
  });
  if (!r.ok) applyCheck(card, clId, itemId, !done);
}

// Чекбоксы в теле карточки
document.querySelectorAll('[data-check]').forEach((cb) => {
  cb.addEventListener('change', () => {
    const card = cb.closest('.den-card');
    if (card) saveCheck(card, cb.getAttribute('data-cl'), cb.getAttribute('data-item'), (cb as HTMLInputElement).checked);
  });
});

// Отметка ПРЯМО В ПРЕВЬЮ (общее представление) — без раскрытия карточки.
document.querySelectorAll('[data-preview-check]').forEach((li) => {
  li.addEventListener('click', (ev) => {
    ev.stopPropagation(); // не триггерить тогл карточки
    const card = li.closest('.den-card');
    if (card) saveCheck(card, li.getAttribute('data-cl'), li.getAttribute('data-item'), !li.classList.contains('done'));
  });
});

// Подсказки контент-заданий по названию блока
document.querySelectorAll('[data-suggest]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const title = btn.getAttribute('data-suggest') || '';
    const r = await fetch(API.contentTasks + '?suggest=' + encodeURIComponent(title), { credentials: 'include' });
    const data = await r.json().catch(() => ({ ok: false, items: [] }));
    const sel = btn.parentElement!.querySelector('[data-lib]');
    if (data.items && data.items.length && sel) {
      const names = data.items.map((t: { content_type: string; title: string }) => `[${t.content_type}] ${t.title}`).join('\n');
      alert('Подходящие задания:\n\n' + names + '\n\nВыбери в списке выше.');
    } else {
      alert('Под этот блок подсказок не нашлось — выбери из общего списка.');
    }
  });
});

// Добавить блок
document.getElementById('add-btn')?.addEventListener('click', async () => {
  const title = (document.getElementById('add-title') as HTMLInputElement).value.trim();
  const time = (document.getElementById('add-time') as HTMLInputElement).value;
  if (!title) { alert('Введите название блока'); return; }
  const res = await post({ action: 'create', shift_id: Number(shiftId), date, title, start_time: time });
  if (res.ok) location.reload();
  else alert('Ошибка: ' + (res.error || ''));
});

const ADMIN = API.admin;
async function postForm(fields: Record<string, unknown>) {
  // JSON, а не FormData: admin при FormData делает redirect (isForm=true),
  // а нам нужен чистый JSON-ответ для разбора.
  let r: Response | undefined;
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
    const res = await postForm({ action: 'duplicateEvent', id: Number(card!.getAttribute('data-event')) });
    if (res.ok) reloadKeepingPlace(Number(card!.getAttribute('data-event')));
    else alert('Не удалось создать параллельный блок: ' + (res.error || ''));
  });
});

// Привязать существующий чек-лист
document.querySelectorAll('[data-cl-attach]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const card = btn.closest('.den-card');
    const pick = card!.querySelector('[data-cl-pick]') as HTMLSelectElement | null;
    const checklistId = pick && pick.value;
    if (!checklistId) { alert('Выбери чек-лист из списка'); return; }
    const res = await postForm({ action: 'attachChecklist', event_id: Number(card!.getAttribute('data-event')), checklist_id: Number(checklistId) });
    if (res.ok) reloadKeepingPlace(Number(card!.getAttribute('data-event')));
    else alert('Ошибка: ' + (res.error || ''));
  });
});

// Создать новый чек-лист и сразу привязать к блоку
// Модалка создания чек-листа
const clModal = document.getElementById('cl-modal') as HTMLElement | null;
const clItems = document.getElementById('cl-items') as HTMLElement | null;
const clTitle = document.getElementById('cl-title') as HTMLInputElement | null;
const clStatus = document.getElementById('cl-status') as HTMLElement | null;
let clTargetEvent: number | null = null;

function clAddItemRow(value: string) {
  const row = document.createElement('div');
  row.className = 'cl-item-row';
  const inp = document.createElement('input');
  inp.type = 'text'; inp.placeholder = 'Текст пункта'; inp.value = value || '';
  const del = document.createElement('button');
  del.type = 'button'; del.className = 'cl-item-del'; del.textContent = '✕';
  del.addEventListener('click', () => row.remove());
  row.appendChild(inp); row.appendChild(del);
  clItems!.appendChild(row);
  return inp;
}
let clEditId: number | null = null;
const clModalTitle = clModal?.querySelector('h3');
const clCreateBtn = document.getElementById('cl-create');
function clOpen(eventId: number, edit?: { id?: number; title?: string; items?: string }) {
  clTargetEvent = eventId;
  clEditId = edit?.id || null;
  clTitle!.value = edit?.title || '';
  clItems!.innerHTML = '';
  if (edit?.items) {
    edit.items.split('\n').filter(Boolean).forEach((t) => clAddItemRow(t));
    if (!edit.items) { clAddItemRow(''); clAddItemRow(''); }
  } else { clAddItemRow(''); clAddItemRow(''); }
  if (clModalTitle) clModalTitle.textContent = clEditId ? 'Редактировать чек-лист' : 'Новый чек-лист';
  if (clCreateBtn) clCreateBtn.textContent = clEditId ? 'Сохранить' : 'Создать и привязать';
  clStatus!.textContent = '';
  clModal!.hidden = false;
  clTitle!.focus();
}
function clClose() { if (clModal) clModal.hidden = true; }

document.querySelectorAll('[data-cl-new]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.den-card');
    clOpen(Number(card!.getAttribute('data-event')));
  });
});

// Редактировать существующий чек-лист
document.querySelectorAll('[data-cl-edit]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.den-card');
    clOpen(Number(card!.getAttribute('data-event')), {
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
    const res = await post({ event_id: Number(card!.getAttribute('data-event')), detach_event_checklist_id: Number(btn.getAttribute('data-ec-id')) });
    if (res.ok) reloadKeepingPlace(Number(card!.getAttribute('data-event')));
    else alert('Ошибка: ' + (res.error || ''));
  });
});
document.getElementById('cl-close')?.addEventListener('click', clClose);
clModal?.addEventListener('click', (ev) => { if (ev.target === clModal) clClose(); });
document.getElementById('cl-add-item')?.addEventListener('click', () => clAddItemRow(''));

document.getElementById('cl-create')?.addEventListener('click', async () => {
  const title = clTitle!.value.trim();
  if (!title) { clStatus!.textContent = 'Введите название'; clTitle!.focus(); return; }
  const items = Array.from(clItems!.querySelectorAll('input'))
    .map((i) => i.value.trim()).filter(Boolean).join('\n');
  if (!items) { clStatus!.textContent = 'Добавьте хотя бы один пункт'; return; }
  clStatus!.textContent = clEditId ? 'Сохраняю…' : 'Создаю…';
  const created = await postForm(clEditId ? { action: 'upsertChecklist', id: clEditId, title, items } : { action: 'upsertChecklist', title, items });
  if (!created.ok || !created.id) { clStatus!.textContent = 'Ошибка: ' + (created.error || ''); return; }
  if (clEditId) { reloadKeepingPlace(clTargetEvent); return; }
  const att = await postForm({ action: 'attachChecklist', event_id: clTargetEvent, checklist_id: Number(created.id) });
  if (att.ok) reloadKeepingPlace(clTargetEvent);
  else clStatus!.textContent = 'Создан, но не привязан: ' + (att.error || '');
});

// Копировать день
document.getElementById('copy-day')?.addEventListener('click', () => {
  const target = prompt('На какую дату скопировать день? (ГГГГ-ММ-ДД)', date ?? '');
  if (!target) return;
  fetch(API.copyDay, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ shift_id: Number(shiftId), from_date: date, to_date: target }),
  }).then((r) => r.json()).then((res) => {
    if (res.ok) { alert('Скопировано блоков: ' + (res.count ?? 0)); location.href = '/portal/smena?shift=' + shiftId + '&date=' + target; }
    else alert('Ошибка: ' + (res.error || 'copy-day не готов'));
  });
});

// ── Материалы дня: загрузка общих фото/видео ──
(function () {
  const secEl = document.querySelector('.den-summary');
  if (!secEl) return;
  const sec = secEl;
  const fileInput = document.getElementById('day-file') as HTMLInputElement | null;
  const status = document.getElementById('day-status');
  document.getElementById('day-upload')?.addEventListener('click', () => fileInput!.click());

  async function ensureSummaryEvent() {
    let id = sec.getAttribute('data-summary-event');
    if (id) return Number(id);
    // Служебного блока ещё нет — создаём
    const res = await post({ action: 'create', shift_id: Number(shiftId), date, title: SUMMARY_TITLE, start_time: SUMMARY_TIME });
    if (res.ok && res.id) { sec.setAttribute('data-summary-event', res.id); return res.id; }
    return null;
  }

  fileInput?.addEventListener('change', async () => {
    const files = Array.from(fileInput!.files || []);
    if (!files.length) return;
    if (status) status.textContent = 'Создаю контейнер…';
    const eventId = await ensureSummaryEvent();
    if (!eventId) { if (status) status.textContent = 'Ошибка: не создан блок материалов'; return; }
    let done = 0;
    for (const f of files) {
      if (status) status.textContent = `Загрузка ${done + 1}/${files.length}…`;
      const fd = new FormData();
      fd.append('event_id', String(eventId));
      fd.append('file', f as File);
      let j: { ok: boolean; error?: string; name?: string };
      try {
        const r = await fetch(API.photo, { method: 'POST', credentials: 'include', body: fd });
        j = await parseResp(r);
      } catch { j = { ok: false, error: 'сеть' }; }
      if (j.ok) done++;
      else if (status) status.textContent = `Файл «${(f as File).name}»: ${j.error || 'ошибка'}`;
    }
    if (status && done === files.length) status.textContent = `Готово: ${done}/${files.length}`;
    setTimeout(() => location.reload(), 700);
  });
})();
