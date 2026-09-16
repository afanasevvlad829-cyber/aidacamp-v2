# Mobile PageSpeed hotfix

Baseline: https://pagespeed.web.dev/analysis/https-aidacamp-ru/hcoghmei3l?form_factor=mobile

Performance 95; accessibility/best practices/SEO 100; agentic 3/3.
FCP 1485 ms, LCP 2136 ms, TBT 88 ms, CLS 0, Speed Index 4730 ms.

- Image delivery: 45.5 KiB estimated savings (hero and two completed-shift thumbnails). Added responsive compressed AVIF candidates; original WebP fallback remains. Hero preload and picture use identical srcsets. New files are in /optimized-media/ because nginx aliases all /images/ to shared storage. Assets use versioned names to avoid immutable cache staleness.
- Forced reflow: 128 ms at inline BackToTop scrollY read during parsing. Initial button is already hidden; restored-scroll initialization now waits for pageshow, retaining scroll/click tracking.
- LCP render delay / Speed Index: first-screen photo and heading no longer fade in from invisible state. This changes presentation timing only.

Regenerate assets with `node scripts/optimize-pagespeed-images.mjs`. The two source WebP thumbnails live in the existing shared gallery; retrieve them into public/images/gallery before regeneration. They are not part of this commit.

Google's 73 KiB unused script and 276 ms long tasks remain unchanged, per task scope. Other audits (network tree, DOM, CSP, COOP, HSTS preload, Trusted Types) are recorded in the external result report; not claimed fixed by this patch.

Verified live baseline is 10bac87b, not the stale .deployed-sha 0811828b: all 1078 non-image client files and 229 server files match /opt/aidacamp-build. 417 extra live files are obsolete hashed assets only. Shared media is excluded from deploy and untouched.
