const { apiRequest } = require('./api-client');

const crmClientsTool = {
  name: 'crm_clients',
  description: 'Список клиентов из AlfaCRM с контактными данными и историей. Показывает имя, телефон, email, статус и количество сделок.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'ID проекта (aidacamp, codims)'
      },
      status: {
        type: 'string',
        description: 'Статус клиента в CRM — опционально'
      },
      limit: {
        type: 'number',
        description: 'Количество клиентов (по умолчанию 50, максимум 200)'
      }
    }
  },
  async execute(args) {
    const limit = Math.min(parseInt(args.limit || 50), 200);
    const params = new URLSearchParams({ limit: String(limit) });
    if (args.project) params.set('project', args.project);
    if (args.status) params.set('status', args.status);

    const result = await apiRequest(`/api/metrics/crm?${params}`);

    if (result.status !== 200) {
      return { error: `API error: ${result.status}` };
    }

    const { clients, total } = result.data;

    if (!clients || clients.length === 0) {
      return { message: 'Клиентов не найдено' };
    }

    return {
      total_in_db: total,
      showing: clients.length,
      clients: clients.map(c => ({
        id: c.client_id,
        name: c.client_name,
        phone: c.phone,
        email: c.email,
        status: c.status,
        created: c.created_date?.substring(0, 10),
        last_contact: c.last_contact?.substring(0, 10),
        deals: c.deal_count,
        revenue: c.total_revenue
      }))
    };
  }
};

module.exports = { crmClientsTool };
