const { apiRequest } = require('./api-client');

const metrikaStatsTool = {
  name: 'metrika_stats',
  description: 'Детальная статистика Яндекс.Метрика по целям и датам. Показывает конверсии по конкретным целям за период.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'ID проекта (aidacamp, codims)'
      },
      goal_id: {
        type: 'string',
        description: 'ID цели Метрики (например 541048270) — опционально'
      },
      days: {
        type: 'number',
        description: 'Период в днях (по умолчанию 14)'
      }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ days: String(args.days || 14) });
    if (args.project) params.set('project', args.project);
    if (args.goal_id) params.set('goal_id', args.goal_id);

    const result = await apiRequest(`/api/metrics?${params}&limit=100`);

    if (result.status !== 200) {
      return { error: `API error: ${result.status}` };
    }

    const { metrics, total } = result.data;

    if (!metrics || metrics.length === 0) {
      return { message: 'Нет данных Метрики за указанный период' };
    }

    // Группировать по датам
    const byDate = {};
    for (const row of metrics) {
      const date = row.metric_date?.substring(0, 10);
      if (!byDate[date]) byDate[date] = { date, visits: 0, conversions: 0, goals: [] };
      byDate[date].visits += row.visits || 0;
      byDate[date].conversions += row.conversions || 0;
      if (row.goal_id) {
        byDate[date].goals.push({
          goal_id: row.goal_id,
          goal_name: row.goal_name,
          conversions: row.conversions
        });
      }
    }

    const timeline = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));

    const totals = timeline.reduce((acc, d) => ({
      visits: acc.visits + d.visits,
      conversions: acc.conversions + d.conversions
    }), { visits: 0, conversions: 0 });

    return {
      period: `${args.days || 14} дней`,
      total_records: total,
      totals: {
        ...totals,
        avg_conversion_rate: totals.visits > 0
          ? (totals.conversions / totals.visits * 100).toFixed(2) + '%'
          : '0%'
      },
      timeline: timeline.slice(0, 30)
    };
  }
};

module.exports = { metrikaStatsTool };
