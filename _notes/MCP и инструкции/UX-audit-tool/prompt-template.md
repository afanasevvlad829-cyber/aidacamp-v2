# Prompt template для UX-аудита через Anthropic API

Готовый шаблон для интеграции UX-аудита в любой скрипт/агент без React-обвязки.

## Прямой вызов (curl)

```bash
ANTHROPIC_API_KEY=sk-ant-...
URL="https://aidacamp.ru"

curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d @- <<'JSON' | jq -r '.content[0].text' > audit.json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "system": "You are a senior UX/UI auditor and design psychologist. You analyze websites and provide comprehensive design audits.\n\nCRITICAL: Return ONLY raw valid JSON. No markdown, no backticks, no code fences. All string values on a single line — no literal newlines inside strings. No trailing commas. Straight double quotes only.\n\nReturn this exact JSON structure:\n\n{\"score\":0-100,\"summary\":\"2-3 sentence executive summary\",\"sections\":[{\"id\":\"contrast\",\"title\":\"Контраст и цвет\",\"score\":0-100,\"issues\":[{\"severity\":\"critical|warning|info\",\"text\":\"description\",\"fix\":\"how to fix\"}],\"passed\":[\"what works well\"]},{\"id\":\"typography\",\"title\":\"Типографика\",\"score\":0-100,\"issues\":[...],\"passed\":[...]},{\"id\":\"mobile\",\"title\":\"Мобильная версия\",\"score\":0-100,\"issues\":[...],\"passed\":[...]},{\"id\":\"layout\",\"title\":\"Лэйаут и иерархия\",\"score\":0-100,\"issues\":[...],\"passed\":[...]},{\"id\":\"psychology\",\"title\":\"Психология восприятия\",\"score\":0-100,\"issues\":[...],\"passed\":[...]}],\"colorPalette\":{\"dominant\":[\"#hex1\"],\"accent\":[\"#hex1\"],\"psychology\":\"описание\",\"recommendations\":[\"рекомендация 1\"]},\"priorityFixes\":[{\"rank\":1,\"action\":\"specific action\",\"impact\":\"high|medium|low\",\"effort\":\"high|medium|low\"}]}\n\nFor psychology: trust signals (blue), urgency/CTA (orange/red), calm/safety (green/teal), money/premium (gold, dark navy), children context (bright, playful, safe). F-pattern, Z-pattern reading. Hick's Law. Fitts's Law.\n\nBe specific, practical, direct. No vague advice.",
  "messages": [
    {
      "role": "user",
      "content": "Analyze this website for UI/UX design quality: URL_PLACEHOLDER\n\nFocus on Russian-speaking audience. The site is a children's IT summer camp (ages 7-14). Target audience: mothers aged 34-45. Analyze for: color contrast, typography, mobile usability, layout hierarchy, and color psychology appropriate for both parents and children.\n\nReturn ONLY valid JSON as specified."
    }
  ]
}
JSON
```

**Замени** `URL_PLACEHOLDER` на нужный URL.

## Для не-AidaCamp проекта — изменить контекст

Правь поле `content` в user-message:
```
"Focus on [AUDIENCE]. The site is [BUSINESS]. Target audience: [WHO]. Analyze for..."
```

## Рендер в HTML

После получения `audit.json`:
```bash
# Вариант 1: JSX приложение
# Запускаешь React-tool, оно само рисует

# Вариант 2: Быстрый HTML-рендер через jq + CSS из example
jq -r '.priorityFixes[] | "#\(.rank) \(.action) [\(.impact)/\(.effort)]"' audit.json

# Вариант 3: Python-рендер в HTML (см. render_audit.py)
```

## render_audit.py — простой скрипт для HTML из JSON

```python
#!/usr/bin/env python3
"""Рендерит JSON-audit в HTML как в example-aidacamp-2026-04-19.html"""
import json, sys, html
from pathlib import Path

CSS = Path(__file__).parent.joinpath('example-aidacamp-2026-04-19.html').read_text()
# извлечь <style>...</style>
import re
style = re.search(r'<style>(.*?)</style>', CSS, re.DOTALL).group(1)

def escape(s): return html.escape(str(s or ''))
def ring(score, size=88):
    color = '#27ae60' if score>=70 else '#f39c12' if score>=50 else '#e74c3c'
    r = (size-12)/2; circ = 2*3.14159*r; fill = score/100*circ
    return f'<svg width="{size}" height="{size}"><circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="#eee" stroke-width="8"/><circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="{color}" stroke-width="8" stroke-dasharray="{fill} {circ}" stroke-linecap="round" transform="rotate(-90 {size/2} {size/2})"/><text x="{size/2}" y="{size/2+1}" text-anchor="middle" dominant-baseline="middle" style="font-size:{int(size*0.22)}px;font-weight:700;fill:{color};font-family:monospace">{score}</text></svg>'

data = json.load(open(sys.argv[1]))
url = sys.argv[2] if len(sys.argv)>2 else ''

parts = [f'<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UX Аудит {escape(url)}</title><style>{style}</style></head><body><div class="wrap">']
parts.append(f'<div class="header"><div class="label">UX Аудит</div><h1>{escape(url)}</h1></div>')
parts.append(f'<div class="card"><div class="score-row">{ring(data["score"])}<div class="score-text"><h2>Общая оценка</h2><p>{escape(data["summary"])}</p></div></div></div>')

if data.get('priorityFixes'):
    parts.append('<div class="section-title">📋 Приоритеты фиксов</div>')
    for f in sorted(data['priorityFixes'], key=lambda x: {'high':0,'medium':1,'low':2}[x['impact']]):
        parts.append(f'<div class="fix-item"><span class="fix-rank">#{f["rank"]}</span><div class="fix-action">{escape(f["action"])}</div><div class="fix-tags"><span class="tag tag-{f["impact"]}">{f["impact"]}</span><span class="tag tag-{f["effort"]}">{f["effort"]}</span></div></div>')

for s in data.get('sections',[]):
    crit = sum(1 for i in s.get('issues',[]) if i['severity']=='critical')
    parts.append(f'<div class="section-card"><div class="section-head">{ring(s["score"],52)}<div class="section-info"><h3>{escape(s["title"])}</h3><div class="meta">{len(s.get("issues",[]))} проблем · {crit} критических · {len(s.get("passed",[]))} ок</div></div></div><div class="section-body">')
    for iss in s.get('issues',[]):
        parts.append(f'<div class="issue issue-{iss["severity"]}"><div class="issue-top"><span class="issue-badge badge-{iss["severity"]}">[{iss["severity"]}]</span><span class="issue-text">{escape(iss["text"])}</span></div><div class="issue-fix"><b>→ Фикс:</b> {escape(iss.get("fix",""))}</div></div>')
    for p in s.get('passed',[]):
        parts.append(f'<div class="pass-item"><span>✓</span><span>{escape(p)}</span></div>')
    parts.append('</div></div>')

parts.append('</div></body></html>')
print('\n'.join(parts))
```

Запуск:
```bash
curl https://api.anthropic.com/... > audit.json
python3 render_audit.py audit.json https://aidacamp.ru > audit.html
open audit.html
```

## Интеграция в CM v3 (autopilot)

Можно добавить правило в `/opt/etl/cm-v3-engine.py`:
- **Триггер:** новая кампания → первый прогон → N дней
- **Действие:** раз в неделю — автозапуск UX-аудита, сохранение результата в Postgres
- **Оповещение:** при падении оценки >10 пунктов → alert в Telegram
