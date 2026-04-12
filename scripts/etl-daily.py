#!/usr/bin/env python3
"""
Daily ETL: Yandex Direct + Metrika → PostgreSQL
Runs on server via cron. Pulls yesterday's data by default.

Usage:
  python3 etl-daily.py                    # yesterday
  python3 etl-daily.py 2026-04-01         # specific date
  python3 etl-daily.py 2026-01-01 2026-04-09  # date range
"""

import sys, os, json, time, datetime, logging
import urllib.request, urllib.error, urllib.parse
import psycopg2

# --- Load .env if present ---
ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k, v)

# --- Config ---
DIRECT_TOKEN = os.environ.get('DIRECT_TOKEN', '')
DIRECT_LOGIN = os.environ.get('DIRECT_LOGIN', 'kv145')
METRIKA_TOKEN = os.environ.get('METRIKA_TOKEN', DIRECT_TOKEN)
METRIKA_COUNTER = os.environ.get('METRIKA_COUNTER', '96499295')
CLARITY_TOKEN = os.environ.get('CLARITY_TOKEN', '')
DB_DSN = os.environ.get('DB_DSN', 'dbname=aidacamp user=postgres')

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('etl')

# --- Helpers ---

def api_request(url, headers=None, data=None, retries=3):
    """Make HTTP request with retry logic for Direct's async reports."""
    headers = headers or {}
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            if resp.status in (201, 202):
                log.info(f'Report generating (HTTP {resp.status}), waiting 5s...')
                resp.read()  # drain
                time.sleep(5)
                continue
            return resp.read().decode('utf-8'), resp.status
        except urllib.error.HTTPError as e:
            if e.code in (201, 202):
                log.info(f'Report generating (HTTP {e.code}), waiting 5s...')
                time.sleep(5)
                continue
            raise
    raise Exception(f'Failed after {retries} retries: {url}')


def db_connect():
    return psycopg2.connect(DB_DSN)


# --- Yandex Direct ---

def pull_direct_campaigns(date_from, date_to):
    """Pull campaign-level stats from Direct Reports API."""
    report_name = f'etl_campaigns_{date_from}_{date_to}_{int(time.time())}'
    body = json.dumps({
        "params": {
            "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
            "FieldNames": [
                "Date", "CampaignId", "CampaignName",
                "Clicks", "Impressions", "Ctr", "AvgCpc", "Cost",
                "Conversions", "CostPerConversion", "BounceRate", "AvgPageviews"
            ],
            "ReportName": report_name,
            "ReportType": "CAMPAIGN_PERFORMANCE_REPORT",
            "DateRangeType": "CUSTOM_DATE",
            "Format": "TSV",
            "IncludeVAT": "YES"
        }
    }).encode('utf-8')

    headers = {
        'Authorization': f'Bearer {DIRECT_TOKEN}',
        'Client-Login': DIRECT_LOGIN,
        'Accept-Language': 'ru',
        'Content-Type': 'application/json',
        'returnMoneyInMicros': 'false',
        'skipReportHeader': 'true',
        'skipColumnHeader': 'true',
        'skipReportSummary': 'true',
        'processingMode': 'auto',
    }

    data, status = api_request('https://api.direct.yandex.com/json/v5/reports', headers, body)
    rows = []
    for line in data.strip().split('\n'):
        if not line or line.startswith('Total'):
            continue
        parts = line.split('\t')
        if len(parts) < 12:
            continue
        rows.append({
            'date': parts[0],
            'campaign_id': int(parts[1]),
            'campaign_name': parts[2],
            'clicks': int(parts[3]) if parts[3] != '--' else 0,
            'impressions': int(parts[4]) if parts[4] != '--' else 0,
            'ctr': float(parts[5]) if parts[5] != '--' else 0,
            'avg_cpc': float(parts[6]) if parts[6] != '--' else 0,
            'cost': float(parts[7]) if parts[7] != '--' else 0,
            'conversions': int(parts[8]) if parts[8] != '--' else 0,
            'cost_per_conversion': float(parts[9]) if parts[9] != '--' else 0,
            'bounce_rate': float(parts[10]) if parts[10] != '--' else 0,
            'avg_pageviews': float(parts[11]) if parts[11] != '--' else 0,
        })
    return rows


