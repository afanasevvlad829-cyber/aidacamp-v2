const API = 'https://aidacamp.ru/crm-api';
let allContacts = [], activeId = null, groupsCache = {};

const GROUP_META = {
  SAFE_INCOMING:    { label:'🟢 Тёплые — писали сами',    cls:'g-safe'  },
  WARM_OUTGOING:    { label:'🟡 Работали мы',              cls:'g-warm'  },
  LAST_CHANCE:      { label:'🔴 Последний шанс',           cls:'g-risky', warn:true },
  RISKY_FRESH_LEAD: { label:'⚡ Новые лиды',              cls:'g-risky' },
};
const FLAG_ICONS = {
  hot:'bi-thermometer-high', price:'bi-tag', killer:'bi-x-octagon',
  dist:'bi-geo-alt', competitor:'bi-building', camp:'bi-tree',
  lost:'bi-emoji-frown', sched:'bi-calendar-x',
};
const ARCH_ICONS = {
  investor:'bi-graph-up-arrow', problem_solver:'bi-tools',
  social:'bi-people', economist:'bi-cash-coin',
};

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadContacts() {
  document.getElementById('scroll-area').innerHTML = '<div class="loader">⏳</div>';
  try {
    const res = await fetch(`${API}/contacts`);
    const data = await res.json();
    groupsCache = data.groups;
    allContacts = Object.values(data.groups).flat();
    document.getElementById('total-badge').textContent = data.total;
    renderGroups(data.groups);
  } catch(e) {
    document.getElementById('scroll-area').innerHTML =
      `<div class="empty"><i class="bi bi-wifi-off" style="font-size:28px;display:block;margin-bottom:8px"></i>API недоступен</div>`;
  }
}

// ── Render groups ─────────────────────────────────────────────────────────────
function renderGroups(groups, filter='') {
  const area = document.getElementById('scroll-area');
  area.innerHTML = '';
  const lf = filter.toLowerCase();
  for (const [key, meta] of Object.entries(GROUP_META)) {
    const contacts = (groups[key]||[]).filter(c =>
      !filter || c.name.toLowerCase().includes(lf) || c.phone.includes(lf) || c.phone_display.includes(lf));
    if (!contacts.length) continue;
    const wrap = document.createElement('div');
    wrap.className = `group ${meta.cls}`;
    const hdr = document.createElement('div');
    hdr.className = 'ghdr open';
    const warnHtml = meta.warn
      ? `<span style="font-size:10px;font-weight:400;color:#c0392b;margin-left:4px">4–5 неотвеченных сообщений · 1 попытка, затем заморозка</span>`
      : '';
    hdr.innerHTML = `${meta.label}${warnHtml}
      <span class="cnt">${contacts.length}</span>
      <i class="bi bi-chevron-right chev"></i>`;
    hdr.onclick = () => { hdr.classList.toggle('open'); body.classList.toggle('open'); };
    const body = document.createElement('div');
    body.className = 'gbody open';
    contacts.forEach(c => body.appendChild(buildCard(c)));
    wrap.appendChild(hdr); wrap.appendChild(body);
    area.appendChild(wrap);
  }
  if (!area.children.length) area.innerHTML = '<div class="empty">Ничего не найдено</div>';
}

// ── Activity dot ──────────────────────────────────────────────────────────────
function actDot(act) {
  return `<span class="act-dot tip" style="background:${act.color}">`+
    `<span class="tipbox"><strong>${act.label}</strong>${act.desc}</span></span>`;
}

// ── Arch badge (compact) ──────────────────────────────────────────────────────
function archBadge(arch, compact=false) {
  const p = arch.primary;
  const icon = ARCH_ICONS[p.key] || 'bi-person';
  return `<span class="arch-badge arch-${p.key} tip">`+
    `<i class="bi ${icon}"></i>${compact ? '' : p.label}`+
    `<span class="tipbox"><strong>${p.label}</strong>${p.approach}</span></span>`;
}

// ── Build card ────────────────────────────────────────────────────────────────
function scoreClass(s) { return s>=70?'high':s>=40?'mid':'low'; }

