export const prerender = false;
import type { APIRoute } from 'astro';
import { Client } from 'pg';

interface ABTestResult {
  id: number;
  test_date: string;
  baseline_ctr: number;
  test_value_ctr: number;
  ctr_change_pct: number;
  baseline_conversions: number;
  test_value_conversions: number;
  conversions_change_pct: number;
  baseline_bounce_rate: number;
  test_value_bounce_rate: number;
  bounce_change_pct: number;
  is_significant: boolean;
  alert_level: string;
  summary_message: string;
  created_at: string;
}

interface Alert {
  id: number;
  metric: string;
  old_value: number;
  new_value: number;
  change_pct: number;
  alert_level: string;
  message: string;
  action_taken?: string;
  telegram_sent: boolean;
  created_at: string;
}

interface ReverHistory {
  id: number;
  revert_timestamp: string;
  commit_hash: string;
  pr_number?: number;
  deploy_status: string;
  recovery_time_minutes?: number;
}

interface DashboardData {
  timestamp: string;
  ab_tests: ABTestResult[];
  alerts: Alert[];
  revert_history: ReverHistory[];
  summary: {
    total_tests: number;
    critical_alerts: number;
    reverts_executed: number;
    last_test_date?: string;
    last_alert_date?: string;
  };
}

// Direct PostgreSQL connection via UNIX socket (trust auth)
async function queryDatabase(sql: string): Promise<any[]> {
  const client = new Client({
    host: '/var/run/postgresql',  // UNIX socket directory
    database: 'aidacamp',
    user: 'postgres',
    password: '',  // Empty password for trust auth
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL via UNIX socket');
    const result = await client.query(sql);
    console.log(`📊 Query returned ${result.rows.length} rows`);
    return result.rows;
  } catch (error) {
    console.error('❌ Database query error:', error);
    return [];
  } finally {
    await client.end();
  }
}

export const GET: APIRoute = async ({ url }) => {
  const limit = url.searchParams.get('limit') || '30';
  const period = url.searchParams.get('period') || 'month';

  console.log('📡 API /api/ab-monitor-data called with limit=' + limit);

  try {
    const limitNum = parseInt(limit);

    // SQL queries - pg.Client returns objects with proper column names
    const abTestsSQL = `
      SELECT id, test_date, baseline_ctr, test_value_ctr, ctr_change_pct,
             baseline_conversions, test_value_conversions, conversions_p_value as conversions_change_pct,
             baseline_bounce_rate, test_value_bounce_rate,
             (COALESCE(test_value_bounce_rate, 0) - COALESCE(baseline_bounce_rate, 0)) as bounce_change_pct,
             is_significant, alert_level, summary_message, created_at
      FROM ab_test_results
      ORDER BY test_date DESC
      LIMIT ${limitNum}
    `;

    const alertsSQL = `
      SELECT id, metric, old_value, new_value, change_pct, alert_level, message,
             action_taken, telegram_sent, alert_date as created_at
      FROM alerts
      ORDER BY alert_date DESC
      LIMIT ${limitNum}
    `;

    const revertsSQL = `
      SELECT id, revert_timestamp, commit_hash, pr_number, deploy_status, recovery_time_minutes
      FROM revert_history
      ORDER BY revert_timestamp DESC
      LIMIT ${limitNum}
    `;

    console.log('🔄 Fetching A/B tests...');
    const abTests = await queryDatabase(abTestsSQL);
    console.log(`✅ A/B tests: ${abTests.length} rows`);

    console.log('🔄 Fetching alerts...');
    const alerts = await queryDatabase(alertsSQL);
    console.log(`✅ Alerts: ${alerts.length} rows`);

    console.log('🔄 Fetching reverts...');
    const reverts = await queryDatabase(revertsSQL);
    console.log(`✅ Reverts: ${reverts.length} rows`);

    // Calculate summary
    const criticalAlerts = alerts.filter(a => a.alert_level === 'critical').length;
    const executedReverts = reverts.filter(r => r.deploy_status === 'success').length;

    const response: DashboardData = {
      timestamp: new Date().toISOString(),
      ab_tests: abTests as ABTestResult[],
      alerts: alerts as Alert[],
      revert_history: reverts as ReverHistory[],
      summary: {
        total_tests: abTests.length,
        critical_alerts: criticalAlerts,
        reverts_executed: executedReverts,
        last_test_date: abTests[0]?.test_date,
        last_alert_date: alerts[0]?.created_at,
      },
    };

    console.log('✅ Response ready:', {
      ab_tests: abTests.length,
      alerts: alerts.length,
      reverts: reverts.length,
    });

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
