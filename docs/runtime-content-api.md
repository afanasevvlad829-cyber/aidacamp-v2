# Runtime Content API (PostgreSQL)

## Environment

- `AIDAPLUS_ENV=dev|prod` — draft/publish endpoints are `dev` only.
- `AIDAPLUS_PG_DSN=postgresql://user:pass@host:5432/dbname` — enables PostgreSQL for content + AB events.
- `AIDAPLUS_AB_DB_PATH=.runtime/ab_events.sqlite` — fallback AB storage when PostgreSQL is not configured.

## Tables

Schema file: `tools/sql/content_api_pg.sql`

- `content_blocks(block_id, locale, payload_json, version, is_published, updated_at)`
- `content_revisions(id, block_id, locale, payload_json, author, created_at)`
- `ab_events(id, event_name, test_id, variant, payload_json, visitor_id, session_id, created_at)`

## Endpoints

### GET `/api/content?block=&locale=`
Returns published block payload.

### GET `/api/content/batch?blocks=shifts,media-content,hero-content,legacy-content-map&locale=ru`
Returns multiple published blocks.

### POST `/api/content/<block>/draft` (dev only)
Body:

```json
{
  "locale": "ru",
  "author": "dev",
  "payload": {"...": "..."}
}
```

### POST `/api/content/<block>/publish` (dev only)
Body:

```json
{
  "locale": "ru",
  "author": "dev"
}
```

If `payload` is omitted, latest draft revision is used.

### POST `/api/ab-event`
Writes A/B event to PostgreSQL (or SQLite fallback).

## Frontend contract

`src/scripts/core/content-adapter.js`:

- `loadBlock(blockId, locale)`
- `loadBlocks(blockIds, locale)`

Fallback source: `window.AIDACAMP_CONTENT`.

## Runtime orchestration contract (current)

- `src/scripts/main.js` is orchestration-only and calls feature APIs through `safeInvoke(target, methodName, args, fallback)`.
- Core feature entrypoints are mounted under `window.AC_FEATURES.*.create(...)`.
- Summary/timer flow is handled by `features/summary-flow.js` (render/timer/summary bar visibility), not inline in `main.js`.
- Runtime freeze mark: `v1-final` (Zero Legacy cycle start).
- Canonical product contour target: Hero simple + single-step booking path; legacy stage flows are tracked in `docs/quality/legacy-inventory-v1-final.md` for removal by batches.
- Required runtime events remain:
  - `state:sync`
  - `hero:*`
  - `booking:*`
  - `calendar:*`
  - `content:*`
  - `tracking:*`
