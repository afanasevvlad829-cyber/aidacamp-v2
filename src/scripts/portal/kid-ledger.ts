import { postJson } from '../../lib/portalApi';
import { haptic } from './tg';

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';

function fmtDate(iso: string) {
  try {
    const normalized = iso.replace(/([+-]\d{2})$/, '$1:00');
    return new Date(normalized).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

async function refreshKidRow(kidId: number) {
  const row = document.querySelector<HTMLElement>(`[data-kid-row][data-kid-id="${kidId}"]`);
  if (!row) return;
  try {
    const res = await fetch(`/api/portal/kid-ledger?action=balance&kid_id=${kidId}`);
    const jr = await res.json();
    if (!jr.ok) return;
    row.querySelector('[data-kid-earned]')!.textContent = fmt(jr.earned);
    row.querySelector('[data-kid-spent]')!.textContent = fmt(jr.spent);
    row.querySelector('[data-kid-balance]')!.textContent = fmt(jr.balance);
  } catch { /* тихо — цифры просто останутся старыми до перезагрузки */ }
}

// ── Диалог начислить/списать ──────────────────────────────────────────
const klDlg = document.getElementById('kid-ledger-dialog') as HTMLDialogElement | null;
const klKidSel = document.getElementById('kl-kid') as HTMLSelectElement | null;
const klSignInput = document.getElementById('kl-sign') as HTMLInputElement | null;
const klSignPlus = document.getElementById('kl-sign-plus');
const klSignMinus = document.getElementById('kl-sign-minus');
const klAmount = document.getElementById('kl-amount') as HTMLInputElement | null;
const klReason = document.getElementById('kl-reason') as HTMLTextAreaElement | null;
const klStatus = document.getElementById('kl-status');
const klTitle = document.getElementById('kl-dialog-title');

function setSign(sign: '1' | '-1') {
  if (klSignInput) klSignInput.value = sign;
  const plus = sign === '1';
  klSignPlus?.classList.toggle('border-emerald-500', plus);
  klSignPlus?.classList.toggle('bg-emerald-50', plus);
  klSignPlus?.classList.toggle('text-emerald-700', plus);
  klSignPlus?.classList.toggle('border-border', !plus);
  klSignPlus?.classList.toggle('bg-white', !plus);
  klSignPlus?.classList.toggle('text-body-muted', !plus);
  klSignMinus?.classList.toggle('border-red-500', !plus);
  klSignMinus?.classList.toggle('bg-red-50', !plus);
  klSignMinus?.classList.toggle('text-red-700', !plus);
  klSignMinus?.classList.toggle('border-border', plus);
  klSignMinus?.classList.toggle('bg-white', plus);
  klSignMinus?.classList.toggle('text-body-muted', plus);
  if (klTitle) klTitle.textContent = plus ? 'Начислить рубли' : 'Списать рубли';
}
klSignPlus?.addEventListener('click', () => setSign('1'));
klSignMinus?.addEventListener('click', () => setSign('-1'));

function openLedgerDialog(kidId?: string, kidName?: string, sign: '1' | '-1' = '1') {
  if (!klDlg) return;
  if (klKidSel) klKidSel.value = kidId || '';
  if (klAmount) klAmount.value = '';
  if (klReason) klReason.value = '';
  if (klStatus) klStatus.textContent = '';
  setSign(sign);
  klDlg.showModal();
}

document.querySelectorAll('[data-add-ledger]').forEach((btn: any) => {
  btn.addEventListener('click', () => {
    openLedgerDialog(btn.dataset.kidId, btn.dataset.kidName, btn.dataset.sign === '-1' ? '-1' : '1');
  });
});

document.getElementById('kl-cancel')?.addEventListener('click', () => klDlg?.close());

document.getElementById('kl-save')?.addEventListener('click', async () => {
  const kidId = klKidSel?.value;
  if (!kidId) { if (klStatus) klStatus.textContent = 'Выбери ребёнка'; return; }
  const amountRaw = Number(klAmount?.value);
  if (!amountRaw || amountRaw <= 0) { if (klStatus) klStatus.textContent = 'Укажи сумму больше 0'; return; }
  const reason = (klReason?.value || '').trim();
  if (!reason) { if (klStatus) klStatus.textContent = 'Укажи причину'; return; }
  const sign = klSignInput?.value === '-1' ? -1 : 1;
  const kidName = klKidSel?.options[klKidSel.selectedIndex]?.dataset?.name || '';

  if (klStatus) klStatus.textContent = 'Сохраняем…';
  try {
    const jr = await postJson('/api/portal/kid-ledger', {
      action: 'add', kid_id: Number(kidId), kid_name: kidName, amount: amountRaw * sign, reason,
    });
    if (jr.ok) {
      haptic('success');
      if (klStatus) klStatus.textContent = '✓ сохранено';
      await refreshKidRow(Number(kidId));
      setTimeout(() => klDlg?.close(), 500);
    } else {
      if (klStatus) klStatus.textContent = 'Ошибка: ' + (jr.error || 'unknown');
    }
  } catch { if (klStatus) klStatus.textContent = 'Сетевая ошибка'; }
});

// ── История начислений ──────────────────────────────────────────────
const klHistDlg = document.getElementById('kid-ledger-sheet') as HTMLElement | null;
function klHistOpen() { if (!klHistDlg) return; klHistDlg.hidden = false; requestAnimationFrame(() => klHistDlg.classList.add('open')); }
function klHistClose() { if (!klHistDlg) return; klHistDlg.classList.remove('open'); setTimeout(() => { klHistDlg.hidden = true; }, 300); }
const klHistLoading = document.getElementById('kl-hist-loading');
const klHistEmpty = document.getElementById('kl-hist-empty');
const klHistList = document.getElementById('kl-hist-list');

async function openHistoryModal(kidId: string, kidName: string) {
  if (!klHistDlg) return;
  document.getElementById('kl-hist-kid-name')!.textContent = kidName;
  if (klHistLoading) klHistLoading.hidden = false;
  if (klHistEmpty) klHistEmpty.hidden = true;
  if (klHistList) { klHistList.hidden = true; klHistList.innerHTML = ''; }
  klHistOpen();

  try {
    const res = await fetch(`/api/portal/kid-ledger?action=list&kid_id=${encodeURIComponent(kidId)}&limit=100`);
    const jr = await res.json();
    if (klHistLoading) klHistLoading.hidden = true;
    const items = jr.items || [];
    if (!items.length) { if (klHistEmpty) klHistEmpty.hidden = false; return; }
    if (klHistList) {
      klHistList.hidden = false;
      klHistList.innerHTML = items.map((it: any) => {
        const positive = it.amount > 0;
        const sourceLabel = it.source === 'daily_allowance' ? 'ежедневная выдача' : 'вручную';
        return `<div class="flex items-start justify-between gap-3 rounded-[12px] border border-border bg-white p-3" data-kl-card="${it.id}">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono font-semibold ${positive ? 'text-emerald-700' : 'text-red-700'}">${positive ? '+' : ''}${it.amount} ₽</span>
              <span class="text-[12px] text-body-muted">${fmtDate(it.created_at)}</span>
              <span class="rounded-full bg-page px-2 py-0.5 text-[11px] text-body-muted">${sourceLabel}</span>
            </div>
            <div class="mt-0.5 text-[13px] text-navy-950">${it.reason || ''}</div>
          </div>
          <button type="button" class="kl-hist-delete flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] text-body-muted hover:bg-red-50 hover:text-red-600 transition"
                  title="Удалить запись" data-del-id="${it.id}">
            <i class="bi bi-trash text-[13px]" aria-hidden="true"></i>
          </button>
        </div>`;
      }).join('');

      klHistList.querySelectorAll('.kl-hist-delete').forEach((btn: any) => {
        let armed = false;
        let armTimer: ReturnType<typeof setTimeout>;
        btn.addEventListener('click', async () => {
          if (!armed) {
            armed = true;
            btn.title = 'Нажми ещё раз для удаления';
            btn.style.background = '#fee2e2';
            btn.style.color = '#dc2626';
            btn.innerHTML = '<i class="bi bi-trash-fill text-[13px]" aria-hidden="true"></i>';
            armTimer = setTimeout(() => {
              armed = false;
              btn.title = 'Удалить запись';
              btn.style.background = '';
              btn.style.color = '';
              btn.innerHTML = '<i class="bi bi-trash text-[13px]" aria-hidden="true"></i>';
            }, 3000);
            return;
          }
          clearTimeout(armTimer);
          btn.disabled = true;
          btn.style.opacity = '0.5';
          const jr = await postJson('/api/portal/kid-ledger', { action: 'delete', id: Number(btn.dataset.delId) });
          if (jr.ok) {
            btn.closest('[data-kl-card]')?.remove();
            if (!klHistList.querySelector('[data-kl-card]')) {
              klHistList.hidden = true;
              if (klHistEmpty) klHistEmpty.hidden = false;
            }
            await refreshKidRow(Number(kidId));
          } else {
            btn.disabled = false;
            btn.style.opacity = '';
          }
        });
      });
    }
  } catch {
    if (klHistLoading) klHistLoading.hidden = true;
    if (klHistEmpty) { klHistEmpty.hidden = false; klHistEmpty.textContent = 'Сетевая ошибка'; }
  }
}

document.querySelectorAll('[data-history]').forEach((btn: any) => {
  btn.addEventListener('click', () => openHistoryModal(btn.dataset.kidId, btn.dataset.kidName));
});
document.getElementById('kl-hist-close')?.addEventListener('click', () => klHistClose());
document.getElementById('kl-hist-close2')?.addEventListener('click', () => klHistClose());
document.querySelector('[data-kl-backdrop]')?.addEventListener('click', () => klHistClose());
