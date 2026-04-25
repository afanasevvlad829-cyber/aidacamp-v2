/**
 * inject-modulepreload.mjs
 * Post-build: injects <link rel="modulepreload"> for the critical JS chain
 * (BookingInfoModal → Shifts → ShiftModal) into index.html
 * This eliminates the 495ms critical request chain flagged by PageSpeed.
 */
import fs from 'fs';
import path from 'path';

const HTML_FILE = 'dist/client/index.html';

if (!fs.existsSync(HTML_FILE)) {
  console.log('[modulepreload] index.html not found, skipping');
  process.exit(0);
}

let html = fs.readFileSync(HTML_FILE, 'utf8');

// Find all _astro/*.js files that match our critical chain components
const PATTERNS = [
  /BookingInfoModal\.astro[^"']+\.js/,
  /Shifts\.astro[^"']+\.js/,
  /ShiftModal\.astro[^"']+\.js/,
];

const found = [];
for (const pattern of PATTERNS) {
  // Search in script tags (type="module" src="/_astro/...")
  const match = html.match(new RegExp(`/_astro/(${pattern.source})`, 'i'));
  if (match) {
    found.push(`/_astro/${match[1]}`);
  }
}

if (found.length === 0) {
  console.log('[modulepreload] no critical chain files found, skipping');
  process.exit(0);
}

// Build preload tags
const preloadTags = found
  .map(href => `<link rel="modulepreload" href="${href}" crossorigin>`)
  .join('\n    ');

// Inject before </head>
if (html.includes('</head>')) {
  html = html.replace('</head>', `    ${preloadTags}\n</head>`);
  fs.writeFileSync(HTML_FILE, html, 'utf8');
  console.log(`[modulepreload] injected ${found.length} modulepreload tags:`);
  found.forEach(f => console.log(`  ${f}`));
} else {
  console.log('[modulepreload] </head> not found, skipping');
}
