#!/usr/bin/env node
/**
 * strengthen-pages.js — усиление тонких страниц зоны удара (v2: уникальный контент)
 *
 * Берёт страницы из seo_url_switch_map (status=pending, target_thin=true) и
 * добавляет в каждую УНИКАЛЬНЫЙ расширенный блок (LLM + RAG-факты), а не
 * идентичный шаблон. Цель: довести тонкую страницу до силы, достаточной чтобы
 * Яндекс сам перенёс ранжирование с перегруженной главной (см.
 * _notes/SEO/expertise/10-homepage-overload-strategy.md).
 *
 * Анти-Баден-Баден: контент уникален на каждой странице, запрещённые слова и
 * рекламные восклицания отсекаются валидатором, плотность ключа — 1/абзац.
 *
 * Запуск: node strengthen-pages.js [--apply] [--limit=N] [--slug=NAME] [--show]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const PAGES_DIR = '/opt/aidacamp-site/src/pages';
const APPLY = process.argv.includes('--apply');
const SHOW = process.argv.includes('--show');
const ONLY_SLUG = (process.argv.find(a=>a.startsWith('--slug='))||'').split('=')[1] || null;
const LIMIT = parseInt((process.argv.find(a=>a.startsWith('--limit='))||'--limit=10').split('=')[1]);
const MARKER = '<!-- strengthened-v2 -->';
const MODEL = 'gpt-4o-mini';
const OPENAI_KEY = (()=>{ try { return fs.readFileSync('/opt/aidacamp-tools/mcp/.env','utf8').match(/OPENAI_API_KEY=(.+)/)?.[1]?.trim()||''; } catch { return ''; } })();

const BANNED = /(единиц[аыейыми]*|балл[аовуые]*|soft[\s-]?skills?|формировани[ея]\s+фундамента)/i;

function getDbClient(){
  const env = fs.readFileSync('/opt/aidacamp-tools/mcp/.env','utf8');
  const conn = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim() || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
  return new Client({connectionString: conn});
}

async function embed(text){
  if(!OPENAI_KEY) return null;
  try{
    const r = await fetch('https://api.openai.com/v1/embeddings',{method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({input:[text],model:'text-embedding-3-small'})});
    return (await r.json())?.data?.[0]?.embedding||null;
  }catch{ return null; }
}

async function ragContext(client, keyword){
  const emb = await embed(`${keyword} LSI программа описание лагеря факты`);
  if(!emb) return [];
  try{
    const {rows} = await client.query(`
      SELECT text FROM knowledge_chunks
      WHERE embedding IS NOT NULL
        AND (source LIKE 'seo:%' OR source LIKE 'obsidian-seo:%' OR source LIKE 'report:seo:%')
        AND (1 - (embedding <=> $1::vector)) > 0.35
      ORDER BY embedding <=> $1::vector LIMIT 4
    `,[`[${emb.join(',')}]`]);
    return rows.map(r=>r.text);
  }catch{ return []; }
}

const FACTS = `
- АйДаКемп — летний IT-лагерь с проживанием, школьники 7–15 лет.
- Локация: санаторий «Изумруд», Наро-Фоминский район, 66 км от МКАД по Киевскому шоссе.
- Группы до 8 человек, один преподаватель на 6–8 ребят.
- Программы по выбору: Python, AI и нейросети, Minecraft, Roblox, 3D-моделирование.
- 5-разовое питание, бассейн, медработник 24/7, закрытая охраняемая территория.
- Летние смены 2026. Актуальные цены смен — на aidacamp.ru/ceny.
- Налоговый вычет 13% с образовательной части путёвки — оформляется через ФНС по договору и чеку.
- Родителям — фото из лагеря в Telegram-чат отряда каждый день.
- В конце смены — хакатон: ребёнок защищает свой проект, получает диплом и портфолио.
`;

async function chat(messages, temperature=0.6){
  const r = await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',
    headers:{'Authorization':`Bearer ${OPENAI_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:MODEL, temperature, response_format:{type:'json_object'}, messages})});
  const j = await r.json();
  const txt = j?.choices?.[0]?.message?.content;
  if(!txt) throw new Error('LLM пустой ответ: '+JSON.stringify(j).slice(0,200));
  return JSON.parse(txt);
}

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function cap(s){s=String(s||"").trim();return s.charAt(0).toUpperCase()+s.slice(1);}

async function generateUniqueSection(keyword, slug, lsi){
  const sys = `Ты — копирайтер детского IT-лагеря АйДаКемп. Пишешь в тоне мамы-подруги: тепло, спокойно, по делу. Конкретные наблюдения, а не реклама.
ЗАПРЕЩЕНО: восклицательные знаки; рекламные призывы и клише («обратите внимание», «выгодно и удобно», «запомните навсегда», «отличный выбор», «уникальный»); педагогические термины (soft-skills, «формирование фундамента»); нотации родителям; лобовое сравнение с конкурентами; шок-контент; слова «единиц»/«баллов» (игровая валюта — только «рубли»). Не выдумывай цифры — бери только из фактов.
Пиши «ребята»/«школьники»/«подростки»/«ребёнок» в меру. Ключевой запрос вплетай естественно, не более одного раза на абзац. Тон ровный, повествовательный — будто рассказываешь подруге, а не продаёшь.`;

  const user = `Запрос страницы: "${keyword}" (slug: ${slug}).
Факты бренда (единственный источник цифр):
${FACTS}
${lsi.length?`Доп. контекст из базы знаний:\n${lsi.join('\n').slice(0,1200)}`:''}

Сгенерируй УНИКАЛЬНЫЙ блок именно под этот запрос (не общий шаблон). Верни строгий JSON:
{
  "s1_h2": "заголовок 1-й секции, релевантный запросу (без слова 'SEO', без восклицательного знака)",
  "s1_p": ["абзац 1 (55-85 слов)", "абзац 2 (55-85 слов)", "абзац 3 (55-85 слов)"],
  "s2_h2": "заголовок 2-й секции",
  "s2_items": ["пункт 1", "пункт 2", "пункт 3", "пункт 4", "пункт 5"]
}
Текст должен отвечать на интент запроса и быть полезным родителю. Если запрос — название другого лагеря/места, мягко покажи почему АйДаКемп подойдёт, без критики конкурента. Без восклицательных знаков.`;

  for(let attempt=0; attempt<3; attempt++){
    let data;
    try { data = await chat([{role:'system',content:sys},{role:'user',content:user + (attempt? '\nВАЖНО: в прошлый раз были нарушения (восклицания/запрещённые слова/мало текста) — перепиши спокойнее и подробнее.':'')}], 0.6); }
    catch(e){ console.log(`    ⚠ LLM ошибка: ${e.message}`); return null; }

    const p = Array.isArray(data.s1_p)? data.s1_p.filter(Boolean):[];
    const items = Array.isArray(data.s2_items)? data.s2_items.filter(Boolean):[];
    const allText = [data.s1_h2, ...p, data.s2_h2, ...items].join(' ');
    const words = allText.split(/\s+/).filter(Boolean).length;

    if(!data.s1_h2 || p.length<3 || !data.s2_h2 || items.length<4){ console.log('    ⚠ неполный JSON, ретрай'); continue; }
    if(BANNED.test(allText)){ console.log('    ⚠ запрещённые слова, ретрай'); continue; }
    if((allText.match(/!/g)||[]).length > 0){ console.log('    ⚠ восклицания, ретрай'); continue; }
    if(words < 160){ console.log(`    ⚠ мало слов (${words}), ретрай`); continue; }
    if(/\{\{/.test(allText)){ console.log('    ⚠ плейсхолдеры в выводе, ретрай'); continue; }

    const html = `

  ${MARKER}
  <section class="mx-auto max-w-[720px] px-4 py-8 prose prose-lg max-w-none text-body-muted leading-relaxed">
    <h2 class="text-[22px] md:text-[28px] font-bold text-body mb-4">${esc(cap(data.s1_h2))}</h2>
    ${p.map(x=>`<p>${esc(x)}</p>`).join('\n    ')}
    <h2 class="text-[22px] md:text-[28px] font-bold text-body mb-4 mt-8">${esc(cap(data.s2_h2))}</h2>
    <ul class="space-y-2">
      ${items.map(x=>`<li>${esc(x)}</li>`).join('\n      ')}
    </ul>
  </section>`;
    return { html, words };
  }
  return null;
}

async function main(){
  if(!OPENAI_KEY){ console.error('FATAL: нет OPENAI_API_KEY'); process.exit(1); }
  const client = getDbClient();
  await client.connect();

  const where = ONLY_SLUG ? `target_slug=$2` : `status='pending' AND target_thin=true AND target_slug IS NOT NULL`;
  const params = ONLY_SLUG ? [LIMIT, ONLY_SLUG] : [LIMIT];
  const {rows} = await client.query(`
    SELECT keyword, current_position, target_slug FROM seo_url_switch_map
    WHERE ${where} ORDER BY current_position ASC LIMIT $1
  `, params);

  console.log(`Кандидатов на усиление: ${rows.length}${ONLY_SLUG?` (slug=${ONLY_SLUG})`:' (тонкие цели зоны удара)'}`);
  let done=0, skip=0;
  const touched=[];

  for(const r of rows){
    const file = path.join(PAGES_DIR, `${r.target_slug}.astro`);
    if(!fs.existsSync(file)){ console.log(`  ⚠ нет файла ${r.target_slug}`); skip++; continue; }
    let content = fs.readFileSync(file,'utf8');
    if(content.includes(MARKER)){ console.log(`  ↩ ${r.target_slug} уже усилена (v2)`); skip++; continue; }

    const lsi = await ragContext(client, r.keyword);
    const gen = await generateUniqueSection(r.keyword, r.target_slug, lsi);
    if(!gen){ console.log(`  ✖ ${r.target_slug}: генерация не прошла валидацию, пропуск`); skip++; continue; }

    let newContent;
    if(content.includes('</LandingLayout>')){ newContent = content.replace('</LandingLayout>', `${gen.html}\n</LandingLayout>`); }
    else if(content.includes('</main>')){ newContent = content.replace('</main>', `${gen.html}\n  </main>`); }
    else { console.log(`  ⚠ ${r.target_slug}: некуда вставить`); skip++; continue; }

    console.log(`  ✅ [${r.current_position}] ${r.keyword} → ${r.target_slug} (+${gen.words} слов, RAG: ${lsi.length})`);
    if(SHOW) console.log(gen.html.replace(/\n\s*/g,' ').slice(0, 600)+'…\n');
    if(APPLY){
      fs.writeFileSync(file, newContent, 'utf8');
      await client.query(`UPDATE seo_url_switch_map SET status='strengthened', updated_at=NOW() WHERE keyword=$1`,[r.keyword]);
    }
    touched.push(r.target_slug); done++;
  }

  console.log(`\nУсилено: ${done}, пропущено: ${skip}`);
  if(APPLY && touched.length) console.log('Файлы:', touched.join(', '));
  else if(!APPLY) console.log('(dry-run — добавь --apply)');
  await client.end();
}
main().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
