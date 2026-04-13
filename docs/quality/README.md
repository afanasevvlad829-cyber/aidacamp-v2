# Quality Gate Rules

## Purpose
- Prevent silent regression of JS/CSS quality and runtime artifact size.
- Keep desktop/mobile behavior in one shared architecture without legacy forks.

## Baseline
- File: `docs/quality/baseline.env`
- Regenerate only when intentionally accepting a new baseline:
  - `./tools/quality-check.sh`
  - `./tools/quality-baseline.sh`

## Local mandatory check
- `./tools/quality-check.sh`
- This script:
  - rebuilds artifacts (`build.sh`)
  - verifies `dist` artifacts are synchronized
  - captures metrics
  - fails on baseline/threshold regression

## Commit policy guard
- Install local hooks once:
  - `./tools/install-git-hooks.sh`
- Hook blocks commits where `dist` artifacts are staged without source-of-truth updates.

## CI gates
- Workflow `Quality Gate` runs on PR and push (`main`, `dev`, `codex/**`).
- Deploy workflow depends on quality pass.

## Anti-regression policy
- No increase allowed by default for:
  - duplicate CSS selectors
  - JS `if` count
  - direct state mutations
  - replacement characters in `dist`
- Small deltas allowed only for unavoidable formatting/packaging metrics.

## Iteration plan
- See `docs/quality/roadmap.md`

## Debt register
- File: `docs/quality/debt-register.md`
- Add item via:
  - `./tools/debt-register-add.sh "Area" "Type" "Risk" "Created By" "Fix Plan" "Iteration"`
