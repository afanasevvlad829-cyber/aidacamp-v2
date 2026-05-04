const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { generateEmbedding } = require('../services/embeddings');

// GET /api/kb
router.get('/', async (req, res) => {
  try {
    const { project, type, status, q, limit = 20, offset = 0 } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (project) { conditions.push(`project_id = $${i++}`); params.push(project); }
    if (type)    { conditions.push(`kb_type = $${i++}`);    params.push(type); }
    if (status)  { conditions.push(`status = $${i++}`);     params.push(status); }
    if (q) {
      conditions.push(`to_tsvector('russian', title || ' ' || content) @@ plainto_tsquery('russian', $${i++})`);
      params.push(q);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitParam = parseInt(limit);
    const offsetParam = parseInt(offset);

    const result = await db.query(
      `SELECT id, project_id, title, kb_type, status, priority, tags,
              LEFT(content, 300) as content_preview,
              created_date, updated_date
       FROM kb_entries ${where}
       ORDER BY updated_date DESC NULLS LAST, created_at DESC
       LIMIT $${i} OFFSET $${i+1}`,
      [...params, limitParam, offsetParam]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM kb_entries ${where}`,
      params
    );

    res.json({ entries: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kb/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, project_id, file_path, title, kb_type, content, tags, status, priority,
              created_date, updated_date, resolved_date, metadata
       FROM kb_entries WHERE id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kb
router.post('/', async (req, res) => {
  try {
    const { project_id, title, kb_type, content, tags, status = 'active', priority = 'medium', file_path, metadata } = req.body;
    if (!project_id || !title || !kb_type || !content) {
      return res.status(400).json({ error: 'Required: project_id, title, kb_type, content' });
    }

    let embedding = null;
    try {
      embedding = await generateEmbedding(`${title}\n${content}`);
    } catch (embErr) {
      console.warn('Embedding generation skipped:', embErr.message);
    }

    const result = await db.query(
      `INSERT INTO kb_entries (project_id, file_path, title, kb_type, content, tags, status, priority, embedding, metadata, created_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING id, project_id, title, kb_type, status, created_date`,
      [project_id, file_path || null, title, kb_type, content,
       tags || null, status, priority,
       embedding ? `[${embedding.join(',')}]` : null,
       metadata ? JSON.stringify(metadata) : '{}']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kb/search-semantic
router.post('/search-semantic', async (req, res) => {
  try {
    const { query, project_id, limit = 10, threshold = 0.7 } = req.body;
    if (!query) return res.status(400).json({ error: 'Required: query' });

    const embedding = await generateEmbedding(query);
    const embStr = `[${embedding.join(',')}]`;

    let conditions = [`(1 - (embedding <=> $1::vector)) > $2`];
    let params = [embStr, threshold];
    let i = 3;

    if (project_id) { conditions.push(`project_id = $${i++}`); params.push(project_id); }
    params.push(parseInt(limit));

    const result = await db.query(
      `SELECT id, project_id, title, kb_type, status,
              LEFT(content, 300) as content_preview,
              (1 - (embedding <=> $1::vector)) as similarity
       FROM kb_entries
       WHERE ${conditions.join(' AND ')} AND embedding IS NOT NULL
       ORDER BY similarity DESC
       LIMIT $${i}`,
      params
    );
    res.json({ results: result.rows, query, threshold });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ error: 'Semantic search unavailable: OpenAI API key not configured' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/kb/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, content, status, priority, tags, metadata } = req.body;
    let params = [];
    let i = 1;
    const updates = [];

    if (title !== undefined)    { updates.push(`title = $${i++}`);    params.push(title); }
    if (content !== undefined)  {
      updates.push(`content = $${i++}`);
      params.push(content);
      try {
        const emb = await generateEmbedding(`${title || ''}\n${content}`);
        updates.push(`embedding = $${i++}`);
        params.push(`[${emb.join(',')}]`);
      } catch (e) { /* skip */ }
    }
    if (status !== undefined)   { updates.push(`status = $${i++}`);   params.push(status); }
    if (priority !== undefined) { updates.push(`priority = $${i++}`); params.push(priority); }
    if (tags !== undefined)     { updates.push(`tags = $${i++}`);     params.push(tags); }
    if (metadata !== undefined) { updates.push(`metadata = $${i++}`); params.push(JSON.stringify(metadata)); }

    updates.push(`updated_date = NOW()`);
    if (updates.length === 1) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    const result = await db.query(
      `UPDATE kb_entries SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, title, kb_type, status, updated_date`,
      params
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
