# AidaCamp Project Artifact Policy

Updated: 2026-03-24 (Europe/Moscow)
Scope: artifact housekeeping/inventory policy. No destructive cleanup.

## 1. Consistent Inventory Counts (single source of truth)
Source of truth: `audit_artifact_inventory_cleanup_report/tables/artifact-inventory.csv`

- Total inventoried files: **7305**
- Git state:
  - `tracked-clean`: **12**
  - `tracked-dirty`: **29**
  - `untracked`: **1663**
  - `ignored`: **5601**
- Category counts (normalized; combined tags like `B;D` contribute to both B and D):
  - `A:Build/Release`: **6**
  - `B:Audit/Report`: **5592**
  - `C:Screens/Visual`: **1545**
  - `D:Legacy/Backup/Archive`: **172**
  - `E:Runtime/Source Docs`: **12**

Raw category tokens currently present in CSV:
- `A:Build/Release`: 6
- `B:Audit/Report`: 5590
- `B:Audit/Report; D:Legacy/Backup/Archive`: 2
- `C:Screens/Visual`: 1525
- `C:Screens/Visual; D:Legacy/Backup/Archive`: 20
- `D:Legacy/Backup/Archive`: 150
- `E:Runtime/Source Docs`: 12

Rule: all summaries must reuse these normalized numbers from CSV, not manual recount.

## 2. Canonical Map (repo-specific)

| Class | Canonical? | Source of truth | Notes |
|---|---|---|---|
| Product runtime source | Yes | `index.html`, `src/scripts/**`, `src/styles/**`, `assets/**`, `src/pages/**` | Core product source and behavior.
| Runtime/release docs | Yes | `docs/**` | Process/runtime contract docs are versioned.
| Generated outputs | No (default) | `build/**`, `dist/**`, root `legal.html` | Generated artifacts, not canonical source.
| Review/debug artifacts | No (default) | `screens/**`, `audit/playwright/artifacts/**`, `diff/**` | Keep minimal curated subset only if explicitly needed.
| Archive/legacy/backups | No (default) | `archive/**`, `*.bak*`, prototype/sandbox exports | Archive-only/cold-storage class.

## 3. HTML Rules (explicit)

### 3.1 Source-of-truth HTML
- `index.html`
- `src/pages/legal.html`

### 3.2 Generated / non-canonical HTML
- `build/legal.html`
- `dist/legal.html`
- root `legal.html` (unless explicitly promoted by policy)

Rule: generated HTML must not be used as editing baseline.

## 4. Curated Commit-Now List (policy baseline)
Reference list file: `docs/project-artifact-commit-now.md`

Commit now:
- `docs/contracts.md`
- `docs/state-schema.md`
- `docs/release-checklist.md`
- `docs/project-map.md`
- `docs/project-artifact-policy.md`
- `src/pages/legal.html` (source page, if this is approved runtime source)

Do not commit now:
- `*.zip` bundles (`audit_*`, `patch_*`, `release/*.zip`, exports)
- bulk `screens/**` (keep only curated final subset)
- `build/**`, `dist/legal.html`, `diff/*.diff`
- `audit/playwright/artifacts/**`
- `archive/non-runtime/**`

## 5. Recommended `.gitignore` Snippet
Use this as the policy snippet (append after review):

```gitignore
# Generated
build/
dist/legal.html
diff/*.diff

# Artifact bundles
*.zip

# Visual debug artifacts
screens/debug/
screens/tmp/
audit/playwright/artifacts/

# Sandbox / exports
prototype-export/
ui-sandbox/prototype-export-*.zip
archive/non-runtime/
```

Never ignore:
- `docs/**`
- `src/pages/**`
- core `src/**`, `assets/**`, `index.html`

## 6. Safe Cleanup Plan (non-destructive)
1. Freeze policy files first (`docs/project-artifact-policy.md`, inventory CSV, report).
2. Curate keep-list for screenshots (5–10 final baselines max).
3. Move chosen baselines into a stable final folder (policy path), keep the rest outside git.
4. Add `.gitignore` rules (no deletions yet).
5. Re-run `git status` and verify only canonical files remain candidates for commit.
6. Perform cleanup in a separate explicit step/PR (not in this policy step).
