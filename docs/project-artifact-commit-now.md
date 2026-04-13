# AidaCamp Curated Commit-Now List

Updated: 2026-03-24 (Europe/Moscow)
Scope: artifact policy baseline only (no product code changes).

## Commit now (policy/setup docs)
- `docs/project-artifact-policy.md`
- `docs/project-artifact-policy.gitignore-snippet.txt`
- `docs/project-artifact-commit-now.md`
- `audit_artifact_inventory_cleanup_report/report.md`
- `audit_artifact_inventory_cleanup_report/tables/artifact-inventory.csv`
- `audit_artifact_inventory_cleanup_report/tables/artifact-classification.csv`
- `audit_artifact_inventory_cleanup_report/tables/commit-now.csv`
- `audit_artifact_inventory_cleanup_report/tables/gitignore-recommendations.csv`

## Commit now only if already approved as canonical docs
- `docs/contracts.md`
- `docs/state-schema.md`
- `docs/release-checklist.md`
- `docs/project-map.md`

## Do not commit now
- `*.zip` bundles (`audit_*`, `patch_*`, `release/*.zip`)
- Generated outputs (`build/**`, `dist/legal.html`, root `legal.html`)
- Debug/review output (`audit/playwright/artifacts/**`, `screens/debug/**`, `screens/tmp/**`, `diff/*.diff`)
- Archive-only storage (`archive/non-runtime/**`, `prototype-export/**`, sandbox exports)