def pull_direct_placements(date_from, date_to):
    """Pull placement-level stats (where ads were shown)."""
    report_name = f'etl_placements_{date_from}_{date_to}_{int(time.time())}'
    body = json.dumps({
        "params": {
            "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
            "FieldNames": [
                "Date", "CampaignId", "Placement",
                "Clicks", "Impressions", "Ctr", "AvgCpc", "Cost",
                "BounceRate", "AvgPageviews"
            ],
            "ReportName": report_name,
            "ReportType": "CAMPAIGN_PERFORMANCE_REPORT",
            "DateRangeType": "CUSTOM_DATE",
            "Format": "TSV",
            "IncludeVAT": "YES"
        }
    }).encode('utf-8')

    headers = {
        'Authorization': f'Bearer {DIRECT_TOKEN}',
        'Client-Login': DIRECT_LOGIN,
        'Accept-Language': 'ru',
        'Content-Type': 'application/json',
        'returnMoneyInMicros': 'false',
        'skipReportHeader': 'true',
        'skipColumnHeader': 'true',
        'skipReportSummary': 'true',
        'processingMode': 'auto',
    }

    data, status = api_request('https://api.direct.yandex.com/json/v5/reports', headers, body)
    rows = []
    for line in data.strip().split('\n'):
        if not line or line.startswith('Total'):
            continue
        parts = line.split('\t')
        if len(parts) < 10:
            continue
        rows.append({
            'date': parts[0],
            'campaign_id': int(parts[1]),
            'placement': parts[2] if parts[2] != '--' else 'unknown',
            'clicks': int(parts[3]) if parts[3] != '--' else 0,
            'impressions': int(parts[4]) if parts[4] != '--' else 0,
            'ctr': float(parts[5]) if parts[5] != '--' else 0,
            'avg_cpc': float(parts[6]) if parts[6] != '--' else 0,
            'cost': float(parts[7]) if parts[7] != '--' else 0,
            'bounce_rate': float(parts[8]) if parts[8] != '--' else 0,
            'avg_pageviews': float(parts[9]) if parts[9] != '--' else 0,
        })
    return rows


def api_request_offline(url, headers, data, retries=12, delay=15):
    """Make HTTP request for offline Direct reports (201/202→retry→200)."""
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            if resp.status in (201, 202):
                log.info(f'Report generating (HTTP {resp.status}), waiting {delay}s... (attempt {attempt+1})')
                resp.read()  # drain
                time.sleep(delay)
                continue
            return resp.read().decode('utf-8'), resp.status
        except urllib.error.HTTPError as e:
            if e.code in (201, 202):
                log.info(f'Report generating (HTTP {e.code}), waiting {delay}s... (attempt {attempt+1})')
                time.sleep(delay)
                continue
            raise
    raise Exception(f'Offline report failed after {retries} retries')


def pull_direct_search_queries(date_from, date_to):
    """Pull search query stats (SEARCH_QUERY_PERFORMANCE_REPORT)."""
    report_name = f'etl_search_queries_{date_from}_{date_to}_{int(time.time())}'
    body = json.dumps({
        "params": {
            "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
            "FieldNames": [
                "CampaignId", "Query",
                "Clicks", "Impressions", "Ctr", "AvgCpc", "Cost",
                "Conversions", "BounceRate"
            ],
            "ReportName": report_name,
            "ReportType": "SEARCH_QUERY_PERFORMANCE_REPORT",
            "DateRangeType": "CUSTOM_DATE",
            "Format": "TSV",
            "IncludeVAT": "YES"
        }
    }).encode('utf-8')

    headers = {
        'Authorization': f'Bearer {DIRECT_TOKEN}',
        'Client-Login': DIRECT_LOGIN,
        'Accept-Language': 'ru',
        'Content-Type': 'application/json',
        'returnMoneyInMicros': 'false',
        'skipReportHeader': 'true',
        'skipColumnHeader': 'true',
        'skipReportSummary': 'true',
        'processingMode': 'offline',
    }

    data, status = api_request_offline('https://api.direct.yandex.com/json/v5/reports', headers, body)
    rows = []
    for line in data.strip().split('\n'):
        if not line or line.startswith('Total'):
            continue
        parts = line.split('\t')
        if len(parts) < 9:
            continue
        rows.append({
            'date': date_from,  # use report date range start
            'campaign_id': int(parts[0]),
            'query': parts[1] if parts[1] != '--' else '',
            'clicks': int(parts[2]) if parts[2] != '--' else 0,
            'impressions': int(parts[3]) if parts[3] != '--' else 0,
            'cost': float(parts[6]) if parts[6] != '--' else 0,
            'conversions': int(parts[7]) if parts[7] != '--' else 0,
            'bounce_rate': float(parts[8]) if parts[8] != '--' else 0,
        })
    return rows


