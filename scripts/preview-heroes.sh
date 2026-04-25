#!/usr/bin/env bash
# preview-heroes.sh — симулирует кроп hero-блока для всех статей
#
# Использование:
#   ./scripts/preview-heroes.sh              # все изображения
#   ./scripts/preview-heroes.sh zavisimost   # только zawis*
#
# Результат: /tmp/hero-previews/*.jpg — откройте в Finder и проверьте кадрирование
#
# Что симулирует:
#   - Desktop hero: 1280×430 (16:5, object-position center 40%)
#   - Левый градиент поверх (50% ширины, alpha) — зона где лежит текст

set -euo pipefail

ARTICLES_DIR="$(cd "$(dirname "$0")/../public/images/articles" && pwd)"
OUT_DIR="/tmp/hero-previews"
mkdir -p "$OUT_DIR"

FILTER="${1:-}"

# Собираем уникальные imageBase (берём только *-800.jpg)
FILES=()
while IFS= read -r -d '' f; do
  base=$(basename "$f" "-800.jpg")
  [[ -z "$FILTER" || "$base" == *"$FILTER"* ]] && FILES+=("$base")
done < <(find "$ARTICLES_DIR" -name "*-800.jpg" -print0 | sort -z)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "❌ Нет файлов по фильтру: '$FILTER'"
  exit 1
fi

echo "🖼  Генерирую превью для ${#FILES[@]} изображений..."
echo "   Формат: 1280×430 (desktop hero, object-position center 40%)"
echo "   Папка:  $OUT_DIR"
echo ""

for BASE in "${FILES[@]}"; do
  SRC="$ARTICLES_DIR/${BASE}-1600.jpg"
  [[ -f "$SRC" ]] || SRC="$ARTICLES_DIR/${BASE}-800.jpg"
  OUT="$OUT_DIR/${BASE}.jpg"

  # 1. Масштабируем до ширины 1280, сохраняя пропорции
  # 2. Кроп 1280×430 с gravity NorthWest со смещением 0,<40%-от-высоты>
  #    object-position: center 40% = берём от 40% высоты вниз
  magick "$SRC" \
    -resize '1280x>' \
    -gravity NorthWest \
    -background black \
    -extent 1280x \
    \( +clone -resize 1280x430+0+0^ -gravity North -extent 1280x430 \) \
    -delete 0 \
    \( -size 640x430 gradient:'rgba(13,26,43,0.82)-rgba(13,26,43,0)' \) \
    -composite \
    -quality 88 \
    "$OUT" 2>/dev/null

  # Если что-то пошло не так — простой вариант
  if [[ $? -ne 0 ]] || [[ ! -s "$OUT" ]]; then
    magick "$SRC" -resize '1280x^' -gravity Center -extent 1280x430 -quality 88 "$OUT" 2>/dev/null || true
  fi

  echo "  ✓ $BASE"
done

echo ""
echo "✅ Готово! Открываю в Finder..."
open "$OUT_DIR"