function buildCard(c) {
  const div = document.createElement('div');
  div.className = 'card'+(c.id===activeId?' active':'');
  div.dataset.id = c.id;
  const act = c.activity;

  const allFlags = c.active_flags||[];
  const shownFlags = allFlags.slice(0,2);
  const hiddenCount = allFlags.length - shownFlags.length + (c.is_tg_only?1:0);
  const flagsHtml = shownFlags.map(f=>
    `<span class="flag-chip ${f.key} tip"><i class="bi ${FLAG_ICONS[f.key]||'bi-flag'}"></i>${f.title}`+
    `<span class="tipbox"><strong>${f.title}</strong>${f.desc}</span></span>`).join('');
  const moreHtml = hiddenCount>0
    ? `<span class="flag-chip tip" style="background:#f2f2f7;color:#636366;border:1px solid #d1d1d6">+${hiddenCount}`+
      `<span class="tipbox"><strong>Ещё флагов: ${hiddenCount}</strong>Нажмите на контакт чтобы увидеть все</span></span>`
    : '';

  const rx = c.reaction || {};
  let rxHtml = '';
  if (rx.in_total > 0) {
    rxHtml = `<span class="rx-chip rx-yes tip"><i class="bi bi-reply-fill"></i>${rx.in_total}`+
      `<span class="tipbox"><strong>Отвечал</strong>${rx.quality}<br>${rx.recency}</span></span>`;
  } else {
    rxHtml = `<span class="rx-chip rx-no tip"><i class="bi bi-slash-circle"></i>нет ответов`+
      `<span class="tipbox"><strong>Не отвечал</strong>${rx.quality||'Клиент ни разу не ответил'}<br>${rx.channels||''}</span></span>`;
  }

  // Тихушник badge
  const dripBadge = c.drip_steps
    ? `<span class="rx-chip tip" style="background:#fff8e1;color:#8a6200;border:1px solid #ffe08280"><i class="bi bi-send-check"></i>капельная`+
      `<span class="tipbox"><strong>Тихушник</strong>Никогда не отвечал. Рекомендуем 3-шаговую серию.</span></span>`
    : '';

  div.innerHTML = `
    <div class="card-info">
      <div class="card-name">
        ${actDot(act)} <span class="card-name-text">${c.name}</span>
      </div>
      <div class="card-sub">
        <span><i class="bi bi-telephone" style="font-size:10px"></i>${c.is_tg_only?'TG':c.phone_display}</span>
        ${act.level!=='outbound'&&+c.days_since_in<9999?`<span><i class="bi bi-clock" style="font-size:10px"></i>${c.days_since_in}д</span>`:''}
        ${rxHtml}${dripBadge}
        ${flagsHtml}${moreHtml}
      </div>
    </div>
    <div class="score-pill ${scoreClass(c.score)} tip">${c.score}
      <span class="tipbox score-tip"><strong>Балл (0–100)</strong>${(c.score_breakdown||[]).join('<br>')}</span>
    </div>`;
  div.onclick = () => openDetail(c);
  return div;
}

// ── Open detail ───────────────────────────────────────────────────────────────
function openDetail(c) {
  activeId = c.id;
  convData = null;
  document.querySelectorAll('.card').forEach(el=>el.classList.toggle('active',el.dataset.id===c.id));

  document.getElementById('d-name').textContent = c.name;
  const act = c.activity;
  const meta = [];
  if (!c.is_tg_only) meta.push(`<span><i class="bi bi-telephone"></i>${c.phone_display}</span>`);
  meta.push(`<span style="display:inline-flex;align-items:center;gap:4px">`+
    `<span class="act-dot tip" style="background:${act.color}">`+
    `<span class="tipbox"><strong>${act.label}</strong>${act.desc}</span></span>`+
    `<b>${act.label}</b></span>`);
  if (c.days_since_in&&+c.days_since_in<9999)
    meta.push(`<span><i class="bi bi-clock"></i>Писали ${c.days_since_in} дн. назад</span>`);
  document.getElementById('d-meta').innerHTML = meta.join('');

  const flagsRow = document.getElementById('d-flags');
  const allFlags = (c.active_flags||[]).map(f=>
    `<span class="flag-chip ${f.key} tip" style="font-size:11px;padding:3px 7px">`+
    `<i class="bi ${FLAG_ICONS[f.key]||'bi-flag'}"></i><strong>${f.title}</strong>`+
    `<span class="tipbox"><strong>${f.title}</strong>${f.desc}</span></span>`).join('');
  const tgFlag = c.is_tg_only?
    `<span class="flag-chip tg-only" style="font-size:11px;padding:3px 7px"><i class="bi bi-telegram"></i>только TG</span>`:'';
  if (allFlags||tgFlag) { flagsRow.style.display='flex'; flagsRow.innerHTML=allFlags+tgFlag; }
  else flagsRow.style.display='none';

  const intRow = document.getElementById('d-interactions');
  if ((c.interactions||[]).length) {
    intRow.style.display='flex';
    intRow.innerHTML = c.interactions.map(t=>`<span><i class="bi bi-chat-dots"></i>${t}</span>`).join('');
  } else intRow.style.display='none';

  renderArchetypeSection(c);
  renderManagerNote(c);
  renderDripOrMessage(c);

  const commWrap = document.getElementById('d-comment');
  if (c.last_comment) {
    document.getElementById('d-comment-text').textContent = c.last_comment;
    commWrap.style.display='block';
  } else commWrap.style.display='none';

  document.getElementById('d-crm-btn').onclick = () =>
    chrome.tabs.query({active:true,currentWindow:true},tabs=>{
      if(tabs[0]) chrome.tabs.update(tabs[0].id,{url:c.crm_url});
    });

  loadManagerNote(c.id);
  buildConvPeekBtns(c);
  buildChannelBtns(c);
  coachReset();
  document.getElementById('detail').classList.add('open');
  document.getElementById('detail-backdrop').classList.add('open');
}