# --- Yandex Metrika ---

def metrika_api(dimensions, metrics, date_from, date_to, limit=10000):
    """Generic Metrika stat API call."""
    params = urllib.parse.urlencode({
        'id': METRIKA_COUNTER,
        'date1': date_from,
        'date2': date_to,
        'dimensions': dimensions,
        'metrics': metrics,
        'limit': limit,
        'accuracy': 'full',
    })
    url = f'https://api-metrika.yandex.net/stat/v1/data?{params}'
    headers = {'Authorization': f'OAuth {METRIKA_TOKEN}'}
    data, _ = api_request(url, headers)
    return json.loads(data)


def pull_metrika_traffic(date_from, date_to):
    """Pull traffic by source and date."""
    result = metrika_api(
        'ym:s:date,ym:s:lastTrafficSource',
        'ym:s:visits,ym:s:users,ym:s:newUsers,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds',
        date_from, date_to
    )
    rows = []
    for item in result.get('data', []):
        dims = item['dimensions']
        mets = item['metrics']
        rows.append({
            'date': (dims[0].get('name') or 'unknown').split('T')[0],
            'source': dims[1].get('name') or 'unknown',
            'visits': int(mets[0]),
            'users': int(mets[1]),
            'new_users': int(mets[2]),
            'bounce_rate': round(float(mets[3]), 2),
            'page_depth': round(float(mets[4]), 2),
            'avg_duration': round(float(mets[5]), 1),
        })
    return rows


def pull_metrika_goals(date_from, date_to):
    """Pull goal conversions per goal per source."""
    # First get the list of goals
    goals_url = f'https://api-metrika.yandex.net/management/v1/counter/{METRIKA_COUNTER}/goals'
    headers = {'Authorization': f'OAuth {METRIKA_TOKEN}'}
    try:
        data, _ = api_request(goals_url, headers)
        goals_data = json.loads(data)
        goals = [(g['id'], g['name']) for g in goals_data.get('goals', [])]
    except Exception:
        goals = []

    rows = []
    for goal_id, goal_name in goals:
        try:
            result = metrika_api(
                'ym:s:date,ym:s:lastTrafficSource',
                f'ym:s:goal{goal_id}reaches,ym:s:visits',
                date_from, date_to
            )
            for item in result.get('data', []):
                dims = item['dimensions']
                mets = item['metrics']
                reaches = int(mets[0])
                if reaches == 0:
                    continue
                rows.append({
                    'date': (dims[0].get('name') or 'unknown').split('T')[0],
                    'goal_id': goal_id,
                    'goal_name': goal_name,
                    'source': dims[1].get('name') or 'unknown',
                    'reaches': reaches,
                    'visits': int(mets[1]),
                })
        except Exception as e:
            log.warning(f'Goal {goal_id} ({goal_name}) failed: {e}')
    return rows


