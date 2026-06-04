#!/usr/bin/env node
/**
 * measure-performance.js — петля измерения SEO-фабрики
 * Запуск: node measure-performance.js   (крон, раз в день после ETL позиций)
 *
 * Что делает:
 * 1. Для каждой страницы из seo_factory_log берёт текущую позицию из seo_positions
 * 2. Фиксирует «до» (на момент создания) и «сейчас» → дельта
 * 3. Пишет в seo_page_performance — какой шаблон/тип дал какой результат
 * 4. Эти данные потом читает enrichFromRAG (фабрика учится на успешных паттернах)
 */
'use strict';
const fs = require('fs');
const { Client } = require('pg');

const LOG_FILE = '/var/log/seo-measure.log';
function log(m){const t=new Date().toISOString().replace('T',' ').slice(0,19);const l=`${t} — ${m}`;console.log(l);try{fs.appendFileSync(LOG_FILE,l+'\n');}catch{}}

function getDbClient(){
  const env = fs.readFileSync('/opt/aidacamp-tools/mcp/.env','utf8');
  const conn = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim() || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
  return new Client({connectionString: conn});
}

async function main(){
  log('=== Measure performance запуск ===');
  const client = getDbClient();
  await client.connect();
  try {
    // Таблица результатов
    await client.query(`
      CREATE TABLE IF NOT EXISTS seo_page_performance (
        id            SERIAL PRIMARY KEY,
        slug          TEXT NOT NULL,
        main_keyword  TEXT,
        template      TEXT,
        created_date  DATE,
        measured_date DATE NOT NULL,
        days_live     INT,
        position      INT,           -- текущая позиция (yandex_mobile), NULL = вне ТОП-100
        best_position INT,           -- лучшая за всё время наблюдения
        in_index      BOOLEAN,       -- появилась ли в индексе вообще
        UNIQUE(slug, measured_date)
      )
    `);

    const today = (await client.query('SELECT CURRENT_DATE::text AS d')).rows[0].d;
    const lastPosDate = (await client.query('SELECT MAX(date)::text AS d FROM seo_positions')).rows[0].d;

    // Все страницы фабрики + дата создания
    const { rows: pages } = await client.query(`
      SELECT slug, MIN(main_keyword) AS main_keyword, MIN(template) AS template, MIN(run_date) AS created_date
      FROM seo_factory_log GROUP BY slug
    `);

    let measured = 0, indexed = 0;
    for (const p of pages) {
      // Текущая позиция по главному ключу
      const { rows: pos } = await client.query(`
        SELECT position FROM seo_positions
        WHERE keyword = $1 AND searcher = 'yandex_mobile' AND date = $2 AND position IS NOT NULL
        ORDER BY position ASC LIMIT 1
      `, [p.main_keyword, lastPosDate]);

      const position = pos.length ? pos[0].position : null;
      const inIndex = position !== null;
      if (inIndex) indexed++;

      // Лучшая позиция за всё время
      const { rows: best } = await client.query(`
        SELECT MIN(position) AS best FROM seo_positions
        WHERE keyword = $1 AND searcher = 'yandex_mobile' AND position IS NOT NULL
          AND date >= $2
      `, [p.main_keyword, p.created_date]);

      const daysLive = Math.round((new Date(today) - new Date(p.created_date)) / 86400000);

      await client.query(`
        INSERT INTO seo_page_performance
          (slug, main_keyword, template, created_date, measured_date, days_live, position, best_position, in_index)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (slug, measured_date) DO UPDATE
          SET position=$7, best_position=$8, in_index=$9, days_live=$6
      `, [p.slug, p.main_keyword, p.template, p.created_date, today, daysLive, position, best.length?best[0].best:null, inIndex]);
      measured++;
    }

    log(`Замерено ${measured} страниц, в индексе: ${indexed}/${measured}`);

    // Сводка по шаблонам (что работает лучше) — для обратной связи фабрике
    const { rows: byTpl } = await client.query(`
      SELECT template,
             COUNT(*) AS pages,
             COUNT(*) FILTER (WHERE in_index) AS indexed,
             ROUND(AVG(position) FILTER (WHERE in_index), 1) AS avg_pos
      FROM seo_page_performance
      WHERE measured_date = $1
      GROUP BY template
    `, [today]);
    for (const t of byTpl) {
      log(`  шаблон ${t.template}: ${t.indexed}/${t.pages} в индексе, ср.позиция ${t.avg_pos || '—'}`);
    }

    log('=== Готово ===');
  } finally {
    await client.end();
  }
}
main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