function renderArchetypeSection(c) {
  let archRow = document.getElementById('d-arch-row');
  if (!archRow) {
    archRow = document.createElement('div');
    archRow.id = 'd-arch-row';
    archRow.style.cssText = 'padding:6px 12px;border-bottom:1px solid #f2f2f7;display:flex;flex-wrap:wrap;gap:6px;align-items:center';
    document.getElementById('d-flags').after(archRow);
  }
  const p = c.archetype.primary;
  const s = c.archetype.secondary;
  const pi = ARCH_ICONS[p.key]||'bi-person';
  let html = `<span style="font-size:10px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:.4px">Архетип:</span>`;
  html += `<span class="arch-badge arch-${p.key} tip"><i class="bi ${pi}"></i>${p.label}`+
    `<span class="tipbox"><strong>${p.label}</strong>${p.approach}</span></span>`;
  if (s) {
    const si = ARCH_ICONS[s.key]||'bi-person';
    html += `<span class="arch-badge arch-${s.key} arch-secondary tip"><i class="bi ${si}"></i>${s.label}`+
      `<span class="tipbox"><strong>${s.label} (вторичный)</strong>${s.approach}</span></span>`;
  }
  archRow.innerHTML = html;
}

function renderManagerNote(c) {
  let noteEl = document.getElementById('d-mgr-note');
  if (!noteEl) {
    noteEl = document.createElement('div');
    noteEl.id = 'd-mgr-note';
    noteEl.className = 'mgr-note';
    document.getElementById('d-comment').before(noteEl);
  }
  const ctx = c.context || {};
  const rx  = c.reaction || {};

  // ── Build concise narrative summary ──────────────────────────────────────
  const parts = [];

  // When did they first appear + date range
  if (ctx.date_range) {
    const yr = ctx.date_range.match(/\d{4}/);
    parts.push(`Клиент с ${yr ? yr[0] + ' г.' : ctx.date_range}`);
  }

  // How many contacts / responses
  if (ctx.msg_count) {
    const total = ctx.msg_count;
    const inCnt = ctx.in_count || 0;
    if (inCnt === 0) {
      parts.push(`${total} сообщений — ни разу не ответил`);
    } else if (inCnt === 1) {
      parts.push(`${total} сообщений, ответил один раз`);
    } else {
      parts.push(`${total} сообщений, ${inCnt} ответов`);
    }
  } else if (rx.in_total > 0) {
    parts.push(`Отвечал ${rx.in_total} раз`);
  } else {
    parts.push('Ни разу не ответил');
  }

  // Unanswered streak
  const ua = ctx.unanswered_count || 0;
  if (ua >= 4) parts.push(`последние ${ua} наших сообщений без ответа`);
  else if (ua > 0) parts.push(`последние ${ua} без ответа`);

  // Tone / mood
  const toneMap = {
    warm:    '🎯 проявлял интерес',
    neutral: '🤔 реагировал нейтрально',
    cold:    '⚠️ отвечал холодно',
    silent:  '🤐 молчит',
    hostile: '🚫 был резким',
  };
  if (ctx.tone && toneMap[ctx.tone]) parts.push(toneMap[ctx.tone]);

  // Key signals from quotes
  const q = ctx.quotes || {};
  const signals = [];
  if ((q.cancel    ||[]).length) signals.push('упоминал отмену');
  if ((q.price     ||[]).length) signals.push('говорил о цене');
  if ((q.hesitation||[]).length) signals.push('были сомнения');
  if ((q.interest  ||[]).length) signals.push('был интерес');
  if (signals.length) parts.push(signals.join(', '));

  // Last client message date
  if (ctx.last_client_date && !parts.some(p => p.includes('не ответил'))) {
    parts.push(`последнее сообщение клиента: ${ctx.last_client_date}`);
  }

  const summary = parts.length ? parts.join(' · ') : (rx.quality || 'Нет данных о переписке');

  // ── Quotes block (compact) ────────────────────────────────────────────────
  const allQuotes = [
    ...(q.cancel    ||[]).map(t=>`<span style="color:#c0392b">❌</span> ${escHtml(t)}`),
    ...(q.price     ||[]).map(t=>`<span style="color:#856404">💰</span> ${escHtml(t)}`),
    ...(q.hesitation||[]).map(t=>`<span style="color:#636366">🤔</span> ${escHtml(t)}`),
    ...(q.interest  ||[]).map(t=>`<span style="color:#1a7a3c">🎯</span> ${escHtml(t)}`),
  ].slice(0, 3); // show max 3 quotes

  const quotesHtml = allQuotes.length
    ? `<div style="margin-top:7px;padding-top:6px;border-top:1px solid #dde6f5;display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:#1d1d1f;line-height:1.45">
        ${allQuotes.map(q=>`<div>${q}</div>`).join('')}
       </div>`
    : '';

  const toneColor = {warm:'#30d158',neutral:'#ff9f0a',cold:'#ff3b30',silent:'#8e8e93',hostile:'#ff3b30'}[ctx.tone]||'#007aff';

  noteEl.innerHTML = `
    <div class="mgr-label"><i class="bi bi-person-gear"></i>Заметка менеджеру</div>
    <div style="font-size:11.5px;line-height:1.6;color:#1d1d1f;border-left:3px solid ${toneColor};padding-left:8px">
      ${escHtml(summary)}
    </div>
    ${quotesHtml}
    <div style="margin-top:7px;font-size:11px;color:#636366">
      <i class="bi bi-arrow-right-circle" style="color:#007aff"></i>
      <strong style="color:#007aff"> Как говорить:</strong> ${c.archetype.primary.approach}
    </div>`;
}

