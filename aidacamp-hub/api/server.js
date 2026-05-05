const express = require('express');

const app = express();
const port = parseInt(process.env.API_PORT || '3001');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(require('./middleware/auth'));

// Routes
app.use('/api/projects', require('./routes/projects'));
app.use('/api/variables', require('./routes/variables'));
app.use('/api/kb', require('./routes/kb'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/sync', require('./routes/sync'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`✅ API server running on port ${port}`);
  });
}

module.exports = app;
