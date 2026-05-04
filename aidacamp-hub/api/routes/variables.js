const express = require('express');
const router = express.Router();
const db = require('../services/db');

// GET /api/variables — список переменных (значения секретов скрыты)
router.get('/', async (req, res) => {
  try {
    const { instrument, project, status, visibility } = req.query;
    
    let conditions = [];
    let params = [];
    let i = 1;

    if (instrument) { conditions.push(`instrument = $${i++}`); params.push(instrument); }
    if (project) { conditions.push(`project_scope = $${i++}`); params.push(project); }
    if (status) { conditions.push(`status = $${i++}`); params.push(status); }
    if (visibility) { conditions.push(`visibility = $${i++}`); params.push(visibility); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const result = await db.query(`
      SELECT id, key, 
             CASE WHEN visibility = 'secret' THEN '***' ELSE value END as value,
             value_type, visibility, instrument, project_scope, status,
             last_tested, test_result, created_at, updated_at
      FROM variables_vault
      ${where}
      ORDER BY instrument NULLS LAST, key
    `, params);

    res.json({ variables: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/variables/:key — получить одну переменную
router.get('/:key', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, key, 
              CASE WHEN visibility = 'secret' THEN '***' ELSE value END as value,
              value_type, visibility, instrument, project_scope, status, last_tested, test_result
       FROM variables_vault WHERE key = $1`,
      [req.params.key]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Variable not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
