/**
 * style-audit.js — CRM Style Audit Tool
 * Paste into Chrome DevTools Console on any AlfaCRM page.
 * Scans every element, finds un-themed colors, groups by component,
 * and outputs a ready-to-use CSS override block + a JSON report.
 *
 * Usage:  copy-paste the whole file into DevTools Console → Enter
 * Result: CSS block printed to console + downloadable JSON report
 */

(function styleAudit() {
  'use strict';

  // ── Colors that indicate "un-themed" Bootstrap/Inspinia defaults ──────────
  const OLD_BG_COLORS = new Set([
    'rgb(255, 255, 255)',   // white
    'rgb(245, 245, 245)',   // Bootstrap gray
    'rgb(248, 248, 248)',
    'rgb(250, 250, 250)',
    'rgb(238, 238, 238)',
    'rgb(240, 240, 240)',
    'rgb(247, 247, 247)',
    'rgb(236, 240, 241)',   // Inspinia sidebar
    'rgb(239, 239, 239)',
    'rgb(252, 252, 252)',
    'rgb(249, 249, 249)',
    'rgb(253, 253, 253)',
    'rgb(246, 246, 246)',
  ]);

  const OLD_TEXT_COLORS = new Set([
    'rgb(51, 51, 51)',      // Bootstrap default text
    'rgb(85, 85, 85)',
    'rgb(119, 119, 119)',
    'rgb(102, 102, 102)',
    'rgb(153, 153, 153)',
    'rgb(0, 0, 0)',
  ]);

  const OLD_BORDER_COLORS = new Set([
    'rgb(221, 221, 221)',
    'rgb(204, 204, 204)',
    'rgb(230, 230, 230)',
    'rgb(214, 214, 214)',
    'rgb(189, 189, 189)',
    'rgb(210, 210, 210)',
    'rgb(228, 228, 228)',
    'rgb(200, 200, 200)',
  ]);

  // Bootstrap accent colors
  const OLD_ACCENT_COLORS = new Set([
    'rgb(51, 122, 183)',    // Bootstrap blue
    'rgb(40, 96, 144)',
    'rgb(35, 82, 124)',
    'rgb(92, 184, 92)',     // Bootstrap green
    'rgb(68, 157, 68)',
    'rgb(217, 83, 79)',     // Bootstrap red
    'rgb(201, 48, 44)',
    'rgb(240, 173, 78)',    // Bootstrap orange
  ]);

  // ── What we care about ────────────────────────────────────────────────────
  const INTERESTING_PROPS = [
    'backgroundColor', 'color', 'borderColor',
    'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor',
    'boxShadow', 'backgroundImage',
  ];

  // ── Component zones ───────────────────────────────────────────────────────
  function getZone(el) {
    if (el.closest('nav.navbar-default.navbar-static-side')) return 'sidebar';
    if (el.closest('.border-bottom.no-padding.m-b-sm.white-bg') ||
        el.closest('nav.navbar.no-margins.no-padding')) return 'topbar';
    if (el.closest('.crm-actions')) return 'action-bar';
    if (el.closest('table.crm-table')) return 'table';
    if (el.closest('.pagination')) return 'pagination';
    if (el.closest('.dropdown-menu')) return 'dropdown';
    if (el.closest('.ibox-title')) return 'ibox-title';
    if (el.closest('.ibox-content')) return 'ibox-content';
    if (el.closest('.modal')) return 'modal';
    if (el.closest('form') || el.tagName === 'INPUT' || el.tagName === 'SELECT') return 'form';
    if (el.closest('.panel')) return 'panel';
    return 'content';
  }

  // ── Build a human-readable selector for an element ────────────────────────
  function getSelector(el) {
    const parts = [];
    let cur = el;
    let depth = 0;

    while (cur && cur !== document.body && depth < 5) {
      let part = cur.tagName.toLowerCase();
      if (cur.id && !cur.id.startsWith('s20-')) {
        part += '#' + cur.id;
        parts.unshift(part);
        break;
      }
      // Take up to 3 meaningful classes (skip utility/state classes)
      const skip = /active|open|focus|hover|show|hide|in|out|fade|collapse|s20-/;
      const classes = Array.from(cur.classList)
        .filter(c => !skip.test(c))
        .slice(0, 3)
        .map(c => '.' + c)
        .join('');
      if (classes) part += classes;
      parts.unshift(part);
      cur = cur.parentElement;
      depth++;
    }

    return parts.join(' > ');
  }

  // ── Scan ─────────────────────────────────────────────────────────────────
  const findings = {};   // zone → Map<selector, {el, issues}>
  const seenSelectors = new Set();

  const allEls = document.querySelectorAll('*');
  let scanned = 0;

  allEls.forEach(el => {
    // Skip hidden, script, style, svg internals
    if (['SCRIPT','STYLE','META','LINK','SVG','PATH','CIRCLE','RECT','LINE','POLYLINE','POLYGON'].includes(el.tagName)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const cs = window.getComputedStyle(el);
    const issues = [];

    const bg = cs.backgroundColor;
    const color = cs.color;
    const border = cs.borderColor;

    if (OLD_BG_COLORS.has(bg)) issues.push({ prop: 'background-color', value: bg, severity: 'high' });
    if (OLD_TEXT_COLORS.has(color)) issues.push({ prop: 'color', value: color, severity: 'medium' });
    if (OLD_BORDER_COLORS.has(border) || OLD_BORDER_COLORS.has(cs.borderTopColor))
      issues.push({ prop: 'border-color', value: border, severity: 'low' });
    if (OLD_ACCENT_COLORS.has(bg)) issues.push({ prop: 'background-color (accent)', value: bg, severity: 'critical' });
    if (OLD_ACCENT_COLORS.has(color)) issues.push({ prop: 'color (accent)', value: color, severity: 'critical' });

    if (!issues.length) return;

    const zone = getZone(el);
    if (!findings[zone]) findings[zone] = [];

    const selector = getSelector(el);
    // Deduplicate by selector
    if (seenSelectors.has(selector)) return;
    seenSelectors.add(selector);

    findings[zone].push({
      selector,
      tag: el.tagName.toLowerCase(),
      classes: Array.from(el.classList).join(' '),
      id: el.id || null,
      text: (el.textContent || '').trim().slice(0, 40),
      issues,
      bg, color, border,
    });

    scanned++;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  console.group('%c🎨 CRM Style Audit', 'font-size:16px;font-weight:bold;color:#4f46e5');
  console.log(`Scanned ${allEls.length} elements, found ${scanned} unthemed nodes`);
  console.log('Page:', window.location.pathname);

  const zoneCounts = Object.entries(findings).map(([z, items]) => `${z}: ${items.length}`).join(' · ');
  console.log('By zone:', zoneCounts);
  console.groupEnd();

  // ── Per-zone report ───────────────────────────────────────────────────────
  Object.entries(findings).forEach(([zone, items]) => {
    const critical = items.filter(i => i.issues.some(x => x.severity === 'critical'));
    const high     = items.filter(i => i.issues.some(x => x.severity === 'high') && !critical.includes(i));

    console.group(
      `%c📦 ${zone.toUpperCase()} %c(${items.length} items, ${critical.length} critical)`,
      'font-weight:bold;color:#e2e8f0;background:#1e293b;padding:2px 6px;border-radius:4px',
      'color:#64748b'
    );

    items.slice(0, 30).forEach(item => {
      const sev = item.issues.some(x => x.severity === 'critical') ? '🔴'
                : item.issues.some(x => x.severity === 'high')     ? '🟠'
                : '🟡';
      const issueText = item.issues.map(i => `${i.prop}: ${i.value}`).join(', ');
      console.log(
        `${sev} %c${item.tag}%c.${item.classes.split(' ').slice(0,3).join('.')}%c  "${item.text}"`,
        'color:#a5b4fc', 'color:#64748b', 'color:#475569',
        '\n   Issues:', issueText,
        '\n   Selector:', item.selector
      );
    });

    console.groupEnd();
  });

  // ── Generate CSS patch ────────────────────────────────────────────────────
  // Build class frequency map across all zones
  const classFreq = {};
  Object.values(findings).flat().forEach(item => {
    item.classes.split(' ').filter(Boolean).forEach(cls => {
      if (!classFreq[cls]) classFreq[cls] = { count: 0, zones: new Set(), items: [] };
      classFreq[cls].count++;
      classFreq[cls].zones.add(item.issues[0]?.prop || '?');
      classFreq[cls].items.push(item);
    });
  });

  // Top offending classes
  const topClasses = Object.entries(classFreq)
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, 40);

  // Build CSS suggestions
  const cssPatch = [];
  cssPatch.push('/* ═══════════════════════════════════════════════════ */');
  cssPatch.push('/* AUTO-GENERATED PATCH — ' + new Date().toISOString().slice(0,16) + ' */');
  cssPatch.push('/* Page: ' + window.location.pathname + ' */');
  cssPatch.push('/* ═══════════════════════════════════════════════════ */');
  cssPatch.push('');

  // Group by zone
  Object.entries(findings).forEach(([zone, items]) => {
    if (!items.length) return;
    cssPatch.push(`/* ── ${zone} ─────────────────── */`);

    // Collect unique problematic classes for this zone
    const zoneClasses = {};
    items.forEach(item => {
      item.classes.split(' ').filter(c => c && !c.startsWith('s20')).forEach(cls => {
        if (!zoneClasses[cls]) zoneClasses[cls] = { bgIssue: false, colorIssue: false, borderIssue: false, accentIssue: false };
        item.issues.forEach(iss => {
          if (iss.prop.includes('background')) zoneClasses[cls].bgIssue = true;
          if (iss.prop === 'color' && !iss.prop.includes('accent')) zoneClasses[cls].colorIssue = true;
          if (iss.prop.includes('border')) zoneClasses[cls].borderIssue = true;
          if (iss.prop.includes('accent')) zoneClasses[cls].accentIssue = true;
        });
      });
    });

    Object.entries(zoneClasses).slice(0, 20).forEach(([cls, flags]) => {
      const rules = [];
      if (flags.bgIssue)     rules.push('  background: var(--s20-surface) !important;');
      if (flags.colorIssue)  rules.push('  color: var(--s20-text) !important;');
      if (flags.borderIssue) rules.push('  border-color: var(--s20-border) !important;');
      if (flags.accentIssue) rules.push('  background: var(--s20-accent) !important;', '  color: #fff !important;');
      if (rules.length) {
        cssPatch.push(`.${cls} {`);
        rules.forEach(r => cssPatch.push(r));
        cssPatch.push('}');
      }
    });

    cssPatch.push('');
  });

  console.group('%c📋 Generated CSS Patch', 'font-size:14px;font-weight:bold;color:#34d399');
  console.log('%c' + cssPatch.join('\n'), 'font-family:monospace;font-size:11px;color:#a5b4fc');
  console.groupEnd();

  // ── Download JSON report ──────────────────────────────────────────────────
  const report = {
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
    totalScanned: allEls.length,
    unthhemed: scanned,
    byZone: Object.fromEntries(
      Object.entries(findings).map(([zone, items]) => [
        zone,
        items.map(item => ({
          selector: item.selector,
          tag: item.tag,
          classes: item.classes,
          text: item.text,
          issues: item.issues,
          computed: { bg: item.bg, color: item.color, border: item.border },
        }))
      ])
    ),
    topClasses: topClasses.map(([cls, data]) => ({
      class: cls,
      count: data.count,
      zones: Array.from(data.zones),
    })),
    cssPath: cssPatch.join('\n'),
  };

  // Copy CSS to clipboard
  try {
    navigator.clipboard.writeText(cssPatch.join('\n')).then(() => {
      console.log('%c✅ CSS patch copied to clipboard!', 'color:#34d399;font-weight:bold');
    });
  } catch (_) {}

  // Download JSON
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'crm-style-audit-' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);

  console.log('%c📥 JSON report downloaded!', 'color:#34d399;font-weight:bold');
  console.log('%cRun on different pages (Клиенты, Финансы, Расписание) and collect all JSONs', 'color:#64748b');

  window.__s20AuditData = report;
  return report;
})();
