const { apiRequest } = require('./api-client');

const directStatsTool = {
  name: 'direct_stats',
  description: 'Статистика рекламных кампаний Яндекс.Директ. Показывает клики, показы, расход, CTR, CPC по кампаниям за период.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'ID проекта (aidacamp, codims)'
      },
      days: {
        type: 'number',
        description: 'Период в днях (по умолчанию 30)'
      },
      campaign_id: {
        type: 'string',
        description: 'ID конкретной кампании — опционально'
      }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ days: String(args.days || 30) });
    if (args.project) params.set('project', args.project);
    if (args.campaign_id) params.set('campaign_id', args.campaign_id);

    const result = await apiRequest(`/api/metrics/direct?${params}`);

    if (result.status !== 200) {
      return { error: `API error: ${result.status}` };
    }

    const { direct, total } = result.data;

    if (!direct || direct.length === 0) {
      return { message: 'Нет данных Директа за указанный период' };
    }

    // Агрегировать по кампаниям
    const byCampaign = {};
    for (const row of direct) {
      const key = row.campaign_id;
      if (!byCampaign[key]) {
        byCampaign[key] = {
          campaign_id: key,
          campaign_name: row.campaign_name,
          project: row.project_id,
          total_clicks: 0,
          total_impressions: 0,
          total_spent: 0,
          total_conversions: 0,
          days_count: 0
        };
      }
      byCampaign[key].total_clicks += row.clicks || 0;
      byCampaign[key].total_impressions += row.impressions || 0;
      byCampaign[key].total_spent += parseFloat(row.spent || 0);
      byCampaign[key].total_conversions += row.conversions || 0;
      byCampaign[key].days_count++;
    }

    const campaigns = Object.values(byCampaign).map(c => ({
      ...c,
      total_spent: c.total_spent.toFixed(2) + ' ₽',
      avg_ctr: c.total_impressions > 0 ? (c.total_clicks / c.total_impressions * 100).toFixed(2) + '%' : '0%',
      avg_cpc: c.total_clicks > 0 ? (c.total_spent / c.total_clicks).toFixed(2) + ' ₽' : '0 ₽'
    }));

    campaigns.sort((a, b) => parseFloat(b.total_spent) - parseFloat(a.total_spent));

    return {
      period: `${args.days || 30} дней`,
      total_records: total,
      campaigns
    };
  }
};

module.exports = { directStatsTool };
