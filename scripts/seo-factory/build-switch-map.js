#!/usr/bin/env node
/**
 * build-switch-map.js — строит карту «переключения URL»
 *
 * Проблема: 75 запросов ранжируются на главной /. Главную тянет в разные стороны.
 * Решение: для каждого запроса с главной найти существующую выделенную страницу,
 *          куда ранжирование надо перенести.
 *
 * Заполняет seo_url_switch_map: keyword, current_url, target_url, target_exists, match_score, status.
 * Запуск: node build-switch-map.js [--apply]   (без --apply = dry-run, только показать)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const PAGES_DIR = '/opt/aidacamp-site/src/pages';
const APPLY = process.argv.includes('--apply');

function getDbClient(){
  const env = fs.readFileSync('/opt/aidacamp-tools/mcp/.env','utf8');
  const conn = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim() || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
  return new Client({connectionString: conn});
}

// Транслит ключа → токены латиницей (для сравнения со slug)
function translit(s){
  const m={'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sh','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
  return s.toLowerCase().split('').map(c=>m[c]??c).join('').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
}
// Стоп-слова (не несут различающего смысла для матчинга)
const STOP = new Set(['v','na','dlya','i','s','po','k','dlja']); // только связки

function slugTokens(slug){
  return slug.replace(/-/g,' ').split(' ').filter(Boolean);
}

// Скор совпадения запроса и slug: доля значимых токенов запроса, покрытых slug
function score(kwTokens, slugTok){
  const sig = kwTokens.filter(t => !STOP.has(t) && t.length>2);
  if (!sig.length) return 0;
  const slugSet = new Set(slugTok);
  const hit = sig.filter(t => slugSet.has(t)).length;
  // бонус если slug целиком содержит интент
  return hit / sig.length;
}

async function main(){
  const client = getDbClient();
  await client.connect();

  // существующие страницы (плоские слаги, без статей/сервисных)
  const pages = fs.readdirSync(PAGES_DIR)
    .filter(f => f.endsWith('.astro'))
    .map(f => f.replace('.astro',''))
    .filter(s => !['index','404','design-v2','lanit-v5','lanit-v6','audit-portal','audit-portal-security','ostavit-otzyv'].includes(s));
  const pageTok = pages.map(p => ({slug:p, tok:slugTokens(p)}));

  // запросы на главной в ТОП-30
  const { rows } = await client.query(`
    SELECT keyword, position::int AS pos
    FROM seo_position_snapshots
    WHERE domain='aidacamp.ru' AND snapshot_date=(SELECT MAX(snapshot_date) FROM seo_position_snapshots)
      AND position BETWEEN 1 AND 30
      AND page_url IN ('https://aidacamp.ru/','https://aidacamp.ru')
    ORDER BY pos ASC
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS seo_url_switch_map (
      id SERIAL PRIMARY KEY,
      keyword TEXT UNIQUE NOT NULL,
      current_position INT,
      current_url TEXT DEFAULT '/',
      target_slug TEXT,
      target_url TEXT,
      match_score NUMERIC,
      status TEXT DEFAULT 'pending',   -- pending | linked | switched | no_target | keep_home
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const results = [];
  for (const r of rows){
    const kwTok = translit(r.keyword);
    let best = {slug:null, sc:0};
    for (const p of pageTok){
      const sc = score(kwTok, p.tok);
      if (sc > best.sc) best = {slug:p.slug, sc};
    }
    // head-запрос остаётся на главной (короткий, общий) — порог
    let status, targetSlug, targetUrl;
    if (best.sc >= 0.6) { status='pending'; targetSlug=best.slug; targetUrl=`/${best.slug}/`; }
    else if (best.sc >= 0.4) { status='review'; targetSlug=best.slug; targetUrl=`/${best.slug}/`; }
    else { status='no_target'; targetSlug=null; targetUrl=null; }

    results.push({keyword:r.keyword, pos:r.pos, targetSlug, targetUrl, score:best.sc, status});

    if (APPLY){
      await client.query(`
        INSERT INTO seo_url_switch_map (keyword, current_position, target_slug, target_url, match_score, status, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT (keyword) DO UPDATE SET current_position=$2, target_slug=$3, target_url=$4, match_score=$5, status=
          CASE WHEN seo_url_switch_map.status IN ('linked','switched') THEN seo_url_switch_map.status ELSE $6 END,
          updated_at=NOW()
      `, [r.keyword, r.pos, targetSlug, targetUrl, best.sc.toFixed(2), status]);
    }
  }

  // вывод
  const byStatus = {};
  for (const r of results){ byStatus[r.status]=(byStatus[r.status]||0)+1; }
  console.log('Запросов с главной (ТОП-30):', results.length);
  console.log('По статусам:', JSON.stringify(byStatus));
  console.log('\n=== Готовы к переключению (pending) ===');
  for (const r of results.filter(r=>r.status==='pending')){
    console.log(`  [${r.pos}] ${r.keyword}  →  ${r.targetUrl}  (score ${r.score.toFixed(2)})`);
  }
  console.log('\n=== Нет целевой страницы (no_target) — кандидаты на создание ===');
  for (const r of results.filter(r=>r.status==='no_target')){
    console.log(`  [${r.pos}] ${r.keyword}`);
  }
  console.log('\n=== Остаются на главной (keep_home) ===');
  for (const r of results.filter(r=>r.status==='keep_home')){
    console.log(`  [${r.pos}] ${r.keyword}`);
  }

  if (APPLY) console.log('\n✅ Записано в seo_url_switch_map');
  else console.log('\n(dry-run — добавь --apply чтобы записать)');
  await client.end();
}
main().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
