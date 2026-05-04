const { Pool } = require('pg');
const https = require('https');

const DB_CONFIG = {
  user: process.env.DB_USER || 'aidacamp_app',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: 'aidacamp_hub'
};

function makeRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function getCRMClients(token, branchId, page = 0) {
  const body = JSON.stringify({
    page,
    per_page: 50,
    status: 1
  });

  const url = new URL(`https://n${branchId}.alfacrm.pro/api/v1/customer/`);
  const res = await makeRequest(url.toString(), {
    method: 'POST',
    headers: {
      'X-ALFACRM-TOKEN': token,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);

  if (res.status !== 200) {
    throw new Error(`AlfaCRM API error: ${res.status}`);
  }

  const parsed = JSON.parse(res.data);
  return parsed;
}

async function syncCRM() {
  console.log(`[${new Date().toISOString()}] Starting CRM sync...`);
  const pool = new Pool(DB_CONFIG);
  const startTime = Date.now();

  try {
    // Получить токен и branch_id из variables_vault
    const tokenResult = await pool.query(`
      SELECT value FROM variables_vault 
      WHERE key ILIKE '%ALFA%TOKEN%' OR key ILIKE '%CRM%TOKEN%' AND status = 'active'
      LIMIT 1
    `);

    const branchResult = await pool.query(`
      SELECT value FROM variables_vault 
      WHERE key ILIKE '%CRM%BRANCH%' OR key ILIKE '%ALFA%BRANCH%' AND status = 'active'
      LIMIT 1
    `);

    if (tokenResult.rows.length === 0) {
      console.log('No CRM token found, skipping');
      return { success: true, records: 0 };
    }

    const token = tokenResult.rows[0].value;
    const branchId = branchResult.rows[0]?.value || '1';

    // Получить проекты с конфигом CRM
    const projectsResult = await pool.query(`
      SELECT p.id as project_id
      FROM projects p
      WHERE p.status = 'active'
    `);

    let totalInserted = 0;

    for (const { project_id } of projectsResult.rows) {
      try {
        console.log(`  Syncing CRM for ${project_id}...`);
        
        let page = 0;
        let hasMore = true;
        let projectInserted = 0;

        while (hasMore) {
          const result = await getCRMClients(token, branchId, page);
          const clients = result.items || [];

          if (clients.length === 0) {
            hasMore = false;
            break;
          }

          for (const client of clients) {
            await pool.query(`
              INSERT INTO crm_clients (project_id, client_id, client_name, phone, email, status, created_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (project_id, client_id) DO UPDATE
              SET client_name = $3, phone = $4, email = $5, status = $6, last_contact = NOW()
            `, [
              project_id,
              String(client.id),
              [client.name, client.patronymic, client.surname].filter(Boolean).join(' '),
              client.phone || null,
              client.email || null,
              String(client.is_study || '0'),
              client.date_from ? new Date(client.date_from).toISOString().split('T')[0] : null
            ]);
            projectInserted++;
          }

          page++;
          hasMore = clients.length === 50;
          if (page > 20) break;  // Защита от бесконечного цикла
        }

        totalInserted += projectInserted;
        console.log(`  OK ${project_id}: ${projectInserted} clients synced`);

      } catch (err) {
        console.error(`  ERR ${project_id}: ${err.message}`);
        await pool.query(`
          INSERT INTO sync_log (project_id, tool_name, status, error_message, duration_ms, completed_at)
          VALUES ($1, 'crm', 'error', $2, $3, NOW())
        `, [project_id, err.message, Date.now() - startTime]);
      }
    }

    await pool.query(`
      INSERT INTO sync_log (tool_name, status, records_processed, records_inserted, duration_ms, completed_at)
      VALUES ('crm', 'success', $1, $2, $3, NOW())
    `, [totalInserted, totalInserted, Date.now() - startTime]);

    console.log(`[${new Date().toISOString()}] CRM sync done in ${Date.now() - startTime}ms (${totalInserted} clients)\n`);
    return { success: true, records: totalInserted };

  } catch (error) {
    console.error('Fatal error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  syncCRM().catch(error => {
    console.error('Unhandled error:', error.message);
    process.exit(1);
  });
}

module.exports = { syncCRM };
