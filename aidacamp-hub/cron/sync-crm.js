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
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function httpsPost(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = JSON.stringify(data);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers },
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
    req.write(body);
    req.end();
  });
}

async function sendTelegram(msg) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await httpsPost(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML',
    });
  } catch (e) { /* silent */ }
}

async function getToken(pool, key) {
  const r = await pool.query(
    "SELECT value FROM variables_vault WHERE key = $1 AND status = 'active' LIMIT 1",
    [key]
  );
  return r.rows[0]?.value || null;
}

// Получить JWT токен AlfaCRM
async function getAlfaToken(hostname, email, apiKey) {
  const res = await httpsPost(
    `https://${hostname}/v2api/auth/login`,
    { email, api_key: apiKey }
  );
  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`AlfaCRM auth failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

// Получить клиентов из филиала с пагинацией
async function fetchClients(hostname, token, branchId, page = 0) {
  const res = await httpsPost(
    `https://${hostname}/v2api/${branchId}/customer/index`,
    { page, per_page: 50 },
    { 'X-ALFACRM-TOKEN': token }
  );
  if (res.status !== 200) throw new Error(`CRM clients ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body;
}

async function syncProject(pool, projectId, hostname, email, apiKey, branchId, token) {
  console.log(`  Syncing CRM for ${projectId} (branch=${branchId})...`);
  let page = 0;
  let total = 0;
  let inserted = 0;
  const maxPages = 20;

  while (page < maxPages) {
    const data = await fetchClients(hostname, token, branchId, page);
    const items = data.items || [];
    if (items.length === 0) break;
    total = data.total || total;

    for (const client of items) {
      await pool.query(`
        INSERT INTO crm_clients (project_id, client_id, client_name, phone, email, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (project_id, client_id) DO UPDATE
          SET client_name = EXCLUDED.client_name,
              phone = EXCLUDED.phone,
              email = EXCLUDED.email,
              status = EXCLUDED.status
      `, [
        projectId,
        String(client.id),
        client.name || '',
        (client.phone || []).join(',').slice(0,20),
        (client.email || '').slice(0,255),
        client.removed == 1 ? 'archived' : (client.is_study ? 'student' : 'lead'),
      ]);
      inserted++;
    }

    page++;
    if (items.length < 50) break;
  }

  console.log(`  OK ${projectId}: ${inserted} clients (total in CRM: ${total})`);
  return inserted;
}

async function main() {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] Starting CRM sync...`);
  const pool = new Pool(DB_CONFIG);

  try {
    const hostname = await getToken(pool, 'ALFACRM_HOSTNAME');
    const email    = await getToken(pool, 'ALFACRM_EMAIL');
    const apiKey   = await getToken(pool, 'ALFACRM_API_KEY');
    const branchCodims    = await getToken(pool, 'ALFACRM_BRANCH_CODIMS')    || '1';
    const branchAidacamp  = await getToken(pool, 'ALFACRM_BRANCH_AIDACAMP') || '5';

    if (!apiKey || !hostname) {
      console.log('No CRM token found, skipping');
      return;
    }

    // Один токен авторизации для всех проектов
    const jwtToken = await getAlfaToken(hostname, email, apiKey);
    console.log(`  Auth OK, token received`);

    let totalRecords = 0;

    // CoDims — филиал 1
    const r1 = await syncProject(pool, 'codims', hostname, email, apiKey, branchCodims, jwtToken);
    totalRecords += r1;

    // AidaCamp — филиал 5
    const r2 = await syncProject(pool, 'aidacamp', hostname, email, apiKey, branchAidacamp, jwtToken);
    totalRecords += r2;

    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] CRM sync done in ${ms}ms (${totalRecords} records)`);

    await pool.query(`
      INSERT INTO sync_log (tool_name, project_id, status, records_processed, duration_ms, started_at)
      VALUES ('sync-crm', NULL, 'success', $1, $2, NOW())
    `, [totalRecords, ms]);

  } catch (err) {
    console.error('Fatal error:', err.message);
    await sendTelegram(`❌ <b>CRM sync failed</b>\n${err.message}`);
    try {
      await pool.query(
        "INSERT INTO sync_log (tool_name, status, error_message, started_at) VALUES ('sync-crm','error',$1,NOW())",
        [err.message]
      );
    } catch {}
  } finally {
    await pool.end();
  }
}

main();
