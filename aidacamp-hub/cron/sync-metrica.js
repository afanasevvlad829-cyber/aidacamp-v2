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

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers,
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function sendTelegram(msg) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const urlObj = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`);
  const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML' });
  const req = https.request({ hostname: urlObj.hostname, path: urlObj.pathname, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, () => {});
  req.on('error', () => {});
  req.write(body);
  req.end();
}

async function getToken(pool, key) {
  const r = await pool.query(
    "SELECT value FROM variables_vault WHERE key = $1 AND status = 'active' LIMIT 1", [key]
  );
  return r.rows[0]?.value || null;
}

async function fetchMetrika(token, counterId, date1, date2, metrics) {
  const params = new URLSearchParams({
    ids: counterId,
    date1,
    date2,
    metrics,
    accuracy: 'full',
  });
  const res = await httpsGet(
    `https://api-metrika.yandex.net/stat/v1/data?${params}`,
    { Authorization: `OAuth ${token}`, 'Accept': 'application/json' }
  );
  if (res.status !== 200) throw new Error(`Metrika API ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
  return res.body;
}

async function syncProject(pool, projectId, token, counterId) {
  const today = new Date();
  const date2 = today.toISOString().slice(0, 10);
  const date1 = new Date(today - 7 * 86400000).toISOString().slice(0, 10);

  console.log(`  Syncing Metrika for ${projectId} (counter=${counterId}) ${date1}→${date2}...`);

  const data = await fetchMetrika(token, counterId, date1, date2,
    'ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds'
  );

  const totals = data.totals || [];
  const [visits=0, users=0, bounceRate=0, pageDepth=0, avgDuration=0] = totals;

  await pool.query(`
        INSERT INTO metrics_stats (project_id, metric_date, visits, conversions, conversion_rate, revenue, created_at)
        VALUES ($1, $2, $3, 0, 0, 0, NOW())
        ON CONFLICT (project_id, metric_date, goal_id) DO UPDATE
          SET visits = EXCLUDED.visits, created_at = NOW()
      `, [projectId, date2, Math.round(visits)]);

  console.log(`  OK ${projectId}: visits=${Math.round(visits)} users=${Math.round(users)} bounce=${bounceRate.toFixed(1)}%`);
  return 1;
}

async function main() {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] 📊 Starting Metrica sync...`);
  const pool = new Pool(DB_CONFIG);

  try {
    const token          = await getToken(pool, 'METRIKA_TOKEN');
    const counterAida    = await getToken(pool, 'METRIKA_COUNTER_AIDACAMP') || await getToken(pool, 'METRIKA_COUNTER');
    const counterCodims  = await getToken(pool, 'METRIKA_COUNTER_CODIMS');

    if (!token) { console.log('  No METRIKA_TOKEN, skipping'); return; }

    let total = 0;

    if (counterAida) {
      total += await syncProject(pool, 'aidacamp', token, counterAida);
    } else {
      console.log('  ⚠️  No counter for aidacamp, skipping');
    }

    if (counterCodims) {
      total += await syncProject(pool, 'codims', token, counterCodims);
    } else {
      console.log('  ⚠️  No counter for codims, skipping');
    }

    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ✅ Metrica sync done in ${ms}ms (${total} records)`);

    await pool.query(`
      INSERT INTO sync_log (tool_name, project_id, status, records_processed, duration_ms, started_at)
      VALUES ('sync-metrica', NULL, 'success', $1, $2, NOW())
    `, [total, ms]);

  } catch (err) {
    console.error('Fatal error:', err.message);
    await sendTelegram(`❌ <b>Metrika sync failed</b>\n${err.message}`);
    try {
      await pool.query(
        "INSERT INTO sync_log (tool_name, status, error_message, started_at) VALUES ('sync-metrica','error',$1,NOW())",
        [err.message]
      );
    } catch {}
  } finally {
    await pool.end();
  }
}

main();
