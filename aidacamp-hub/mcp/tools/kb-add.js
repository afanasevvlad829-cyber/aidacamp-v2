const { apiRequest } = require('./kb-search');

// Tool: kb_add
const kbAddTool = {
  name: 'kb_add',
  description: 'Добавить новую запись в базу знаний. Автоматически генерирует векторный embedding для семантического поиска (если настроен OpenAI).',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'ID проекта: aidacamp или codims'
      },
      title: {
        type: 'string',
        description: 'Заголовок записи'
      },
      kb_type: {
        type: 'string',
        description: 'Тип: hypothesis (гипотеза), question (вопрос), solution (решение), insight (инсайт)'
      },
      content: {
        type: 'string',
        description: 'Полное содержимое записи'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Теги для категоризации (опционально)'
      },
      priority: {
        type: 'string',
        description: 'Приоритет: low, medium, high (по умолчанию medium)'
      }
    },
    required: ['project_id', 'title', 'kb_type', 'content']
  },
  async execute(args) {
    const body = {
      project_id: args.project_id,
      title: args.title,
      kb_type: args.kb_type,
      content: args.content,
      priority: args.priority || 'medium'
    };
    if (args.tags) body.tags = args.tags;

    const result = await apiRequest('/api/kb', 'POST', body);

    if (result.status === 400) {
      return { error: 'Ошибка валидации', details: result.data };
    }

    if (result.status !== 201) {
      return { error: `API error: ${result.status}`, details: result.data };
    }

    return {
      success: true,
      message: 'Запись добавлена в базу знаний',
      entry: result.data
    };
  }
};

module.exports = { kbAddTool };