def pull_metrika_utm(date_from, date_to):
    """Pull UTM breakdown."""
    result = metrika_api(
        'ym:s:date,ym:s:lastUTMSource,ym:s:lastUTMMedium,ym:s:lastUTMCampaign,ym:s:lastUTMContent,ym:s:lastUTMTerm',
        'ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds',
        date_from, date_to
    )
    rows = []
    for item in result.get('data', []):
        dims = item['dimensions']
        mets = item['metrics']
        rows.append({
            'date': (dims[0].get('name') or 'unknown').split('T')[0],
            'utm_source': dims[1].get('name') or '',
            'utm_medium': dims[2].get('name') or '',
            'utm_campaign': dims[3].get('name') or '',
            'utm_content': dims[4].get('name') or '',
            'utm_term': dims[5].get('name') or '',
            'visits': int(mets[0]),
            'users': int(mets[1]),
            'bounce_rate': round(float(mets[2]), 2),
            'page_depth': round(float(mets[3]), 2),
            'avg_duration': round(float(mets[4]), 1),
            'goal_reaches': 0,
        })
    return rows


# --- Microsoft Clarity ---

def clarity_api(num_days=1, dimensions=None):
    """Call Clarity Export API. Returns list of metric objects."""
    params = {'numOfDays': str(num_days)}
    if dimensions:
        for i, dim in enumerate(dimensions, 1):
            if i > 3:
                break
            params[f'dimension{i}'] = dim
    query = urllib.parse.urlencode(params)
    url = f'https://www.clarity.ms/export-data/api/v1/project-live-insights?{query}'
    headers = {
        'Authorization': f'Bearer {CLARITY_TOKEN}',
        'Content-Type': 'application/json',
    }
    data, _ = api_request(url, headers)
    return json.loads(data)


def _clarity_extract(metrics_list, metric_name, dim_key=None):
    """Extract rows for a given metricName from Clarity API response."""
    for m in metrics_list:
        if m.get('metricName') == metric_name:
            return m.get('information', [])
    return []


def _safe_int(val):
    try:
        return int(str(val).replace(',', ''))
    except (ValueError, TypeError):
        return 0


def _safe_float(val):
    try:
        return round(float(str(val).replace(',', '')), 2)
    except (ValueError, TypeError):
        return 0.0


