#!/usr/bin/env python3
"""
SEO Positions Snapshot — раз в 2 недели берёт позиции всех ключей
из Яндекс.Вебмастер + Google Search Console и пишет в PostgreSQL.

Таблица seo_position_snapshots хранит историю — каждый snapshot_date — свой набор записей.
Дополнительно обновляет seo_keywords.position (последний известный) и snapshot_date.

Cron: 0 7 1,15 * *  (1 и 15 число в 07:00)

Usage:
  python3 seo-positions-snapshot.py              # берёт последние 7 дней
  python3 seo-positions-snapshot.py --days 14    # за 14 дней
  python3 seo-positions-snapshot.py --dry-run    # только вывод, без записи в БД
"""

import sys, os, json, time, datetime, logging, argparse
import urllib.request, urllib.parse
import psycopg2
import psycopg2.extras

ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k, v)

# Для Webmaster API нужен токен со scope «webmaster». В /opt/etl/.env
# DIRECT_TOKEN = старый токен с полным scope (Direct+Metrika+Webmaster),
# METRIKA_TOKEN = новый read-only metrika-only. Берём Webmaster-friendly.
YM_TOKEN = (os.environ.get('YM_WEBMASTER_TOKEN')
            or os.environ.get('DIRECT_TOKEN')
            or os.environ.get('METRIKA_TOKEN', ''))
GSC_SA = os.environ.get('GSC_CREDENTIALS_PATH', '/root/.config/gsc-service-account.json')
GSC_SITE = os.environ.get('GSC_SITE', 'sc-domain:aidacamp.ru')
YM_HOST = os.environ.get('YM_HOST', 'https:aidacamp.ru:443')
YM_USER_ID = int(os.environ.get('YM_USER_ID', '19303961'))
DB_DSN = os.environ.get('DB_DSN', 'dbname=aidacamp user=postgres')

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('seo-snapshot')


# ---------- Schema ----------

DDL = """
CREATE TABLE IF NOT EXISTS seo_position_snapshots (
  id bigserial PRIMARY KEY,
  snapshot_date date NOT NULL,
  keyword text NOT NULL,
  search_engine text NOT NULL CHECK (search_engine IN ('yandex','google')),
  position numeric,
  clicks integer,
  impressions integer,
  ctr numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE (snapshot_date, keyword, search_engine)
);
CREATE INDEX IF NOT EXISTS seo_position_snapshots_keyword_idx
  ON seo_position_snapshots(keyword, search_engine, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS seo_position_snapshots_date_idx
  ON seo_position_snapshots(snapshot_date DESC);
"""


# ---------- Yandex Webmaster ----------

def fetch_yandex(days_back=7):
    """Возвращает list of dicts {keyword, position, clicks, impressions, ctr}."""
    if not YM_TOKEN:
        log.warning('YM_TOKEN не задан, пропускаю Яндекс')
        return []
    url_enc = urllib.parse.quote(YM_HOST, safe='')
    base = f'https://api.webmaster.yandex.net/v4/user/{YM_USER_ID}/hosts/{url_enc}/search-queries'
    out = []
    offset = 0
    page_size = 500
    # Popular endpoint отдаёт шоу/клики/CTR по ключам — собираем сырые стрингифицированные данные
    for indicator in ('TOTAL_CLICKS', 'TOTAL_SHOWS'):
        offset = 0
        while True:
            params = {
                'query_indicator': indicator,
                'order_by': indicator,
                'limit': page_size,
                'offset': offset,
            }
            q = urllib.parse.urlencode(params)
            req = urllib.request.Request(f'{base}/popular?{q}', headers={'Authorization': f'OAuth {YM_TOKEN}'})
            try:
                resp = urllib.request.urlopen(req, timeout=30)
                data = json.loads(resp.read())
            except Exception as e:
                log.error(f'YM {indicator} offset={offset}: {e}')
                break
            queries = data.get('queries', [])
            for q in queries:
                kw = (q.get('query_text') or '').strip().lower()
                if not kw: continue
                ind = q.get('indicators', {})
                entry = next((x for x in out if x['keyword'] == kw), None)
                if entry is None:
                    entry = {'keyword': kw, 'clicks': None, 'impressions': None}
                    out.append(entry)
                if indicator == 'TOTAL_CLICKS' and ind.get('TOTAL_CLICKS') is not None:
                    entry['clicks'] = int(ind['TOTAL_CLICKS'])
                if indicator == 'TOTAL_SHOWS' and ind.get('TOTAL_SHOWS') is not None:
                    entry['impressions'] = int(ind['TOTAL_SHOWS'])
            if len(queries) < page_size:
                break
            offset += page_size
            time.sleep(0.1)
    # YM popular не отдаёт position напрямую — нужен отдельный endpoint `/all-history?query_ids=...`
    # Для упрощения v1: position оставляем NULL, clicks/impressions главное. Position можно вытягивать раздельно при необходимости.
    log.info(f'Yandex: {len(out)} keyword-строк собрано')
    return out


