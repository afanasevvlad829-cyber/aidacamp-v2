const { apiRequest } = require('./kb-search');

// Tool: kb_search_semantic
const kbSearchSemanticTool = {
  name: 'kb_search_semantic',
  description: 'Семантический поиск в базе знаний через векторное сходство (pgvector). Находит записи близкие по смыслу, даже если слова не совпадают. Требует настроенный OpenAI API ключ.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Вопрос или описание того, что нужно найти (на любом языке)'
      },
      project_id: {
        type: 'string',
        description: 'ID проекта (aidacamp, codims) — опционально'
      },
      limit: {
        type: 'number',
        description: 'Максимальное количество результатов (по умолчанию 10)'
      },
      threshold: {
        type: 'number',
        description: 'Минимальный порог сходства 0-1 (по умолчанию 0.7)'
      }
    },
    required: ['query']
  },
  async execute(args) {
    const body = {
      query: args.query,
      limit: args.limit || 10,
      threshold: args.threshold || 0.7
    };
    if (args.project_id) body.project_id = args.project_id;

    const result = await apiRequest('/api/kb/search-semantic', 'POST', body);

    if (result.status === 503) {
      return { error: 'Семантический поиск недоступен: OpenAI API ключ не настроен' };
    }

    if (result.status !== 200) {
      return { error: `API error: ${result.status}`, details: result.data };
    }

    const { results } = result.data;
    if (!results || results.length === 0) {
      return { message: 'Похожих записей не найдено', query: args.query, threshold: args.threshold || 0.7 };
    }

    return {
      query: args.query,
      results: results.map(r => ({
        id: r.id,
        project: r.project_id,
        title: r.title,
        type: r.kb_type,
        similarity: Math.round(r.similarity * 100) + '%',
        preview: r.content_preview
      }))
    };
  }
};

module.exports = { kbSearchSemanticTool };