def pull_clarity(date_str):
    """Pull all Clarity data: daily aggregate + per-page + breakdowns.

    Makes 5 API calls (limit is 10/day):
      1. No dims — aggregate traffic
      2. URL — per-page detail
      3. Device — device breakdown
      4. Country/Region — geo breakdown
      5. Browser — browser breakdown
    Returns (daily_row, page_rows).
    """
    if not CLARITY_TOKEN:
        log.warning('CLARITY_TOKEN not set, skipping Clarity')
        return None, []

    daily = {
        'date': date_str,
        'total_sessions': 0, 'bot_sessions': 0, 'distinct_users': 0,
        'pages_per_session': 0, 'avg_scroll_depth': 0,
        'dead_click_pct': 0, 'rage_click_pct': 0, 'quickback_pct': 0,
        'total_time_sec': 0, 'active_time_sec': 0,
        'top_pages': '[]', 'devices': '[]', 'countries': '[]',
        'browsers': '[]', 'referrers': '[]',
    }
    pages = []

    # 1. Aggregate (no dimensions) — includes Traffic, ScrollDepth, DeadClickCount, etc.
    try:
        data = clarity_api(1)
        traffic = _clarity_extract(data, 'Traffic')
        if traffic:
            t = traffic[0]
            daily['total_sessions'] = _safe_int(t.get('totalSessionCount'))
            daily['bot_sessions'] = _safe_int(t.get('totalBotSessionCount'))
            daily['distinct_users'] = _safe_int(t.get('distinctUserCount'))
            daily['pages_per_session'] = _safe_float(t.get('pagesPerSessionPercentage'))

        scroll = _clarity_extract(data, 'ScrollDepth')
        if scroll:
            daily['avg_scroll_depth'] = _safe_float(scroll[0].get('averageScrollDepth', 0))

        dead = _clarity_extract(data, 'DeadClickCount')
        if dead:
            daily['dead_click_pct'] = _safe_float(dead[0].get('sessionsWithMetricPercentage', 0))

        rage = _clarity_extract(data, 'RageClickCount')
        if rage:
            daily['rage_click_pct'] = _safe_float(rage[0].get('sessionsWithMetricPercentage', 0))

        qb = _clarity_extract(data, 'QuickbackClick')
        if qb:
            daily['quickback_pct'] = _safe_float(qb[0].get('sessionsWithMetricPercentage', 0))

        eng = _clarity_extract(data, 'EngagementTime')
        if eng:
            daily['total_time_sec'] = _safe_int(eng[0].get('totalTime', 0))
            daily['active_time_sec'] = _safe_int(eng[0].get('activeTime', 0))

        # Breakdowns from aggregate response (Browser, Device, Country, ReferrerUrl, PopularPages)
        browsers = [{'name': i.get('name', '?'), 'sessions': _safe_int(i.get('sessionsCount'))}
                    for i in _clarity_extract(data, 'Browser')]
        daily['browsers'] = json.dumps(sorted(browsers, key=lambda x: x['sessions'], reverse=True))

        devices = [{'name': i.get('name', '?'), 'sessions': _safe_int(i.get('sessionsCount'))}
                   for i in _clarity_extract(data, 'Device')]
        daily['devices'] = json.dumps(sorted(devices, key=lambda x: x['sessions'], reverse=True))

        countries = [{'name': i.get('name', '?'), 'sessions': _safe_int(i.get('sessionsCount'))}
                     for i in _clarity_extract(data, 'Country')]
        daily['countries'] = json.dumps(sorted(countries, key=lambda x: x['sessions'], reverse=True)[:30])

        referrers = [{'name': i.get('name', ''), 'sessions': _safe_int(i.get('sessionsCount'))}
                     for i in _clarity_extract(data, 'ReferrerUrl') if i.get('name')]
        daily['referrers'] = json.dumps(sorted(referrers, key=lambda x: x['sessions'], reverse=True)[:20])

        pop_pages = [{'url': i.get('url', ''), 'visits': _safe_int(i.get('visitsCount'))}
                     for i in _clarity_extract(data, 'PopularPages') if i.get('url')]
        daily['top_pages'] = json.dumps(sorted(pop_pages, key=lambda x: x['visits'], reverse=True)[:20])
    except Exception as e:
        log.error(f'Clarity aggregate failed: {e}')

    # 2. By URL — per-page detail (uses 1 API call)
    try:
        data = clarity_api(1, ['URL'])
        url_map = {}
        for metric in data:
            name = metric.get('metricName', '')
            for item in metric.get('information', []):
                url = item.get('Url', '')
                if not url:
                    continue
                if url not in url_map:
                    url_map[url] = {
                        'date': date_str, 'url': url,
                        'sessions': 0, 'scroll_depth_pct': 0,
                        'dead_clicks': 0, 'rage_clicks': 0,
                        'quickbacks': 0, 'error_clicks': 0,
                        'avg_duration_sec': 0,
                    }
                r = url_map[url]
                if name == 'Traffic':
                    r['sessions'] = _safe_int(item.get('totalSessionCount'))
                elif name == 'ScrollDepth':
                    r['scroll_depth_pct'] = _safe_float(item.get('averageScrollDepth', 0))
                elif name == 'DeadClickCount':
                    r['dead_clicks'] = _safe_int(item.get('subTotal', 0))
                elif name == 'RageClickCount':
                    r['rage_clicks'] = _safe_int(item.get('subTotal', 0))
                elif name == 'QuickbackClick':
                    r['quickbacks'] = _safe_int(item.get('subTotal', 0))
                elif name == 'ErrorClickCount':
                    r['error_clicks'] = _safe_int(item.get('subTotal', 0))
                elif name == 'EngagementTime':
                    sessions = _safe_int(item.get('sessionsCount', 1)) or 1
                    r['avg_duration_sec'] = round(_safe_float(item.get('totalTime', 0)) / sessions, 1)

        pages = sorted(url_map.values(), key=lambda x: x['sessions'], reverse=True)
        # Update top_pages if not already set from aggregate
        if not pop_pages:
            daily['top_pages'] = json.dumps([{'url': p['url'], 'visits': p['sessions']} for p in pages[:20]])
    except Exception as e:
        log.error(f'Clarity by URL failed: {e}')

    return daily, pages


