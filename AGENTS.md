<!--
ICON SYSTEM MIGRATION

Project now uses unified SVG icons located in:

/assets/icons/

Rules for Codex:

1. Do not scan the whole repository.
2. Only inspect:
   - index.html
   - src/scripts/main.js
   - src/styles/main.css

3. Replace UI symbols with SVG icons:

✕ -> /assets/icons/close.svg
← -> /assets/icons/chevron-left.svg
→ -> /assets/icons/chevron-right.svg
▶ -> /assets/icons/play.svg

🤖 -> /assets/icons/robot.svg
🏊 -> /assets/icons/pool.svg
🍽 -> /assets/icons/food.svg
🏥 -> /assets/icons/med.svg
🔍 -> /assets/icons/search.svg
📋 -> /assets/icons/clipboard.svg
🔄 -> /assets/icons/refresh.svg
🔥 -> /assets/icons/fire-hit.svg
✨ -> /assets/icons/sparkle.svg
💰 -> /assets/icons/money.svg
🔒 -> /assets/icons/lock.svg
✅ -> /assets/icons/check.svg

Replacement pattern:

<img class="ac-icon" src="/assets/icons/close.svg" alt="" aria-hidden="true">

Do not modify business logic.
Do not change deploy scripts.
Only replace icon symbols.
-->

## Git Safety Rules (Local)

1. Never run `git add` for:
   - `assets/**`
   - `reports/**`
   - `*.tgz`
   - `*.zip`
   - `*.mp4`
   - `*.webp`
   - `*.jpeg`
2. Never run `git diff --no-index` for large binary files.
3. Before any `git add`, first print exact file list and wait for explicit user confirmation.

## UI Architecture Rules (Desktop/Mobile)

1. Desktop is the single source-of-truth for structure and data flow.
2. Mobile is a presentation layer of the same architecture (templates/classes/styles), not a separate UI branch.
3. Do not implement feature changes via legacy forks or hardcoded duplicate markup for mobile/desktop.
4. If change scope is visual, prefer CSS/class/template updates; do not duplicate business/state logic.
5. Keep one shared state/action pipeline for both views; only rendering differs.
6. Legacy mode is not used for production changes; migrate legacy behavior into unified components.
