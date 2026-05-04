const express = require('express');
const router = express.Router();
const db = require('../services/db');

// GET /api/metrics?project=aidacamp&days=30 — Яндекс.Метрика
router.get('/', async (req, res) => {
  try {
    const { project, days = 30, goal_id } = req.query;
    
    let conditions = ['metric_date >= CURRENT_DATE - $1::interval'];
    let params = [`${days} days`];
    let i = 2;

    if (project) { conditions.push(`project_id = $${i++}`); params.push(project); }
    if (goal_id) { conditions.push(`goal_id = $${i++}`); params.push(goal_id); }

    const result = await db.query(`
      SELECT project_id, metric_date, goal_id, goal_name,
             visits, conversions, conversion_rate, revenue
      FROM metrics_stats
      WHERE ${conditions.join(' AND ')}
      ORDER BY metric_date DESC, project_id
      LIMIT 500
    `, params);

    res.json({ metrics: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/metrics/summary?project=aidacamp&days=7 — сводка за период
router.get('/summary', async (req, res) => {
  try {
    const { project, days = 7 } = req.query;
    const params = [`${days} days`];
    let projectFilter = '';
    if (project) { projectFilter = 'AND project_id = $2'; params.push(project); }

    const result = await db.query(`
      SELECT 
        project_id,
        SUM(visits) as total_visits,
        SUM(conversions) as total_conversions,
        AVG(conversion_rate) as avg_conversion_rate,
        MIN(metric_date) as date_from,
        MAX(metric_date) as date_to
      FROM metrics_stats
      WHERE metric_date >= CURRENT_DATE - $1::interval ${projectFilter}
      GROUP BY project_id
    `, params);

    res.json({ summary: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/metrics/direct?project=aidacamp&days=30 — Яндекс.Директ
router.get('/direct', async (req, res) => {
  try {
    const { project, days = 30, campaign_id } = req.query;
    let conditions = [`stat_date >= CURRENT_DATE - $1::interval`];
    let params = [`${days} days`];
    let i = 2;

    if (project) { conditions.push(`project_id = $${i++}`); params.push(project); }
    if (campaign_id) { conditions.push(`campaign_id = $${i++}`); params.push(campaign_id); }

    const result = await db.query(`
      SELECT project_id, campaign_id, campaign_name, stat_date,
             clicks, impressions, ctr, cpc, spent, conversions, conversion_value
      FROM direct_stats
      WHERE ${conditions.join(' AND ')}
      ORDER BY stat_date DESC, spent DESC
      LIMIT 500
    `, params);

    res.json({ direct: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/metrics/vk?project=aidacamp&days=30 — VK Ads
router.get('/vk', async (req, res) => {
  try {
    const { project, days = 30, campaign_id } = req.query;
    let conditions = [`stat_date >= CURRENT_DATE - $1::interval`];
    let params = [`${days} days`];
    let i = 2;

    if (project) { conditions.push(`project_id = $${i++}`); params.push(project); }
    if (campaign_id) { conditions.push(`campaign_id = $${i++}`); params.push(campaign_id); }

    const result = await db.query(`
      SELECT project_id, campaign_id, campaign_name, stat_date,
             shows, clicks, spent, cpm, goals, cr
      FROM vk_stats
      WHERE ${conditions.join(' AND ')}
      ORDER BY stat_date DESC, spent DESC
      LIMIT 500
    `, params);

    res.json({ vk: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/metrics/crm?project=aidacamp — CRM клиенты
router.get('/crm', async (req, res) => {
  try {
    const { project, status, limit = 100, offset = 0 } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (project) { conditions.push(`project_id = $${i++}`); params.push(project); }
    if (status) { conditions.push(`status = $${i++}`); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(`
      SELECT project_id, client_id, client_name, phone, email,
             status, created_date, last_contact, deal_count, total_revenue
      FROM crm_clients
      ${where}
      ORDER BY last_contact DESC NULLS LAST
      LIMIT $${i} OFFSET $${i+1}
    `, params);

    const count = await db.query(`SELECT COUNT(*) FROM crm_clients ${where}`, params.slice(0, -2));

    res.json({ clients: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
