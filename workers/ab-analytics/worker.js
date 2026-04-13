export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/api/ab-event' && request.method === 'POST') {
      return withCors(await handleAbEvent(request, env));
    }

    if (url.pathname === '/api/ab-event/summary' && request.method === 'GET') {
      return withCors(await handleSummary(url, env));
    }

    return withCors(json({ ok: false, error: 'not_found' }, 404));
  }
};

async function handleAbEvent(request, env) {
  if (!env.AB_ANALYTICS_DB) {
    return json({ ok: false, error: 'db_binding_missing' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const event = String(body?.event || '').trim();
  const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};

  if (!event) {
    return json({ ok: false, error: 'event_required' }, 400);
  }

  const eventTs = String(payload.event_ts || new Date().toISOString());
  const testId = String(payload.ab_test_id || '');
  const variant = String(payload.ab_variant || '');
  const sessionId = String(payload.session_id || '');
  const visitorId = String(payload.visitor_id || '');
  const pagePath = String(payload.page_path || '');
  const pageUrl = String(payload.page_url || '');
  const referrer = String(payload.referrer || '');
  const utmSource = String(payload.utm_source || '');
  const utmMedium = String(payload.utm_medium || '');
  const utmCampaign = String(payload.utm_campaign || '');
  const utmContent = String(payload.utm_content || '');
  const utmTerm = String(payload.utm_term || '');
  const deviceType = String(payload.device_type || '');
  const country = request.cf?.country || '';
  const colo = request.cf?.colo || '';
  const ua = request.headers.get('user-agent') || '';

  const result = await env.AB_ANALYTICS_DB
    .prepare(
      `INSERT INTO ab_events (
        event_ts, event_name, test_id, variant, session_id, visitor_id,
        page_path, page_url, referrer,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        device_type, country, colo, user_agent, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      eventTs,
      event,
      testId,
      variant,
      sessionId,
      visitorId,
      pagePath,
      pageUrl,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      deviceType,
      country,
      colo,
      ua,
      JSON.stringify(payload)
    )
    .run();

  return json({ ok: true, stored: true, id: result.meta?.last_row_id || 0 }, 200);
}

async function handleSummary(url, env) {
  if (!env.AB_ANALYTICS_DB) {
    return json({ ok: false, error: 'db_binding_missing' }, 500);
  }

  const testId = String(url.searchParams.get('test_id') || '').trim();
  const from = String(url.searchParams.get('from') || '').trim();
  const to = String(url.searchParams.get('to') || '').trim();

  const clauses = [];
  const binds = [];

  if (testId) {
    clauses.push('test_id = ?');
    binds.push(testId);
  }
  if (from) {
    clauses.push('event_ts >= ?');
    binds.push(from);
  }
  if (to) {
    clauses.push('event_ts < ?');
    binds.push(to);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = await env.AB_ANALYTICS_DB
    .prepare(
      `SELECT
        test_id,
        variant,
        COUNT(*) AS events,
        SUM(CASE WHEN event_name = 'form_submit' THEN 1 ELSE 0 END) AS leads,
        SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
        SUM(CASE WHEN event_name = 'hero_ab_assigned_v1' THEN 1 ELSE 0 END) AS assigned
      FROM ab_events
      ${whereSql}
      GROUP BY test_id, variant
      ORDER BY test_id, variant`
    )
    .bind(...binds)
    .all();

  return json({ ok: true, rows: rows.results || [] }, 200);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'Content-Type');
  return new Response(response.body, { status: response.status, headers });
}
