import { postJson } from '../../lib/portalApi';
import { confirmDialog, alertDialog, haptic } from './tg';

// ── Rasselenie tab logic ──────────────────────────────────────────────────

const shiftIdMeta = document.querySelector<HTMLMetaElement>('meta[name="rooms-shift-id"]');
const shiftId = shiftIdMeta ? Number(shiftIdMeta.content) : 0;

if (document.getElementById('load-crm-btn')) {
  initRasselenie();
}

if (document.getElementById('room-modal')) {
  initInventory();
}

function initRasselenie() {
  // ── CRM-загрузка через диалог выбора групп ──
  const crmBtn = document.getElementById('load-crm-btn') as HTMLButtonElement | null;
  const crmDlg = document.getElementById('crm-groups-dialog') as HTMLDialogElement | null;
  const crmList = document.getElementById('crm-groups-list') as HTMLDivElement | null;
  const crmError = document.getElementById('crm-groups-error') as HTMLDivElement | null;
  const crmSubmit = document.getElementById('crm-groups-submit') as HTMLButtonElement | null;
  const crmCancel = document.getElementById('crm-groups-cancel') as HTMLButtonElement | null;

  crmCancel?.addEventListener('click', () => crmDlg?.close());
  crmDlg?.addEventListener('click', (e) => { if (e.target === crmDlg) crmDlg.close(); });

  crmBtn?.addEventListener('click', async () => {
    if (!crmDlg || !crmList || !crmSubmit) return;
    // Сбрасываем состояние
    crmList.innerHTML = '<div style="color:#6b7280;font-size:14px">Загрузка групп…</div>';
    crmSubmit.disabled = true;
    if (crmError) crmError.style.display = 'none';
    crmDlg.showModal();

    try {
      const r = await fetch('/api/portal/alfacrm-groups', { credentials: 'include' });
      const d = await r.json();
      if (!d.ok || !Array.isArray(d.groups)) {
        crmList.innerHTML = '<div style="color:#b91c1c;font-size:14px">Не удалось загрузить группы: ' + (d.error || r.status) + '</div>';
        return;
      }
      if (d.groups.length === 0) {
        crmList.innerHTML = '<div style="color:#6b7280;font-size:14px">Активных групп не найдено</div>';
        return;
      }
      crmList.innerHTML = d.groups.map((g: any) =>
        `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;font-size:14px">
          <input type="checkbox" data-group-id="${g.id}" style="width:16px;height:16px;flex-shrink:0" />
          <span style="flex:1">${g.name}</span>
          ${g.student_count != null ? `<span style="color:#6b7280">${g.student_count} уч.</span>` : ''}
        </label>`
      ).join('');

      // Активируем кнопку при выборе хотя бы одной группы
      crmList.addEventListener('change', () => {
        const checked = crmList.querySelectorAll('input[type=checkbox]:checked');
        crmSubmit.disabled = checked.length === 0;
      });
    } catch (e: any) {
      crmList.innerHTML = '<div style="color:#b91c1c;font-size:14px">Сетевая ошибка: ' + (e?.message ?? e) + '</div>';
    }
  });

  crmSubmit?.addEventListener('click', async () => {
    if (!crmDlg || !crmList || !crmSubmit || !crmError) return;
    const checked = Array.from(crmList.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked'));
    const groupIds = checked.map(el => Number(el.dataset.groupId)).filter(Boolean);
    if (groupIds.length === 0) return;

    crmSubmit.disabled = true;
    const oldText = crmSubmit.innerHTML;
    crmSubmit.innerHTML = '<i class="bi bi-arrow-repeat"></i> Загружаю…';
    crmError.style.display = 'none';

    try {
      let totalAdded = 0;
      for (const groupId of groupIds) {
        const r = await fetch('/api/shift-roster?group_id=' + groupId, { credentials: 'include' });
        const d = await r.json();
        if (!d.ok || !Array.isArray(d.kids)) {
          crmError.textContent = 'Ошибка группы ' + groupId + ': ' + (d.error || r.status);
          crmError.style.display = 'block';
          crmSubmit.disabled = false;
          crmSubmit.innerHTML = oldText;
          return;
        }
        for (const k of d.kids) {
          const gender = k.gender === 1 ? 'M' : (k.gender === 0 ? 'F' : null);
          await postJson('/api/portal/rasselenie', {
            shift_id: shiftId,
            kid_id: 'alfa-' + k.alfaId,
            kid_name: k.name,
            kid_gender: gender,
            kid_age: k.age || null,
          });
          totalAdded++;
        }
      }
      haptic('success');
      crmDlg.close();
      await alertDialog('Загружено: ' + totalAdded + ' детей из ' + groupIds.length + ' групп(ы). Дубли пропущены.');
      window.location.reload();
    } catch (e: any) {
      crmError.textContent = 'Сетевая ошибка: ' + (e?.message ?? e);
      crmError.style.display = 'block';
      crmSubmit.disabled = false;
      crmSubmit.innerHTML = oldText;
    }
  });

  // ── Авто-расстановка ──
  const autoBtn = document.getElementById('auto-assign-btn') as HTMLButtonElement | null;
  autoBtn?.addEventListener('click', async () => {
    if (!shiftId) { await alertDialog('Нет активной смены — обновите страницу.'); return; }
    autoBtn.disabled = true;
    const old = autoBtn.innerHTML;
    autoBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Расставляю…';
    try {
      const d = await postJson('/api/portal/rasselenie', { action: 'auto_assign', shift_id: shiftId });
      if (d.ok) {
        haptic('success');
        await alertDialog('Расселено: ' + d.assigned + '. Не удалось разместить: ' + d.skipped + ' (возможно — нет подходящих коек или пол/возраст не сходятся).');
        window.location.reload();
      } else {
        await alertDialog('Ошибка: ' + (d.error || ''));
        autoBtn.disabled = false;
        autoBtn.innerHTML = old;
      }
    } catch {
      await alertDialog('Сетевая ошибка');
      autoBtn.disabled = false;
      autoBtn.innerHTML = old;
    }
  });

  // ── Сброс расселения ──
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;
  resetBtn?.addEventListener('click', async () => {
    const choice = prompt('Выбери режим сброса:\n  1 — снять всех с коек (список детей сохранится)\n  2 — удалить ВСЕХ детей полностью\n\nВведи 1 или 2 (или Cancel):', '1');
    if (choice !== '1' && choice !== '2') return;
    const action = choice === '2' ? 'wipe_all' : 'reset_all';
    if (action === 'wipe_all') {
      const confirmed = await confirmDialog('Точно удалить ВСЕХ детей из списка? Это необратимо.');
      if (!confirmed) return;
    }
    try {
      const r = await fetch('/api/portal/rasselenie', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shift_id: shiftId, action }),
        credentials: 'include',
      });
      const d = await r.json();
      if (d.ok) { haptic('success'); window.location.reload(); }
      else await alertDialog('Ошибка: ' + (d.error || ''));
    } catch {
      await alertDialog('Сетевая ошибка');
    }
  });

  // ── Add-kid modal ──
  const modal = document.getElementById('add-kid-modal') as HTMLElement | null;
  const openBtn = document.getElementById('add-kid-btn');
  const cancelBtn = document.getElementById('add-kid-cancel');
  const form = document.getElementById('add-kid-form') as HTMLFormElement | null;
  const statusEl = document.getElementById('add-kid-status');

  openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
  cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal.firstElementChild) modal.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      shift_id: shiftId,
      kid_id: 'kid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      kid_name: fd.get('kid_name'),
      kid_gender: fd.get('kid_gender') || null,
      kid_age: fd.get('kid_age') || null,
      notes: fd.get('notes') || null,
    };
    if (statusEl) statusEl.textContent = 'Добавляю…';
    const d = await postJson('/api/portal/rasselenie', body);
    if (d.ok) { haptic('success'); window.location.reload(); }
    else if (statusEl) statusEl.textContent = 'Ошибка: ' + (d.error || '');
  });

  // ── Переключатель видов: План / Список + Печать ──
  const planView = document.getElementById('rasselenie-plan-view');
  const listView = document.getElementById('rasselenie-list-view');
  const planBtn = document.getElementById('view-plan-btn');
  const listBtn = document.getElementById('view-list-btn');
  const printBtn = document.getElementById('print-rasselenie-btn');

  function setView(view: 'plan' | 'list') {
    const isList = view === 'list';
    planView?.classList.toggle('hidden', isList);
    listView?.classList.toggle('hidden', !isList);
    // активная кнопка — заливка primary, неактивная — белая
    planBtn?.classList.toggle('bg-primary', !isList);
    planBtn?.classList.toggle('text-white', !isList);
    planBtn?.classList.toggle('border-primary', !isList);
    planBtn?.classList.toggle('bg-white', isList);
    planBtn?.classList.toggle('border-border', isList);
    listBtn?.classList.toggle('bg-primary', isList);
    listBtn?.classList.toggle('text-white', isList);
    listBtn?.classList.toggle('border-primary', isList);
    listBtn?.classList.toggle('bg-white', !isList);
    listBtn?.classList.toggle('border-border', !isList);
  }
  planBtn?.addEventListener('click', () => setView('plan'));
  listBtn?.addEventListener('click', () => setView('list'));
  printBtn?.addEventListener('click', () => {
    setView('list');
    // window.print() недоступен в Telegram WebView — даём понятный фидбэк вместо тишины
    if (typeof window.print === 'function') {
      try { window.print(); }
      catch { alertDialog('Печать недоступна здесь. Откройте портал в обычном браузере (Chrome/Safari) и нажмите «Печать».'); }
    } else {
      alertDialog('Печать недоступна в этом приложении. Откройте aidacamp.ru/portal/rooms в браузере на компьютере и нажмите «Печать».');
    }
  });

  // ── Drag-n-drop через Sortable.js ──
  const poolEl = document.getElementById('pool-list');

  function initSortable() {
    const S = (window as any).Sortable;
    if (!S) return;

    document.querySelectorAll('.kid-card[draggable="true"]').forEach((c) => c.removeAttribute('draggable'));

    const commonOpts = {
      group: { name: 'kids', pull: true, put: true },
      animation: 150,
      ghostClass: 'opacity-50',
      draggable: '.kid-card',
      // Кнопка «×» (снять с койки) внутри перетаскиваемой карточки: без filter
      // Sortable перехватывает нажатие как старт drag и клик не срабатывает.
      // preventOnFilter:false — пропускаем нативный click к обработчику .kid-remove.
      filter: '.kid-remove',
      preventOnFilter: false,
      forceFallback: false,
    };

    if (poolEl) {
      S.create(poolEl, {
        ...commonOpts,
        onAdd: async (evt: any) => {
          const item = evt.item;
          const kidId = item.dataset.kidId;
          const kidName = item.dataset.kidName;
          if (!kidId) return;
          await moveKid(kidId, kidName, null, null);
        },
      });
    }

    document.querySelectorAll('.bed').forEach((bed: Element) => {
      S.create(bed, {
        ...commonOpts,
        onAdd: async (evt: any) => {
          const item = evt.item;
          const kidId = item.dataset.kidId;
          const kidName = item.dataset.kidName;
          if (!kidId) return;
          const roomNumber = Number((bed as HTMLElement).dataset.roomNumber);
          const bedIndex = Number((bed as HTMLElement).dataset.bedIndex);
          await moveKid(kidId, kidName, roomNumber, bedIndex);
        },
      });
    });
  }

  if ((window as any).Sortable) initSortable();
  else window.addEventListener('sortable-ready', initSortable, { once: true });

  async function moveKid(kidId: string, kidName: string, roomNumber: number | null, bedIndex: number | null) {
    const d = await postJson('/api/portal/rasselenie', {
      shift_id: shiftId, kid_id: kidId, kid_name: kidName,
      room_number: roomNumber, bed_index: bedIndex,
    });
    if (d.ok) { haptic('success'); window.location.reload(); }
    else await alertDialog('Ошибка: ' + (d.error || ''));
  }

  // Pool toggle
  const toggleBtn = document.getElementById('toggle-pool-btn');
  const poolList = document.getElementById('pool-list');
  if (toggleBtn && poolList) {
    toggleBtn.addEventListener('click', () => {
      const collapsed = poolList.style.display === 'none';
      poolList.style.display = collapsed ? '' : 'none';
      toggleBtn.textContent = collapsed ? 'Свернуть' : 'Развернуть';
    });
  }

  // Remove kid — event delegation на document, срабатывает до Sortable (touch-safe)
  async function handleKidRemove(kidId: string) {
    const r = await fetch('/api/portal/rasselenie', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shift_id: shiftId, kid_id: kidId }),
      credentials: 'include',
    });
    if (r.ok) {
      haptic('success');
      window.location.reload();
    } else {
      const d = await r.json().catch(() => ({}));
      await alertDialog('Не удалось снять с койки: ' + (d.error || ('HTTP ' + r.status)));
    }
  }
  // click (desktop) + touchend (mobile/TG) — оба варианта
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest('.kid-remove') as HTMLElement | null;
    if (!btn) return;
    e.stopPropagation(); e.preventDefault();
    const kidId = btn.dataset.kidId;
    if (kidId) handleKidRemove(kidId);
  });
  document.addEventListener('touchend', (e) => {
    const btn = (e.target as Element).closest('.kid-remove') as HTMLElement | null;
    if (!btn) return;
    e.stopPropagation(); e.preventDefault();
    const kidId = btn.dataset.kidId;
    if (kidId) handleKidRemove(kidId);
  }, { passive: false });
}

