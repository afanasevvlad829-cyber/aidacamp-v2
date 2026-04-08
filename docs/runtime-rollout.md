# Runtime Rollout Plan (10% → 50% → 100%)

## Scope
- Feature rollout: `FF_CONTENT_FROM_API`.
- Sticky bucket key: `aidacamp_rollout_bucket_FF_CONTENT_FROM_API` (localStorage).
- Dev hosts (`dev.aidacamp.ru`, localhost) ignore rollout buckets and use base flags for validation.
- This runbook is for production rollout only after explicit go decision.

## Preconditions (Go/No-Go)
Before switching stage, all must be true:
1. `CODE_READY=YES` in `docs/quality/code-ready-pre-report.md`.
2. `quality-check`, `architecture-check`, runtime/bookings smokes are green.
3. No unresolved critical incidents in booking path.
4. Rollback owner and communication channel are assigned.

If any point is false, rollout is blocked.

## Stage Switching Commands
Apply stage value in runtime settings:

```bash
bash tools/rollout-set-stage.sh 10
bash tools/rollout-set-stage.sh 50
bash tools/rollout-set-stage.sh 100
```

Then run build/deploy of target environment.

## Mandatory Verification Right After Deploy
Run:

```bash
./tools/smoke-runtime-api.sh https://aidacamp.ru
bash ./tools/smoke-booking-flow.sh https://aidacamp.ru
node ./tools/smoke-booking-ui-playwright.mjs https://aidacamp.ru
```

Minimum expected:
- Runtime API summary/content endpoints work.
- Booking path is submit-ready on desktop/mobile.
- No new blocking UI regressions.

## 72h Stabilization Window (Per Stage)
Duration per stage: 72h.
Recommended check cadence: every 6–12h.

```bash
bash tools/rollout-stability-report.sh https://aidacamp.ru 300
```

Monitor:
- Funnel: `hero_views → age_selects → shift_selects → offer_apply → booking_submitted`
- Errors: `lead_send_failed`
- Content API health:

```bash
curl -fsS "https://aidacamp.ru/api/content/batch?blocks=shifts,media-content,hero-content,legacy-content-map,ui-copy&locale=ru"
```

## Promotion Rules (10→50 and 50→100)
Promote only if all conditions hold over stabilization window:
1. No critical UI regressions.
2. No sustained growth in `lead_send_failed`.
3. No material conversion drop in `booking_submitted / offer_apply`.
4. Content API is stable (no repeated failures/timeouts).

If any rule fails: no promotion.

## Rollback Procedure
Rollback target stage:

```bash
bash tools/rollout-set-stage.sh 50   # from 100
bash tools/rollout-set-stage.sh 10   # from 50
```

Current `rollout-set-stage.sh` supports `10|50|100`; to perform full disable, set `FF_CONTENT_FROM_API` base flag off in runtime config and redeploy.

After rollback:
1. Re-run mandatory smokes.
2. Open incident note with timestamp, stage, observed regressions.
3. Freeze promotions until root-cause fix is merged and revalidated.

## Evidence Artifact Per Stage
For each stage keep:
- Deploy timestamp and commit hash.
- Smoke command outputs.
- 72h stability snapshots.
- Explicit decision: `PROMOTE` or `ROLLBACK`.
