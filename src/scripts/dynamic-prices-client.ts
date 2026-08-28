/**
 * Клиентская логика динамических цен (ранее is:inline в DynamicPrices.astro).
 * Читает конфиг из #aida-prices-config (JSON, инжектирован сервером),
 * пересчитывает цены на текущую дату и обновляет DOM-атрибуты.
 */

interface Stage {
  from: string;
  price: number;
  increment?: number;
}

interface ShiftConfig {
  stages: Stage[];
}

const el = document.getElementById('aida-prices-config');
const cfg: Record<string, ShiftConfig> = el ? JSON.parse(el.textContent || '{}') : {};

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' ₽'; }

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

function daysDiff(a: string, b: string) {
  return Math.floor((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

function calcPrice(c: ShiftConfig, today: string): number | null {
  const stages = c.stages;
  if (!stages?.length) return null;
  let activeIdx = -1;
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].from <= today) activeIdx = i;
  }
  if (activeIdx === -1) return null;
  const s = stages[activeIdx];
  if (s.increment) {
    const nextFrom = stages[activeIdx + 1]?.from ?? today;
    const capStr = nextFrom <= today ? nextFrom : today;
    return s.price + daysDiff(s.from, capStr) * s.increment;
  }
  return s.price;
}

function calcNextDay(c: ShiftConfig, today: string): number | null {
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const tom = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const next = calcPrice(c, tom);
  const cur = calcPrice(c, today);
  return (next && cur && next > cur) ? next : null;
}

function fmtDateRu(iso: string) {
  const p = iso.split('-');
  return parseInt(p[2], 10) + ' ' + MONTHS_RU[parseInt(p[1], 10) - 1];
}

function nextStage(c: ShiftConfig, today: string): Stage | null {
  return c.stages?.find(s => s.from > today) ?? null;
}

function applyPrices() {
  const today = todayStr();
  for (const id of Object.keys(cfg)) {
    const c = cfg[id];
    const cur = calcPrice(c, today);
    if (cur === null) continue;
    const nextDay = calcNextDay(c, today);

    document.querySelectorAll<HTMLElement>(`[data-dynamic-price="${id}"]`)
      .forEach(el => { el.textContent = fmt(cur); });

    if (nextDay !== null) {
      const msg = 'Завтра будет ' + nextDay.toLocaleString('ru-RU') + ' ₽';
      document.querySelectorAll<HTMLElement>(`[data-price-urgency="${id}"]`)
        .forEach(el => { el.textContent = msg; el.classList.remove('hidden'); });
    }

    const ns = nextStage(c, today);
    const stageEls = document.querySelectorAll<HTMLElement>(`[data-price-stage="${id}"]`);
    if (ns?.increment && ns.price > cur) {
      const smsg = 'с ' + fmtDateRu(ns.from) + ': ' + ns.price.toLocaleString('ru-RU') + ' ₽';
      stageEls.forEach(el => { el.textContent = smsg; el.classList.remove('hidden'); });
    } else {
      stageEls.forEach(el => el.classList.add('hidden'));
    }

    document.querySelectorAll<HTMLElement>(`[data-vychet-link="${id}"]`).forEach(el => {
      const card = el.closest<HTMLElement>('[data-shift-days]');
      const days = parseInt(card?.getAttribute('data-shift-days') || '0', 10);
      if (!days) return;
      const vychet = Math.round((cur - 3800 * days) * 0.13);
      if (vychet > 0) el.textContent = vychet.toLocaleString('ru-RU') + ' ₽ налогового вычета';
    });

    document.querySelectorAll<HTMLElement>(`[data-option-price="${id}"]`).forEach(el => {
      el.setAttribute('data-price', String(cur));
      const label = el.getAttribute('data-option-label') || '';
      const popular = el.getAttribute('data-option-popular') === 'true';
      el.textContent = label + ' — ' + cur.toLocaleString('ru-RU') + ' ₽' + (popular ? ' · популярная' : '');
    });
  }
}

document.addEventListener('astro:page-load', applyPrices);
applyPrices();
