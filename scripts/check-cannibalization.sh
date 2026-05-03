#!/bin/bash
# Мониторинг каннибализации — запросы где конкурируют несколько страниц
# Запускать: bash scripts/check-cannibalization.sh

SSH_HOST="root@159.194.223.55"
SSH_KEY="$HOME/.ssh/aidacamp_prod"

echo "=== КАННИБАЛИЗАЦИЯ (несколько страниц на один запрос) ==="
ssh -i "$SSH_KEY" "$SSH_HOST" psql -U postgres -d aidacamp -c "
SELECT keyword, COUNT(DISTINCT page_url) as pages,
       STRING_AGG(DISTINCT page_url, ' | ') as competing_urls,
       MIN(position) as best_pos
FROM seo_position_snapshots
WHERE snapshot_date >= NOW() - INTERVAL '3 days'
  AND page_url != ''
GROUP BY keyword
HAVING COUNT(DISTINCT page_url) > 1
ORDER BY best_pos ASC
LIMIT 30;"

echo ""
echo "=== IT-ЗАПРОСЫ — какая страница ранжируется ==="
ssh -i "$SSH_KEY" "$SSH_HOST" psql -U postgres -d aidacamp -c "
SELECT keyword, page_url, position, snapshot_date
FROM seo_position_snapshots
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM seo_position_snapshots)
  AND (keyword ILIKE '%it лагерь%' OR keyword ILIKE '%компьютерный лагерь%')
ORDER BY position ASC
LIMIT 20;"
