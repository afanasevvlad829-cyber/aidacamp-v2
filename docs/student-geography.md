# Geography widget

Verified 2026-10-03 against aidacrm_mvp: customer notes/residence and attendance status «был», non-archived attendance. Map is a curated historical subset, not a live count or a branch directory. No names, addresses, IDs or exact counts are exposed.

Country locations are approximate; no city inferred for Cyprus or Mexico. Spain and Susuman excluded: attendance not confirmed. Historical «родом из Новосибирска» is not used for school residence. Camp Novosibirsk uses the participant residence address plus confirmed camp attendance. Moscow-region cluster avoids overlapping markers. Domodedovo excluded pending malformed-label validation.

Placement: home page immediately after Reviews. Reusable component: StudentGeography.astro. Standalone route: /widgets/geography/ (noindex). Embed on the same origin with an iframe, title="География учеников", width="100%", height="780", loading="lazy", style="border:0". Cross-origin framing may be restricted by existing server CSP/X-Frame-Options; do not weaken global policy. For another site, reuse the component/static assets.

Base map: Natural Earth 1:110m countries (public domain), https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson . Simplified geometry is illustrative, no external map requests or cookies. Labels remain available through the text list without JavaScript.
