const { apiRequest } = require('./api-client');

const metricsSummaryTool = {
  name: 'metrics_summary',
  description: 'Сводка метрик Яндекс.Метрика за период. Показывает визиты, конверсии, процент отказов по проектам.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'ID проекта (aidacamp, codims) — опционально, без фильтра покажет все'
      },
      days: {
        type: 'number',
        description: 'Количество дней для анализа (по умолчанию 7)'
      }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ days: String(args.days || 7) });
    if (args.project) params.set('project', args.project);

    const [summaryRes, detailRes] = await Promise.all([
      apiRequest(`/api/metrics/summary?${params}`),
      apiRequest(`/api/metrics?${params}&limit=50`)
    ]);

    if (summaryRes.status !== 200) {
      return { error: `API error: ${summaryRes.status}` };
    }

    const { summary } = summaryRes.data;
    const details = detailRes.data?.metrics || [];

    // Агрегировать по целям
    const byGoal = {};
    for (const row of details) {
      if (!byGoal[row.goal_id]) {
        byGoal[row.goal_id] = { goal_id: row.goal_id, goal_name: row.goal_name, total_conversions: 0, total_visits: 0 };
      }
      byGoal[row.goal_id].total_conversions += row.conversions || 0;
      byGoal[row.goal_id].total_visits += row.visits || 0;
    }

    return {
      period: `${args.days || 7} дней`,
      projects: summary.map(s => ({
        project: s.project_id,
        total_visits: parseInt(s.total_visits),
        total_conversions: parseInt(s.total_conversions),
        avg_conversion_rate: parseFloat(s.avg_conversion_rate || 0).toFixed(2) + '%',
        date_range: `${s.date_from?.substring(0, 10)} — ${s.date_to?.substring(0, 10)}`
      })),
      top_goals: Object.values(byGoal)
        .sort((a, b) => b.total_conversions - a.total_conversions)
        .slice(0, 5)
    };
  }
};

module.exports = { metricsSummaryTool };