# --- DB Upserts ---

def upsert_direct_campaigns(conn, rows):
    if not rows:
        return 0
    cur = conn.cursor()
    for r in rows:
        cur.execute("""
            INSERT INTO direct_campaign_stats
                (date, campaign_id, campaign_name, clicks, impressions, ctr, avg_cpc, cost,
                 conversions, cost_per_conversion, bounce_rate, avg_pageviews)
            VALUES (%(date)s, %(campaign_id)s, %(campaign_name)s, %(clicks)s, %(impressions)s,
                    %(ctr)s, %(avg_cpc)s, %(cost)s, %(conversions)s, %(cost_per_conversion)s,
                    %(bounce_rate)s, %(avg_pageviews)s)
            ON CONFLICT (date, campaign_id) DO UPDATE SET
                campaign_name=EXCLUDED.campaign_name, clicks=EXCLUDED.clicks,
                impressions=EXCLUDED.impressions, ctr=EXCLUDED.ctr, avg_cpc=EXCLUDED.avg_cpc,
                cost=EXCLUDED.cost, conversions=EXCLUDED.conversions,
                cost_per_conversion=EXCLUDED.cost_per_conversion,
                bounce_rate=EXCLUDED.bounce_rate, avg_pageviews=EXCLUDED.avg_pageviews
        """, r)
    conn.commit()
    return len(rows)


def upsert_direct_placements(conn, rows):
    if not rows:
        return 0
    cur = conn.cursor()
    for r in rows:
        cur.execute("""
            INSERT INTO direct_placements
                (date, campaign_id, placement, clicks, impressions, ctr, avg_cpc, cost,
                 bounce_rate, avg_pageviews)
            VALUES (%(date)s, %(campaign_id)s, %(placement)s, %(clicks)s, %(impressions)s,
                    %(ctr)s, %(avg_cpc)s, %(cost)s, %(bounce_rate)s, %(avg_pageviews)s)
            ON CONFLICT (date, campaign_id, placement) DO UPDATE SET
                clicks=EXCLUDED.clicks, impressions=EXCLUDED.impressions, ctr=EXCLUDED.ctr,
                avg_cpc=EXCLUDED.avg_cpc, cost=EXCLUDED.cost,
                bounce_rate=EXCLUDED.bounce_rate, avg_pageviews=EXCLUDED.avg_pageviews
        """, r)
    conn.commit()
    return len(rows)