// ── Drip / single message renderer ───────────────────────────────────────────
function renderDripOrMessage(c) {
  const msgWrap = document.querySelector('.msg-wrap');

  // Clean up any previous drip UI
  const oldTabs = document.getElementById('d-drip-tabs');
  if (oldTabs) oldTabs.remove();
  msgWrap.querySelectorAll('.drip-label').forEach(el => el.remove());

  if (c.drip_steps && c.drip_steps.length) {
    const label = document.createElement('div');
    label.className = 'sec-label drip-label';
    label.style.cssText = 'margin-bottom:6px;color:#8a6200';
    label.innerHTML = '<i class="bi bi-send-check" style="color:#ff9f0a"></i> Тихушник · выберите шаг серии';
    msgWrap.insertBefore(label, msgWrap.firstChild);

    const tabBar = document.createElement('div');
    tabBar.id = 'd-drip-tabs';
    tabBar.style.cssText = 'display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap';

    c.drip_steps.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.textContent = s.label;
      btn.style.cssText = `flex:1;border:1.5px solid ${i===0?'#ff9f0a':'#d1d1d6'};
        background:${i===0?'#fff8e1':'#f2f2f7'};
        color:${i===0?'#8a6200':'#636366'};border-radius:8px;padding:5px 6px;
        cursor:pointer;font-size:11px;font-weight:${i===0?'700':'500'};transition:all .15s`;
      btn.onclick = () => {
        document.getElementById('d-message').textContent = s.message;
        document.getElementById('d-why').textContent = s.why;
        tabBar.querySelectorAll('button').forEach((b, j) => {
          b.style.borderColor = j===i ? '#ff9f0a' : '#d1d1d6';
          b.style.background  = j===i ? '#fff8e1' : '#f2f2f7';
          b.style.color       = j===i ? '#8a6200' : '#636366';
          b.style.fontWeight  = j===i ? '700'     : '500';
        });
        buildChannelBtns(c);
      };
      tabBar.appendChild(btn);
    });

    msgWrap.insertBefore(tabBar, msgWrap.children[1]);
    document.getElementById('d-message').textContent = c.drip_steps[0].message;
    document.getElementById('d-why').textContent = c.drip_steps[0].why;
  } else {
    document.getElementById('d-message').textContent = c.message;
    document.getElementById('d-why').textContent = c.why;
  }
}