# ---------- GSC ----------

def fetch_gsc(days_back=28):
    """GSC searchanalytics/query, dimensions=[query]."""
    if not os.path.exists(GSC_SA):
        log.warning(f'GSC_CREDENTIALS_PATH={GSC_SA} не найден, пропускаю GSC')
        return []
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession

    creds = service_account.Credentials.from_service_account_file(
        GSC_SA, scopes=['https://www.googleapis.com/auth/webmasters.readonly']
    )
    session = AuthorizedSession(creds)
    end = datetime.date.today() - datetime.timedelta(days=2)
    start = end - datetime.timedelta(days=days_back)
    site = urllib.parse.quote(GSC_SITE, safe='')
    body = {
        'startDate': start.isoformat(),
        'endDate': end.isoformat(),
        'dimensions': ['query'],
        'rowLimit': 25000,
    }
    r = session.post(f'https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query', json=body)
    rows = r.json().get('rows', [])
    out = []
    for row in rows:
        kw = row['keys'][0].strip().lower()
        if not kw: continue
        out.append({
            'keyword': kw,
            'position': round(float(row.get('position') or 0), 2),
            'clicks': int(row.get('clicks', 0)),
            'impressions': int(row.get('impressions', 0)),
            'ctr': round(float(row.get('ctr') or 0) * 100, 4),
        })
    log.info(f'GSC: {len(out)} keyword-строк за {days_back} дней')
    return out


# ---------- Persist ----------

def upsert(conn, snapshot_date, items, search_engine):
    if not items:
        log.info(f'{search_engine}: нечего писать')
        return 0
    with conn.cursor() as cur:
        rows = [(
            snapshot_date,
            it['keyword'],
            search_engine,
            it.get('position'),
            it.get('clicks'),
            it.get('impressions'),
            it.get('ctr'),
        ) for it in items]
        psycopg2.extras.execute_values(cur, """
            INSERT INTO seo_position_snapshots (snapshot_date, keyword, search_engine, position, clicks, impressions, ctr)
            VALUES %s
            ON CONFLICT (snapshot_date, keyword, search_engine) DO UPDATE SET
              position = EXCLUDED.position,
              clicks = EXCLUDED.clicks,
              impressions = EXCLUDED.impressions,
              ctr = EXCLUDED.ctr
        """, rows)
    return len(items)


def update_seo_keywords_from_snapshot(conn, snapshot_date):
    """Обновляет seo_keywords.position/snapshot_date из последнего snapshot."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE seo_keywords sk
            SET position = sps.position,
                snapshot_date = sps.snapshot_date
            FROM seo_position_snapshots sps
            WHERE sps.snapshot_date = %s
              AND lower(sk.keyword) = sps.keyword
              AND sk.search_engine = sps.search_engine
              AND sps.position IS NOT NULL
        """, (snapshot_date,))
        return cur.rowcount


# ---------- Main ----------

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--days', type=int, default=14, help='Окно для YM (по умолчанию 14 дней)')
    p.add_argument('--gsc-days', type=int, default=28, help='Окно для GSC (по умолчанию 28)')
    p.add_argument('--dry-run', action='store_true', help='Не писать в БД')
    args = p.parse_args()

    snapshot_date = datetime.date.today()
    log.info(f'Snapshot для {snapshot_date} (YM {args.days}d / GSC {args.gsc_days}d)')

    ym_items = fetch_yandex(args.days)
    gsc_items = fetch_gsc(args.gsc_days)

    if args.dry_run:
        log.info(f'DRY-RUN — Yandex: {len(ym_items)} keys, Google: {len(gsc_items)} keys')
        print('Sample Yandex:', ym_items[:3])
        print('Sample Google:', gsc_items[:3])
        return

    conn = psycopg2.connect(DB_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute(DDL)
        conn.commit()
        yn = upsert(conn, snapshot_date, ym_items, 'yandex')
        gn = upsert(conn, snapshot_date, gsc_items, 'google')
        conn.commit()
        updated = update_seo_keywords_from_snapshot(conn, snapshot_date)
        conn.commit()
        log.info(f'WROTE: yandex={yn}, google={gn}, seo_keywords updated={updated}')
    finally:
        conn.close()


if __name__ == '__main__':
    main()
