import { c as createComponent } from './astro-component_DF6GQlJq.mjs';
import 'piccolore';
import { P as renderTemplate, aZ as renderHead } from './sequence_CTKPztmt.mjs';
import 'clsx';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const prerender = false;
const $$GbpPosts = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(['<html lang="ru" data-astro-cid-zjsjcpza> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GBP Посты — АйДаКемп</title>', `</head> <body data-astro-cid-zjsjcpza> <div class="layout" data-astro-cid-zjsjcpza> <!-- Топбар --> <div class="topbar" data-astro-cid-zjsjcpza> <h1 data-astro-cid-zjsjcpza> <span id="statusDot" class="badge-r" data-astro-cid-zjsjcpza></span>
Google Business Profile
</h1> <div class="toplinks" data-astro-cid-zjsjcpza> <span id="locationLabel" style="color:#64748b;font-size:13px" data-astro-cid-zjsjcpza>не настроен</span> <a href="/admin/gbp-setup" data-astro-cid-zjsjcpza>Настройки</a> <a href="/admin/hero" data-astro-cid-zjsjcpza>Hero</a> <a href="/admin/gallery" data-astro-cid-zjsjcpza>Gallery</a> </div> </div> <!-- Шаблоны --> <div class="tpl-col" data-astro-cid-zjsjcpza> <h2 data-astro-cid-zjsjcpza>Шаблоны</h2> <div id="tplList" data-astro-cid-zjsjcpza></div> <div class="section-title" style="margin-top:24px" data-astro-cid-zjsjcpza>Последние посты</div> <div id="recentPosts" data-astro-cid-zjsjcpza><p style="font-size:12px;color:#64748b" data-astro-cid-zjsjcpza>Загрузка...</p></div> </div> <!-- Редактор --> <div class="editor-col" data-astro-cid-zjsjcpza> <div class="editor-body" data-astro-cid-zjsjcpza> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Тип поста</label> <select id="topicType" onchange="onTypeChange()" data-astro-cid-zjsjcpza> <option value="STANDARD" data-astro-cid-zjsjcpza>Обычный пост</option> <option value="EVENT" data-astro-cid-zjsjcpza>Событие</option> <option value="OFFER" data-astro-cid-zjsjcpza>Акция / Предложение</option> </select> </div> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Текст поста <span style="color:#64748b;font-weight:400" data-astro-cid-zjsjcpza>(макс. 1500 симв.)</span></label> <textarea id="postText" placeholder="Текст поста для Google Бизнес Профиль..." oninput="onTextInput()" data-astro-cid-zjsjcpza></textarea> <div class="char-count" id="charCount" data-astro-cid-zjsjcpza>0 / 1500</div> </div> <div id="eventFields" style="display:none" data-astro-cid-zjsjcpza> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Название события</label> <input type="text" id="eventTitle" placeholder="Смена 1 АйДаКемп — июнь 2026" data-astro-cid-zjsjcpza> </div> <div class="row2" data-astro-cid-zjsjcpza> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Дата начала</label> <input type="date" id="eventStart" data-astro-cid-zjsjcpza> </div> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Дата окончания</label> <input type="date" id="eventEnd" data-astro-cid-zjsjcpza> </div> </div> </div> <div class="row2" data-astro-cid-zjsjcpza> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Кнопка (CTA)</label> <select id="ctaType" data-astro-cid-zjsjcpza> <option value="NONE" data-astro-cid-zjsjcpza>Без кнопки</option> <option value="BOOK" data-astro-cid-zjsjcpza>Забронировать</option> <option value="ORDER" data-astro-cid-zjsjcpza>Заказать</option> <option value="LEARN_MORE" data-astro-cid-zjsjcpza>Подробнее</option> <option value="SIGN_UP" data-astro-cid-zjsjcpza>Записаться</option> <option value="CALL" data-astro-cid-zjsjcpza>Позвонить</option> </select> </div> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>URL кнопки</label> <input type="url" id="ctaUrl" placeholder="https://aidacamp.ru/#shifts" value="https://aidacamp.ru/#shifts" data-astro-cid-zjsjcpza> </div> </div> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Фото <span style="color:#64748b;font-weight:400" data-astro-cid-zjsjcpza>(URL публичной картинки)</span></label> <input type="url" id="imageUrl" placeholder="https://aidacamp.ru/images/..." oninput="updatePreview()" data-astro-cid-zjsjcpza> </div> </div> <div class="footer" data-astro-cid-zjsjcpza> <button class="btn" id="publishBtn" onclick="publishPost()" data-astro-cid-zjsjcpza> <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-zjsjcpza><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" data-astro-cid-zjsjcpza></path></svg>
Опубликовать
</button> <button class="btn btn-sec" onclick="clearForm()" data-astro-cid-zjsjcpza>Очистить</button> <div class="status" id="pubStatus" data-astro-cid-zjsjcpza></div> </div> </div> <!-- Превью --> <div class="preview-col" data-astro-cid-zjsjcpza> <h2 data-astro-cid-zjsjcpza>Превью</h2> <div class="gbp-card" data-astro-cid-zjsjcpza> <div class="gbp-card-header" data-astro-cid-zjsjcpza> <div class="gbp-logo" data-astro-cid-zjsjcpza>А</div> <div data-astro-cid-zjsjcpza> <div class="gbp-name" data-astro-cid-zjsjcpza>АйДаКемп</div> <div class="gbp-date" data-astro-cid-zjsjcpza>Только что</div> </div> </div> <div id="previewImg" class="gbp-img" style="display:none" data-astro-cid-zjsjcpza> <img id="previewImgTag" style="width:100%;height:160px;object-fit:cover" data-astro-cid-zjsjcpza> </div> <div class="gbp-img" id="previewImgPlaceholder" data-astro-cid-zjsjcpza>Фото поста</div> <div class="gbp-body" id="previewText" data-astro-cid-zjsjcpza>Текст поста появится здесь...</div> <div class="gbp-cta" id="previewCta" style="display:none" data-astro-cid-zjsjcpza> <span class="gbp-cta-btn" id="previewCtaBtn" data-astro-cid-zjsjcpza>Забронировать</span> </div> </div> </div> </div> <script>
// --- Шаблоны ---------------------------------------------------------------
const TEMPLATES = [
  {
    tag: 'season', tagLabel: 'Сезонное',
    title: 'Открыта запись на лето',
    text: \`🌟 Запись на летние смены 2026 открыта!

Детский IT-лагерь АйДаКемп — 66 км от МКАД, смены с июня по август.

Программы: Python, AI, Minecraft Education, Scratch, 3D-моделирование.

Дети 7–15 лет. Соотношение преподаватель:дети = 1:6.

📍 Наро-Фоминский округ, территория санатория «Изумруд»
🏊 Бассейн, спорт, питание 5 раз в день

Стоимость от 48 000 ₽. Налоговый вычет 13%.\`,
    cta: 'BOOK',
  },
  {
    tag: 'season', tagLabel: 'Срочность',
    title: 'Остаётся мало мест',
    text: \`⚡ Места на июньскую смену заканчиваются!

На первую смену (1–14 июня) осталось всего несколько мест.

Если планируете лето с пользой — лучше не откладывать.

АйДаКемп: Python, AI и Minecraft за 10–14 дней в загородном лагере.
Ребёнок уезжает с готовым проектом.\`,
    cta: 'BOOK',
  },
  {
    tag: 'social', tagLabel: 'Социальное доказательство',
    title: 'Итоги смены',
    text: \`✅ Итоги смены АйДаКемп!

За 14 дней дети создали:
— Telegram-ботов на Python
— Моды для Minecraft Education
— 3D-модели и распечатали на 3D-принтере
— AI-помощников с Gemini API

Каждый уехал домой с реальным проектом — не сертификатом, а работающим продуктом.

Следующая смена — в июле. Запись открыта.\`,
    cta: 'LEARN_MORE',
  },
  {
    tag: 'product', tagLabel: 'Продукт',
    title: 'Python для детей',
    text: \`🐍 Лагерь Python — для детей 10–14 лет

За 10 дней ребята с нуля напишут работающий Python-проект:
→ Telegram-бот
→ Парсер сайтов
→ Игра с базой данных
→ AI-помощник на Gemini API

Преподаватели — практикующие разработчики с опытом 6+ лет.
Группы до 8 человек.

66 км от МКАД по Калужскому шоссе. Трансфер от метро Солнцево.\`,
    cta: 'SIGN_UP',
  },
  {
    tag: 'product', tagLabel: 'Продукт',
    title: 'Minecraft Education',
    text: \`🎮 Лагерь Minecraft Education — это не просто игра

Дети 7–12 лет создают собственные миры, пишут моды, программируют поведение персонажей.

Minecraft Education — официальная образовательная версия от Microsoft. На ней строят курсы MIT и Гарвард.

В АйДаКемп дети делают реальные IT-проекты в любимой игровой среде.\`,
    cta: 'LEARN_MORE',
  },
  {
    tag: 'trust', tagLabel: 'Доверие',
    title: 'Налоговый вычет',
    text: \`💰 Верните 13% стоимости лагеря

За детский лагерь можно получить налоговый вычет — до 5 200 ₽ за смену.

Мы выдаём все документы для ФНС:
✓ Договор с организацией
✓ Акт об оказании услуг
✓ Платёжный документ

Оформляется онлайн через «Госуслуги» за 15 минут.

АйДаКемп — лицензированный образовательный лагерь.\`,
    cta: 'LEARN_MORE',
  },
  {
    tag: 'event', tagLabel: 'Событие',
    title: 'Хакатон — защита проектов',
    text: \`🏆 Финальный хакатон АйДаКемп

В конце каждой смены дети защищают проекты перед аудиторией — как на настоящей конференции.

Формат: 3-минутная презентация + ответы на вопросы.

Победители получают призы. Все участники — опыт публичного выступления, который не купишь ни на каком курсе.

Родители могут приехать и посмотреть!\`,
    cta: 'LEARN_MORE',
  },
  {
    tag: 'trust', tagLabel: 'Доверие',
    title: '5.0 на Яндекс Картах',
    text: \`⭐ АйДаКемп — 5.0 на Яндекс Картах

С 2019 года через лагерь прошли более 1 200 детей.

Что говорят родители:
«Ребёнок вернулся и сам сел делать проекты дома»
«Впервые за 10 дней я не слышала жалоб на скуку»
«Преподаватели объясняют так, что даже я поняла»

Смены июнь–август 2026. Запись открыта.\`,
    cta: 'BOOK',
  },
];

const CTA_LABELS = {
  NONE: '—', BOOK: 'Забронировать', ORDER: 'Заказать',
  LEARN_MORE: 'Подробнее', SIGN_UP: 'Записаться', CALL: 'Позвонить',
};

// --- Рендер шаблонов --------------------------------------------------------
const tplList = document.getElementById('tplList');
TEMPLATES.forEach((t, i) => {
  const el = document.createElement('div');
  el.className = 'tpl';
  el.dataset.idx = i;
  el.innerHTML = \`<div class="tpl-title">\${t.title}</div><div class="tpl-tag \${t.tag}">\${t.tagLabel}</div>\`;
  el.addEventListener('click', () => applyTemplate(i));
  tplList.appendChild(el);
});

function applyTemplate(idx) {
  const t = TEMPLATES[idx];
  document.getElementById('postText').value = t.text;
  document.getElementById('ctaType').value = t.cta;
  onTextInput(); updatePreview();
  document.querySelectorAll('.tpl').forEach((el, i) => el.classList.toggle('active', i === idx));
}

// --- Превью ----------------------------------------------------------------
function updatePreview() {
  const text = document.getElementById('postText').value;
  document.getElementById('previewText').textContent = text || 'Текст поста появится здесь...';

  const imgUrl = document.getElementById('imageUrl').value;
  if (imgUrl) {
    document.getElementById('previewImgPlaceholder').style.display = 'none';
    document.getElementById('previewImg').style.display = 'block';
    document.getElementById('previewImgTag').src = imgUrl;
  } else {
    document.getElementById('previewImgPlaceholder').style.display = 'flex';
    document.getElementById('previewImg').style.display = 'none';
  }

  const ctaType = document.getElementById('ctaType').value;
  const ctaEl = document.getElementById('previewCta');
  if (ctaType !== 'NONE') {
    ctaEl.style.display = 'block';
    document.getElementById('previewCtaBtn').textContent = CTA_LABELS[ctaType] ?? ctaType;
  } else {
    ctaEl.style.display = 'none';
  }
}

function onTextInput() {
  const len = document.getElementById('postText').value.length;
  const el = document.getElementById('charCount');
  el.textContent = \`\${len} / 1500\`;
  el.className = 'char-count' + (len > 1500 ? ' over' : len > 1300 ? ' warn' : '');
  updatePreview();
}

function onTypeChange() {
  const type = document.getElementById('topicType').value;
  document.getElementById('eventFields').style.display = type === 'EVENT' ? 'block' : 'none';
}

// --- Публикация -------------------------------------------------------------
async function publishPost() {
  const text = document.getElementById('postText').value.trim();
  const el = document.getElementById('pubStatus');
  const btn = document.getElementById('publishBtn');

  if (!text) { showStatus('err', 'Введи текст поста'); return; }
  if (text.length > 1500) { showStatus('err', \`Слишком длинный текст: \${text.length} символов (макс. 1500)\`); return; }

  btn.disabled = true;
  btn.textContent = 'Публикую...';
  showStatus('', '');

  const body = {
    text,
    topicType: document.getElementById('topicType').value,
    ctaType: document.getElementById('ctaType').value,
    ctaUrl: document.getElementById('ctaUrl').value || 'https://aidacamp.ru/#shifts',
    imageUrl: document.getElementById('imageUrl').value || null,
    eventTitle: document.getElementById('eventTitle')?.value || null,
    eventStart: document.getElementById('eventStart')?.value || null,
    eventEnd: document.getElementById('eventEnd')?.value || null,
  };

  try {
    const r = await fetch('/api/gbp-post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.ok) {
      showStatus('ok', '✓ Пост опубликован в Google Business Profile!');
      loadRecentPosts();
    } else {
      showStatus('err', d.error ?? 'Ошибка публикации');
    }
  } catch (e) {
    showStatus('err', String(e));
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Опубликовать';
  }
}

function showStatus(type, msg) {
  const el = document.getElementById('pubStatus');
  el.className = 'status' + (type ? ' ' + type : '');
  el.textContent = msg;
}

function clearForm() {
  document.getElementById('postText').value = '';
  document.getElementById('imageUrl').value = '';
  document.getElementById('ctaType').value = 'NONE';
  document.querySelectorAll('.tpl').forEach(e => e.classList.remove('active'));
  onTextInput(); updatePreview();
}

// --- Статус подключения -----------------------------------------------------
async function checkStatus() {
  try {
    const r = await fetch('/api/gbp-auth');
    const d = await r.json();
    document.getElementById('statusDot').className = d.configured ? 'badge-g' : 'badge-r';
    if (d.locationId) {
      document.getElementById('locationLabel').textContent = d.locationId;
    }
  } catch {}
}

// --- Последние посты --------------------------------------------------------
async function loadRecentPosts() {
  const el = document.getElementById('recentPosts');
  try {
    const r = await fetch('/api/gbp-post');
    const d = await r.json();
    if (!d.ok || !d.posts?.length) { el.innerHTML = '<p style="font-size:12px;color:#64748b">Постов нет</p>'; return; }
    el.innerHTML = d.posts.map(p => \`
      <div class="recent-post">
        <div class="text">\${p.summary ?? ''}</div>
        <div class="meta">\${p.state ?? ''} · \${(p.createTime ?? '').slice(0, 10)}</div>
      </div>\`).join('');
  } catch {
    el.innerHTML = '<p style="font-size:12px;color:#64748b">Не удалось загрузить</p>';
  }
}

checkStatus();
loadRecentPosts();
document.getElementById('ctaType').addEventListener('change', updatePreview);
<\/script> </body> </html>`], ['<html lang="ru" data-astro-cid-zjsjcpza> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GBP Посты — АйДаКемп</title>', `</head> <body data-astro-cid-zjsjcpza> <div class="layout" data-astro-cid-zjsjcpza> <!-- Топбар --> <div class="topbar" data-astro-cid-zjsjcpza> <h1 data-astro-cid-zjsjcpza> <span id="statusDot" class="badge-r" data-astro-cid-zjsjcpza></span>
Google Business Profile
</h1> <div class="toplinks" data-astro-cid-zjsjcpza> <span id="locationLabel" style="color:#64748b;font-size:13px" data-astro-cid-zjsjcpza>не настроен</span> <a href="/admin/gbp-setup" data-astro-cid-zjsjcpza>Настройки</a> <a href="/admin/hero" data-astro-cid-zjsjcpza>Hero</a> <a href="/admin/gallery" data-astro-cid-zjsjcpza>Gallery</a> </div> </div> <!-- Шаблоны --> <div class="tpl-col" data-astro-cid-zjsjcpza> <h2 data-astro-cid-zjsjcpza>Шаблоны</h2> <div id="tplList" data-astro-cid-zjsjcpza></div> <div class="section-title" style="margin-top:24px" data-astro-cid-zjsjcpza>Последние посты</div> <div id="recentPosts" data-astro-cid-zjsjcpza><p style="font-size:12px;color:#64748b" data-astro-cid-zjsjcpza>Загрузка...</p></div> </div> <!-- Редактор --> <div class="editor-col" data-astro-cid-zjsjcpza> <div class="editor-body" data-astro-cid-zjsjcpza> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Тип поста</label> <select id="topicType" onchange="onTypeChange()" data-astro-cid-zjsjcpza> <option value="STANDARD" data-astro-cid-zjsjcpza>Обычный пост</option> <option value="EVENT" data-astro-cid-zjsjcpza>Событие</option> <option value="OFFER" data-astro-cid-zjsjcpza>Акция / Предложение</option> </select> </div> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Текст поста <span style="color:#64748b;font-weight:400" data-astro-cid-zjsjcpza>(макс. 1500 симв.)</span></label> <textarea id="postText" placeholder="Текст поста для Google Бизнес Профиль..." oninput="onTextInput()" data-astro-cid-zjsjcpza></textarea> <div class="char-count" id="charCount" data-astro-cid-zjsjcpza>0 / 1500</div> </div> <div id="eventFields" style="display:none" data-astro-cid-zjsjcpza> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Название события</label> <input type="text" id="eventTitle" placeholder="Смена 1 АйДаКемп — июнь 2026" data-astro-cid-zjsjcpza> </div> <div class="row2" data-astro-cid-zjsjcpza> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Дата начала</label> <input type="date" id="eventStart" data-astro-cid-zjsjcpza> </div> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Дата окончания</label> <input type="date" id="eventEnd" data-astro-cid-zjsjcpza> </div> </div> </div> <div class="row2" data-astro-cid-zjsjcpza> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Кнопка (CTA)</label> <select id="ctaType" data-astro-cid-zjsjcpza> <option value="NONE" data-astro-cid-zjsjcpza>Без кнопки</option> <option value="BOOK" data-astro-cid-zjsjcpza>Забронировать</option> <option value="ORDER" data-astro-cid-zjsjcpza>Заказать</option> <option value="LEARN_MORE" data-astro-cid-zjsjcpza>Подробнее</option> <option value="SIGN_UP" data-astro-cid-zjsjcpza>Записаться</option> <option value="CALL" data-astro-cid-zjsjcpza>Позвонить</option> </select> </div> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>URL кнопки</label> <input type="url" id="ctaUrl" placeholder="https://aidacamp.ru/#shifts" value="https://aidacamp.ru/#shifts" data-astro-cid-zjsjcpza> </div> </div> <div class="field" data-astro-cid-zjsjcpza> <label data-astro-cid-zjsjcpza>Фото <span style="color:#64748b;font-weight:400" data-astro-cid-zjsjcpza>(URL публичной картинки)</span></label> <input type="url" id="imageUrl" placeholder="https://aidacamp.ru/images/..." oninput="updatePreview()" data-astro-cid-zjsjcpza> </div> </div> <div class="footer" data-astro-cid-zjsjcpza> <button class="btn" id="publishBtn" onclick="publishPost()" data-astro-cid-zjsjcpza> <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-zjsjcpza><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" data-astro-cid-zjsjcpza></path></svg>
Опубликовать
</button> <button class="btn btn-sec" onclick="clearForm()" data-astro-cid-zjsjcpza>Очистить</button> <div class="status" id="pubStatus" data-astro-cid-zjsjcpza></div> </div> </div> <!-- Превью --> <div class="preview-col" data-astro-cid-zjsjcpza> <h2 data-astro-cid-zjsjcpza>Превью</h2> <div class="gbp-card" data-astro-cid-zjsjcpza> <div class="gbp-card-header" data-astro-cid-zjsjcpza> <div class="gbp-logo" data-astro-cid-zjsjcpza>А</div> <div data-astro-cid-zjsjcpza> <div class="gbp-name" data-astro-cid-zjsjcpza>АйДаКемп</div> <div class="gbp-date" data-astro-cid-zjsjcpza>Только что</div> </div> </div> <div id="previewImg" class="gbp-img" style="display:none" data-astro-cid-zjsjcpza> <img id="previewImgTag" style="width:100%;height:160px;object-fit:cover" data-astro-cid-zjsjcpza> </div> <div class="gbp-img" id="previewImgPlaceholder" data-astro-cid-zjsjcpza>Фото поста</div> <div class="gbp-body" id="previewText" data-astro-cid-zjsjcpza>Текст поста появится здесь...</div> <div class="gbp-cta" id="previewCta" style="display:none" data-astro-cid-zjsjcpza> <span class="gbp-cta-btn" id="previewCtaBtn" data-astro-cid-zjsjcpza>Забронировать</span> </div> </div> </div> </div> <script>
// --- Шаблоны ---------------------------------------------------------------
const TEMPLATES = [
  {
    tag: 'season', tagLabel: 'Сезонное',
    title: 'Открыта запись на лето',
    text: \\\`🌟 Запись на летние смены 2026 открыта!

Детский IT-лагерь АйДаКемп — 66 км от МКАД, смены с июня по август.

Программы: Python, AI, Minecraft Education, Scratch, 3D-моделирование.

Дети 7–15 лет. Соотношение преподаватель:дети = 1:6.

📍 Наро-Фоминский округ, территория санатория «Изумруд»
🏊 Бассейн, спорт, питание 5 раз в день

Стоимость от 48 000 ₽. Налоговый вычет 13%.\\\`,
    cta: 'BOOK',
  },
  {
    tag: 'season', tagLabel: 'Срочность',
    title: 'Остаётся мало мест',
    text: \\\`⚡ Места на июньскую смену заканчиваются!

На первую смену (1–14 июня) осталось всего несколько мест.

Если планируете лето с пользой — лучше не откладывать.

АйДаКемп: Python, AI и Minecraft за 10–14 дней в загородном лагере.
Ребёнок уезжает с готовым проектом.\\\`,
    cta: 'BOOK',
  },
  {
    tag: 'social', tagLabel: 'Социальное доказательство',
    title: 'Итоги смены',
    text: \\\`✅ Итоги смены АйДаКемп!

За 14 дней дети создали:
— Telegram-ботов на Python
— Моды для Minecraft Education
— 3D-модели и распечатали на 3D-принтере
— AI-помощников с Gemini API

Каждый уехал домой с реальным проектом — не сертификатом, а работающим продуктом.

Следующая смена — в июле. Запись открыта.\\\`,
    cta: 'LEARN_MORE',
  },
  {
    tag: 'product', tagLabel: 'Продукт',
    title: 'Python для детей',
    text: \\\`🐍 Лагерь Python — для детей 10–14 лет

За 10 дней ребята с нуля напишут работающий Python-проект:
→ Telegram-бот
→ Парсер сайтов
→ Игра с базой данных
→ AI-помощник на Gemini API

Преподаватели — практикующие разработчики с опытом 6+ лет.
Группы до 8 человек.

66 км от МКАД по Калужскому шоссе. Трансфер от метро Солнцево.\\\`,
    cta: 'SIGN_UP',
  },
  {
    tag: 'product', tagLabel: 'Продукт',
    title: 'Minecraft Education',
    text: \\\`🎮 Лагерь Minecraft Education — это не просто игра

Дети 7–12 лет создают собственные миры, пишут моды, программируют поведение персонажей.

Minecraft Education — официальная образовательная версия от Microsoft. На ней строят курсы MIT и Гарвард.

В АйДаКемп дети делают реальные IT-проекты в любимой игровой среде.\\\`,
    cta: 'LEARN_MORE',
  },
  {
    tag: 'trust', tagLabel: 'Доверие',
    title: 'Налоговый вычет',
    text: \\\`💰 Верните 13% стоимости лагеря

За детский лагерь можно получить налоговый вычет — до 5 200 ₽ за смену.

Мы выдаём все документы для ФНС:
✓ Договор с организацией
✓ Акт об оказании услуг
✓ Платёжный документ

Оформляется онлайн через «Госуслуги» за 15 минут.

АйДаКемп — лицензированный образовательный лагерь.\\\`,
    cta: 'LEARN_MORE',
  },
  {
    tag: 'event', tagLabel: 'Событие',
    title: 'Хакатон — защита проектов',
    text: \\\`🏆 Финальный хакатон АйДаКемп

В конце каждой смены дети защищают проекты перед аудиторией — как на настоящей конференции.

Формат: 3-минутная презентация + ответы на вопросы.

Победители получают призы. Все участники — опыт публичного выступления, который не купишь ни на каком курсе.

Родители могут приехать и посмотреть!\\\`,
    cta: 'LEARN_MORE',
  },
  {
    tag: 'trust', tagLabel: 'Доверие',
    title: '5.0 на Яндекс Картах',
    text: \\\`⭐ АйДаКемп — 5.0 на Яндекс Картах

С 2019 года через лагерь прошли более 1 200 детей.

Что говорят родители:
«Ребёнок вернулся и сам сел делать проекты дома»
«Впервые за 10 дней я не слышала жалоб на скуку»
«Преподаватели объясняют так, что даже я поняла»

Смены июнь–август 2026. Запись открыта.\\\`,
    cta: 'BOOK',
  },
];

const CTA_LABELS = {
  NONE: '—', BOOK: 'Забронировать', ORDER: 'Заказать',
  LEARN_MORE: 'Подробнее', SIGN_UP: 'Записаться', CALL: 'Позвонить',
};

// --- Рендер шаблонов --------------------------------------------------------
const tplList = document.getElementById('tplList');
TEMPLATES.forEach((t, i) => {
  const el = document.createElement('div');
  el.className = 'tpl';
  el.dataset.idx = i;
  el.innerHTML = \\\`<div class="tpl-title">\\\${t.title}</div><div class="tpl-tag \\\${t.tag}">\\\${t.tagLabel}</div>\\\`;
  el.addEventListener('click', () => applyTemplate(i));
  tplList.appendChild(el);
});

function applyTemplate(idx) {
  const t = TEMPLATES[idx];
  document.getElementById('postText').value = t.text;
  document.getElementById('ctaType').value = t.cta;
  onTextInput(); updatePreview();
  document.querySelectorAll('.tpl').forEach((el, i) => el.classList.toggle('active', i === idx));
}

// --- Превью ----------------------------------------------------------------
function updatePreview() {
  const text = document.getElementById('postText').value;
  document.getElementById('previewText').textContent = text || 'Текст поста появится здесь...';

  const imgUrl = document.getElementById('imageUrl').value;
  if (imgUrl) {
    document.getElementById('previewImgPlaceholder').style.display = 'none';
    document.getElementById('previewImg').style.display = 'block';
    document.getElementById('previewImgTag').src = imgUrl;
  } else {
    document.getElementById('previewImgPlaceholder').style.display = 'flex';
    document.getElementById('previewImg').style.display = 'none';
  }

  const ctaType = document.getElementById('ctaType').value;
  const ctaEl = document.getElementById('previewCta');
  if (ctaType !== 'NONE') {
    ctaEl.style.display = 'block';
    document.getElementById('previewCtaBtn').textContent = CTA_LABELS[ctaType] ?? ctaType;
  } else {
    ctaEl.style.display = 'none';
  }
}

function onTextInput() {
  const len = document.getElementById('postText').value.length;
  const el = document.getElementById('charCount');
  el.textContent = \\\`\\\${len} / 1500\\\`;
  el.className = 'char-count' + (len > 1500 ? ' over' : len > 1300 ? ' warn' : '');
  updatePreview();
}

function onTypeChange() {
  const type = document.getElementById('topicType').value;
  document.getElementById('eventFields').style.display = type === 'EVENT' ? 'block' : 'none';
}

// --- Публикация -------------------------------------------------------------
async function publishPost() {
  const text = document.getElementById('postText').value.trim();
  const el = document.getElementById('pubStatus');
  const btn = document.getElementById('publishBtn');

  if (!text) { showStatus('err', 'Введи текст поста'); return; }
  if (text.length > 1500) { showStatus('err', \\\`Слишком длинный текст: \\\${text.length} символов (макс. 1500)\\\`); return; }

  btn.disabled = true;
  btn.textContent = 'Публикую...';
  showStatus('', '');

  const body = {
    text,
    topicType: document.getElementById('topicType').value,
    ctaType: document.getElementById('ctaType').value,
    ctaUrl: document.getElementById('ctaUrl').value || 'https://aidacamp.ru/#shifts',
    imageUrl: document.getElementById('imageUrl').value || null,
    eventTitle: document.getElementById('eventTitle')?.value || null,
    eventStart: document.getElementById('eventStart')?.value || null,
    eventEnd: document.getElementById('eventEnd')?.value || null,
  };

  try {
    const r = await fetch('/api/gbp-post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.ok) {
      showStatus('ok', '✓ Пост опубликован в Google Business Profile!');
      loadRecentPosts();
    } else {
      showStatus('err', d.error ?? 'Ошибка публикации');
    }
  } catch (e) {
    showStatus('err', String(e));
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Опубликовать';
  }
}

function showStatus(type, msg) {
  const el = document.getElementById('pubStatus');
  el.className = 'status' + (type ? ' ' + type : '');
  el.textContent = msg;
}

function clearForm() {
  document.getElementById('postText').value = '';
  document.getElementById('imageUrl').value = '';
  document.getElementById('ctaType').value = 'NONE';
  document.querySelectorAll('.tpl').forEach(e => e.classList.remove('active'));
  onTextInput(); updatePreview();
}

// --- Статус подключения -----------------------------------------------------
async function checkStatus() {
  try {
    const r = await fetch('/api/gbp-auth');
    const d = await r.json();
    document.getElementById('statusDot').className = d.configured ? 'badge-g' : 'badge-r';
    if (d.locationId) {
      document.getElementById('locationLabel').textContent = d.locationId;
    }
  } catch {}
}

// --- Последние посты --------------------------------------------------------
async function loadRecentPosts() {
  const el = document.getElementById('recentPosts');
  try {
    const r = await fetch('/api/gbp-post');
    const d = await r.json();
    if (!d.ok || !d.posts?.length) { el.innerHTML = '<p style="font-size:12px;color:#64748b">Постов нет</p>'; return; }
    el.innerHTML = d.posts.map(p => \\\`
      <div class="recent-post">
        <div class="text">\\\${p.summary ?? ''}</div>
        <div class="meta">\\\${p.state ?? ''} · \\\${(p.createTime ?? '').slice(0, 10)}</div>
      </div>\\\`).join('');
  } catch {
    el.innerHTML = '<p style="font-size:12px;color:#64748b">Не удалось загрузить</p>';
  }
}

checkStatus();
loadRecentPosts();
document.getElementById('ctaType').addEventListener('change', updatePreview);
<\/script> </body> </html>`])), renderHead());
}, "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gbp-posts.astro", void 0);

const $$file = "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gbp-posts.astro";
const $$url = "/admin/gbp-posts";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$GbpPosts,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
