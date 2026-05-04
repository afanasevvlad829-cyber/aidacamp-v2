const { Pool } = require('pg');
const https = require('https');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'aidacamp_app',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'aidacamp_hub',
};
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

function directPost(token, method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ method: 'get', params });
    const opts = {
      hostname: 'api.direct.yandex.com',
      path: `/json/v5/${method}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Accept-Language': 'ru',
      },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch { resolve({ status: res.statusCode, body: raw }); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function getToken(pool, key) {
  const r = await pool.query("SELECT value FROM variables_vault WHERE key=$1 AND status='active' LIMIT 1", [key]);
  return r.rows[0]?.value || null;
}

const getProject = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('codims') || n.includes('кодим') || n.includes('алгоритмика')) return 'codims';
  return 'aidacamp';
};

async function main() {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] Starting Direct sync...`);
  const pool = new Pool(DB_CONFIG);
  try {
    const token = await getToken(pool, 'DIRECT_TOKEN');
    if (!token) { console.log('No DIRECT_TOKEN, skipping'); return; }

    // Шаг 1: список кампаний
    const campRes = await directPost(token, 'campaigns', {
      SelectionCriteria: { States: ['ON', 'OFF', 'SUSPENDED', 'ENDED'] },
      FieldNames: ['Id', 'Name', 'Status', 'State'],
      Page: { Limit: 100 },
    });
    if (campRes.body?.error) throw new Error(`Campaigns: ${campRes.body.error.error_string}`);
    const campaigns = campRes.body?.result?.Campaigns || [];
    console.log(`  Кампаний: ${campaigns.length}`);

    // Шаг 2: статистика за последние 7 дней
    const today = new Date();
    const date2 = today.toISOString().slice(0, 10);
    const date1 = new Date(today - 7 * 86400000).toISOString().slice(0, 10);

    const statRes = await directPost(token, 'campaigns', {
      SelectionCriteria: { States: ['ON', 'OFF', 'SUSPENDED', 'ENDED'] },
      FieldNames: ['Id', 'Name', 'Statistics'],
      DateRange: { From: date1, To: date2, IncludeVAT: 'YES' },
      Page: { Limit: 100 },
    });

    const statsMap = {};
    for (const c of statRes.body?.result?.Campaigns || []) {
      statsMap[c.Id] = c.Statistics || {};
    }

    let synced = 0;
    for (const camp of campaigns) {
      const project = getProject(camp.Name);
      const stats = statsMap[camp.Id] || {};
      const clicks = parseInt(stats.Clicks || 0);
      const impressions = parseInt(stats.Impressions || 0);
      const spent = parseFloat((stats.Cost || 0) / 1000000).toFixed(2); // микрорубли → рубли
      const ctr = impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0;
      const cpc = clicks > 0 ? parseFloat((spent / clicks).toFixed(2)) : 0;

      await pool.query(`
        INSERT INTO direct_stats (project_id, campaign_id, campaign_name, stat_date, clicks, impressions, spent, ctr, cpc)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (project_id, campaign_id, stat_date) DO UPDATE
          SET campaign_name=$3, clicks=$5, impressions=$6, spent=$7, ctr=$8, cpc=$9
      `, [project, String(camp.Id), camp.Name, date2, clicks, impressions, spent, ctr, cpc]);

      const icon = camp.State === 'ON' ? '▶' : '⏸';
      console.log(`  ${icon} ${camp.Id} [${camp.State}] ${camp.Name.slice(0, 45)} | клики=${clicks} расход=${spent}₽`);
      synced++;
    }

    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] Direct sync done in ${ms}ms (${synced} кампаний)`);
    await pool.query(
      "INSERT INTO sync_log (tool_name, status, records_processed, duration_ms, started_at) VALUES ('sync-direct','success',$1,$2,NOW())",
      [synced, ms]
    );
  } catch (err) {
    console.error('Fatal error:', err.message);
    try { await pool.query("INSERT INTO sync_log (tool_name, status, error_message, started_at) VALUES ('sync-direct','error',$1,NOW())", [err.message]); } catch {}
  } finally { await pool.end(); }
}
main();
