const API_SECRET = process.env.HUB_API_SECRET || 'local-dev-secret';

function authMiddleware(req, res, next) {
  // Health check без авторизации
  if (req.path === '/health') return next();
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  if (token !== API_SECRET) {
    return res.status(403).json({ error: 'Invalid API token' });
  }

  next();
}

module.exports = authMiddleware;
