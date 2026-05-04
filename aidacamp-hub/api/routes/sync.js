const express = require('express');
const router = express.Router();
const db = require('../services/db');

// GET /api/sync/status — статус всех синков
router.get('/status', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        tool_name,
        status,
        records_processed,
        records_inserted,
        error_message,
        duration_ms,
        started_at,
        completed_at
      FROM sync_log
      WHERE id IN (
        SELECT DISTINCT ON (tool_name) id
        FROM sync_log
        ORDER BY tool_name, started_at DESC
      )
      ORDER BY tool_name
    `);

    res.json({ sync_status: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/history?tool=metrica&limit=20 — история синков
router.get('/history', async (req, res) => {
  try {
    const { tool, limit = 20 } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (tool) { conditions.push(`tool_name = $${i++}`); params.push(tool); }
    params.push(parseInt(limit));

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(`
      SELECT tool_name, status, records_processed, records_inserted,
             error_message, duration_ms, started_at, completed_at
      FROM sync_log
      ${where}
      ORDER BY started_at DESC
      LIMIT $${i}
    `, params);

    res.json({ history: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/:tool/run — ручной запуск синка (триггер)
router.post('/:tool/run', async (req, res) => {
  const { tool } = req.params;
  const validTools = ['metrica', 'direct', 'vk', 'crm'];

  if (!validTools.includes(tool)) {
    return res.status(400).json({ error: `Unknown tool: ${tool}. Valid: ${validTools.join(', ')}` });
  }

  try {
    // Логировать запуск
    await db.query(`
      INSERT INTO sync_log (tool_name, status, started_at)
      VALUES ($1, 'running', NOW())
    `, [tool]);

    // Запустить фоновый процесс (non-blocking)
    const { spawn } = require('child_process');
    const child = spawn('node', [`/opt/aidacamp-hub/cron/sync-${tool}.js`], {
      detached: true,
      stdio: 'ignore',
      env: process.env
    });
    child.unref();

    res.json({
      message: `Sync for ${tool} started`,
      tool,
      started_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