// ── Channel buttons ───────────────────────────────────────────────────────────
function buildChannelBtns(c) {
  const box = document.getElementById('d-channels');
  box.innerHTML = '';
  const msg = document.getElementById('d-message').textContent;
  const pref = c.channels.preferred;
  const hasPhone = c.phone && !c.is_tg_only;

  // Normalize phone to 11 digits (Russian +7...)
  let phoneE164 = (c.phone || '').replace(/\D/g, '');
  if (phoneE164.length === 10) phoneE164 = '7' + phoneE164;

  // WA — show if has phone (anyone can be on WA)
  if (hasPhone) {
    const wa = document.createElement('button');
    const isPrim = pref==='wa' || (!c.channels.tg && !c.is_tg_only);
    wa.className = `ch-btn ${isPrim ? 'wa-primary' : 'wa-secondary'}`;
    const waLabel = c.channels.wa_count
      ? `WhatsApp <span style="opacity:.75;font-size:11px">(${c.channels.wa_count})</span>`
      : 'WhatsApp';
    wa.innerHTML = `<i class="bi bi-whatsapp"></i>${waLabel}${isPrim?'<span class="pref-star">★</span>':''}`;
    wa.title = c.channels.wa_count ? `${c.channels.wa_count} сообщений в истории` : 'Написать в WhatsApp';
    wa.onclick = () => chrome.tabs.create({url:`https://wa.me/${phoneE164}?text=${encodeURIComponent(msg)}`});
    box.appendChild(wa);
  }

  // TG — show if has phone OR has tg history
  if (hasPhone || c.channels.tg || c.is_tg_only) {
    const tg = document.createElement('button');
    const tgPrim = pref === 'tg' || c.is_tg_only || (!c.channels.wa && !hasPhone);
    tg.className = `ch-btn ${tgPrim ? 'tg-primary' : 'tg-secondary'}`;
    const tgLabel = c.channels.tg_count
      ? `Telegram <span style="opacity:.75;font-size:11px">(${c.channels.tg_count})</span>`
      : 'Telegram';
    tg.innerHTML = `<i class="bi bi-telegram"></i>${tgLabel}${tgPrim?'<span class="pref-star">★</span>':''}`;
    tg.title = c.channels.tg_count ? `${c.channels.tg_count} сообщений в истории` : 'Написать в Telegram';
    tg.onclick = () => chrome.tabs.create({url:`https://t.me/+${phoneE164}`});
    box.appendChild(tg);
  }
}

// ── CRM sync ──────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type==='CRM_CUSTOMER_CHANGED') {
    const contact = allContacts.find(c=>String(c.id)===String(msg.customerId));
    if (contact) {
      openDetail(contact);
      setTimeout(()=>{
        const card=document.querySelector(`.card[data-id="${msg.customerId}"]`);
        if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
      },100);
    }
  }
});

// ── Events ────────────────────────────────────────────────────────────────────
document.getElementById('search').addEventListener('input', e=>{
  const f=e.target.value;
  const groups={SAFE_INCOMING:[],WARM_OUTGOING:[],LAST_CHANCE:[],RISKY_FRESH_LEAD:[]};
  allContacts.forEach(c=>{
    const ua = c.unanswered_count||0;
    if (ua >= 4) groups['LAST_CHANCE'].push(c);
    else { groups[c.safety]=groups[c.safety]||[]; groups[c.safety].push(c); }
  });
  renderGroups(groups,f);
});
document.getElementById('refresh-btn').addEventListener('click',loadContacts);
function closeDetail() {
  document.getElementById('detail').classList.remove('open');
  document.getElementById('detail-backdrop').classList.remove('open');
  activeId=null;
  document.querySelectorAll('.card').forEach(el=>el.classList.remove('active'));
}
document.getElementById('d-close').addEventListener('click', closeDetail);
document.getElementById('detail-backdrop').addEventListener('click', closeDetail);

// ── Smart tooltip positioning ─────────────────────────────────────────────────
document.addEventListener('mouseover', e => {
  const chip = e.target.closest('.tip');
  if (!chip) return;
  const box = chip.querySelector('.tipbox');
  if (!box) return;
  box.style.display = 'block';
  const cr = chip.getBoundingClientRect();
  const bw = box.offsetWidth || 220;
  const bh = box.offsetHeight || 80;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = cr.left + cr.width/2 - bw/2;
  left = Math.max(6, Math.min(left, vw - bw - 6));
  let top = cr.top - bh - 8;
  if (top < 6) top = cr.bottom + 8;
  box.style.left = left + 'px';
  box.style.top  = top  + 'px';
});
document.addEventListener('mouseout', e => {
  const chip = e.target.closest('.tip');
  if (!chip) return;
  const box = chip.querySelector('.tipbox');
  if (box) box.style.display = 'none';
});

loadContacts();

// ── Conversation modal ────────────────────────────────────────────────────────
let convData = null;
let convChannel = 'wa';

async function openConvModal(contact, channel) {
  convChannel = channel;
  const modal = document.getElementById('conv-modal');
  const body  = document.getElementById('conv-body');
  document.getElementById('conv-hdr-title').textContent =
    `Переписка · ${contact.name}`;

  // Show/hide tabs based on available channels
  const tabWa = document.getElementById('conv-tab-wa');
  const tabTg = document.getElementById('conv-tab-tg');
  tabWa.disabled = !contact.channels.wa;
  tabTg.disabled = !contact.channels.tg && !contact.is_tg_only;

  modal.classList.add('open');
  body.innerHTML = '<div class="conv-loader">💬</div>';

  // Fetch if not cached for this contact
  if (!convData || convData._id !== contact.id) {
    try {
      const res  = await fetch(`${API}/conversation/${contact.id}`);
      const data = await res.json();
      data._id = contact.id;
      convData = data;
    } catch(e) {
      body.innerHTML = `<div class="conv-empty">Ошибка загрузки переписки</div>`;
      return;
    }
  }
  renderConvChannel(convChannel);
}

