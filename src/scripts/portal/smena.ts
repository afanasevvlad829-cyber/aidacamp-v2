import { postJson } from '../../lib/portalApi';
import { alertDialog } from './tg';

// ── Dates toggle (show/hide extra dates) ──────────────────────────────────
(() => {
  const btn = document.getElementById('dates-toggle');
  const extra = document.getElementById('dates-extra');
  if (!btn || !extra) return;
  btn.addEventListener('click', () => {
    extra.classList.toggle('hidden');
    extra.classList.toggle('flex');
  });
})();

// ── Checklist checkboxes ──────────────────────────────────────────────────
(() => {
  const boxes = document.querySelectorAll<HTMLInputElement>('.smena-check');
  boxes.forEach((box) => {
    box.addEventListener('change', async () => {
      const eventId = Number(box.dataset.event);
      const checklistId = Number(box.dataset.checklist);
      const itemId = box.dataset.item;
      const intended = box.checked;
      box.disabled = true;
      try {
        const data = await postJson('/api/portal/shift/check', { eventId, checklistId, itemId, done: intended });
        if (!data.ok) {
          box.checked = !intended;
          await alertDialog('Не удалось сохранить отметку. Попробуйте ещё раз.');
        } else {
          box.checked = data.done;
        }
      } catch {
        box.checked = !intended;
        await alertDialog('Нет связи с сервером. Отметка не сохранена.');
      } finally {
        box.disabled = false;
      }
    });
  });
})();

// ── Parallel slots — switch panel by clicking responsible badge ───────────
(() => {
  function activate(slotId: string, panelId: string) {
    document.querySelectorAll<HTMLElement>('[data-slot-panel="' + slotId + '"]').forEach((p) => {
      p.classList.toggle('hidden', p.id !== panelId);
    });
    document.querySelectorAll<HTMLElement>('[data-slot-tab="' + slotId + '"]').forEach((b) => {
      const on = b.getAttribute('data-target') === panelId;
      b.classList.toggle('ring-4', on);
      b.classList.toggle('ring-primary', on);
      b.classList.toggle('ring-offset-2', on);
      b.classList.toggle('scale-110', on);
      b.classList.toggle('shadow-lg', on);
      b.classList.toggle('opacity-50', !on);
      b.classList.toggle('grayscale', !on);
    });
  }
  document.querySelectorAll<HTMLButtonElement>('button[data-slot-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slotId = btn.getAttribute('data-slot-tab');
      const target = btn.getAttribute('data-target');
      if (slotId && target) activate(slotId, target);
    });
  });
})();

// ── Portal edit forms (inline event editing) ─────────────────────────────
// Канонический обработчик инлайн-правки события живёт в PortalLayout.astro
// (POST /api/portal/shift/event-edit с полем event_id). Здесь раньше был
// дубль с битым путём /api/portal/shift/event + полем id — он конфликтовал
// (двойной submit, ложная ошибка). Удалён, чтобы остался один источник правды.

