/**
 * audit-merge.js — Merge multiple style-audit JSON reports → unified CSS patch
 * 
 * Usage:
 *   1. Run style-audit.js on several CRM pages (Клиенты, Финансы, Расписание, etc.)
 *   2. Save all downloaded JSONs to one folder
 *   3. Run: node audit-merge.js audit1.json audit2.json audit3.json
 *   4. Get: css-patch-merged.css  (ready to paste into ui-modern.js)
 */

const fs   = require('fs');
const path = require('path');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node audit-merge.js <audit1.json> [audit2.json] ...');
  process.exit(1);
}

// ── Load all reports ─────────────────────────────────────────────────────────
const reports = files.map(f => {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(`Loaded: ${f} (page: ${data.page}, unthemed: ${data.unthhemed})`);
  return data;
});

// ── Merge class frequency across all pages ────────────────────────────────────
const classMap = {};  // cls → { bgIssue, colorIssue, borderIssue, accentIssue, zones, count, pages }

reports.forEach(report => {
  Object.entries(report.byZone).forEach(([zone, items]) => {
    items.forEach(item => {
      const classes = (item.classes || '').split(' ').filter(c => c && !c.startsWith('s20'));
      classes.forEach(cls => {
        if (!classMap[cls]) classMap[cls] = {
          bgIssue: false, colorIssue: false, borderIssue: false, accentIssue: false,
          zones: new Set(), count: 0, pages: new Set(),
        };
        classMap[cls].count++;
        classMap[cls].zones.add(zone);
        classMap[cls].pages.add(report.page);

        item.issues.forEach(iss => {
          if (iss.prop.includes('background') && !iss.prop.includes('accent')) classMap[cls].bgIssue = true;
          if (iss.prop === 'color' && !iss.prop.includes('accent'))             classMap[cls].colorIssue = true;
          if (iss.prop.includes('border'))                                      classMap[cls].borderIssue = true;
          if (iss.prop.includes('accent'))                                      classMap[cls].accentIssue = true;
        });
      });
    });
  });
});

// Sort by frequency
const sorted = Object.entries(classMap)
  .sort((a, b) => b[1].count - a[1].count);

console.log(`\nTotal unique unthemed classes: ${sorted.length}`);
console.log('Top 20 offenders:');
sorted.slice(0, 20).forEach(([cls, d]) => {
  const flags = [d.bgIssue && 'bg', d.colorIssue && 'color', d.borderIssue && 'border', d.accentIssue && 'ACCENT']
    .filter(Boolean).join('+');
  console.log(`  .${cls.padEnd(40)} ×${d.count} [${flags}]`);
});

// ── Group classes by zone for logical CSS organization ─────────────────────────
const zones = {};
Object.entries(classMap).forEach(([cls, d]) => {
  d.zones.forEach(zone => {
    if (!zones[zone]) zones[zone] = [];
    zones[zone].push([cls, d]);
  });
});

// ── Generate CSS ───────────────────────────────────────────────────────────────
const lines = [];
const dt = new Date().toISOString().slice(0, 16);
lines.push(`/* ════════════════════════════════════════════════════════════ */`);
lines.push(`/* MERGED CSS PATCH — ${dt}                                    */`);
lines.push(`/* Generated from: ${files.map(f => path.basename(f)).join(', ')}  */`);
lines.push(`/* Pages covered:  ${reports.map(r => r.page).join(', ')} */`);
lines.push(`/* ════════════════════════════════════════════════════════════ */`);
lines.push('');

