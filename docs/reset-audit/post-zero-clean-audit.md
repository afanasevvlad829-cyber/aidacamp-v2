# Post Zero-Clean Audit (Current Comparative Snapshot)

Date: 2026-04-08 (Europe/Moscow)
Model: dist-centric runtime reset-cleanup

## Baseline vs current (this wave)
| Metric | Baseline | Current |
|---|---:|---:|
| src CSS lines | 13,349 | 13,349 |
| src JS lines (`main.js`) | 2,662 | 2,662 |
| `!important` count | 234 | 234 |
| dist bytes | 177,440 | 163,523 |
| dist max line length | 108,835 | 136,289 |
| active asset roots | 6 | 6 |
| external URL refs | 34 | 34 |
| compat layer files | 2 | 9 |
| orphan asset candidates | 0 | 0 |
| unknown items (active-surface scope) | 0 | 0 |

## Runtime verdict
- build: PASS
- smoke: PASS
- quality-check: FAIL (known dist line threshold)
- quality-gate: FAIL (known baseline mismatch on dist metrics)

## Architecture verdict (current wave)
- Runtime model: DIST-CENTRIC CONFIRMED
- Active path map: FIXED
- Legacy-active clusters: MAPPED, partially reduced in prior passes
- Compat layers: CONFIRMED
- Next simplification wave: required for measurable debt reduction