def upsert_direct_search_queries(conn, rows):
    if not rows:
        return 0
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS direct_search_queries (
            id SERIAL PRIMARY KEY,
            date DATE NOT NULL,
            campaign_id BIGINT NOT NULL,
            query TEXT NOT NULL DEFAULT '',
            clicks INTEGER DEFAULT 0,
            impressions INTEGER DEFAULT 0,
            cost NUMERIC DEFAULT 0,
            conversions INTEGER DEFAULT 0,
            bounce_rate NUMERIC DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(date, campaign_id, query)
        )
    """)
    conn.commit()
    for r in rows:
        cur.execute("""
            INSERT INTO direct_search_queries
                (date, campaign_id, query, clicks, impressions, cost, conversions, bounce_rate)
            VALUES (%(date)s, %(campaign_id)s, %(query)s, %(clicks)s, %(impressions)s,
                    %(cost)s, %(conversions)s, %(bounce_rate)s)
            ON CONFLICT (date, campaign_id, query) DO UPDATE SET
                clicks=EXCLUDED.clicks, impressions=EXCLUDED.impressions,
                cost=EXCLUDED.cost, conversions=EXCLUDED.conversions,
                bounce_rate=EXCLUDED.bounce_rate
        """, r)
    conn.commit()
    return len(rows)


def upsert_metrika_traffic(conn, rows):
    if not rows:
        return 0
    cur = conn.cursor()
    for r in rows:
        cur.execute("""
            INSERT INTO metrika_traffic
                (date, source, visits, users, new_users, bounce_rate, page_depth, avg_duration)
            VALUES (%(date)s, %(source)s, %(visits)s, %(users)s, %(new_users)s,
                    %(bounce_rate)s, %(page_depth)s, %(avg_duration)s)
            ON CONFLICT (date, source) DO UPDATE SET
                visits=EXCLUDED.visits, users=EXCLUDED.users, new_users=EXCLUDED.new_users,
                bounce_rate=EXCLUDED.bounce_rate, page_depth=EXCLUDED.page_depth,
                avg_duration=EXCLUDED.avg_duration
        """, r)
    conn.commit()
    return len(rows)


def upsert_metrika_goals(conn, rows):
    if not rows:
        return 0
    cur = conn.cursor()
    for r in rows:
        cur.execute("""
            INSERT INTO metrika_goals
                (date, goal_id, goal_name, source, reaches, visits)
            VALUES (%(date)s, %(goal_id)s, %(goal_name)s, %(source)s, %(reaches)s, %(visits)s)
            ON CONFLICT (date, goal_id, source) DO UPDATE SET
                goal_name=EXCLUDED.goal_name, reaches=EXCLUDED.reaches, visits=EXCLUDED.visits
        """, r)
    conn.commit()
    return len(rows)


def upsert_metrika_utm(conn, rows):
    if not rows:
        return 0
    cur = conn.cursor()
    for r in rows:
        cur.execute("""
            INSERT INTO metrika_utm
                (date, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                 visits, users, bounce_rate, page_depth, avg_duration, goal_reaches)
            VALUES (%(date)s, %(utm_source)s, %(utm_medium)s, %(utm_campaign)s, %(utm_content)s,
                    %(utm_term)s, %(visits)s, %(users)s, %(bounce_rate)s, %(page_depth)s,
                    %(avg_duration)s, %(goal_reaches)s)
            ON CONFLICT (date, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
            DO UPDATE SET
                visits=EXCLUDED.visits, users=EXCLUDED.users, bounce_rate=EXCLUDED.bounce_rate,
                page_depth=EXCLUDED.page_depth, avg_duration=EXCLUDED.avg_duration,
                goal_reaches=EXCLUDED.goal_reaches
        """, r)
    conn.commit()
    return len(rows)


def upsert_clarity_daily(conn, row):
    if not row:
        return 0
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO clarity_daily
            (date, total_sessions, bot_sessions, distinct_users, pages_per_session,
             avg_scroll_depth, dead_click_pct, rage_click_pct, quickback_pct,
             total_time_sec, active_time_sec, top_pages, devices, countries, browsers, referrers)
        VALUES (%(date)s, %(total_sessions)s, %(bot_sessions)s, %(distinct_users)s,
                %(pages_per_session)s, %(avg_scroll_depth)s, %(dead_click_pct)s,
                %(rage_click_pct)s, %(quickback_pct)s, %(total_time_sec)s, %(active_time_sec)s,
                %(top_pages)s, %(devices)s, %(countries)s, %(browsers)s, %(referrers)s)
        ON CONFLICT (date) DO UPDATE SET
            total_sessions=EXCLUDED.total_sessions, bot_sessions=EXCLUDED.bot_sessions,
            distinct_users=EXCLUDED.distinct_users, pages_per_session=EXCLUDED.pages_per_session,
            avg_scroll_depth=EXCLUDED.avg_scroll_depth, dead_click_pct=EXCLUDED.dead_click_pct,
            rage_click_pct=EXCLUDED.rage_click_pct, quickback_pct=EXCLUDED.quickback_pct,
            total_time_sec=EXCLUDED.total_time_sec, active_time_sec=EXCLUDED.active_time_sec,
            top_pages=EXCLUDED.top_pages, devices=EXCLUDED.devices,
            countries=EXCLUDED.countries, browsers=EXCLUDED.browsers, referrers=EXCLUDED.referrers
    """, row)
    conn.commit()
    return 1


