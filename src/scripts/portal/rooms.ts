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
  // ── CRM-загрузка ──
  const crmBtn = document.getElementById('load-crm-btn') as HTMLButtonElement | null;
  crmBtn?.addEventListener('click', async () => {
    const ok = await confirmDialog('Загрузить детей из AlfaCRM (группа 660 = смена 1)? Существующие записи останутся, дубли по alfaId игнорируются.');
    if (!ok) return;
    crmBtn.disabled = true;
    const old = crmBtn.innerHTML;
    crmBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Загружаю…';
    try {
      const r = await fetch('/api/shift-roster?shift=1', { credentials: 'include' });
      const d = await r.json();
      if (!d.ok || !Array.isArray(d.kids)) {
        await alertDialog('Ошибка AlfaCRM: ' + (d.error || r.status));
        return;
      }
      let added = 0;
      for (const k of d.kids) {
        const gender = k.gender === 1 ? 'M' : (k.gender === 0 ? 'F' : null);
        await postJson('/api/portal/rasselenie', {
          shift_id: shiftId,
          kid_id: 'alfa-' + k.alfaId,
          kid_name: k.name,
          kid_gender: gender,
          kid_age: k.age || null,
        });
        added++;
      }
      haptic('success');
      await alertDialog('Загружено: ' + added + ' детей');
      window.location.reload();
    } catch (e: any) {
      await alertDialog('Сетевая ошибка: ' + (e?.message ?? e));
    } finally {
      crmBtn.disabled = false;
      crmBtn.innerHTML = old;
    }
  });

  // ── Авто-расстановка ──
  const autoBtn = document.getElementById('auto-assign-btn') as HTMLButtonElement | null;
  autoBtn?.addEventListener('click', async () => {
    const ok = await confirmDialog('Авто-расстановка заполнит свободные койки с учётом пола (без смешанных) и близкого возраста (разброс ≤3 лет). Уже расселённых не трогаем. Продолжить?');
    if (!ok) return;
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

  // Remove kid
  document.querySelectorAll('.kid-remove').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const kidId = (btn as HTMLElement).dataset.kidId;
      const ok = await confirmDialog('Снять с койки и удалить из списка?');
      if (!ok) return;
      const r = await fetch('/api/portal/rasselenie', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shift_id: shiftId, kid_id: kidId }),
        credentials: 'include',
      });
      if (r.ok) { haptic('success'); window.location.reload(); }
    });
  });
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
  let currentRoom: number | null = null;

  function openModal(room: number) {
    currentRoom = room;
    if (numEl) numEl.textContent = String(room);
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    // reset checks/comments
    modal.querySelectorAll<HTMLInputElement>('.room-check').forEach((c) => { c.checked = false; });
    modal.querySelectorAll<HTMLTextAreaElement>('.room-comment').forEach((t) => { t.value = ''; t.classList.add('hidden'); });
    if (wtStatus) wtStatus.textContent = 'Загружаю состояние…';
    if (statusEl) statusEl.textContent = '';
    fetch('/api/portal/room-inventory?shift_id=' + shiftId + '&room=' + room, { credentials: 'include' })
      .then((r) => r.json()).then((d) => {
        if (!d.ok) { if (wtStatus) wtStatus.textContent = 'Ошибка: ' + (d.error || ''); return; }
        const row = d.row;
        const checks = d.checks || [];
        checks.forEach((c: any) => {
          const cb = modal.querySelector<HTMLInputElement>('.room-check[data-item="' + c.item_id + '"]');
          const ta = modal.querySelector<HTMLTextAreaElement>('.room-comment[data-item="' + c.item_id + '"]');
          if (cb) cb.checked = !!c.done;
          if (ta && c.comment) { ta.value = c.comment; ta.classList.remove('hidden'); }
        });
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

  // Toggle textarea on check change
  modal.querySelectorAll<HTMLInputElement>('.room-check').forEach((cb) => {
    cb.addEventListener('change', () => {
      const item = cb.dataset.item!;
      const ta = modal.querySelector<HTMLTextAreaElement>('.room-comment[data-item="' + item + '"]');
      if (ta) {
        if (cb.checked) ta.classList.add('hidden'); else ta.classList.remove('hidden');
        saveCheck(item, cb.checked, ta.value || null);
      }
    });
  });

  modal.querySelectorAll<HTMLTextAreaElement>('.room-comment').forEach((ta) => {
    let t: ReturnType<typeof setTimeout>;
    ta.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const item = ta.dataset.item!;
        const cb = modal.querySelector<HTMLInputElement>('.room-check[data-item="' + item + '"]');
        saveCheck(item, cb ? cb.checked : false, ta.value || null);
      }, 600);
    });
  });

  async function saveCheck(item: string, done: boolean, comment: string | null) {
    if (!currentRoom) return;
    if (statusEl) statusEl.textContent = 'Сохраняю…';
    const d = await postJson('/api/portal/room-inventory', {
      shift_id: shiftId, room: currentRoom, item_id: item, done, comment,
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
        if (cb && !cb.checked) { cb.checked = true; saveCheck('video', true, null); }
      } else {
        if (wtStatus) wtStatus.textContent = 'Ошибка привязки видео: ' + (res.error || '');
      }
    }).catch(() => { if (wtStatus) wtStatus.textContent = 'Сетевая ошибка при привязке видео'; });
  });
}
