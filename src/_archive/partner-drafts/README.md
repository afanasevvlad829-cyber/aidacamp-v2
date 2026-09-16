# Партнёрские черновики ЛАНИТ — архив

Убраны из `src/pages/` 08.09.2026 по решению владельца: не нужны, вернёмся при
необходимости. Страницы были noindex, в sitemap не входили, входящих ссылок в
коде не было. `LanitPageLayout` оставлен — его использует `dashboard/status`.

Вернуть: `git mv` файла обратно в `src/pages/`, затем добавить исключение в
`filter` sitemap (astro.config.mjs) и, для lanit-v5, в список `excluded`
в `scripts/check-public-astro.mjs`.