def upsert_clarity_pages(conn, rows):
    if not rows:
        return 0
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS clarity_pages (
            id SERIAL PRIMARY KEY,
            date DATE NOT NULL,
            url TEXT NOT NULL,
            sessions INTEGER DEFAULT 0,
            scroll_depth_pct NUMERIC DEFAULT 0,
            dead_clicks INTEGER DEFAULT 0,
            rage_clicks INTEGER DEFAULT 0,
            quickbacks INTEGER DEFAULT 0,
            error_clicks INTEGER DEFAULT 0,
            avg_duration_sec NUMERIC DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(date, url)
        )
    """)
    conn.commit()
    for r in rows:
        cur.execute("""
            INSERT INTO clarity_pages
                (date, url, sessions, scroll_depth_pct, dead_clicks, rage_clicks,
                 quickbacks, error_clicks, avg_duration_sec)
            VALUES (%(date)s, %(url)s, %(sessions)s, %(scroll_depth_pct)s,
                    %(dead_clicks)s, %(rage_clicks)s, %(quickbacks)s,
                    %(error_clicks)s, %(avg_duration_sec)s)
            ON CONFLICT (date, url) DO UPDATE SET
                sessions=EXCLUDED.sessions, scroll_depth_pct=EXCLUDED.scroll_depth_pct,
                dead_clicks=EXCLUDED.dead_clicks, rage_clicks=EXCLUDED.rage_clicks,
                quickbacks=EXCLUDED.quickbacks, error_clicks=EXCLUDED.error_clicks,
                avg_duration_sec=EXCLUDED.avg_duration_sec
        """, r)
    conn.commit()
    return len(rows)


# --- Main ---

def main():
    if len(sys.argv) == 3:
        date_from = sys.argv[1]
        date_to = sys.argv[2]
    elif len(sys.argv) == 2:
        date_from = date_to = sys.argv[1]
    else:
        yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
        date_from = date_to = yesterday

    log.info(f'ETL run: {date_from} → {date_to}')
    conn = db_connect()
    total = 0

    # Direct campaigns
    try:
        rows = pull_direct_campaigns(date_from, date_to)
        n = upsert_direct_campaigns(conn, rows)
        log.info(f'Direct campaigns: {n} rows')
        total += n
    except Exception as e:
        log.error(f'Direct campaigns failed: {e}')

    # Direct placements
    try:
        rows = pull_direct_placements(date_from, date_to)
        n = upsert_direct_placements(conn, rows)
        log.info(f'Direct placements: {n} rows')
        total += n
    except Exception as e:
        log.error(f'Direct placements failed: {e}')

    # Direct search queries (offline report)
    try:
        rows = pull_direct_search_queries(date_from, date_to)
        n = upsert_direct_search_queries(conn, rows)
        log.info(f'Direct search queries: {n} rows')
        total += n
    except Exception as e:
        log.error(f'Direct search queries failed: {e}')

    # Metrika traffic
    try:
        rows = pull_metrika_traffic(date_from, date_to)
        n = upsert_metrika_traffic(conn, rows)
        log.info(f'Metrika traffic: {n} rows')
        total += n
    except Exception as e:
        log.error(f'Metrika traffic failed: {e}')

    # Metrika goals
    try:
        rows = pull_metrika_goals(date_from, date_to)
        n = upsert_metrika_goals(conn, rows)
        log.info(f'Metrika goals: {n} rows')
        total += n
    except Exception as e:
        log.error(f'Metrika goals failed: {e}')

    # Metrika UTM
    try:
        rows = pull_metrika_utm(date_from, date_to)
        n = upsert_metrika_utm(conn, rows)
        log.info(f'Metrika UTM: {n} rows')
        total += n
    except Exception as e:
        log.error(f'Metrika UTM failed: {e}')

    # Clarity (always pulls last 24h, ignores date_from/date_to)
    try:
        clarity_date = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
        daily_row, page_rows = pull_clarity(clarity_date)
        n = upsert_clarity_daily(conn, daily_row)
        log.info(f'Clarity daily: {n} rows')
        total += n
        n = upsert_clarity_pages(conn, page_rows)
        log.info(f'Clarity pages: {n} rows')
        total += n
    except Exception as e:
        log.error(f'Clarity failed: {e}')

    conn.close()
    log.info(f'Done. Total rows: {total}')


if __name__ == '__main__':
    main()
