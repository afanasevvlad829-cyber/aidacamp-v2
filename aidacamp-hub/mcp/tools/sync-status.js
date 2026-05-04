const { apiRequest } = require('./api-client');

const syncStatusTool = {
  name: 'sync_status',
  description: 'Статус синхронизации всех источников данных (Метрика, Директ, VK, CRM). Показывает последний запуск, количество записей и ошибки.',
  inputSchema: {
    type: 'object',
    properties: {
      tool: {
        type: 'string',
        description: 'Конкретный инструмент: metrica, direct, vk, crm — или пусто для всех'
      },
      run: {
        type: 'boolean',
        description: 'Если true — запустить синхронизацию для указанного инструмента (требует параметр tool)'
      }
    }
  },
  async execute(args) {
    // Запустить синхронизацию если запрошено
    if (args.run && args.tool) {
      const runResult = await apiRequest(`/api/sync/${args.tool}/run`, 'POST');
      if (runResult.status !== 200) {
        return { error: `Не удалось запустить sync для ${args.tool}: ${runResult.data?.error}` };
      }
    }

    // Получить статус
    const statusResult = await apiRequest('/api/sync/status');
    if (statusResult.status !== 200) {
      return { error: `API error: ${statusResult.status}` };
    }

    const { sync_status } = statusResult.data;

    if (!sync_status || sync_status.length === 0) {
      return { message: 'Нет данных о синхронизации. Запустите синки через crontab или вручную.' };
    }

    // Опционально — фильтровать по инструменту
    const filtered = args.tool
      ? sync_status.filter(s => s.tool_name === args.tool)
      : sync_status;

    return {
      sync_status: filtered.map(s => ({
        tool: s.tool_name,
        status: s.status,
        last_run: s.started_at?.substring(0, 19)?.replace('T', ' '),
        completed: s.completed_at?.substring(0, 19)?.replace('T', ' '),
        records_processed: s.records_processed,
        records_inserted: s.records_inserted,
        duration: s.duration_ms ? `${(s.duration_ms / 1000).toFixed(1)}s` : null,
        error: s.error_message || null
      }))
    };
  }
};

module.exports = { syncStatusTool };
