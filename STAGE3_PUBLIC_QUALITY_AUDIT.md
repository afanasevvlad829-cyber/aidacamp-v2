# Stage 3 public quality audit

## Scope

Public pages and non-destructive local checks only. Internal portal scenarios requiring credentials, merge, and deployment are excluded.

## Results

- Dependency audit: 6 findings (3 low, 2 moderate, 1 critical) before; 3 low after. The remaining Astro/esbuild advisory affects the Windows development server and requires a breaking Astro 7 upgrade.
- Unit tests: 324/324 passed.
- Coverage baseline: 1.10% statements/lines, 36.22% branches, 19.19% functions. The denominator includes large page and Astro sources; no threshold is enabled yet.
- Public browser smoke: 5/5 routes passed with no console errors.
- Hard-coded portal E2E passwords were removed; authenticated tests now require environment secrets.
- The obsolete `X-XSS-Protection` response header was removed.
- The desktop hero preload now matches the image selected by `srcset`, preventing an unused 110,097-byte request in the measured desktop scenario.

## Follow-up

Rotate the former portal test credentials if they are still active. Add focused coverage thresholds for business logic before expanding page-level coverage. Roll out CSP in report-only mode before enforcement.
