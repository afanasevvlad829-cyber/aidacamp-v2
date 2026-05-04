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
    const protocol = url.startsWith('https') ? https : require('http');
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function getDirectCampaigns(token) {
  const body = JSON.stringify({
    method: 'get',
    params: {
      SelectionCriteria: { Statuses: ['ACCEPTED', 'SERVING', 'ON_MODERATION'] },
      FieldNames: ['Id', 'Name', 'Status', 'Statistics'],
      ReportFields: ['Clicks', 'Impressions', 'Cost', 'Conversions']
    }
  });

  const res = await makeRequest('https://api.direct.yandex.com/json/v5/campaigns', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);

  if (res.status !== 200 && res.status !== 400) {
    throw new Error(`Direct API error: ${res.status}`);
  }

  return JSON.parse(res.data);
}

async function syncDirect() {
  console.log(`[${new Date().toISOString()}] Starting Direct sync...`);
  const pool = new Pool(DB_CONFIG);
  const startTime = Date.now();

  try {
    // Получить токен из variables_vault
    const tokenResult = await pool.query(`
      SELECT value FROM variables_vault 
      WHERE key ILIKE '%DIRECT%TOKEN%' AND status = 'active'
      LIMIT 1
    `);

    if (tokenResult.rows.length === 0) {
      console.log('No Direct token found, skipping');
      return { success: true, records: 0 };
    }

    const token = tokenResult.rows[0].value;
    const today = new Date().toISOString().split('T')[0];

    // Получить все проекты с конфигом Direct
    const projectsResult = await pool.query(`
      SELECT p.id as project_id
      FROM projects p
      JOIN project_config pc ON p.id = pc.project_id AND pc.config_key = 'direct_client_login'
      WHERE p.status = 'active'
    `);

    let totalInserted = 0;

    for (const { project_id } of projectsResult.rows) {
      try {
        console.log(`  Syncing Direct for ${project_id}...`);
        const data = await getDirectCampaigns(token);
        const campaigns = data?.result?.Campaigns || [];

        for (const campaign of campaigns) {
          const stats = campaign.Statistics || {};
          await pool.query(`
            INSERT INTO direct_stats (project_id, campaign_id, campaign_name, stat_date, clicks, impressions, spent, conversions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (project_id, campaign_id, stat_date) DO UPDATE
            SET clicks = $5, impressions = $6, spent = $7, conversions = $8
          `, [
            project_id,
            String(campaign.Id),
            campaign.Name,
            today,
            stats.Clicks || 0,
            stats.Impressions || 0,
            (stats.Cost || 0) / 1000000,  // Direct в микрорублях
            stats.Conversions || 0
          ]);
          totalInserted++;
        }

        console.log(`  OK ${project_id}: ${campaigns.length} campaigns synced`);

      } catch (err) {
        console.error(`  ERR ${project_id}: ${err.message}`);
        await pool.query(`
          INSERT INTO sync_log (project_id, tool_name, status, error_message, duration_ms, completed_at)
          VALUES ($1, 'direct', 'error', $2, $3, NOW())
        `, [project_id, err.message, Date.now() - startTime]);
      }
    }

    await pool.query(`
      INSERT INTO sync_log (tool_name, status, records_processed, records_inserted, duration_ms, completed_at)
      VALUES ('direct', 'success', $1, $2, $3, NOW())
    `, [totalInserted, totalInserted, Date.now() - startTime]);

    console.log(`[${new Date().toISOString()}] Direct sync done in ${Date.now() - startTime}ms (${totalInserted} records)\n`);
    return { success: true, records: totalInserted };

  } catch (error) {
    console.error('Fatal error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  syncDirect().catch(error => {
    console.error('Unhandled error:', error.message);
    process.exit(1);
  });
}

module.exports = { syncDirect };