// Known Bootstrap/Inspinia patterns we always want to override
const ALWAYS_OVERRIDE = {
  // Structural containers
  'wrapper':       { bg: true },
  'content-page':  { bg: true },
  'page-heading':  { bg: true, border: true },
  // Tables
  'table':         { bg: true, color: true },
  'table-striped': { bg: true },
  'table-hover':   { bg: true },
  'table-bordered':{ border: true },
  // Panels
  'panel':              { bg: true, border: true },
  'panel-default':      { bg: true, border: true },
  'panel-body':         { bg: true },
  'panel-heading':      { bg: true, border: true, color: true },
  'panel-footer':       { bg: true, border: true },
  // Wells
  'well':          { bg: true, border: true },
  // List group
  'list-group-item': { bg: true, border: true, color: true },
  'list-group-item-heading': { color: true },
  // Nav tabs
  'nav-tabs':          { border: true },
  'nav-tabs > li > a': { bg: true, color: true, border: true },
  // Alerts
  'alert':         { bg: true, border: true, color: true },
  'alert-info':    { bg: true, border: true },
  'alert-warning': { bg: true, border: true },
  'alert-success': { bg: true, border: true },
  'alert-danger':  { bg: true, border: true },
  // Badges/Labels
  'label-default': { bg: true },
  'label-primary': { bg: true },
  'badge':         { bg: true },
  // Modals
  'modal-content':  { bg: true, border: true },
  'modal-header':   { bg: true, border: true },
  'modal-footer':   { bg: true, border: true },
  // Misc
  'breadcrumb':    { bg: true },
  'thumbnail':     { bg: true, border: true },
  'jumbotron':     { bg: true },
  'progress':      { bg: true },
  'card':          { bg: true, border: true },
  'card-header':   { bg: true, border: true },
  'card-body':     { bg: true },
  'card-footer':   { bg: true, border: true },
};

lines.push('/* ── Always-override Bootstrap/Inspinia components ── */');
Object.entries(ALWAYS_OVERRIDE).forEach(([cls, flags]) => {
  const rules = [];
  if (flags.bg)     rules.push('  background: var(--s20-surface) !important;');
  if (flags.color)  rules.push('  color: var(--s20-text) !important;');
  if (flags.border) rules.push('  border-color: var(--s20-border) !important;');
  if (rules.length) {
    lines.push(`.${cls} {`);
    rules.forEach(r => lines.push(r));
    lines.push('}');
  }
});
lines.push('');

// Zone-specific from audit
Object.entries(zones).forEach(([zone, clsList]) => {
  lines.push(`/* ── ${zone} (audit-detected) ── */`);
  // Sort by count desc, take top 30 per zone
  clsList
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 30)
    .forEach(([cls, flags]) => {
      // Skip if already in ALWAYS_OVERRIDE
      if (ALWAYS_OVERRIDE[cls]) return;
      // Skip single-character utility classes
      if (cls.length < 3) return;
      // Skip pure state classes
      if (/^(active|open|in|show|focus|disabled|selected|checked)$/.test(cls)) return;

      const rules = [];
      if (flags.bgIssue)     rules.push('  background: var(--s20-surface) !important;');
      if (flags.colorIssue)  rules.push('  color: var(--s20-text) !important;');
      if (flags.borderIssue) rules.push('  border-color: var(--s20-border) !important;');
      if (flags.accentIssue) {
        rules.push('  background: var(--s20-accent) !important;');
        rules.push('  color: #fff !important;');
      }
      if (rules.length) {
        lines.push(`/* ×${flags.count} pages:${Array.from(flags.pages).join(',')} */`);
        lines.push(`.${cls} {`);
        rules.forEach(r => lines.push(r));
        lines.push('}');
      }
    });
  lines.push('');
});

// ── Write output ──────────────────────────────────────────────────────────────
const outCss  = 'css-patch-merged.css';
const outJson = 'audit-merged.json';

fs.writeFileSync(outCss, lines.join('\n'), 'utf8');
fs.writeFileSync(outJson, JSON.stringify({
  timestamp: dt,
  pages: reports.map(r => r.page),
  totalClasses: sorted.length,
  topClasses: sorted.slice(0, 50).map(([cls, d]) => ({
    class: cls, count: d.count,
    zones: Array.from(d.zones),
    issues: { bg: d.bgIssue, color: d.colorIssue, border: d.borderIssue, accent: d.accentIssue },
  })),
  cssLines: lines.length,
}, null, 2), 'utf8');

console.log(`\n✅ Written: ${outCss} (${lines.length} lines)`);
console.log(`✅ Written: ${outJson}`);
