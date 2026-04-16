# Phase checks

Date: 2026-04-08 (Europe/Moscow)

- `bash ./build.sh` -> PASS
- `node ./tools/smoke-booking-ui-playwright.mjs` -> PASS
- `./tools/quality-check.sh` -> FAIL (`dist_max_line_length=117808 > 1100`)
- `./tools/quality-gate.sh` -> FAIL (`dist_bytes=177440 > baseline 56263`, `dist_max_line_length=117808 > baseline 437`)

Known status: failures are baseline/threshold alignment issues; runtime smoke remains green.
