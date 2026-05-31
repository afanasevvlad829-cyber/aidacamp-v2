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

## Destructive Operations — NEVER without explicit user confirmation

These commands can permanently destroy work and are NOT caught by git hooks.
An agent must STOP and ask the user in plain text before running ANY of them.
"The task seems to require it" is NOT confirmation. Only an explicit user "yes" is.

1. History / commit destruction:
   - `git reset --hard` (any ref)
   - `git rebase` on shared branches (`dev`, `main`, `site-prod`)
   - `git commit --amend` on already-pushed commits
   - `git reflog expire` / `git gc --prune=now`
2. Working-tree destruction:
   - `git clean -f` / `git clean -fd` / `git clean -fdx`
   - `git checkout -- .` / `git restore .` that discards uncommitted changes
   - `git stash drop` / `git stash clear`
3. Branch / remote destruction:
   - `git branch -D` (force-delete unmerged branch)
   - `git push --delete` / `git push :branch`
   - `git push --force` / `--force-with-lease` (also blocked by hook on protected branches)
4. Bypassing safety:
   - NEVER use `--no-verify` to skip pre-commit / pre-push / commit-msg hooks.
   - NEVER set `PIPELINE_BYPASS=1` or `MASTER_AGENT=1` on the user's behalf.
   - NEVER edit `scripts/git-hooks/**`, branch protection, or `core.hooksPath` to weaken protection.
5. Filesystem / deploy destruction:
   - NEVER run `rm -rf` on anything outside a clearly scoped build/temp dir.
   - Deploy ONLY via `./scripts/deploy.sh [dev|prod]`. NEVER call `rsync` to the server
     by hand. The script is already hardened: it deploys static WITHOUT `--delete` and
     excludes `.env`, `current/`, `node_modules/`, `data/`, `images/gallery/`.
   - Manual `rsync --delete` against a live web-root wipes `current/`, `.env` and
     `node_modules` (incident 2026-05-22 — dev root was destroyed this way).
   - NEVER deploy `prod` on the user's behalf: it requires `MASTER_AGENT=1` and an
     interactive `yes`. Prod deploy is the owner's action, not the agent's.

If unsure whether an operation is destructive: treat it as destructive and ask first.
Prefer non-destructive alternatives: `git revert` over `reset --hard`,
`git stash` over `clean`, a new branch over force-push.

## UI Architecture Rules (Desktop/Mobile)

1. Desktop is the single source-of-truth for structure and data flow.
2. Mobile is a presentation layer of the same architecture (templates/classes/styles), not a separate UI branch.
3. Do not implement feature changes via legacy forks or hardcoded duplicate markup for mobile/desktop.
4. If change scope is visual, prefer CSS/class/template updates; do not duplicate business/state logic.
5. Keep one shared state/action pipeline for both views; only rendering differs.
6. Legacy mode is not used for production changes; migrate legacy behavior into unified components.
