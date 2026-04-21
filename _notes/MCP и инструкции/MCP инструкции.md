# MCP — инструкции для агентов

## Единственный MCP — `aidacamp-tools`

Все агенты работают через удалённый MCP-сервер:
- URL: `https://dev.aidacamp.ru/mcp`
- Монитор: `https://dev.aidacamp.ru/mcp/dashboard`
- Локальный запуск: `node scripts/mcp-server.mjs`

## Подключение

**Claude Code / Claude Desktop** — через `.mcp.json` в проекте:
```json
{
  "aidacamp-tools": {
    "command": "node",
    "args": ["/Users/vladimirafanasev/Aidacamp-cloude/scripts/mcp-server.mjs"]
  }
}
```

**Cursor / Windsurf** — та же конфигурация.

## Инструменты (21 шт.)

### Сервер и файлы
| Инструмент | Назначение |
|---|---|
| `ssh` | Команды на сервере (host: "aidacamp") |
| `files` | Файловые операции: copy, move, delete, search, tree, edit |
| `read_file` | Чтение файлов |
| `write_file` | Запись файлов |
| `list_directory` | Список файлов в папке |
| `create_directory` | Создание папок |
| `diagnostics` | Проверка VK, Директ, SSH, лог ошибок |

### Аналитика
| Инструмент | Назначение |
|---|---|
| `stats` | SQL-запросы к PostgreSQL (Директ, Метрика, Clarity) |
| `clarity` | Microsoft Clarity: поведение на сайте |
| `pagespeed` | Google PageSpeed аудит |

### Рекламные платформы
| Инструмент | Назначение |
|---|---|
| `direct_campaigns` | Список кампаний Яндекс Директ |
| `direct_manage_campaign` | CRUD кампаний Директ |
| `direct_manage_adgroup` | CRUD групп Директ |
| `direct_manage_ad` | CRUD объявлений Директ |
| `direct_manage_keywords` | CRUD ключевых слов Директ |
| `vk_campaigns` | Список кампаний VK Ads |
| `vk_manage_campaign` | CRUD кампаний VK |
| `vk_manage_ad_group` | CRUD групп VK |
| `vk_manage_ad` | CRUD объявлений VK |
| `vk_ads_stats` | Статистика VK Ads |

### Контент
| Инструмент | Назначение |
|---|---|
| `photos` | Поиск фото на Яндекс.Диске (9200 фото с AI-описаниями) |
| `browser_agent` | Headless браузер: скриншоты, скрапинг, Lighthouse |

## Запрещённые инструменты

НЕ использовать: `mcp__Claude_in_Chrome__*`, `mcp__Claude_Preview__*`, `mcp__a3fef8cb-*` (Figma), `mcp__5967f77d__*`, `mcp__scheduled-tasks__*`, Desktop Commander, Kapture.

## Диагностика

При ошибке — сначала `diagnostics()`, потом действия.

| Ситуация | Действие |
|---|---|
| Инструмент не отвечает | `diagnostics()` |
| Таймаут SSH | Повторить 1 раз |
| Таймаут browser_agent | Использовать site-snapshot |
| Ошибка 429 | Лимит, НЕ повторять |

## Site-snapshot (готовые данные сайта)

Обновляется при каждом деплое. **Проверь дату в `content.json` — если < 24ч, используй snapshot вместо browser_agent.**

- Контент: `https://dev.aidacamp.ru/screenshots/site-snapshot/content.json`
- Сводка: `https://dev.aidacamp.ru/screenshots/site-snapshot/summary.md`
- Скриншоты: `desktop-{name}.png`, `mobile-{name}.png`
- Имена: index, detskiy-lager, podmoskove, kompyuternyy, programming, podrostkov, shkolnikov, v-podmoskove, v-moskve, leto-2026, avgust, bez-telefonov, nedorogo, minecraft, it-shkola, obrazovatelnyy, tematicheskiy, kompaniy, putevku, legal