function convShowChannel(ch) {
  convChannel = ch;
  document.getElementById('conv-tab-wa').classList.toggle('active', ch==='wa');
  document.getElementById('conv-tab-tg').classList.toggle('active', ch==='tg');
  renderConvChannel(ch);
}

function renderConvChannel(ch) {
  const body = document.getElementById('conv-body');
  document.getElementById('conv-tab-wa').classList.toggle('active', ch==='wa');
  document.getElementById('conv-tab-tg').classList.toggle('active', ch==='tg');

  const msgs = (convData && convData[ch]) || [];
  if (!msgs.length) {
    body.innerHTML = `<div class="conv-empty">Переписки в ${ch==='wa'?'WhatsApp':'Telegram'} нет</div>`;
    return;
  }

  let html = '';
  let lastDate = '';
  for (const m of msgs) {
    // Date divider
    const dateStr = m.ts ? m.ts.substring(0, 11).trim() : '';
    if (dateStr && dateStr !== lastDate) {
      html += `<div class="date-divider">${dateStr}</div>`;
      lastDate = dateStr;
    }
    const dir  = m.dir === 'out' ? 'out' : 'in';
    const time = m.ts ? m.ts.slice(-5) : '';
    const txt  = escHtml(m.text || '');
    const nameHtml = (dir === 'in' && m.name)
      ? `<div class="bubble-name">${escHtml(m.name)}</div>` : '';
    html += `
      <div class="bubble-row ${dir}">
        <div class="bubble">
          ${nameHtml}
          ${txt.replace(/\n/g,'<br>')}
          <div class="bubble-ts">${time}</div>
        </div>
      </div>`;
  }
  body.innerHTML = html;
  // Scroll to bottom
  body.scrollTop = body.scrollHeight;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function closeConvModal() {
  document.getElementById('conv-modal').classList.remove('open');
}

// ── Modal button listeners (no inline onclick — CSP Manifest V3) ──────────────
document.getElementById('conv-close-btn').addEventListener('click', closeConvModal);
document.getElementById('conv-tab-wa').addEventListener('click', () => convShowChannel('wa'));
document.getElementById('conv-tab-tg').addEventListener('click', () => convShowChannel('tg'));

// ── Manager notes ─────────────────────────────────────────────────────────────
let noteSaveTimer = null;
let currentNoteId = null;
let recognition = null;

async function loadManagerNote(contactId) {
  currentNoteId = contactId;
  const ta = document.getElementById('mgr-textarea');
  const prev = document.getElementById('d-prev-note');
  ta.value = '';
  prev.style.display = 'none';
  try {
    const res = await fetch(`${API}/notes/${contactId}`);
    const d = await res.json();
    if (d.note && d.note.text) {
      ta.value = d.note.text;
      // Show previous note header with timestamp
      if (d.note.ts) {
        document.getElementById('d-prev-note-text').textContent = `${d.note.ts}`;
        prev.style.display = 'block';
      }
    }
  } catch(e) { /* offline */ }
}

async function saveManagerNote() {
  if (!currentNoteId) return;
  const ta = document.getElementById('mgr-textarea');
  const text = ta.value.trim();
  const now = new Date();
  const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const ts = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  try {
    await fetch(`${API}/notes/${currentNoteId}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({note: text, ts})
    });
    const badge = document.getElementById('mgr-saved-badge');
    badge.classList.add('show');
    setTimeout(() => badge.classList.remove('show'), 2000);
  } catch(e) { /* offline */ }
}

document.getElementById('mgr-textarea').addEventListener('input', () => {
  clearTimeout(noteSaveTimer);
  noteSaveTimer = setTimeout(saveManagerNote, 1200);
});

// ── Voice input — via content script on CRM tab ───────────────────────────────
const micBtn = document.getElementById('mgr-mic-btn');
let micActive = false;

micBtn.addEventListener('click', () => {
  if (micActive) {
    // Stop recording
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_MIC' });
    });
    return;
  }
  // Start recording via content script on CRM tab
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab || !tab.url || !tab.url.includes('codim.s20.online')) {
      showMicHint('Откройте вкладку CRM и попробуйте снова.');
      return;
    }
    _micTargetId = 'mgr-textarea';
    chrome.tabs.sendMessage(tab.id, { type: 'START_MIC' }, () => {
      const err = chrome.runtime.lastError?.message || '';
      if (err && !err.includes('port closed') && !err.includes('no response')) {
        showMicHint('Не удалось подключиться к вкладке CRM — обновите страницу CRM.');
      }
    });
  });
});

function showMicHint(text) {
  let el = document.getElementById('mic-hint');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mic-hint';
    el.style.cssText = 'font-size:10px;color:#ff3b30;margin:2px 12px 0;line-height:1.4;display:none';
    const wrap = document.getElementById('mgr-mic-btn').closest('.mgr-input-wrap');
    wrap.parentNode.insertBefore(el, wrap.nextSibling);
  }
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// Receive mic events forwarded by background.js
let _micBaseText = '';
let _micTargetId  = 'mgr-textarea';  // tracks which field gets the audio

function _micTargetEl() {
  return document.getElementById(_micTargetId) || document.getElementById('mgr-textarea');
}

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'MIC_STARTED') {
    micActive = true;
    micBtn.classList.add('recording');
    micBtn.querySelector('i').className = 'bi bi-stop-circle-fill';
    micBtn.title = 'Идёт запись… нажмите чтобы остановить';
    // Snapshot the current text so interim updates don't duplicate it
    const el = _micTargetEl();
    _micBaseText = el.value ? el.value.trimEnd() + ' ' : '';
  }

  // Real-time interim transcription — update as the user speaks
  if (msg.type === 'MIC_INTERIM') {
    const el = _micTargetEl();
    el.value = _micBaseText + (msg.text || '');
    // Scroll to end
    el.scrollTop = el.scrollHeight;
  }

  if (msg.type === 'MIC_RESULT') {
    micActive = false;
    micBtn.classList.remove('recording');
    micBtn.querySelector('i').className = 'bi bi-mic';
    micBtn.title = 'Надиктовать голосом';
    // Reset coach mic button too
    const cmb = document.getElementById('coach-mic-btn');
    if (cmb) { cmb.querySelector('i').className = 'bi bi-mic'; }

    const el = _micTargetEl();
    const finalText = msg.text || '';
    el.value = _micBaseText + finalText;
    _micBaseText = '';

    if (finalText) {
      if (el.id === 'coach-input') {
        el.style.borderColor = '#34c759';
        setTimeout(() => { el.style.borderColor = ''; }, 1200);
      } else {
        saveManagerNote();
        el.style.borderColor = '#34c759';
        setTimeout(() => { el.style.borderColor = ''; }, 1200);
      }
    }
  }
  if (msg.type === 'MIC_ERROR') {
    micActive = false;
    micBtn.classList.remove('recording');
    micBtn.querySelector('i').className = 'bi bi-mic';
    micBtn.title = 'Надиктовать голосом';
    _micBaseText = '';
    const errors = {
      'not-allowed':   'Нет доступа к микрофону — разрешите в адресной строке.',
      'not-supported': 'Speech API недоступен.',
      'network':       'Нет соединения с интернетом.',
      'no-speech':     'Речь не обнаружена — попробуйте ещё раз.',
    };
    showMicHint(errors[msg.error] || 'Ошибка: ' + msg.error);
  }
});

// ── AI Sales Coach dialog ─────────────────────────────────────────────────────
let coachContactId = null;
let coachMessages  = [];   // full history sent to API each time

function coachReset() {
  coachMessages = [];
  coachContactId = null;
  document.getElementById('coach-msgs').innerHTML = '';
  document.getElementById('coach-input').value = '';
  document.getElementById('coach-dialog').style.display = 'none';
  document.getElementById('coach-start-btn').style.display = 'flex';
}

function coachInit(contactId) {
  coachReset();
  coachContactId = contactId;
  document.getElementById('coach-start-btn').style.display = 'none';
  document.getElementById('coach-dialog').style.display = 'block';
  coachAddBubble('ai', 'Что произошло при контакте с клиентом? Дозвонились? Что сказал?');
  document.getElementById('coach-input').focus();
}

function coachAddBubble(role, text) {
  const msgs = document.getElementById('coach-msgs');
  const wrap = document.createElement('div');
  wrap.className = `coach-msg ${role}`;

  // Check if dialog is done
  const isDone = text.includes('[ГОТОВО]');
  const cleanText = text.replace('[ГОТОВО]', '').trim();

  if (isDone) {
    const done = document.createElement('div');
    done.className = 'coach-done';
    done.innerHTML = `<i class="bi bi-check-circle-fill"></i> <strong>Итог:</strong> ${escHtml(cleanText)}`;
    msgs.appendChild(done);
    // Hide input
    document.querySelector('.coach-input-row').style.display = 'none';
    saveCoachLog(cleanText);
  } else {
    const bubble = document.createElement('div');
    bubble.className = 'coach-bubble';
    bubble.textContent = cleanText;
    wrap.appendChild(bubble);
    msgs.appendChild(wrap);
  }
  msgs.scrollTop = msgs.scrollHeight;
}

function coachShowTyping() {
  const msgs = document.getElementById('coach-msgs');
  const el = document.createElement('div');
  el.className = 'coach-typing';
  el.id = 'coach-typing';
  el.innerHTML = '<div class="coach-dots"><span></span><span></span><span></span></div>';
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

async function coachSend() {
  const input = document.getElementById('coach-input');
  const text = input.value.trim();
  if (!text || !coachContactId) return;

  // Stop any active mic — prevents MIC_RESULT writing text back after clear
  if (micActive) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_MIC' });
    });
    micActive = false;
    micBtn.classList.remove('recording');
    micBtn.querySelector('i').className = 'bi bi-mic';
  }
  _micBaseText = '';

  input.value = '';
  document.getElementById('coach-send-btn').disabled = true;

  // Add manager bubble
  coachAddBubble('mgr', text);

  // Append to history
  coachMessages.push({ role: 'user', content: text });

  // Show typing indicator
  coachShowTyping();

  try {
    const res = await fetch(`${API}/dialog/${coachContactId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: coachMessages })
    });
    const data = await res.json();
    document.getElementById('coach-typing')?.remove();

    const reply = data.reply || 'Нет ответа от ИИ';
    coachAddBubble('ai', reply);
    coachMessages.push({ role: 'assistant', content: reply });
  } catch(e) {
    document.getElementById('coach-typing')?.remove();
    coachAddBubble('ai', '⚠️ Ошибка связи с сервером. Попробуйте ещё раз.');
  }

  document.getElementById('coach-send-btn').disabled = false;
  document.getElementById('coach-input').focus();
}

