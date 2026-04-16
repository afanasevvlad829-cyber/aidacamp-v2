# Phase 5 — Asset Root Map

Date: 2026-04-08 (Europe/Moscow)

## Runtime references from `dist/index.html`
- `/_astro`: 1
- `/assets`: 2
- `/cdn`: 2
- `/icons`: 5
- `/images`: 102
- `/legal#privacy`: 2

## Filesystem ownership snapshot
- `dist/images`: 33 files, 4.6M
- `dist/icons`: 4 files, 16K
- `assets`: 126 files, 26M
- `dist/cdn`: 35 files, 8.7M
- `cdn`: 80 files, 18M

## Ownership interpretation
- `/images` + `/icons`: primary runtime visual asset roots.
- `/cdn`: runtime artifact root for css/js bundles.
- `/assets`: mixed support root (icons/media, plus mirror sync role in build chain).
- `cdn/*`: mirror layer for external/CDN publishing workflows.
