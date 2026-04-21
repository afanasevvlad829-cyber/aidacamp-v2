# UI/UX аудит — open-source стек (19.04.2026)

> Задача: автоматически проверять эргономику и корректность aidacamp.ru.
> Итог подбора: 4 инструмента + единый скрипт агрегатор.
> Запускаем ежедневно, результат складываем в Postgres `seo_keywords`-подобную таблицу.

---

## 🎯 Рекомендуемый стек

| # | Инструмент | Назначение | GitHub |
|---|---|---|---|
| 1 | **Unlighthouse** | Lighthouse на весь сайт (perf/SEO/best-practices/a11y-base) | harlan-zw/unlighthouse ⭐4.5k |
| 2 | **axe-core CLI** | Глубокая a11y (WCAG 2.1), JSON-выхлоп | dequelabs/axe-core-npm |
| 3 | **WebQA Agent** 🧠 | AI-powered UX-аудит — Playwright + Claude Vision оценивает эргономику | MigoXLab/webqa-agent |
| 4 | **BackstopJS** | Визуальная регрессия (эталон vs текущий) | garris/BackstopJS ⭐7.1k |

---

## Быстрый старт — 1 команда

```bash
cd /Users/vladimirafanasev/Aidacamp-cloude
bash scripts/audit-site.sh   # TODO — создать по шаблону ниже
```

### Шаблон `scripts/audit-site.sh`

```bash
#!/bin/bash
set -e
SITE="https://aidacamp.ru"
OUT="./audit-$(date +%Y%m%d)"
mkdir -p "$OUT"/{lighthouse,axe,ai,visual}

# 1) Site-wide Lighthouse
npx unlighthouse-cli --site "$SITE" --output-path "$OUT/lighthouse" --no-cache

# 2) Углублённая a11y по ключевым URL
for url in "$SITE" "$SITE/schedule" "$SITE/contacts" "$SITE/about"; do
  slug=$(echo "$url" | sed 's|[^a-zA-Z0-9]|_|g')
  npx @axe-core/cli "$url" --save "$OUT/axe/$slug.json" --stdout || true
done

# 3) AI UX-оценщик (Claude Vision)
cd webqa && uv run webqa-agent gen --config ../webqa.config.yaml --output "../$OUT/ai"
cd ..

# 4) Визуальная регрессия
npx backstopjs test --config=backstop.json || true
cp -r backstop_data/html_report "$OUT/visual/"

echo "✅ Audit → $OUT/"
```

---

## Почему эти 4, а не другие

- **Unlighthouse вместо lighthouse-ci** — lhci хорош для одного URL, но для сайта с десятками страниц нужен batch (смена, контакты, программы). Unlighthouse сам обходит sitemap, параллелит, отдаёт веб-дашборд.
- **axe-core + pa11y**: axe даёт 57% автоматически обнаруживаемых WCAG-нарушений, pa11y добавляет свой набор (+10-15% сверху). Если нужна максимум — ставим оба. Для старта — только axe.
- **WebQA Agent** (самое новое, 200 stars) — **единственный open-source** инструмент, который реально умеет «скриншот → LLM-оценка эргономики». Работает с Claude/GPT/Gemini. Дает human-language рекомендации типа «CTA на hero-экране контрастирует плохо с фоном, шрифт заголовка 18px → мобильному читать сложно».
- **BackstopJS вместо Percy/Chromatic** — полностью OSS без SaaS-подписки, работает через Playwright (у нас уже стоит).

---

## Lighthouse / Nielsen / SEO-гибрид

- **SEMrush open-source альтернативы** — не нашлось. Ближе всего: Unlighthouse + свой SEO-layer на базе `seo_keywords` (у нас уже есть).
- **Nielsen heuristics evaluator** — пока нет готового CLI. Альтернатива — Claude skill `nielsen-heuristics-audit` (github.com/mastepanoski/claude-skills).

---

## Roadmap интеграции (когда делаем)

1. Создать `scripts/audit-site.sh` (по шаблону выше) — **15 мин**
2. Запустить вручную для baseline — **10 мин**
3. Таблица `site_audit_runs` в Postgres + импортер JSON → SQL — **30 мин**
4. Cron ежедневно 6:00 — **5 мин**
5. CM v3 правило `audit_regression` (если perf-score упал >5 пунктов / появились новые axe violations) — **20 мин**

**Итого ~1.5 часа на полную интеграцию.** Сейчас это не приоритет (Директ/SEO важнее), но скрипт готов — запустим после разворота Директа.

---

## Источники

- [Unlighthouse](https://github.com/harlan-zw/unlighthouse)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [axe-core CLI](https://github.com/dequelabs/axe-core-npm)
- [WebQA Agent](https://github.com/MigoXLab/webqa-agent) 🧠 AI
- [BackstopJS](https://github.com/garris/BackstopJS)
- [Pa11y](https://github.com/pa11y/pa11y)
- [axe vs pa11y сравнение](https://www.craigabbott.co.uk/blog/axe-core-vs-pa11y/)
- [Claude UX skill / Nielsen heuristics](https://github.com/mastepanoski/claude-skills)
