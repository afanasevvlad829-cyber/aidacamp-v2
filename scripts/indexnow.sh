#!/usr/bin/env bash
# IndexNow — мгновенная отправка URL в Яндекс для переиндексации
#
# Использование:
#   ./scripts/indexnow.sh                    # отправить все страницы сайта
#   ./scripts/indexnow.sh /ceny/ /lager-v-moskve/   # конкретные пути
#   ./scripts/indexnow.sh --dry-run          # показать что будет отправлено
#
# Документация: https://yandex.ru/support/webmaster/indexnow/indexnow-protocol.html
# IndexNow ключ зарегистрирован на: https://aidacamp.ru/f5bd0a7e08fa4610830ab6ea73abd373.txt

set -euo pipefail

KEY="f5bd0a7e08fa4610830ab6ea73abd373"
HOST="aidacamp.ru"
YANDEX_ENDPOINT="https://yandex.com/indexnow"

# Все страницы сайта (обновляй при добавлении новых)
ALL_URLS=(
  "https://aidacamp.ru/"
  "https://aidacamp.ru/ceny/"
  "https://aidacamp.ru/kupit-putevku-v-lager/"
  "https://aidacamp.ru/lager-nedorogo/"
  "https://aidacamp.ru/lager-v-moskve/"
  "https://aidacamp.ru/lager-v-podmoskove/"
  "https://aidacamp.ru/detskiy-lager-podmoskove/"
  "https://aidacamp.ru/detskiy-lager/"
  "https://aidacamp.ru/lager-dlya-podrostkov/"
  "https://aidacamp.ru/lager-dlya-shkolnikov/"
  "https://aidacamp.ru/lager-programmirovaniya/"
  "https://aidacamp.ru/kompyuternyy-lager/"
  "https://aidacamp.ru/it-camp/"
  "https://aidacamp.ru/python-lager/"
  "https://aidacamp.ru/minecraft-lager/"
  "https://aidacamp.ru/scratch-lager/"
  "https://aidacamp.ru/roblox-lager/"
  "https://aidacamp.ru/3d-modelirovanie-lager/"
  "https://aidacamp.ru/lager-bez-telefonov/"
  "https://aidacamp.ru/tematicheskiy-lager/"
  "https://aidacamp.ru/obrazovatelnyy-lager/"
  "https://aidacamp.ru/letnyaya-it-shkola/"
  "https://aidacamp.ru/dlya-kompaniy/"
  "https://aidacamp.ru/nalogovyj-vychet/"
  "https://aidacamp.ru/lager-na-leto-2026/"
  "https://aidacamp.ru/lager-na-avgust-podmoskove/"
  "https://aidacamp.ru/politika-vozvrata/"
  "https://aidacamp.ru/stati/podrostok-ne-hochet-uchitsya/"
  "https://aidacamp.ru/stati/nizkaya-samootsenka-u-rebenka/"
  "https://aidacamp.ru/stati/problemy-v-obschenii-podrostkov/"
  "https://aidacamp.ru/stati/zavisimost-ot-kompyuternyh-igr/"
  "https://aidacamp.ru/stati/zavisimost-ot-telefona-u-podrostkov/"
  "https://aidacamp.ru/stati/lechenie-kompyuternoj-zavisimosti/"
  "https://aidacamp.ru/stati/priznaki-kompyuternoj-zavisimosti/"
  "https://aidacamp.ru/stati/profilaktika-kompyuternoj-zavisimosti/"
  "https://aidacamp.ru/stati/kak-izbavitsya-ot-zavisimosti-ot-igr/"
  "https://aidacamp.ru/stati/igromaniya-u-detej/"
  "https://aidacamp.ru/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet/"
  "https://aidacamp.ru/stati/kuda-det-rebenka-letom/"
  "https://aidacamp.ru/stati/detskiy-lager-bez-telefonov/"
  "https://aidacamp.ru/stati/hakaton-v-detskom-lagere/"
  "https://aidacamp.ru/stati/vnutrennyaya-ekonomika-v-lagere/"
  "https://aidacamp.ru/stati/ii-zamenit-programmista/"
)

DRY_RUN=false
CUSTOM_URLS=()

# Разбираем аргументы
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN=true
  elif [[ "$arg" == /* ]]; then
    # Путь вида /ceny/ → полный URL
    CUSTOM_URLS+=("https://${HOST}${arg}")
  elif [[ "$arg" == https://* ]]; then
    CUSTOM_URLS+=("$arg")
  fi
done

# Определяем что отправляем
if [[ ${#CUSTOM_URLS[@]} -gt 0 ]]; then
  URLS_TO_SEND=("${CUSTOM_URLS[@]}")
else
  URLS_TO_SEND=("${ALL_URLS[@]}")
fi

echo "IndexNow: отправляем ${#URLS_TO_SEND[@]} URL(s) в Яндекс"
echo "Ключ: ${KEY}"
echo ""

# Формируем JSON массив URL
URL_JSON=$(python3 -c "
import json, sys
urls = sys.argv[1:]
print(json.dumps(urls, ensure_ascii=False))
" "${URLS_TO_SEND[@]}")

PAYLOAD=$(python3 -c "
import json, sys
data = {
  'host': '${HOST}',
  'key': '${KEY}',
  'keyLocation': 'https://${HOST}/${KEY}.txt',
  'urlList': json.loads(sys.argv[1])
}
print(json.dumps(data, ensure_ascii=False, indent=2))
" "$URL_JSON")

if [[ "$DRY_RUN" == true ]]; then
  echo "=== DRY RUN — запрос не отправлен ==="
  echo "$PAYLOAD"
  exit 0
fi

echo "Отправляем запрос..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$YANDEX_ENDPOINT" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP статус: $HTTP_CODE"
[[ -n "$BODY" ]] && echo "Ответ: $BODY"
echo ""

case "$HTTP_CODE" in
  200) echo "✓ Успешно — URL приняты, переиндексация запущена" ;;
  202) echo "✓ Принято в очередь — URL будут проиндексированы" ;;
  400) echo "✗ Ошибка запроса (400) — проверьте формат" ;;
  403) echo "✗ Ключ не верифицирован (403) — проверьте ${HOST}/${KEY}.txt" ;;
  422) echo "✗ URL не относятся к домену ${HOST} (422)" ;;
  429) echo "! Слишком много запросов (429) — подождите и повторите" ;;
  *)   echo "? Неизвестный статус: $HTTP_CODE" ;;
esac