// ── Inventory tab logic ───────────────────────────────────────────────────

function initInventory() {
  const modal = document.getElementById('room-modal') as HTMLDialogElement | null;
  if (!modal) return;

  const numEl = document.getElementById('room-modal-num');
  const closeBtn = document.getElementById('room-modal-close');
  const wtStatus = document.getElementById('room-walkthrough-status');
  const statusEl = document.getElementById('room-modal-status');
  const okBtn = document.getElementById('room-mark-ok');
  const defBtn = document.getElementById('room-mark-defects');
  const notesEl = document.getElementById('room-notes') as HTMLTextAreaElement | null;
  let currentRoom: number | null = null;

  function openModal(room: number) {
    currentRoom = room;
    if (numEl) numEl.textContent = String(room);
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    // reset checks/comment
    modal.querySelectorAll<HTMLInputElement>('.room-check').forEach((c) => { c.checked = false; });
    if (notesEl) notesEl.value = '';
    if (wtStatus) wtStatus.textContent = 'Загружаю состояние…';
    if (statusEl) statusEl.textContent = '';
    fetch('/api/portal/room-inventory?shift_id=' + shiftId + '&room=' + room, { credentials: 'include' })
      .then((r) => r.json()).then((d) => {
        if (!d.ok) { if (wtStatus) wtStatus.textContent = 'Ошибка: ' + (d.error || ''); return; }
        const row = d.row;
        const checks = d.checks || [];
        checks.forEach((c: any) => {
          const cb = modal.querySelector<HTMLInputElement>('.room-check[data-item="' + c.item_id + '"]');
          if (cb) cb.checked = !!c.done;
        });
        if (notesEl) notesEl.value = (row && row.notes) || '';
        if (wtStatus) {
          wtStatus.textContent = row && row.walkthrough_photo_id
            ? '✓ Видео обхода загружено (id ' + row.walkthrough_photo_id + ')'
            : 'Видео ещё не загружено.';
        }
      }).catch(() => { if (wtStatus) wtStatus.textContent = 'Не удалось загрузить.'; });
  }

  function closeModal() {
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
    currentRoom = null;
  }

  document.querySelectorAll('.room-tile').forEach((b) => {
    if ((b as HTMLButtonElement).disabled) return;
    b.addEventListener('click', () => openModal(Number((b as HTMLElement).dataset.room)));
  });

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  modal.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });

  // Сохраняем галочку при изменении чекбокса
  modal.querySelectorAll<HTMLInputElement>('.room-check').forEach((cb) => {
    cb.addEventListener('change', () => saveCheck(cb.dataset.item!, cb.checked));
  });

  // Один комментарий на комнату (debounce)
  if (notesEl) {
    let t: ReturnType<typeof setTimeout>;
    notesEl.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => saveNotes(notesEl.value), 600);
    });
  }

  async function saveCheck(item: string, done: boolean) {
    if (!currentRoom) return;
    if (statusEl) statusEl.textContent = 'Сохраняю…';
    const d = await postJson('/api/portal/room-inventory', {
      shift_id: shiftId, room: currentRoom, item_id: item, done,
    });
    if (statusEl) statusEl.textContent = d.ok ? '✓' : 'Ошибка';
  }

  async function saveNotes(notes: string) {
    if (!currentRoom) return;
    if (statusEl) statusEl.textContent = 'Сохраняю…';
    const d = await postJson('/api/portal/room-inventory', {
      shift_id: shiftId, room: currentRoom, notes,
    });
    if (statusEl) statusEl.textContent = d.ok ? '✓' : 'Ошибка';
  }

  async function setStatus(st: string) {
    if (!currentRoom) return;
    if (statusEl) statusEl.textContent = 'Сохраняю…';
    const d = await postJson('/api/portal/room-inventory', {
      shift_id: shiftId, room: currentRoom, status: st,
    });
    if (d.ok) {
      haptic('success');
      if (statusEl) statusEl.textContent = '✓ Сохранено';
      setTimeout(() => window.location.reload(), 500);
    } else {
      if (statusEl) statusEl.textContent = 'Ошибка: ' + (d.error || '');
    }
  }

  okBtn?.addEventListener('click', () => setStatus('ok'));
  defBtn?.addEventListener('click', () => setStatus('defects'));

  const resetBtn = document.getElementById('room-mark-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const ok = await confirmDialog('Сбросить статус комнаты в «не принято»? Чек-листы и видео сохранятся.');
      if (ok) setStatus('pending');
    });
  }

  // После загрузки видео обхода — привязать к комнате.
  document.addEventListener('portal-media:uploaded', (ev: Event) => {
    const d = (ev as CustomEvent).detail || {};
    if (d.uploaderId !== 'room-walkthrough-uploader' || !currentRoom || !d.photoId) return;
    postJson('/api/portal/room-inventory', {
      shift_id: shiftId, room: currentRoom, walkthrough_photo_id: d.photoId,
    }).then((res) => {
      if (res.ok) {
        if (wtStatus) wtStatus.textContent = '✓ Видео обхода привязано (id ' + d.photoId + ')';
        const cb = modal.querySelector<HTMLInputElement>('.room-check[data-item="video"]');
        if (cb && !cb.checked) { cb.checked = true; saveCheck('video', true); }
      } else {
        if (wtStatus) wtStatus.textContent = 'Ошибка привязки видео: ' + (res.error || '');
      }
    }).catch(() => { if (wtStatus) wtStatus.textContent = 'Сетевая ошибка при привязке видео'; });
  });
}
