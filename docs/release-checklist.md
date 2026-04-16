# Release Checklist

- Run `./build.sh` (dist regenerated from canonical source).
- Verify canonical target: `dist/index.html`.
- Verify artifact sync: `dist/index.html` == `dist/index.htm`.
- If legal page exists: `dist/legal.html` == `legal.html` == `build/legal.html`.
- Verify `dist/index.html` has `ac-build-main-css` and `ac-build-main-js`.
- Verify no `/src/scripts/` links remain in `dist/index.html`.
- Desktop 1440: compact/full switch, no overflow-x.
- Tablet 768: compact/full switch, funnel usable.
- Mobile 390: menu/toggle/funnel usable.
- Funnel: step flow forward/back works.
- Overlays: contact/shifts open+close.
- Analytics smoke: page_loaded, mode_changed, step_changed, booking events.
- Final pass: no console-breaking errors.
- Architecture contract: no new legacy booking IDs/selectors (`#mobile-booking-card` etc.), only `#desktop-booking-card` and `#mobileBookingCard`.
- Architecture contract: desktop/mobile keep single state/action pipeline; visual differences only via templates/classes/styles.
- Architecture contract: `renderAll()` remains single full rerender entrypoint.