// Save completed coach dialogue to server log
function saveCoachLog(summary) {
  const now = new Date();
  const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const ts = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const contactName = document.getElementById('d-name')?.textContent || '';
  fetch(`${API}/coach-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact_id:   coachContactId,
      contact_name: contactName,
      ts,
      summary,
      messages: coachMessages,
    }),
  }).catch(() => {});
}

// Start button
document.getElementById('coach-start-btn').addEventListener('click', () => {
  if (activeId) coachInit(activeId);
});

// Send on button click
document.getElementById('coach-send-btn').addEventListener('click', coachSend);

// Send on Enter (Shift+Enter = newline)
document.getElementById('coach-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); coachSend(); }
});

// Mic for coach — same content script approach
document.getElementById('coach-mic-btn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab || !tab.url || !tab.url.includes('codim.s20.online')) return;
    _micTargetId = 'coach-input';
    chrome.tabs.sendMessage(tab.id, { type: 'START_MIC' });
  });
});

// Override MIC_RESULT to fill coach input if coach is open
const _origMicHandler = null; // mic handler already in chrome.runtime.onMessage above
// We'll check coach-dialog visibility in the existing MIC_RESULT handler
// — patch: replace the MIC_RESULT block to route to coach or notes
// (handled inline below by checking coach-dialog display)

// ── Info panel ────────────────────────────────────────────────────────────────
function openInfoPanel()  { document.getElementById('info-panel').classList.add('open'); }
function closeInfoPanel() { document.getElementById('info-panel').classList.remove('open'); }
document.getElementById('info-btn').addEventListener('click', openInfoPanel);
document.getElementById('info-close').addEventListener('click', closeInfoPanel);

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeConvModal();
    closeInfoPanel();
  }
});

// ── Conversation preview buttons (injected above channel buttons) ─────────────
function buildConvPeekBtns(c) {
  // Remove old if exists
  const old = document.getElementById('conv-btns-row');
  if (old) old.remove();

  if (!c.channels.wa && !c.channels.tg && !c.is_tg_only) return;

  const row = document.createElement('div');
  row.className = 'conv-btns';
  row.id = 'conv-btns-row';

  if (!c.is_tg_only) {
    const waBtn = document.createElement('button');
    waBtn.className = 'conv-peek-btn wa';
    waBtn.disabled = !c.channels.wa;
    waBtn.innerHTML = `<i class="bi bi-whatsapp"></i> Переписка WA${c.channels.wa_count?' ('+c.channels.wa_count+')':''}`;
    waBtn.onclick = () => openConvModal(c, 'wa');
    row.appendChild(waBtn);
  }

  const tgBtn = document.createElement('button');
  tgBtn.className = 'conv-peek-btn tg';
  tgBtn.disabled = !c.channels.tg && !c.is_tg_only;
  tgBtn.innerHTML = `<i class="bi bi-telegram"></i> Переписка TG${c.channels.tg_count?' ('+c.channels.tg_count+')':''}`;
  tgBtn.onclick = () => openConvModal(c, 'tg');
  row.appendChild(tgBtn);

  // Insert before channel buttons
  const chBox = document.getElementById('d-channels');
  chBox.parentNode.insertBefore(row, chBox);
}