// ── Self-check (wakeup) ──────────────────────────────────────────────────
(() => {
  // dayjs is loaded via CDN scripts in the page head
  const dj = () => (window as any).dayjs;

  function fmtTime(iso: string): string {
    try {
      const d = dj() ? dj()(iso) : null;
      if (d && d.isValid()) return d.format('HH:mm');
      return typeof iso === 'string' ? iso : '';
    } catch { return typeof iso === 'string' ? iso : ''; }
  }

  function renderRow(r: any, me: number | null, eventId: string): string {
    const isMe = me != null && Number(r.staff_id) === Number(me);
    const checked = !!r.checked_at;
    const name = r.full_name || ('id=' + r.staff_id);
    const role = r.role ? (' · ' + r.role) : '';
    const status = checked
      ? '<span class="text-emerald-700"><i class="bi bi-check-circle-fill"></i> встал в ' + fmtTime(r.checked_at) + '</span>'
      : '<span class="text-amber-700"><i class="bi bi-hourglass"></i> ещё нет</span>';
    const myBtn = isMe && !checked
      ? '<button type="button" data-mark="' + eventId + '" class="ml-2 rounded-[8px] bg-primary px-3 py-1 text-[13px] font-medium text-white hover:opacity-90">Я встал</button>'
      : (isMe && checked
        ? '<button type="button" data-unmark="' + eventId + '" class="ml-2 rounded-[8px] border border-border bg-white px-3 py-1 text-[12px] font-medium text-body-muted hover:border-primary">Снять</button>'
        : '');
    return '<li class="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-border bg-white px-3 py-1.5">'
      + '<span><b>' + name + '</b>' + role + '</span>'
      + '<span class="flex items-center gap-1.5">' + status + myBtn + '</span>'
      + '</li>';
  }

  async function loadWakeup(wrap: HTMLElement) {
    const eventId = wrap.dataset.eventId;
    if (!eventId) return;
    const list = wrap.querySelector<HTMLElement>('.portal-wakeup__list');
    const loading = wrap.querySelector<HTMLElement>('.portal-wakeup__loading');
    try {
      const r = await fetch('/api/portal/self-check?event_id=' + encodeURIComponent(eventId), { credentials: 'include' });
      const j = await r.json();
      if (loading) loading.style.display = 'none';
      if (!j.ok) { if (list) list.innerHTML = '<li class="text-body-muted">не удалось загрузить</li>'; return; }
      const me = j.me_staff_id;
      const rows = j.rows || [];
      if (list) {
        if (rows.length === 0) {
          list.innerHTML = '<li class="text-body-muted">нет активных сотрудников</li>';
        } else {
          list.innerHTML = rows.map((row: any) => renderRow(row, me, eventId)).join('');
        }
      }
    } catch (e: any) {
      if (loading) loading.textContent = 'ошибка: ' + (e?.message ?? e);
    }
  }

  document.querySelectorAll<HTMLElement>('.portal-wakeup').forEach((wrap) => {
    loadWakeup(wrap);
  });

  document.addEventListener('click', async (ev) => {
    const target = ev.target as HTMLElement | null;
    const btn = target?.closest<HTMLButtonElement>('button[data-mark],button[data-unmark]');
    if (!btn) return;
    const eventId = (btn as any).dataset.mark || (btn as any).dataset.unmark;
    const action = (btn as any).dataset.mark ? 'mark' : 'unmark';
    btn.disabled = true;
    try {
      const data = await postJson('/api/portal/self-check', { action, event_id: Number(eventId) });
      if (!data.ok) throw new Error(data.error || 'error');
      const wrap = document.querySelector<HTMLElement>('.portal-wakeup[data-event-id="' + eventId + '"]');
      if (wrap) await loadWakeup(wrap);
    } catch (e: any) {
      await alertDialog('Ошибка: ' + (e?.message ?? e));
    } finally {
      btn.disabled = false;
    }
  });
})();

// ── Duplicate event dialog (admin only) ──────────────────────────────────
(() => {
  const dlg = document.getElementById('dup-dlg') as HTMLDialogElement | null;
  if (!dlg) return;
  const sourceInp = document.getElementById('dup-source-id') as HTMLInputElement | null;
  const respSel = document.getElementById('dup-resp') as HTMLSelectElement | null;
  const errBox = document.getElementById('dup-error') as HTMLElement | null;
  const saveBtn = document.getElementById('dup-save') as HTMLButtonElement | null;

  function showErr(msg: string) {
    if (!errBox) return;
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
  }
  function hideErr() { errBox?.classList.add('hidden'); }
  function closeDlg() { hideErr(); dlg.close(); }

  document.querySelectorAll<HTMLButtonElement>('[data-dup-event]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (sourceInp) sourceInp.value = (btn as any).dataset.dupEvent || '';
      if (respSel) respSel.value = '';
      hideErr();
      dlg.showModal();
    });
  });

  document.getElementById('dup-cancel')?.addEventListener('click', closeDlg);
  document.getElementById('dup-cancel-x')?.addEventListener('click', closeDlg);
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) closeDlg(); });

  saveBtn?.addEventListener('click', async () => {
    const srcId = sourceInp?.value;
    const respId = respSel?.value;
    if (!srcId) return;
    if (!respId) { showErr('Выбери ответственного'); return; }
    hideErr();
    saveBtn.disabled = true;
    try {
      const data = await postJson('/api/portal/shift/admin', {
        action: 'duplicateEvent',
        id: Number(srcId),
        responsible_staff_id: Number(respId),
      });
      if (!data.ok) throw new Error(data.error || ('HTTP error'));
      if (!data.id) throw new Error('Событие не создалось — попробуй ещё раз');
      dlg.close();
      location.reload();
    } catch (e: any) {
      showErr('Ошибка: ' + (e?.message ?? String(e)));
    } finally {
      saveBtn.disabled = false;
    }
  });
})();
