#!/bin/bash
# news-jazz: hourly AI-news fetch + summarize + publish to dev and prod
set -e
cd /opt/news-jazz

export OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' /opt/mcp/.env | head -1 | cut -d= -f2-)
if [ -z "$OPENAI_API_KEY" ]; then
  echo "[news-jazz] OPENAI_API_KEY not found in /opt/mcp/.env, aborting" >&2
  exit 1
fi

node fetch.js

# Публикуем ту же выгрузку и на прод (fetch.js пишет только в dev-путь)
DEV_FILE=/var/www/aidacamp-dev/current/data/news-jazz.json
PROD_DIR=/var/www/aidacamp/current/data
if [ -f "$DEV_FILE" ]; then
  mkdir -p "$PROD_DIR"
  cp "$DEV_FILE" "$PROD_DIR/news-jazz.json"
  echo "[news-jazz] synced to prod"
fi
