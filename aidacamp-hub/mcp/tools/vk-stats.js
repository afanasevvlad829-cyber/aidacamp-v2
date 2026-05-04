const { apiRequest } = require('./api-client');

const vkStatsTool = {
  name: 'vk_stats',
  description: 'Статистика рекламных кампаний VK Ads. Показывает показы, клики, расход, CPM, цели по кампаниям за период.',
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

    const result = await apiRequest(`/api/metrics/vk?${params}`);

    if (result.status !== 200) {
      return { error: `API error: ${result.status}` };
    }

    const { vk, total } = result.data;

    if (!vk || vk.length === 0) {
      return { message: 'Нет данных VK Ads за указанный период' };
    }

    const byCampaign = {};
    for (const row of vk) {
      const key = row.campaign_id;
      if (!byCampaign[key]) {
        byCampaign[key] = {
          campaign_id: key,
          campaign_name: row.campaign_name,
          project: row.project_id,
          total_shows: 0,
          total_clicks: 0,
          total_spent: 0,
          total_goals: 0
        };
      }
      byCampaign[key].total_shows += row.shows || 0;
      byCampaign[key].total_clicks += row.clicks || 0;
      byCampaign[key].total_spent += parseFloat(row.spent || 0);
      byCampaign[key].total_goals += row.goals || 0;
    }

    const campaigns = Object.values(byCampaign).map(c => ({
      ...c,
      total_spent: c.total_spent.toFixed(2) + ' ₽',
      ctr: c.total_shows > 0 ? (c.total_clicks / c.total_shows * 100).toFixed(3) + '%' : '0%',
      cpm: c.total_shows > 0 ? (c.total_spent / c.total_shows * 1000).toFixed(2) + ' ₽' : '0 ₽'
    }));

    campaigns.sort((a, b) => parseFloat(b.total_spent) - parseFloat(a.total_spent));

    return {
      period: `${args.days || 30} дней`,
      total_records: total,
      campaigns
    };
  }
};

module.exports = { vkStatsTool };
