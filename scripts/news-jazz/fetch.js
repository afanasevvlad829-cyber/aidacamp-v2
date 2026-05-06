const { parseString } = require('xml2js');
const { promisify }   = require('util');
const { writeFileSync, mkdirSync } = require('fs');

const parseXml  = promisify(parseString);
const RSS_URL   = 'https://techcrunch.com/category/artificial-intelligence/feed/';
const OUT_DIR   = '/var/www/aidacamp-dev/current/data';
const OUT_FILE  = `${OUT_DIR}/news-jazz.json`;
const FETCH_N   = 15;
const SHOW_N    = 5;

async function fetchRss() {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 AidaCamp-NewsJazz/1.0' }
  });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  return res.text();
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);
}

async function filterAndProcess(items) {
  const key = process.env.OPENAI_API_KEY;

  const input = items.map((item, i) => ({
    idx: i,
    title: item.title[0],
    desc: stripHtml(item['content:encoded']?.[0] || item.description?.[0] || ''),
  }));

  const prompt = `Ты помогаешь детскому IT-лагерю АйДаКемп выбрать новости про ИИ для главной страницы сайта.

Аудитория: родители детей 7–15 лет. Тон — лёгкий, позитивный.

Из списка ниже:
1. Выбери ровно ${SHOW_N} позитивных новостей (новые модели, инструменты, запуски). Исключай: суды, скандалы, увольнения, опасности ИИ.
2. Для каждой выбранной:
   - "ru": короткий перевод заголовка на русский (до 10 слов)
   - "summary": краткое содержание на русском, 2–3 предложения, простым языком для родителей
3. Верни ТОЛЬКО JSON-массив без markdown:
[{"idx": <число>, "ru": "...", "summary": "..."}]

Новости:
${input.map(i => `${i.idx}: ${i.title}\n${i.desc}`).join('\n\n')}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 900,
    }),
  });
  const data = await res.json();
  const raw = data.choices[0].message.content.trim()
    .replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(raw);
}

function timeAgo(dateStr) {
  const h = Math.floor((Date.now() - new Date(dateStr)) / 3600000);
  if (h < 1)  return 'только что';
  if (h < 24) {
    const mod10 = h % 10, mod100 = h % 100;
    const form = (mod100 >= 11 && mod100 <= 14) ? 'часов'
               : mod10 === 1 ? 'час'
               : (mod10 >= 2 && mod10 <= 4) ? 'часа'
               : 'часов';
    return h + ' ' + form + ' назад';
  }
  const d = Math.floor(h / 24);
  return d===1 ? 'вчера' : `${d} дня назад`;
}

async function main() {
  console.log('[news-jazz] fetch RSS...');
  const xml    = await fetchRss();
  const parsed = await parseXml(xml);
  const items  = parsed.rss.channel[0].item.slice(0, FETCH_N);

  console.log(`[news-jazz] filter + summary ${items.length} → ${SHOW_N}...`);
  const selected = await filterAndProcess(items);

  const news = selected.map(s => {
    const item = items[s.idx];
    return {
      text:    s.ru,
      orig:    item.title[0],
      summary: s.summary,
      url:     item.link[0],
      time:    timeAgo(item.pubDate[0]),
      source:  'techcrunch.com',
    };
  });

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify({ updated: new Date().toISOString(), items: news }, null, 2));
  console.log('[news-jazz] done:');
  news.forEach(n => console.log(`  • ${n.text}\n    ${n.summary}`));
}

main().catch(e => { console.error(e); process.exit(1); });
