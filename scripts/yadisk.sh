#!/usr/bin/env bash
# yadisk.sh — утилита для работы с Яндекс.Диском AidaCamp
# Используется агентами и MCP-сервером для поиска фото и получения ссылок.
#
# Команды:
#   search <запрос>           — поиск по описанию/тегам/сцене в каталоге фото
#   best <сцена> [кол-во]     — лучшие фото (качество=сайт) по сцене
#   url <disk:/путь>          — получить прямую ссылку на скачивание файла
#   preview <disk:/путь>      — получить ссылку на превью (маленькое фото)
#   info <disk:/путь>         — метаданные файла с диска
#   scenes                    — список всех сцен с количеством фото
#   stats                     — общая статистика каталога
#
# Переменные окружения:
#   YADISK_TOKEN  — OAuth-токен Яндекс.Диска (обязателен для url/preview/info)
#
# Примеры:
#   ./yadisk.sh search "дети программирование"
#   ./yadisk.sh best занятие 5
#   ./yadisk.sh url "disk:/Медиа/2025/Фото/Прочее/photo.jpg"
#   ./yadisk.sh scenes

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Каталог фото — ищем рядом со скриптом или в disk-cleanup
CATALOG=""
for f in \
  "$SCRIPT_DIR/photo_catalog.json" \
  "$SCRIPT_DIR/../photo_catalog.json" \
  "$HOME/Downloads/photo_catalog.json" \
  "/root/disk-cleanup/photo_catalog.json"; do
  [ -f "$f" ] && CATALOG="$f" && break
done

SUMMARY=""
for f in \
  "$SCRIPT_DIR/photo_catalog_summary.json" \
  "$SCRIPT_DIR/../photo_catalog_summary.json" \
  "$HOME/Downloads/photo_catalog_summary.json" \
  "/root/disk-cleanup/photo_catalog_summary.json"; do
  [ -f "$f" ] && SUMMARY="$f" && break
done

INDEX=""
for f in \
  "$SCRIPT_DIR/disk_index.json" \
  "$SCRIPT_DIR/../disk_index.json" \
  "$HOME/Downloads/disk_index.json" \
  "/root/disk-cleanup/disk_index.json"; do
  [ -f "$f" ] && INDEX="$f" && break
done

CMD="${1:-help}"
shift || true

case "$CMD" in

  search)
    QUERY="${*:?Укажи поисковый запрос}"
    [ -z "$CATALOG" ] && echo "❌ photo_catalog.json не найден" && exit 1
    python3 -c "
import json, sys, re

catalog = json.load(open('$CATALOG'))
query = ' '.join(sys.argv[1:]).lower()
terms = query.split()
results = []

for path, entry in catalog.items():
    if not isinstance(entry, dict): continue
    text = ' '.join([
        entry.get('описание', ''),
        entry.get('сцена', ''),
        entry.get('качество', ''),
        entry.get('возраст', ''),
        ' '.join(entry.get('теги', [])),
        entry.get('_имя', ''),
    ]).lower()
    score = sum(1 for t in terms if t in text)
    if score > 0:
        results.append((score, path, entry))

results.sort(key=lambda x: (
    -x[0],
    0 if x[2].get('качество') == 'сайт' else 1 if x[2].get('качество') == 'соцсети' else 2,
))

if not results:
    print('Ничего не найдено.')
    sys.exit(0)

print(f'Найдено: {len(results)} фото\n')
for score, path, e in results[:20]:
    q = e.get('качество', '?')
    s = e.get('сцена', '?')
    desc = e.get('описание', '')
    print(f'[{q}] [{s}] {path}')
    if desc:
        print(f'  {desc}')
    tags = e.get('теги', [])
    if tags:
        print(f'  Теги: {', '.join(tags)}')
    print()
" $QUERY
    ;;

  best)
    SCENE="${1:?Укажи сцену: занятие, хакатон, эмоции, спорт, территория, столовая, вожатые, награждение, портрет, обучение, прочее}"
    COUNT="${2:-10}"
    [ -z "$CATALOG" ] && echo "❌ photo_catalog.json не найден" && exit 1
    python3 -c "
import json, sys

catalog = json.load(open('$CATALOG'))
scene = sys.argv[1].lower()
count = int(sys.argv[2])

# Сначала сайт, потом соцсети
results = []
for path, e in catalog.items():
    if not isinstance(e, dict): continue
    if e.get('сцена', '').lower() == scene:
        q = e.get('качество', 'архив')
        rank = 0 if q == 'сайт' else 1 if q == 'соцсети' else 2
        results.append((rank, path, e))

