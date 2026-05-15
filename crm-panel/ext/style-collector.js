/**
 * style-collector.js — автоматический сборщик стилей
 * Запускается на каждой странице CRM, собирает unthemed-элементы
 * и сохраняет в chrome.storage.local. Работает тихо, < 10ms.
 */
(function () {
  'use strict';

  // Подождать немного — дать странице дорендериться
  const DELAY_MS = 1200;

  // Цвета Bootstrap/Inspinia которые нас интересуют
  const OLD_BG = new Set([
    'rgb(255, 255, 255)', 'rgb(245, 245, 245)', 'rgb(248, 248, 248)',
    'rgb(250, 250, 250)', 'rgb(238, 238, 238)', 'rgb(240, 240, 240)',
    'rgb(247, 247, 247)', 'rgb(236, 240, 241)', 'rgb(239, 239, 239)',
    'rgb(252, 252, 252)', 'rgb(249, 249, 249)', 'rgb(246, 246, 246)',
  ]);
  const OLD_TEXT = new Set([
    'rgb(51, 51, 51)', 'rgb(85, 85, 85)', 'rgb(119, 119, 119)',
    'rgb(102, 102, 102)', 'rgb(153, 153, 153)', 'rgb(0, 0, 0)',
  ]);
  const OLD_BORDER = new Set([
    'rgb(221, 221, 221)', 'rgb(204, 204, 204)', 'rgb(230, 230, 230)',
    'rgb(214, 214, 214)', 'rgb(189, 189, 189)', 'rgb(210, 210, 210)',
  ]);
  const OLD_ACCENT = new Set([
    'rgb(51, 122, 183)', 'rgb(40, 96, 144)', 'rgb(35, 82, 124)',
    'rgb(92, 184, 92)', 'rgb(68, 157, 68)', 'rgb(217, 83, 79)',
    'rgb(201, 48, 44)', 'rgb(240, 173, 78)',
  ]);

  function getZone(el) {
    if (el.closest('nav.navbar-default.navbar-static-side')) return 'sidebar';
    if (el.closest('.border-bottom.no-padding.m-b-sm') ||
        el.closest('nav.navbar.no-margins'))              return 'topbar';
    if (el.closest('.crm-actions'))                       return 'action-bar';
    if (el.closest('table.crm-table'))                    return 'table';
    if (el.closest('.pagination'))                        return 'pagination';
    if (el.closest('.dropdown-menu'))                     return 'dropdown';
    if (el.closest('.modal'))                             return 'modal';
    if (el.closest('.ibox-title'))                        return 'ibox-title';
    if (el.closest('.ibox-content'))                      return 'ibox-content';
    if (el.closest('form') || ['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) return 'form';
    if (el.closest('.panel'))                             return 'panel';
    if (el.closest('.nav-tabs'))                          return 'nav-tabs';
    return 'content';
  }

  function scan() {
    const page = window.location.pathname.replace(/\/\d+/g, '/:id'); // нормализуем /123 → /:id
    const classData = {}; // cls → { zones, bg, color, border, accent, count }

    const skip = /^(s20-|active|open|in|show|focus|disabled|selected|ng-)/;
    const SKIP_TAGS = new Set(['SCRIPT','STYLE','META','LINK','SVG','PATH','CIRCLE','RECT','LINE','POLYLINE','POLYGON','DEFS','G']);

    document.querySelectorAll('*').forEach(el => {
      if (SKIP_TAGS.has(el.tagName)) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width && !rect.height) return;

      const cs = window.getComputedStyle(el);
      const bg  = cs.backgroundColor;
      const col = cs.color;
      const bdr = cs.borderTopColor;

      const hasBg     = OLD_BG.has(bg);
      const hasColor  = OLD_TEXT.has(col);
      const hasBorder = OLD_BORDER.has(bdr);
      const hasAccent = OLD_ACCENT.has(bg) || OLD_ACCENT.has(col);

      if (!hasBg && !hasColor && !hasBorder && !hasAccent) return;

      const zone = getZone(el);

      Array.from(el.classList).filter(c => !skip.test(c) && c.length >= 3).forEach(cls => {
        if (!classData[cls]) classData[cls] = { zones: {}, bg: false, color: false, border: false, accent: false, count: 0 };
        classData[cls].count++;
        classData[cls].zones[zone] = (classData[cls].zones[zone] || 0) + 1;
        if (hasBg)     classData[cls].bg     = true;
        if (hasColor)  classData[cls].color  = true;
        if (hasBorder) classData[cls].border = true;
        if (hasAccent) classData[cls].accent = true;
      });
    });

    // Сохранить в storage, ключ = путь страницы
    chrome.storage.local.get(['s20_audit'], result => {
      const audit = result.s20_audit || {};
      // Мёрджим с уже накопленными данными
      const existing = audit[page] || {};
      Object.entries(classData).forEach(([cls, d]) => {
        if (!existing[cls]) {
          existing[cls] = d;
        } else {
          existing[cls].count += d.count;
          existing[cls].bg     = existing[cls].bg     || d.bg;
          existing[cls].color  = existing[cls].color  || d.color;
          existing[cls].border = existing[cls].border || d.border;
          existing[cls].accent = existing[cls].accent || d.accent;
          Object.entries(d.zones).forEach(([z, n]) => {
            existing[cls].zones[z] = (existing[cls].zones[z] || 0) + n;
          });
        }
      });
      audit[page] = existing;
      audit['__pages'] = Object.keys(audit).filter(k => k !== '__pages');
      audit['__updated'] = Date.now();
      chrome.storage.local.set({ s20_audit: audit });
    });
  }

  setTimeout(scan, DELAY_MS);
})();
