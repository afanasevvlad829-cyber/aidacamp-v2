const https = require('https');
const http = require('http');

const API_URL = process.env.HUB_API_URL || 'http://localhost:3001';
const API_SECRET = process.env.HUB_API_SECRET || 'local-dev-secret';

async function apiRequest(path, method = 'GET', body = null) {
  const url = new URL(API_URL + path);
  const protocol = url.protocol === 'https:' ? https : http;
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method,
    headers: {
      'Authorization': `Bearer ${API_SECRET}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('API timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

module.exports = { apiRequest };
