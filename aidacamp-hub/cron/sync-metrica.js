const { Pool } = require('pg');

const DB_CONFIG = {
  user: process.env.DB_USER || 'aidacamp_app',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: 'aidacamp_hub'
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `⚠️ Metrica Sync Error:\n${message}` });
  const https = require('https');
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, resolve);
    req.on('error', () => resolve());
    req.write(body);
    req.end();
  });
}

async function getMetricaStats(counterId, token, dateFrom, dateTo) {
  const https = require('https');
  const url = `https://api-metrica.yandex.net/stat/v1/data?ids=${counterId}&metrics=ym:s:visits,ym:s:pageviews,ym:s:bounceRate&date1=${dateFrom}&date2=${dateTo}&limit=1`;

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: { 'Authorization': `OAuth ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Metrica API error: ${res.statusCode} - ${data.substring(0, 200)}`));
        } else {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Invalid JSON from Metrica API')); }
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Metrica API timeout')); });
    req.end();
  });
}

async function syncMetrica() {
  console.log(`[${new Date().toISOString()}] 📊 Starting Metrica sync...`);
  const pool = new Pool(DB_CONFIG);
  const startTime = Date.now();

  try {
    // Получить проекты с конфигом Метрики
    const projectsResult = await pool.query(`
      SELECT p.id as project_id, pc.config_value as counter_id, vv.value as token
      FROM projects p
      JOIN project_config pc ON p.id = pc.project_id AND pc.config_key = 'metrica_id'
      LEFT JOIN variables_vault vv ON vv.key ILIKE '%METRICA%TOKEN%' AND vv.status = 'active'
      WHERE p.status = 'active'
    `);

    if (projectsResult.rows.length === 0) {
      console.log('No Metrica projects configured, skipping');
      return { success: true, records: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    let totalRecords = 0;
    let totalInserted = 0;

    for (const row of projectsResult.rows) {
      const { project_id, counter_id, token } = row;

      if (!token) {
        console.log(`  ⚠️  No token for ${project_id}, skipping`);
        continue;
      }

      try {
        console.log(`  Syncing ${project_id} (counter=${counter_id})...`);
        const data = await getMetricaStats(counter_id, token, today, today);

        const visits = data?.totals?.[0] || 0;
        const pageviews = data?.totals?.[1] || 0;
        const bounceRate = data?.totals?.[2] || 0;

        await pool.query(`
          INSERT INTO metrics_stats (project_id, metric_date, visits, conversion_rate)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (project_id, metric_date, goal_id) DO UPDATE
          SET visits = $3, conversion_rate = $4, created_at = NOW()
        `, [project_id, today, visits, bounceRate]);

        totalInserted++;
        totalRecords++;
        console.log(`  ✅ ${project_id}: visits=${visits}, bounce=${bounceRate}%`);

      } catch (err) {
        console.error(`  ❌ ${project_id}: ${err.message}`);
        await pool.query(`
          INSERT INTO sync_log (project_id, tool_name, status, error_message, duration_ms, completed_at)
          VALUES ($1, 'metrica', 'error', $2, $3, NOW())
        `, [project_id, err.message, Date.now() - startTime]);
        await sendTelegramAlert(`Metrica sync failed for ${project_id}: ${err.message}`);
      }
    }

    // Логировать общий успех
    await pool.query(`
      INSERT INTO sync_log (tool_name, status, records_processed, records_inserted, duration_ms, completed_at)
      VALUES ('metrica', 'success', $1, $2, $3, NOW())
    `, [totalRecords, totalInserted, Date.now() - startTime]);

    console.log(`[${new Date().toISOString()}] ✅ Metrica sync done in ${Date.now() - startTime}ms (${totalInserted} records)\n`);
    return { success: true, records: totalInserted };

  } catch (error) {
    console.error('Fatal error:', error.message);
    await sendTelegramAlert(`FATAL Metrica sync: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  syncMetrica().catch(error => {
    console.error('❌ Unhandled error:', error.message);
    process.exit(1);
  });
}

module.exports = { syncMetrica };
