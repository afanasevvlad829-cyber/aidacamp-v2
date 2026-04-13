# Quality Roadmap (Reasonable Sufficiency)

## Current baseline (step-1)
- CSS duplicate selectors: `77`
- JS `if` count: `403`
- JS max line length: `348`
- JS direct `state.*=` mutations: `84`
- Dist size: `323011` bytes

## Iterations to stabilize technical debt

### Iteration 1 (already done)
- Add metrics/baseline/gate scripts
- Add CI quality workflow
- Freeze anti-regression via baseline deltas

Expected impact:
- Stop silent regressions immediately
- Tech debt growth curve: flat (no automatic increase)

### Iteration 2 (policy hardening)
- Enforce pre-commit guard: no manual `dist` edits without source changes
- Keep debug and production behavior separated by policy
- Keep commit granularity by stage

Expected impact:
- Tech debt: `-10%` (operational debt)
- CSS/JS quality: `+0.5 / +0.5`

### Iteration 3 (CSS structural cleanup)
- Layer cleanup in `src/styles/main.css` by zones:
  - hero/topbar
  - booking flow
  - modal stack
  - mobile overrides
- Reduce duplicate selectors and selector coupling

Expected impact:
- CSS quality: `+1.0 ... +1.5`
- Tech debt: `-15%`

### Iteration 4 (JS flow cleanup)
- Move hot paths into explicit modules:
  - state transitions
  - booking actions
  - render/update boundaries
- Replace direct state mutations with controlled patching
- Reduce conditional branching in render paths

Expected impact:
- JS quality: `+1.0 ... +1.5`
- Tech debt: `-20%`

## Total plan size
- **4 iterations** (including completed iteration-1)
- Remaining: **3 iterations**
- Target after iteration-4:
  - CSS/JS quality: `8.5+ / 8.5+`
  - Technical debt: `< 4/10`
