#!/usr/bin/env node
/**
 * sync-vk.js — синхронизация статистики VK Ads
 * OAuth2 client_credentials → кеш токена в variables_vault → API calls
 */

import pg from 'pg';
import https from 'https';
import { URLSearchParams } from 'url';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'aidacamp_hub',
  user: process.env.DB_USER || 'aidacamp_app',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
});

function httpsRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getVarVault(client, key) {
  const r = await client.query(
    'SELECT value FROM variables_vault WHERE key = $1 LIMIT 1',
    [key]
  );
  return r.rows[0]?.value || null;
}

async function setVarVault(client, key, value) {
  await client.query(`
    INSERT INTO variables_vault (key, value, instrument, status)
    VALUES ($1, $2, 'vk', 'ok')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `, [key, value]);
}

async function getToken(client, clientId, clientSecret) {
  // Проверяем кешированный токен
  const cached = await getVarVault(client, 'VK_ACCESS_TOKEN');
  const cachedAt = await getVarVault(client, 'VK_ACCESS_TOKEN_TS');

  if (cached && cachedAt) {
    const age = Date.now() - parseInt(cachedAt, 10);
    // Токен живёт 24ч, используем если моложе 23ч
    if (age < 23 * 3600 * 1000) {
      console.log('Используем кешированный VK токен');
      return cached;
    }
  }

  console.log('Получаем новый VK OAuth2 токен...');
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'read_ads,create_ads,read_payments',
  });

  const res = await httpsRequest(
    'https://ads.vk.com/api/v2/oauth2/token.json',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
    params.toString()
  );

  if (res.status !== 200 || !res.body.access_token) {
    throw new Error(`VK OAuth failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  const token = res.body.access_token;
  // Кешируем токен
  await setVarVault(client, 'VK_ACCESS_TOKEN', token);
  await setVarVault(client, 'VK_ACCESS_TOKEN_TS', Date.now().toString());
  console.log('Новый токен получен и закеширован');
  return token;
}

async function vkGet(token, path) {
  const res = await httpsRequest(
    `https://ads.vk.com${path}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return { status: res.status, body: res.body };
}

async function fetchStats(token, accountId, planIds, dateStr) {
  // Пробуем несколько форматов эндпоинта статистики
  const endpoints = [
    `/api/v2/statistics/ad_plans/${dateStr}/${dateStr}.json?account_id=${accountId}&ids=${planIds}`,
    `/api/v2/statistics/ad_plans.json?account_id=${accountId}&ids=${planIds}&date_from=${dateStr}&date_to=${dateStr}`,
    `/api/v2/statistics/ad_plans?account_id=${accountId}&ids=${planIds}&date_from=${dateStr}&date_to=${dateStr}`,
  ];

  for (const ep of endpoints) {
    const r = await vkGet(token, ep);
    if (r.status === 200 && !r.body?.error) {
      console.log(`Статистика получена через: ${ep.split('?')[0]}`);
      return r.body?.items || r.body || [];
    }
    console.log(`Статистика ${ep.split('?')[0]} → ${r.status}: ${r.body?.error?.message || r.body?.error?.code || 'skip'}`);
  }

  console.log('Статистика недоступна — записываем нули');
  return [];
}

async function upsertProject(client, slug) {
  const r = await client.query('SELECT id FROM projects WHERE slug = $1', [slug]);
  if (r.rows.length) return r.rows[0].id;
  const ins = await client.query(
    'INSERT INTO projects(name, slug) VALUES($1, $2) RETURNING id',
    [slug, slug]
  );
  return ins.rows[0].id;
}

async function main() {
  const startedAt = new Date();
  let recordsProcessed = 0;
  let logStatus = 'ok';
  let logError = null;

  const client = await pool.connect();
  try {
    const vkClientId     = await getVarVault(client, 'VK_CLIENT_ID');
    const vkClientSecret = await getVarVault(client, 'VK_CLIENT_SECRET');
    const accountId      = '29700362';

    if (!vkClientId || !vkClientSecret) {
      throw new Error('VK_CLIENT_ID или VK_CLIENT_SECRET не найдены в variables_vault');
    }

    const token = await getToken(client, vkClientId, vkClientSecret);

    // Список кампаний (ad_plans)
    const plansRes = await vkGet(token, `/api/v2/ad_plans.json?account_id=${accountId}`);
    if (plansRes.status !== 200 || plansRes.body?.error) {
      throw new Error(`Кампании VK: ${JSON.stringify(plansRes.body)}`);
    }

    const plans = plansRes.body?.items || plansRes.body || [];
    console.log(`Найдено ${plans.length} кампаний VK`);

    // Дата — вчера
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    // Статистика (опциональная)
    const planIds = plans.map(p => p.id).join(',');
    let statsItems = [];
    if (planIds) {
      statsItems = await fetchStats(token, accountId, planIds, dateStr);
    }

    // Map: plan_id → stats
    const statsMap = {};
    for (const s of statsItems) {
      const id = s.id || s.plan_id || s.ad_plan_id;
      if (id) statsMap[String(id)] = s;
    }

    const projectId = await upsertProject(client, 'aidacamp');

    for (const plan of plans) {
      const s = statsMap[String(plan.id)] || {};
      const row = s.stats?.[0] || s.stat || s;

      const spent       = parseFloat(row.spent || row.cost || row.money_spent || 0);
      const impressions = parseInt(row.impressions || row.shows || 0, 10);
      const clicks      = parseInt(row.clicks || row.click || 0, 10);
      const ctr         = impressions > 0 ? (clicks / impressions * 100) : 0;
      const cpc         = clicks > 0 ? (spent / clicks) : 0;

      await client.query(`
        INSERT INTO vk_stats
          (project_id, campaign_id, campaign_name, stat_date, clicks, impressions, spent, ctr, cpc)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (campaign_id, stat_date) DO UPDATE SET
          clicks = EXCLUDED.clicks,
          impressions = EXCLUDED.impressions,
          spent = EXCLUDED.spent,
          ctr = EXCLUDED.ctr,
          cpc = EXCLUDED.cpc,
          updated_at = now()
      `, [
        projectId,
        plan.id.toString(),
        plan.name || plan.title || '',
        dateStr,
        clicks,
        impressions,
        spent,
        ctr,
        cpc,
      ]);
      recordsProcessed++;
    }

    console.log(`Записано ${recordsProcessed} кампаний за ${dateStr}`);

  } catch (err) {
    logStatus = 'error';
    logError = err.message;
    console.error('Ошибка sync-vk:', err.message);
  } finally {
    try {
      await client.query(`
        INSERT INTO sync_log (tool_name, project_id, records_processed, started_at, status, error_message)
        VALUES ($1, NULL, $2, $3, $4, $5)
      `, ['sync-vk', recordsProcessed, startedAt, logStatus, logError]);
    } catch (e) {
      console.error('Ошибка записи sync_log:', e.message);
    }
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
