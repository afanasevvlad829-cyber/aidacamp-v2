#!/bin/bash
# Stats CLI — query analytics DB on server via SSH
# Usage: ./scripts/stats.sh <command> [args...]
#
# Commands:
#   summary [period]           — key metrics overview (default: last 7 days)
#   direct [period]            — Direct campaign stats
#   direct-daily [period]      — Direct daily breakdown
#   metrika [period]           — Metrika traffic by source
#   metrika-daily [period]     — Metrika daily totals
#   goals [period]             — Goal conversions
#   utm [period]               — UTM breakdown
#   placements [period] [N]    — Top N placements by cost
#   query <SQL>                — Run raw SQL query
#   tables                     — List all tables with row counts
#   etl [date] [date_to]       — Run ETL manually for date(range)
#
# Periods: today, yesterday, week, month, quarter, YYYY-MM-DD, YYYY-MM-DD:YYYY-MM-DD

set -euo pipefail

SSH_KEY="$HOME/.ssh/aidacamp_prod"
SSH_HOST="root@159.194.223.55"
SSH="ssh -i $SSH_KEY -o ConnectTimeout=10 $SSH_HOST"
PSQL="sudo -u postgres psql -d aidacamp -P pager=off"

cmd="${1:-help}"
shift || true

# Period parsing — returns two SQL expressions separated by |
resolve_period() {
  local p="${1:-week}"
  case "$p" in
    today)     echo "CURRENT_DATE|CURRENT_DATE" ;;
    yesterday) echo "CURRENT_DATE-1|CURRENT_DATE-1" ;;
    week)      echo "CURRENT_DATE-7|CURRENT_DATE-1" ;;
    month)     echo "CURRENT_DATE-30|CURRENT_DATE-1" ;;
    quarter)   echo "CURRENT_DATE-90|CURRENT_DATE-1" ;;
    year)      echo "date_trunc('year',CURRENT_DATE)::date|CURRENT_DATE-1" ;;
    *:*)       echo "'${p%%:*}'|'${p##*:}'" ;;
    *)         echo "'$p'|'$p'" ;;
  esac
}

run_sql() {
  $SSH "$PSQL -c \"$1\""
}

