import { roundTo, recommendedBongere, saveDays, dailyPotential, shiftFunds,
         activityRecommended, effectivePrice, perPerson, extractPct,
         DEFAULT_ECONOMY_SETTINGS } from '../../lib/economyMath';
import { postJson, postForm } from '../../lib/portalApi';
import { confirmDialog, alertDialog, haptic } from './tg';
// Реактивная подпись «выбран файл X» под label-кнопкой загрузки в обоих модалках.
  function bindFileLabel(inputId, labelId, fallback) {
    const inp = document.getElementById(inputId);
    const lbl = document.getElementById(labelId);
    if (!inp || !lbl) return;
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      lbl.textContent = f ? ('✓ ' + (f.name || 'файл выбран')) : fallback;
    });
  }
  bindFileLabel('give-file', 'give-file-label', 'Снять или выбрать файл');
  bindFileLabel('cust-file', 'cust-file-label', 'Снять или выбрать фото');

  const LS_KEY = 'aidacamp.portal.prizes.v1';        // старое хранение
  const LS_SETTINGS = 'aidacamp.portal.economy.settings.v1';
  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';

  // Settings
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}') || {}; } catch { return {}; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch {}
  }
  const set = Object.assign({
    kids: 35, days: 10, phoneMin: 10, markup: 3, round: 50, daily: 600, targetExtract: 75,
  }, loadSettings());
  const idMap = {
    'set-kids':'kids','set-days':'days','set-phone-min':'phoneMin','set-markup':'markup','set-round':'round','set-daily':'daily','set-target-extract':'targetExtract',
  };
  for (const id of Object.keys(idMap)) {
    const el = document.getElementById(id);
    if (el) el.value = String(set[idMap[id]] ?? '');
  }

  function readSettings() {
    const num = (id, min) => Math.max(min, Number(document.getElementById(id).value) || min);
    return {
      kids: num('set-kids', 1),
      days: num('set-days', 1),
      phoneMin: num('set-phone-min', 1),
      markup: num('set-markup', 1),
      round: num('set-round', 1),
      daily: Math.max(0, Number(document.getElementById('set-daily').value) || 0),
      targetExtract: Math.max(0, Math.min(100, Number(document.getElementById('set-target-extract').value) || 75)),
    };
  }
  // Tabs
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach((b) => {
        const active = b.dataset.tab === tab;
        b.classList.toggle('bg-white', active);
        b.classList.toggle('border-border', active);
        b.classList.toggle('bg-page', !active);
        b.classList.toggle('border-transparent', !active);
        b.classList.toggle('text-body-muted', !active);
      });
      document.querySelectorAll('[data-tab-pane]').forEach((p) => {
        p.hidden = p.dataset.tabPane !== tab;
      });
    });
  });

  // ── Prizes ────────────────────────────────────────
  const prizeRows = Array.from(document.querySelectorAll('[data-prize-row]'));
  let showHidden = false;

  function recalcPrizes() {
    const s = readSettings();
    const dp = dailyPotential(s);
    let active = 0, sumBongere = 0, sumRec = 0, sumOzonVisible = 0;
    prizeRows.forEach((r) => {
      const isHidden = r.dataset.hidden === '1';
      if (isHidden && !showHidden) { r.style.display = 'none'; return; }
      if (isHidden && showHidden)  { r.style.display = ''; r.style.opacity = '0.45'; }
      else { r.style.display = ''; r.style.opacity = ''; }
      if (!isHidden) active++;
      const price = Number(r.dataset.price || 0);
      const qty = Number(r.dataset.qty || 0);
      if (!isHidden) sumOzonVisible += price * qty;
      // Рекомендованная цена за 1 шт = Цена Ozon × Наценка
      const rec = recommendedBongere(price, s);
      const recCell = r.querySelector('[data-recommended]');
      if (recCell) recCell.innerHTML = fmt(rec) + ' / шт';
      // Цена игровая: либо заданная вручную (input), либо рекомендованная.
      // Если input пуст — показываем рекомендованную как placeholder.
      const inp = r.querySelector('[data-bongere-input]');
      if (inp) {
        inp.placeholder = String(rec);
        if (inp.dataset.recDefault !== String(rec)) inp.dataset.recDefault = String(rec);
      }
      const v = inp.value === '' ? null : Number(inp.value);
      // Эффективная цена = ввели → её; иначе → рекомендованная.
      const effective = (v != null && !isNaN(v)) ? v : rec;
      if (!isHidden) sumBongere += effective * qty;
      if (!isHidden) sumRec += rec * qty;
      // Копить N дней — от эффективной цены
      const targetPrice = effective;
      const days = saveDays(targetPrice, dp);
      const cell = r.querySelector('[data-save-days]');
      if (cell) {
        if (days <= 0) { cell.textContent = '—'; }
        else if (days > s.days) {
          cell.innerHTML = '<span class="text-red-600">' + days + ' дн</span><div class="text-[11px] text-body-muted">> смены</div>';
        } else {
          cell.innerHTML = days + ' <span class="text-[11px] text-body-muted">дн</span>';
        }
      }
    });
    document.getElementById('cnt-active').textContent = String(active);
    document.getElementById('sum-bongere').textContent = fmt(sumBongere);
    // KPI шапки
    const sf = shiftFunds(s);
    document.getElementById('kpi-potential').textContent = fmt(sf.dp);
    document.getElementById('kpi-daily-fund').textContent = fmt(sf.dailyFund);
    document.getElementById('kpi-per-kid').textContent = fmt(sf.perKid);
    document.getElementById('kpi-phone-equiv').textContent = sf.phoneEquiv;
    document.getElementById('kpi-total').textContent = fmt(sf.total);
    const ext = document.getElementById('kpi-target-extract'); if (ext) ext.textContent = fmt(sf.targetExtract);
    // Сводка
    const sumOzVis = document.getElementById('sum-ozon-visible'); if (sumOzVis) sumOzVis.textContent = fmt(sumOzonVisible);
    const sumRecEl = document.getElementById('sum-recommended'); if (sumRecEl) sumRecEl.textContent = fmt(sumRec);
    const sumBon2 = document.getElementById('sum-bongere-2'); if (sumBon2) sumBon2.textContent = fmt(sumBongere);
    const sumTot = document.getElementById('sum-total-money'); if (sumTot) sumTot.textContent = fmt(sf.total);
    const usedForPrizes = sumBongere || sumRec;
    const balPr = document.getElementById('sum-balance-prizes'); if (balPr) balPr.textContent = fmt(sf.total - usedForPrizes);
    const balAc = document.getElementById('sum-balance-acts'); if (balAc) balAc.textContent = fmt(sf.total - usedForPrizes);
    const avg = sumOzonVisible > 0 && sumBongere > 0 ? (sumBongere / sumOzonVisible) : null;
    const ma = document.getElementById('sum-markup-avg');
    if (ma) ma.textContent = avg != null ? '×' + avg.toFixed(2) : '×' + s.markup.toFixed(1);
    // Активности
    recalcActivities();
  }

  // KPI шапки (фонды) пересчитывается на лету, но цены в таблицах — нет.
  // Цены меняются только по явному нажатию «Пересчитать цены».
  function recalcKPIOnly() {
    const s = readSettings();
    const sf = shiftFunds(s);
    document.getElementById('kpi-potential').textContent = fmt(sf.dp);
    document.getElementById('kpi-daily-fund').textContent = fmt(sf.dailyFund);
    document.getElementById('kpi-per-kid').textContent = fmt(sf.perKid);
    document.getElementById('kpi-phone-equiv').textContent = sf.phoneEquiv;
    document.getElementById('kpi-total').textContent = fmt(sf.total);
    const ext = document.getElementById('kpi-target-extract'); if (ext) ext.textContent = fmt(sf.targetExtract);
  }

  ['set-kids','set-days','set-phone-min','set-markup','set-round','set-daily','set-target-extract'].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const s = readSettings();
      saveSettings(s);
      recalcKPIOnly();
      // Подсветим кнопку «Пересчитать», чтобы было заметно что параметры изменились
      const btn = document.getElementById('btn-recalc-prices');
      if (btn) {
        btn.classList.add('animate-pulse');
        btn.title = 'Параметры изменились — нажмите чтобы пересчитать цены';
      }
    });
  });

  const resetBtn = document.getElementById('btn-reset-issuances');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!await confirmDialog('Удалить ВСЕ выдачи призов?\n\nЭто действие необратимо. История очистится полностью.\nИспользуй только для очистки тестовых данных перед началом смены.')) return;
      if (!await confirmDialog('Точно? Это последнее предупреждение.')) return;
      resetBtn.disabled = true;
      try {
        const j = await postJson('/api/portal/prize-ops', { action: 'reset_all_issuances' });
        if (!j.ok) throw new Error(j.error || 'error');
        await alertDialog('Удалено выдач: ' + j.deleted);
        location.reload();
      } catch (e) {
        await alertDialog('Ошибка: ' + (e && e.message ? e.message : e));
        resetBtn.disabled = false;
      }
    });
  }
  document.getElementById('btn-show-hidden').addEventListener('click', (ev) => {
    showHidden = !showHidden;
    ev.currentTarget.innerHTML = showHidden
      ? '<i class="bi bi-eye-slash"></i> Скрыть скрытые'
      : '<i class="bi bi-eye"></i> Показать скрытые';
    recalcPrizes();
  });

  // Save prize state to server
  async function savePrizeState(id, patch) {
    try {
      const result = await postJson('/api/portal/economy', { action: 'set_prize', prize_id: id, ...patch });
      if (!result.ok) throw new Error(result.error || 'error');
    } catch (e) { console.error('save prize state failed', e); }
  }

  // Bongere input — debounced save
  prizeRows.forEach((r) => {
    const id = r.dataset.id;
    const inp = r.querySelector('[data-bongere-input]');
    let t;
    const saveFlag = r.querySelector('[data-save-flag]');
    inp.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const v = inp.value === '' ? null : Number(inp.value);
        r.dataset.bongere = v == null ? '' : String(v);
        try {
          await savePrizeState(id, { bongere_price: v });
          haptic('success');
          if (saveFlag) {
            saveFlag.style.opacity = '1';
            setTimeout(() => { saveFlag.style.opacity = '0'; }, 1200);
          }
        } catch (e) { /* error already logged */ }
        recalcPrizes();
      }, 350);
    });
    // Сбросить к рекомендованной → удаляем ручную цену из БД
    const resetBtn = r.querySelector('[data-reset-price]');
    if (resetBtn) resetBtn.addEventListener('click', async () => {
      inp.value = '';
      r.dataset.bongere = '';
      await savePrizeState(id, { bongere_price: null });
      recalcPrizes();
    });
    // Hide / show
    r.querySelector('[data-toggle-hidden]').addEventListener('click', async () => {
      const wasHidden = r.dataset.hidden === '1';
      if (!wasHidden && !await confirmDialog('Скрыть эту позицию? Она пропадёт из активного списка, можно вернуть кнопкой «Показать скрытые».')) return;
      r.dataset.hidden = wasHidden ? '0' : '1';
      await savePrizeState(id, { hidden: !wasHidden });
      // Refresh icon
      r.querySelector('[data-toggle-hidden] i').className = wasHidden ? 'bi bi-x-lg' : 'bi bi-eye-slash';
      recalcPrizes();
    });
  });

  // Apply markup to all visible
  document.getElementById('btn-apply-markup').addEventListener('click', async () => {
    const s = readSettings();
    if (!await confirmDialog('Записать «Цена × ' + s.markup + ', округление до ' + s.round + ' ₽» в поле «Цена, игр. ₽» для всех видимых позиций?')) return;
    for (const r of prizeRows) {
      if (r.dataset.hidden === '1') continue;
      const price = Number(r.dataset.price || 0);
      const rec = roundTo(price * s.markup, s.round);
      r.querySelector('[data-bongere-input]').value = rec;
      r.dataset.bongere = String(rec);
      await savePrizeState(r.dataset.id, { bongere_price: rec });
    }
    recalcPrizes();
  });

  // Import from localStorage
  document.getElementById('btn-import-local').addEventListener('click', async () => {
    let local;
    try { local = JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { local = {}; }
    const deleted = Array.isArray(local.deleted) ? local.deleted : [];
    const bongere = local.bongere && typeof local.bongere === 'object' ? local.bongere : {};
    const photos  = local.photos  && typeof local.photos  === 'object' ? local.photos  : {};
    const cnt = deleted.length + Object.keys(bongere).length + Object.keys(photos).length;
    if (cnt === 0) { await alertDialog('В localStorage этого браузера ничего нет.'); return; }
    if (!await confirmDialog('Загрузить на сервер: ' + deleted.length + ' скрытых, ' + Object.keys(bongere).length + ' цен, ' + Object.keys(photos).length + ' фото?')) return;
    const jr = await postJson('/api/portal/economy', { action: 'import_localstorage', deleted, bongere, photos });
    if (jr.ok) {
      await alertDialog('Загружено: ' + jr.imported + ' записей. Перезагрузи страницу — увидишь актуальное состояние.');
    } else {
      await alertDialog('Ошибка: ' + (jr.error || 'unknown'));
    }
  });

  // ── Activities ────────────────────────────────────
  const actRows = Array.from(document.querySelectorAll('[data-activity-row]'));

  // Сохранение Цены вручную в активности
  async function saveActivityCustom(id, val) {
    try {
      const result = await postJson('/api/portal/economy', { action: 'set_activity_custom_price', id, custom_price: val });
      return result.ok;
    } catch { return false; }
  }
  actRows.forEach((r) => {
    const id = Number(r.dataset.id);
    const inp = r.querySelector('[data-custom-price-input]');
    const flag = r.querySelector('[data-act-save-flag]');
    let t;
    if (inp) inp.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const v = inp.value === '' ? null : Number(inp.value);
        r.dataset.customPrice = v == null ? '' : String(v);
        const ok = await saveActivityCustom(id, v);
        if (ok && flag) {
          flag.style.opacity = '1';
          setTimeout(() => { flag.style.opacity = '0'; }, 1200);
        }
        recalcActivities();
      }, 350);
    });
    const reset = r.querySelector('[data-reset-custom-price]');
    if (reset) reset.addEventListener('click', async () => {
      if (inp) inp.value = '';
      r.dataset.customPrice = '';
      await saveActivityCustom(id, null);
      recalcActivities();
    });
  });
  function recalcActivities() {
    const s = readSettings();
    const sf = shiftFunds(s);
    actRows.forEach((r) => {
      const baseRaw = r.dataset.bongere;
      const partRaw = r.dataset.participants;
      const tdRaw = r.dataset.targetDays;
      const tsRaw = r.dataset.targetShare;
      // participants: пусто => вся смена N
      const participants = (partRaw === '' || partRaw == null) ? s.kids : Number(partRaw);
      const targetDays = tdRaw === '' || tdRaw == null ? null : Number(tdRaw);
      const targetShare = tsRaw === '' || tsRaw == null ? null : Number(tsRaw);
      const basePrice = (baseRaw === '' || baseRaw == null) ? null : Number(baseRaw);

      const { value: recommended, formula: formulaText } = activityRecommended(
        { participants, dp: sf.dp, targetDays, targetShare, basePrice }, s.round
      );

      // Цена вручную из input или из data-атрибута (был загружен с сервера)
      const customInp = r.querySelector('[data-custom-price-input]');
      const customRaw = customInp ? customInp.value : (r.dataset.customPrice || '');
      const custom = customRaw === '' || customRaw == null ? null : Number(customRaw);

      // Итоговая цена: custom если задан, иначе recommended
      const price = effectivePrice(custom != null && !isNaN(custom) ? custom : null, recommended);

      // Placeholder для input — показываем recommended
      if (customInp) customInp.placeholder = recommended > 0 ? String(recommended) : '';

      r.querySelector('[data-formula]').textContent = formulaText;
      const recCell = r.querySelector('[data-recommended-price]');
      if (recCell) recCell.textContent = recommended > 0 ? fmt(recommended) : '—';
      r.querySelector('[data-total-price]').textContent = price > 0
        ? fmt(price) + (custom != null ? '' : '')
        : '—';
      const pp = perPerson(price, participants, s.round);
      r.querySelector('[data-per-person]').textContent = price <= 0 ? '—' :
        (participants > 1 ? fmt(pp) + ' × ' + participants : fmt(pp));
      const extractPctEl = r.querySelector('[data-extract-pct]');
      if (extractPctEl) {
        const pct = extractPct(price, sf.total);
        extractPctEl.textContent = pct > 0 ? pct.toFixed(1) + '%' : '—';
      }
    });
  }

  // Activity dialog
  const dlg = document.getElementById('activity-dialog');
  function openDialog(act) {
    document.getElementById('act-id').value = act?.id || '';
    document.getElementById('act-name').value = act?.name || '';
    document.getElementById('act-desc').value = act?.description || '';
    document.getElementById('act-cat').value = act?.category || 'fun';
    document.getElementById('act-price').value = act?.base_price ?? '';
    document.getElementById('act-participants').value = act?.participants_hint ?? '';
    document.getElementById('act-target-days').value = act?.target_days ?? '';
    document.getElementById('act-target-share').value = act?.target_share_pct ?? '';
    document.getElementById('act-repeat').value = act?.repeat_multiplier ?? '';
    dlg.showModal();
  }
  document.getElementById('btn-add-activity').addEventListener('click', () => openDialog(null));
  document.getElementById('act-cancel').addEventListener('click', () => dlg.close());

  document.getElementById('act-save').addEventListener('click', async () => {
    const id = document.getElementById('act-id').value;
    const body = {
      action: 'upsert_activity',
      id: id ? Number(id) : undefined,
      name: document.getElementById('act-name').value.trim(),
      description: document.getElementById('act-desc').value.trim() || null,
      category: document.getElementById('act-cat').value,
      base_price: document.getElementById('act-price').value || null,
      participants_hint: document.getElementById('act-participants').value || null,
      target_days: document.getElementById('act-target-days').value || null,
      target_share_pct: document.getElementById('act-target-share').value || null,
      repeat_multiplier: document.getElementById('act-repeat').value || null,
    };
    if (!body.name) { await alertDialog('Введите название'); return; }
    const jr = await postJson('/api/portal/economy', body);
    if (jr.ok) { dlg.close(); location.reload(); }
    else await alertDialog('Ошибка: ' + (jr.error || 'unknown'));
  });

  document.querySelectorAll('[data-edit-activity]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = btn.closest('[data-activity-row]');
      openDialog({
        id: r.dataset.id,
        name: r.querySelector('td .font-medium').textContent,
        description: r.querySelector('td .text-body-muted')?.textContent || '',
        category: '',
        base_price: r.dataset.bongere === '' ? null : Number(r.dataset.bongere),
        participants_hint: r.dataset.participants === '' ? null : Number(r.dataset.participants),
        target_days: r.dataset.targetDays === '' ? null : Number(r.dataset.targetDays),
        target_share_pct: r.dataset.targetShare === '' ? null : Number(r.dataset.targetShare),
        repeat_multiplier: r.dataset.repeat === '' ? null : Number(r.dataset.repeat),
      });
    });
  });
  document.querySelectorAll('[data-delete-activity]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!await confirmDialog('Удалить эту активность?')) return;
      const id = btn.dataset.id;
      const jr = await postJson('/api/portal/economy', { action: 'delete_activity', id: Number(id) });
      if (jr.ok) location.reload(); else await alertDialog('Ошибка: ' + (jr.error || 'unknown'));
    });
  });

  // ── Issue prize modal ──
  const giveDlg = document.getElementById('give-dialog');
  const giveCancel = document.getElementById('give-cancel');
  const giveSave = document.getElementById('give-save');
  const giveStatus = document.getElementById('give-status');
  document.querySelectorAll('[data-give]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('give-prize-id').value = btn.dataset.prizeId;
      document.getElementById('give-prize-name-hidden').value = btn.dataset.prizeName;
      document.getElementById('give-prize-name').textContent = btn.dataset.prizeName;
      document.getElementById('give-kid').value = '';
      document.getElementById('give-price').value = '';
      document.getElementById('give-file').value = '';
      document.getElementById('give-note').value = '';
      giveStatus.textContent = '';
      giveDlg.showModal();
    });
  });
  if (giveCancel) giveCancel.addEventListener('click', () => giveDlg.close());
  if (giveSave) giveSave.addEventListener('click', async () => {
    const kidSel = document.getElementById('give-kid');
    const kidId = kidSel.value;
    if (!kidId) { giveStatus.textContent = 'Выбери ребёнка'; return; }
    const file = document.getElementById('give-file').files[0];
    if (!file) { giveStatus.textContent = 'Прикрепи фото или видео'; return; }
    const kidName = kidSel.options[kidSel.selectedIndex]?.dataset?.name || '';
    const fd = new FormData();
    fd.append('action', 'issue');
    fd.append('prize_id', document.getElementById('give-prize-id').value);
    fd.append('prize_name', document.getElementById('give-prize-name-hidden').value);
    fd.append('kid_id', kidId);
    fd.append('kid_name', kidName);
    const price = document.getElementById('give-price').value;
    if (price) fd.append('bongere_price', price);
    const note = document.getElementById('give-note').value;
    if (note) fd.append('note', note);
    fd.append('file', file);
    giveStatus.textContent = 'Загружаем…';
    try {
      const jr = await postForm('/api/portal/prize-ops', fd);
      if (jr.ok) {
        haptic('success');
        giveStatus.textContent = '✓ выдано';
        setTimeout(() => { giveDlg.close(); location.reload(); }, 600);
      } else giveStatus.textContent = 'Ошибка: ' + (jr.error || 'unknown');
    } catch (e) { giveStatus.textContent = 'Сетевая ошибка'; }
  });

  // ── Custom prize modal ──
  const custDlg = document.getElementById('custom-dialog');
  const custCancel = document.getElementById('cust-cancel');
  const custSave = document.getElementById('cust-save');
  const custStatus = document.getElementById('cust-status');
  // ── Пересчитать цены по текущим параметрам (Призы + Активности разом) ──
  document.getElementById('btn-recalc-prices')?.addEventListener('click', () => {
    recalcPrizes();
    recalcActivities();
    const btn = document.getElementById('btn-recalc-prices');
    if (btn) { btn.classList.remove('animate-pulse'); btn.title = 'Цены актуальны на текущие параметры'; }
  });

  // ── Кнопки печати: только текущая вкладка ──
  document.getElementById('btn-print-prizes')?.addEventListener('click', () => {
    document.body.classList.add('printing-prizes');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-prizes'), 100);
  });
  document.getElementById('btn-print-activities')?.addEventListener('click', () => {
    document.body.classList.add('printing-activities');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-activities'), 100);
  });

  document.getElementById('btn-add-custom')?.addEventListener('click', () => {
    ['cust-name','cust-desc','cust-cat','cust-price','cust-file'].forEach((id) => {
      const el = document.getElementById(id); if (el) el.value = id === 'cust-qty' ? 1 : '';
    });
    document.getElementById('cust-qty').value = 1;
    custStatus.textContent = '';
    custDlg.showModal();
  });
  if (custCancel) custCancel.addEventListener('click', () => custDlg.close());
  if (custSave) custSave.addEventListener('click', async () => {
    const name = document.getElementById('cust-name').value.trim();
    if (!name) { custStatus.textContent = 'Название обязательно'; return; }
    const fd = new FormData();
    fd.append('action', 'create_custom');
    fd.append('name', name);
    fd.append('description', document.getElementById('cust-desc').value);
    fd.append('category', document.getElementById('cust-cat').value);
    const price = document.getElementById('cust-price').value;
    if (price) fd.append('ozon_price', price);
    fd.append('qty', document.getElementById('cust-qty').value || '1');
    const file = document.getElementById('cust-file').files[0];
    if (file) fd.append('file', file);
    custStatus.textContent = 'Сохраняем…';
    try {
      const jr = await postForm('/api/portal/prize-ops', fd);
      if (jr.ok) {
        custStatus.textContent = '✓ добавлен';
        setTimeout(() => { custDlg.close(); location.reload(); }, 600);
      } else custStatus.textContent = 'Ошибка: ' + (jr.error || 'unknown');
    } catch (e) { custStatus.textContent = 'Сетевая ошибка'; }
  });

  // Archive custom prize
  document.querySelectorAll('[data-archive-custom]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.customId);
      if (!await confirmDialog('Удалить этот кастомный приз? (записи о выдачах останутся в журнале)')) return;
      try {
        const jr = await postJson('/api/portal/prize-ops', { action: 'archive_custom', id });
        if (jr.ok) location.reload(); else await alertDialog('Ошибка: ' + (jr.error || ''));
      } catch (e) { await alertDialog('Сетевая ошибка'); }
    });
  });

  // First render
  recalcPrizes();
