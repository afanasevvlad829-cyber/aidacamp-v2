## Git Safety Rules

1. Never run `git add` for:
   - `assets/**`, `reports/**`, `*.tgz`, `*.zip`, `*.mp4`, `*.webp`, `*.jpeg`
2. Never run `git diff --no-index` for large binary files.
3. Before any `git add`, first print exact file list and wait for explicit user confirmation.

## Destructive Operations — NEVER without explicit user confirmation

An agent must STOP and ask in plain text. "The task seems to require it" is NOT confirmation.

1. **History / commit destruction:**
   - `git reset --hard` (any ref)
   - `git rebase` on shared branches (`dev`, `main`)
   - `git commit --amend` on already-pushed commits
   - `git reflog expire` / `git gc --prune=now`

2. **Working-tree destruction:**
   - `git clean -f` / `-fd` / `-fdx`
   - `git checkout -- .` / `git restore .` (discards uncommitted changes)
   - `git stash drop` / `git stash clear`

3. **Branch / remote destruction:**
   - `git branch -D` (force-delete unmerged branch)
   - `git push --delete` / `git push :branch`
   - `git push --force` / `--force-with-lease`

4. **Bypassing safety:**
   - NEVER use `--no-verify` to skip hooks
   - NEVER set `PIPELINE_BYPASS=1` or `MASTER_AGENT=1` on the user's behalf
   - NEVER edit `scripts/git-hooks/**` or branch protection rules

5. **Filesystem / deploy destruction:**
   - NEVER run `rm -rf` outside a clearly scoped build/temp dir
   - Deploy ONLY via `./scripts/deploy.sh [dev|prod]`. NEVER call `rsync` by hand.
   - Manual `rsync --delete` against live web-root wipes `current/`, `.env`, `node_modules` (incident 2026-05-22)
   - NEVER deploy `prod` on the user's behalf (requires `MASTER_AGENT=1` + interactive "yes")

If unsure — treat as destructive and ask first.
Prefer: `git revert` over `reset --hard`, `git stash` over `clean`, new branch over force-push.

## UI Architecture Rules

1. Desktop is the single source-of-truth for structure and data flow.
2. Mobile is a presentation layer — NOT a separate UI branch.
3. Do not implement feature changes via hardcoded duplicate markup for mobile/desktop.
4. If change scope is visual, prefer CSS/class/template updates; do not duplicate business/state logic.
5. Keep one shared state/action pipeline for both views; only rendering differs.
6. Legacy mode is not used for production changes.