results.sort(key=lambda x: x[0])

if not results:
    print(f'Фото со сценой \"{scene}\" не найдены.')
    sys.exit(0)

total = len(results)
site = sum(1 for r in results if r[0] == 0)
social = sum(1 for r in results if r[0] == 1)
print(f'Сцена \"{scene}\": {total} фото ({site} сайт, {social} соцсети)\n')
print(f'Топ-{min(count, len(results))}:\n')
for rank, path, e in results[:count]:
    q = e.get('качество', '?')
    desc = e.get('описание', '')
    year = e.get('_год', '?')
    age = e.get('возраст', '')
    print(f'[{q}] [{year}] {path}')
    if desc:
        print(f'  {desc}')
    if age:
        print(f'  Возраст: {age}')
    print()
" "$SCENE" "$COUNT"
    ;;

  url)
    PATH_ARG="${1:?Укажи путь: disk:/Медиа/...}"
    [ -z "$YADISK_TOKEN" ] && echo "❌ YADISK_TOKEN не задан" && exit 1
    ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$PATH_ARG")
    RESPONSE=$(curl -sf -H "Authorization: OAuth $YADISK_TOKEN" \
      "https://cloud-api.yandex.net/v1/disk/resources/download?path=$ENCODED")
    echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['href'])"
    ;;

  preview)
    PATH_ARG="${1:?Укажи путь: disk:/Медиа/...}"
    SIZE="${2:-L}"
    [ -z "$YADISK_TOKEN" ] && echo "❌ YADISK_TOKEN не задан" && exit 1
    ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$PATH_ARG")
    RESPONSE=$(curl -sf -H "Authorization: OAuth $YADISK_TOKEN" \
      "https://cloud-api.yandex.net/v1/disk/resources?path=$ENCODED&fields=preview&preview_size=${SIZE}")
    echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('preview','Превью недоступно'))"
    ;;

  info)
    PATH_ARG="${1:?Укажи путь: disk:/Медиа/...}"
    [ -z "$YADISK_TOKEN" ] && echo "❌ YADISK_TOKEN не задан" && exit 1
    ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$PATH_ARG")
    curl -sf -H "Authorization: OAuth $YADISK_TOKEN" \
      "https://cloud-api.yandex.net/v1/disk/resources?path=$ENCODED" | python3 -m json.tool
    ;;

  scenes)
    [ -z "$CATALOG" ] && echo "❌ photo_catalog.json не найден" && exit 1
    python3 -c "
import json
catalog = json.load(open('$CATALOG'))
scenes = {}
for e in catalog.values():
    if not isinstance(e, dict): continue
    s = e.get('сцена', 'неизвестно')
    q = e.get('качество', 'архив')
    if s not in scenes:
        scenes[s] = {'total': 0, 'сайт': 0, 'соцсети': 0, 'архив': 0}
    scenes[s]['total'] += 1
    scenes[s][q] = scenes[s].get(q, 0) + 1

print(f'{'Сцена':<18} {'Всего':>6} {'Сайт':>6} {'Соцсети':>8} {'Архив':>6}')
print('-' * 48)
for s, c in sorted(scenes.items(), key=lambda x: -x[1]['total']):
    print(f'{s:<18} {c[\"total\"]:>6} {c.get(\"сайт\",0):>6} {c.get(\"соцсети\",0):>8} {c.get(\"архив\",0):>6}')
print(f'\nВсего: {len(catalog)} фото')
"
    ;;

  stats)
    [ -z "$SUMMARY" ] && echo "❌ photo_catalog_summary.json не найден" && exit 1
    python3 -c "
import json
s = json.load(open('$SUMMARY'))
print(f'Всего фото: {s[\"итого\"]}')
print(f'Для сайта: {s[\"для_сайта_кол\"]}')
print(f'Для соцсетей: {s[\"для_соцсетей_кол\"]}')
print()
print('По качеству:')
for k, v in sorted(s['по_качеству'].items(), key=lambda x: -x[1]):
    print(f'  {k:<12} {v:>5}')
print()
print('По сценам:')
for k, v in sorted(s['по_сцене'].items(), key=lambda x: -x[1]):
    print(f'  {k:<18} {v:>5}')
"
    ;;

  help|--help|-h)
    head -25 "$0" | grep '^#' | sed 's/^# \?//'
    ;;

  *)
    echo "❌ Неизвестная команда: $CMD"
    echo "Используй: $0 help"
    exit 1
    ;;
esac
