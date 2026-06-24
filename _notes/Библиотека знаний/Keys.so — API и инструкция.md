# Keys.so — SEO API: инструкция и эндпоинты

> Доступ: месячная подписка с 2026-06-22. Ключ: `KEYS_SO_TOKEN` в `~/MCP/.env`.
> Интеграция в MCP: `service="keys"` в инструменте `run`.

## Базы данных (параметр `base`)
| base | Что |
|---|---|
| `msk` | Яндекс Москва (default) |
| `gru` | Google Россия (Москва) |
| `spb` | Яндекс Санкт-Петербург |
| и др. региональные |  |

## Доступные действия

### domain_info
Общий дашборд домена: трафик, видимость, количество ключей в ТОП.
```
run(service="keys", action="domain_info", params={domain:"aidacamp.ru", base:"msk"})
```

### domain_keywords
Органические ключевые слова домена.
```
run(service="keys", action="domain_keywords", params={
  domain:"aidacamp.ru",
  base:"msk",
  per_page:100,
  sort:"traffic|desc"  // или pos|asc
})
```

### domain_pages
Топ страниц домена по органическому трафику.
```
run(service="keys", action="domain_pages", params={domain:"aidacamp.ru", base:"msk", per_page:50})
```

### domain_competitors
Список конкурентов домена по пересечению ключей.
```
run(service="keys", action="domain_competitors", params={domain:"aidacamp.ru", base:"msk"})
```

### keyword_gap ⭐ (главный инструмент анализа)
Ключи, по которым конкуренты в ТОП, а наш домен — нет.
```
run(service="keys", action="keyword_gap", params={
  domain:"aidacamp.ru",
  domains:["moscamp.ru","enjoy-camp.ru","lageropt.ru"],
  base:"msk",
  per_page:200,
  sort:"traffic|desc"
})
```

### similar_keywords
Расширение семантики — похожие запросы по seed-ключу.
```
run(service="keys", action="similar_keywords", params={keyword:"детский лагерь подмосковье", base:"msk"})
```

### keyword_info
Детальная информация о запросе: частота, CPC, тренд, SERP-особенности.
```
run(service="keys", action="keyword_info", params={keyword:"летний лагерь для детей", base:"msk"})
```

### domain_lost_keywords
Ключи, по которым домен потерял позиции (вышел из ТОП).
```
run(service="keys", action="domain_lost_keywords", params={domain:"aidacamp.ru", base:"msk"})
```

### backlinks
Ссылочный профиль — донорские домены.
```
run(service="keys", action="backlinks", params={domain:"aidacamp.ru", per_page:100})
```

### raw
Произвольный эндпоинт из API docs (https://apidoc.keys.so/).
```
run(service="keys", action="raw", params={
  path:"/report/simple/organic/keywords",
  params:{domain:"aidacamp.ru", base:"msk", per_page:50}
})
```

## Полная карта эндпоинтов API

### Органический поиск
- `/report/simple/organic/keywords` — ключи домена
- `/report/simple/organic/concurents` — конкуренты
- `/report/simple/organic/sitepages` — топ страниц
- `/report/simple/organic/sitepages/withkeys` — страницы + ключи
- `/report/simple/organic/concurent_pages` — страницы конкурентов
- `/report/simple/organic/lost_keywords` — потерянные ключи
- `/report/simple/organic/lost_pages` — потерянные страницы
- `/report/simple/organic/ai-answers` — AI-ответы в SERP
- `/report/simple/organic/ai-concurents` — AI-конкуренты

### Дашборды
- `/report/simple/domain_dashboard` — дашборд домена
- `/report/simple/keyword_dashboard` — дашборд ключа
- `/report/simple/top_domain_visibility` — видимость

### Сравнение доменов (keyword gap)
- `/report/compare?view=organic` — органика
- `/report/compare?view=context` — контекст
- `/report/compare?view=backlinks` — ссылки

### Ссылки
- `/report/simple/links/backlinks` — бэклинки
- `/report/simple/links/backlinks-domains` — донорские домены
- `/report/simple/links/backlinks-anchor` — анкоры
- `/report/simple/links/backlinks-ip` — по IP

### Контекстная реклама
- `/report/simple/context/keywords` — ключи в контексте
- `/report/simple/context/concurents` — конкуренты в контексте
- `/report/simple/context/ads/` — объявления

### Расширение семантики
- `/report/simple/similarkeys` — похожие запросы

### Кластеризация
- `/clustering/` — создать кластер
- `/clustering/list` — список кластеров

### Wordstat (онлайн-парсер)
- `/wordstat/create-project`
- `/wordstat/report`
- `/wordstat/get-project-status`

## Лимиты
- Rate limit: 10 запросов / 10 секунд
- При 429 — смотреть заголовок `Retry-After`

## Правило
Перед любым SEO-анализом конкурентов — сначала `domain_competitors` чтобы получить актуальный список, не угадывать вручную.
