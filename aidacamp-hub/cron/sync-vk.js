const { Pool } = require('pg');
const https = require('https');

const DB_CONFIG = {
  user: process.env.DB_USER || 'aidacamp_app',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: 'aidacamp_hub'
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function getVKCampaigns(token, accountId) {
  const url = `https://ads.vk.com/api/v2/ads.getCampaigns.json?account_id=${accountId}&access_token=${token}&v=5.131`;
  const res = await makeRequest(url);
  
  if (res.status !== 200) {
    throw new Error(`VK API error: ${res.status}`);
  }
  
  const parsed = JSON.parse(res.data);
  if (parsed.error) {
    throw new Error(`VK API error: ${parsed.error.error_msg}`);
  }
  
  return parsed.response || [];
}

async function getVKStats(token, accountId, campaignIds, dateFrom, dateTo) {
  if (campaignIds.length === 0) return [];
  
  const ids = campaignIds.join(',');
  const url = `https://ads.vk.com/api/v2/ads.getStatistics.json?account_id=${accountId}&ids_type=campaign&ids=${ids}&period=day&date_from=${dateFrom}&date_to=${dateTo}&access_token=${token}&v=5.131`;
  const res = await makeRequest(url);
  
  if (res.status !== 200) return [];
  
  const parsed = JSON.parse(res.data);
  return parsed.response || [];
}

async function syncVK() {
  console.log(`[${new Date().toISOString()}] Starting VK Ads sync...`);
  const pool = new Pool(DB_CONFIG);
  const startTime = Date.now();

  try {
    // Получить токен из variables_vault
    const tokenResult = await pool.query(`
      SELECT value FROM variables_vault 
      WHERE key ILIKE '%VK%TOKEN%' AND status = 'active'
      LIMIT 1
    `);

    const accountResult = await pool.query(`
      SELECT value FROM variables_vault 
      WHERE key ILIKE '%VK%ACCOUNT%' AND status = 'active'
      LIMIT 1
    `);

    if (tokenResult.rows.length === 0) {
      console.log('No VK token found, skipping');
      return { success: true, records: 0 };
    }

    const token = tokenResult.rows[0].value;
    const accountId = accountResult.rows[0]?.value || '0';
    const today = new Date().toISOString().split('T')[0];

    // Получить все проекты с конфигом VK
    const projectsResult = await pool.query(`
      SELECT p.id as project_id, pc.config_value as vk_account_id
      FROM projects p
      JOIN project_config pc ON p.id = pc.project_id AND pc.config_key = 'vk_account_id'
      WHERE p.status = 'active'
    `);

    let totalInserted = 0;

    for (const { project_id, vk_account_id } of projectsResult.rows) {
      const accId = vk_account_id || accountId;
      
      try {
        console.log(`  Syncing VK for ${project_id} (account=${accId})...`);
        
        const campaigns = await getVKCampaigns(token, accId);
        const campaignIds = campaigns.map(c => c.id);
        const stats = await getVKStats(token, accId, campaignIds, today, today);

        // Объединить campaigns и stats
        const statsMap = {};
        for (const stat of stats) {
          statsMap[stat.id] = stat.stats?.[0] || {};
        }

        for (const campaign of campaigns) {
          const s = statsMap[campaign.id] || {};
          await pool.query(`
            INSERT INTO vk_stats (project_id, campaign_id, campaign_name, stat_date, shows, clicks, spent, cpm, goals)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (project_id, campaign_id, stat_date) DO UPDATE
            SET shows = $5, clicks = $6, spent = $7, cpm = $8, goals = $9
          `, [
            project_id,
            String(campaign.id),
            campaign.name,
            today,
            s.impressions || 0,
            s.clicks || 0,
            parseFloat(s.spent || 0),
            parseFloat(s.cpm || 0),
            s.goals || 0
          ]);
          totalInserted++;
        }

        console.log(`  OK ${project_id}: ${campaigns.length} campaigns synced`);

      } catch (err) {
        console.error(`  ERROR ${project_id}: ${err.message}`);
        await pool.query(`
          INSERT INTO sync_log (project_id, tool_name, status, error_message, duration_ms, completed_at)
          VALUES ($1, 'vk', 'error', $2, $3, NOW())
        `, [project_id, err.message, Date.now() - startTime]);
      }
    }

    await pool.query(`
      INSERT INTO sync_log (tool_name, status, records_processed, records_inserted, duration_ms, completed_at)
      VALUES ('vk', 'success', $1, $2, $3, NOW())
    `, [totalInserted, totalInserted, Date.now() - startTime]);

    console.log(`[${new Date().toISOString()}] VK sync done in ${Date.now() - startTime}ms (${totalInserted} records)\n`);
    return { success: true, records: totalInserted };

  } catch (error) {
    console.error('Fatal error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  syncVK().catch(error => {
    console.error('Unhandled error:', error.message);
    process.exit(1);
  });
}

module.exports = { syncVK };