case "$cmd" in

  summary)
    IFS='|' read -r dfrom dto <<< "$(resolve_period "${1:-week}")"
    run_sql "
      SELECT '--- DIRECT ---' AS section;
      SELECT
        SUM(clicks) AS clicks,
        SUM(impressions) AS impressions,
        ROUND(AVG(ctr)::numeric, 2) AS avg_ctr,
        ROUND(SUM(cost)::numeric, 2) AS total_cost,
        SUM(conversions) AS conversions,
        CASE WHEN SUM(conversions)>0 THEN ROUND((SUM(cost)/SUM(conversions))::numeric,2) ELSE 0 END AS cpa
      FROM direct_campaign_stats
      WHERE date >= $dfrom AND date <= $dto;

      SELECT '--- METRIKA ---' AS section;
      SELECT
        SUM(visits) AS visits,
        SUM(users) AS users,
        SUM(new_users) AS new_users,
        ROUND(AVG(bounce_rate)::numeric, 1) AS avg_bounce,
        ROUND(AVG(page_depth)::numeric, 2) AS avg_depth,
        ROUND(AVG(avg_duration)::numeric, 0) AS avg_duration_s
      FROM metrika_traffic
      WHERE date >= $dfrom AND date <= $dto;

      SELECT '--- GOALS ---' AS section;
      SELECT
        goal_name,
        SUM(reaches) AS total_reaches
      FROM metrika_goals
      WHERE date >= $dfrom AND date <= $dto
      GROUP BY goal_name
      ORDER BY total_reaches DESC;
    "
    ;;

  direct)
    IFS='|' read -r dfrom dto <<< "$(resolve_period "${1:-week}")"
    run_sql "
      SELECT
        campaign_name,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impressions,
        ROUND(AVG(ctr)::numeric, 2) AS ctr,
        ROUND(AVG(avg_cpc)::numeric, 2) AS cpc,
        ROUND(SUM(cost)::numeric, 2) AS cost,
        SUM(conversions) AS conv
      FROM direct_campaign_stats
      WHERE date >= $dfrom AND date <= $dto
      GROUP BY campaign_name
      ORDER BY cost DESC;
    "
    ;;

  direct-daily)
    IFS='|' read -r dfrom dto <<< "$(resolve_period "${1:-week}")"
    run_sql "
      SELECT
        date,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impr,
        ROUND(AVG(ctr)::numeric, 2) AS ctr,
        ROUND(SUM(cost)::numeric, 2) AS cost,
        SUM(conversions) AS conv
      FROM direct_campaign_stats
      WHERE date >= $dfrom AND date <= $dto
      GROUP BY date ORDER BY date;
    "
    ;;

  metrika)
    IFS='|' read -r dfrom dto <<< "$(resolve_period "${1:-week}")"
    run_sql "
      SELECT
        source,
        SUM(visits) AS visits,
        SUM(users) AS users,
        ROUND(AVG(bounce_rate)::numeric, 1) AS bounce,
        ROUND(AVG(page_depth)::numeric, 2) AS depth
      FROM metrika_traffic
      WHERE date >= $dfrom AND date <= $dto
      GROUP BY source
      ORDER BY visits DESC
      LIMIT 20;
    "
    ;;

  metrika-daily)
    IFS='|' read -r dfrom dto <<< "$(resolve_period "${1:-week}")"
    run_sql "
      SELECT
        date,
        SUM(visits) AS visits,
        SUM(users) AS users,
        ROUND(AVG(bounce_rate)::numeric, 1) AS bounce,
        ROUND(AVG(page_depth)::numeric, 2) AS depth,
        ROUND(AVG(avg_duration)::numeric, 0) AS dur_s
      FROM metrika_traffic
      WHERE date >= $dfrom AND date <= $dto
      GROUP BY date ORDER BY date;
    "
    ;;

  goals)
    IFS='|' read -r dfrom dto <<< "$(resolve_period "${1:-week}")"
    run_sql "
      SELECT
        date, goal_name, source,
        SUM(reaches) AS reaches
      FROM metrika_goals
      WHERE date >= $dfrom AND date <= $dto
      GROUP BY date, goal_name, source
      ORDER BY date DESC, reaches DESC;
    "
    ;;

  utm)
    IFS='|' read -r dfrom dto <<< "$(resolve_period "${1:-week}")"
    run_sql "
      SELECT
        utm_source, utm_medium, utm_campaign,
        SUM(visits) AS visits,
        SUM(users) AS users,
        ROUND(AVG(bounce_rate)::numeric, 1) AS bounce,
        SUM(goal_reaches) AS goals
      FROM metrika_utm
      WHERE date >= $dfrom AND date <= $dto
        AND utm_source != ''
      GROUP BY utm_source, utm_medium, utm_campaign
      ORDER BY visits DESC
      LIMIT 30;
    "
    ;;

  placements)
    IFS='|' read -r dfrom dto <<< "$(resolve_period "${1:-week}")"
    local_limit="${2:-20}"
    run_sql "
      SELECT
        placement,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impr,
        ROUND(AVG(ctr)::numeric, 2) AS ctr,
        ROUND(SUM(cost)::numeric, 2) AS cost
      FROM direct_placements
      WHERE date >= $dfrom AND date <= $dto
      GROUP BY placement
      ORDER BY cost DESC
      LIMIT $local_limit;
    "
    ;;

  tables)
    run_sql "
      SELECT
        relname AS table_name,
        n_live_tup AS row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC;
    "
    ;;

  query)
    sql="${1:?SQL query required}"
    run_sql "$sql"
    ;;

  etl)
    date_arg="${1:-}"
    date_to="${2:-}"
    if [ -n "$date_to" ]; then
      $SSH "cd /opt/etl && python3 etl-daily.py '$date_arg' '$date_to'"
    elif [ -n "$date_arg" ]; then
      $SSH "cd /opt/etl && python3 etl-daily.py '$date_arg'"
    else
      $SSH "cd /opt/etl && python3 etl-daily.py"
    fi
    ;;

  help|*)
    echo "Stats CLI — query analytics DB on server"
    echo ""
    echo "Usage: $0 <command> [period]"
    echo ""
    echo "Commands:"
    echo "  summary [period]         Key metrics overview"
    echo "  direct [period]          Direct campaign stats"
    echo "  direct-daily [period]    Direct daily breakdown"
    echo "  metrika [period]         Metrika traffic by source"
    echo "  metrika-daily [period]   Metrika daily totals"
    echo "  goals [period]           Goal conversions"
    echo "  utm [period]             UTM breakdown"
    echo "  placements [period] [N]  Top N placements by cost"
    echo "  query <SQL>              Run raw SQL query"
    echo "  tables                   List tables with row counts"
    echo "  etl [date] [date_to]     Run ETL manually"
    echo ""
    echo "Periods: today, yesterday, week, month, quarter, year"
    echo "         YYYY-MM-DD, YYYY-MM-DD:YYYY-MM-DD"
    ;;
esac
