const express = require('express');
const router = express.Router();
const db = require('../services/db');

// GET /api/projects — список всех проектов
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT id, slug, name, description, status, created_at FROM projects';
    const params = [];
    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }
    sql += ' ORDER BY name';
    const result = await db.query(sql, params);
    res.json({ projects: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id — детали проекта
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, slug, name, description, status, created_at FROM projects WHERE id = $1',
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Project not found' });
    
    const config = await db.query(
      'SELECT config_key, config_value, is_secret FROM project_config WHERE project_id = $1',
      [req.params.id]
    );
    
    const project = result.rows[0];
    project.config = config.rows.map(r => ({
      key: r.config_key,
      value: r.is_secret ? '***' : r.config_value,
      is_secret: r.is_secret
    }));
    
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
