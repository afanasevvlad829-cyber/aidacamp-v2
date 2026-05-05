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

// Tool: kb_search
const kbSearchTool = {
  name: 'kb_search',
  description: 'Поиск в базе знаний по тексту (полнотекстовый поиск на русском). Возвращает записи из базы знаний по ключевым словам.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Поисковый запрос (ключевые слова)'
      },
      project: {
        type: 'string',
        description: 'ID проекта (aidacamp, codims) — опционально'
      },
      type: {
        type: 'string',
        description: 'Тип записи: hypothesis, question, solution, insight — опционально'
      },
      limit: {
        type: 'number',
        description: 'Максимальное количество результатов (по умолчанию 20)'
      }
    },
    required: ['query']
  },
  async execute(args) {
    const params = new URLSearchParams({ q: args.query });
    if (args.project) params.set('project', args.project);
    if (args.type) params.set('type', args.type);
    if (args.limit) params.set('limit', String(args.limit));

    const result = await apiRequest(`/api/kb?${params}`);
    
    if (result.status !== 200) {
      return { error: `API error: ${result.status}`, details: result.data };
    }

    const { entries, total } = result.data;
    if (entries.length === 0) {
      return { message: 'Записей не найдено', query: args.query };
    }

    return {
      total,
      entries: entries.map(e => ({
        id: e.id,
        project: e.project_id,
        title: e.title,
        type: e.kb_type,
        status: e.status,
        preview: e.content_preview,
        tags: e.tags,
        updated: e.updated_date
      }))
    };
  }
};

module.exports = { kbSearchTool, apiRequest };
