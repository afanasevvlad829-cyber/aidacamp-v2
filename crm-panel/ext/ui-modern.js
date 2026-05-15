// ui-modern.js — AlfaCRM (codim.s20.online) UI modernization
// Lucide icons · Collapsible sidebar · Dark/Light themes · Branch tabs
// Accent: Indigo #4F46E5  v1.2

(function () {
  'use strict';

  const ICONS = {
    users:        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    book:         `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    calendar:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>`,
    dollar:       `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    activity:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    settings:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    home:         `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    barchart:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    clipboard:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
    phone:        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    mail:         `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    check:        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
    bell:         `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    layers:       `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    tag:          `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.3-7.3a1 1 0 0 0 0-1.41z"/><circle cx="7" cy="7" r="1" fill="currentColor"/></svg>`,
    moon:         `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
    sun:          `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
    sidebarClose: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>`,
    sidebarOpen:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>`,
    grid:         `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`,
  };

  const ION_MAP = {
    'ion-person':'users','ion-people':'users','ion-person-add':'users','ion-ios-person':'users','ion-ios-people':'users',
    'ion-book':'book','ion-ios-book':'book',
    'ion-calendar':'calendar','ion-ios-calendar':'calendar',
    'ion-cash':'dollar','ion-ios-cash':'dollar','ion-card':'dollar',
    'ion-stats-bars':'barchart','ion-stats-bars-outline':'barchart','ion-ios-stats':'barchart',
    'ion-pulse':'activity',
    'ion-gear-a':'settings','ion-gear-b':'settings','ion-ios-gear':'settings','ion-settings':'settings',
    'ion-home':'home','ion-ios-home':'home',
    'ion-clipboard':'clipboard','ion-ios-list':'clipboard',
    'ion-ios-telephone':'phone','ion-telephone':'phone',
    'ion-email':'mail','ion-ios-email':'mail',
    'ion-checkmark-round':'check','ion-checkmark':'check',
    'ion-ios-bell':'bell','ion-bell':'bell',
    'ion-layers':'layers','ion-ios-layers':'layers',
    'ion-pricetag':'tag','ion-ios-pricetag':'tag',
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    :root {
      --s20-accent:#4f46e5; --s20-accent-h:#4338ca; --s20-accent-soft:rgba(79,70,229,.15);
      --s20-bg:#0f172a;
      --s20-sidebar:#0f172a; --s20-sidebar-item:#94a3b8;
      --s20-sb-hover-bg:#1e293b; --s20-sb-hover:#e2e8f0;
      --s20-sb-section:#334155; --s20-sb-border:#1e293b;
      --s20-topbar:#1e293b; --s20-topbar-border:#0f172a; --s20-topbar-icon:#64748b;
      --s20-surface:#1e293b; --s20-surface2:#0f172a;
      --s20-border:#0f172a; --s20-border-soft:#1e293b;
      --s20-text:#e2e8f0; --s20-muted:#64748b; --s20-sub:#475569;
      --s20-tab-inact-bg:#1e293b; --s20-tab-inact:#64748b;
      --s20-ghost-bg:transparent; --s20-ghost-bdr:#334155; --s20-ghost-text:#64748b;
      --s20-th-bg:#0f172a; --s20-th:#475569;
      --s20-row-bdr:#1e293b; --s20-row-hover:#162032; --s20-row-sel:#1e1b4b;
      --s20-tag-bg:#312e81; --s20-tag:#a5b4fc;
      --s20-dd-bg:#1e293b; --s20-dd-bdr:#334155; --s20-dd-hover:#0f172a;
      --s20-shadow:0 4px 16px rgba(0,0,0,.35);
      --s20-sb-w:220px; --s20-sb-min:54px;
    }
    [data-s20-theme="light"] {
      --s20-bg:#f1f5f9;
      --s20-sidebar:#ffffff; --s20-sidebar-item:#64748b;
      --s20-sb-hover-bg:#f8fafc; --s20-sb-hover:#1e293b;
      --s20-sb-section:#e2e8f0; --s20-sb-border:#f1f5f9;
      --s20-topbar:#ffffff; --s20-topbar-border:#e2e8f0; --s20-topbar-icon:#94a3b8;
      --s20-surface:#ffffff; --s20-surface2:#f8fafc;
      --s20-border:#e2e8f0; --s20-border-soft:#f1f5f9;
      --s20-text:#1e293b; --s20-muted:#94a3b8; --s20-sub:#64748b;
      --s20-tab-inact-bg:#f1f5f9; --s20-tab-inact:#64748b;
      --s20-ghost-bg:#f1f5f9; --s20-ghost-bdr:#e2e8f0; --s20-ghost-text:#475569;
      --s20-th-bg:#f8fafc; --s20-th:#94a3b8;
      --s20-row-bdr:#f1f5f9; --s20-row-hover:#f8fafc; --s20-row-sel:#ede9fe;
      --s20-tag-bg:#ede9fe; --s20-tag:#4f46e5;
      --s20-dd-bg:#ffffff; --s20-dd-bdr:#e2e8f0; --s20-dd-hover:#f8fafc;
      --s20-shadow:0 4px 16px rgba(0,0,0,.10);
    }

    body, input, button, select, textarea {
      font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif !important;
    }

    /* ── Page bg ── */
    #page-wrapper, #page-wrapper.gray-bg { background: var(--s20-bg) !important; }

    /* ════════════════════════════════════
       TOPBAR — полная очистка артефактов
       ════════════════════════════════════ */

    /* Весь верхний header */
    .border-bottom.no-padding.m-b-sm.white-bg,
    #header-wrapper, .nav-header {
      background: var(--s20-topbar) !important;
      border-bottom: 1px solid var(--s20-topbar-border) !important;
      box-shadow: 0 1px 0 var(--s20-topbar-border) !important;
    }
    nav.navbar.no-margins.no-padding {
      background: var(--s20-topbar) !important;
      min-height: 48px !important;
      border: none !important;
    }

    /* Скрыть кнопку гамбургера (сайдбар сворачивается нашей кнопкой) */
    .navbar-minimalize, .minimalize-styl-2 { display: none !important; }

    /* Скрыть разделители между блоками topbar */
    .border-right { border-right: 1px solid var(--s20-topbar-border) !important; }

    /* Все li-разделители вне branch-tabs — сделать прозрачной границей */
    .nav.navbar-top-links > li.border-right { border-right: 1px solid var(--s20-topbar-border) !important; }

    /* Иконки быстрых действий (+, 🔧) в topbar — сделать менее заметными */
    .nav.navbar-top-links > li:not(#s20-theme-li) > a {
      color: var(--s20-topbar-icon) !important;
      font-size: 13px !important;
      line-height: 48px !important;
      height: 48px !important;
      display: flex !important;
      align-items: center !important;
    }
    .nav.navbar-top-links > li:not(#s20-theme-li) > a:hover {
      background: var(--s20-sb-hover-bg) !important;
      color: var(--s20-text) !important;
    }

    /* Search box в topbar */
    .nav.navbar-top-links .navbar-form,
    .nav.navbar-top-links form {
      padding: 8px 6px !important;
    }
    .nav.navbar-top-links .form-control,
    .nav.navbar-top-links input[type="text"] {
      background: var(--s20-surface2) !important;
      border: 1px solid var(--s20-border) !important;
      border-radius: 8px !important;
      color: var(--s20-text) !important;
      height: 32px !important;
      font-size: 13px !important;
      padding: 0 12px !important;
    }
    .nav.navbar-top-links .form-control::placeholder,
    .nav.navbar-top-links input::placeholder { color: var(--s20-muted) !important; }
    .nav.navbar-top-links .form-control:focus,
    .nav.navbar-top-links input:focus {
      border-color: var(--s20-accent) !important;
      box-shadow: 0 0 0 2px var(--s20-accent-soft) !important;
      outline: none !important;
    }

    /* Имя пользователя в правом nav */
    .nav.navbar-top-links.navbar-right > li > a { color: var(--s20-text) !important; }

    /* Theme toggle — правый nav */
    #s20-theme-li {
      display: flex !important;
      align-items: center !important;
      padding: 0 8px !important;
    }
    #s20-theme-toggle {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 10px; border-radius: 7px;
      font-size: 12px; font-weight: 500; cursor: pointer;
      border: 1px solid var(--s20-ghost-bdr);
      background: var(--s20-ghost-bg);
      color: var(--s20-sub);
      transition: all 0.15s; line-height: 1;
      white-space: nowrap;
    }
    #s20-theme-toggle:hover { background: var(--s20-sb-hover-bg); color: var(--s20-text); border-color: var(--s20-sub); }

    /* ── Branch tabs ── */
    #s20-branch-tabs {
      display: inline-flex; align-items: center; gap: 4px; padding: 8px 8px;
    }
    #s20-branch-tabs a {
      display: inline-flex; align-items: center;
      padding: 5px 14px; border-radius: 7px;
      font-size: 13px; font-weight: 500;
      text-decoration: none !important;
      transition: all 0.15s; white-space: nowrap;
    }
    #s20-branch-tabs a.active { background: var(--s20-accent); color: #fff !important; }
    #s20-branch-tabs a:not(.active) { background: var(--s20-tab-inact-bg); color: var(--s20-tab-inact) !important; }
    #s20-branch-tabs a:not(.active):hover { background: var(--s20-sb-hover-bg); color: var(--s20-text) !important; }

    /* ══════════════════
       SIDEBAR
       ══════════════════ */
    nav.navbar-default.navbar-static-side {
      background: var(--s20-sidebar) !important;
      border-right: 1px solid var(--s20-sb-border) !important;
      box-shadow: none !important;
      width: var(--s20-sb-w) !important;
      transition: width 0.2s ease !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }
    body.s20-col nav.navbar-default.navbar-static-side { width: var(--s20-sb-min) !important; }
    body.s20-col #page-wrapper { margin-left: var(--s20-sb-min) !important; }
    body.s20-col .s20-hc { opacity:0 !important; width:0 !important; overflow:hidden !important; pointer-events:none !important; }
    body.s20-col nav.navbar-default.navbar-static-side .nav.metismenu > li > a {
      justify-content: center !important; padding: 9px 0 !important;
    }
    body.s20-col nav.navbar-default.navbar-static-side .nav.metismenu > li > a .s20-icon { margin-right:0 !important; }

    /* Tooltip when collapsed */
    body.s20-col nav.navbar-default.navbar-static-side .nav.metismenu > li { position:relative !important; }
    body.s20-col nav.navbar-default.navbar-static-side .nav.metismenu > li > a::after {
      content: attr(data-s20-tip);
      position: absolute; left: calc(var(--s20-sb-min) + 8px); top: 50%; transform: translateY(-50%);
      background: var(--s20-surface); color: var(--s20-text);
      font-size: 12px; font-weight: 500; padding: 5px 10px;
      border-radius: 7px; border: 1px solid var(--s20-border);
      box-shadow: var(--s20-shadow); pointer-events: none; opacity: 0;
      white-space: nowrap; z-index: 99999; transition: opacity 0.1s 0.15s;
    }
    body.s20-col nav.navbar-default.navbar-static-side .nav.metismenu > li > a:hover::after { opacity:1; }

    nav.navbar-default.navbar-static-side .nav.metismenu > li > a {
      color: var(--s20-sidebar-item) !important;
      border-radius: 8px !important; margin: 1px 6px !important;
      padding: 9px 10px !important; font-size: 13px !important; font-weight: 500 !important;
      display: flex !important; align-items: center !important;
      transition: background 0.15s, color 0.15s, padding 0.2s !important;
      white-space: nowrap !important;
    }
    nav.navbar-default.navbar-static-side .nav.metismenu > li > a:hover,
    nav.navbar-default.navbar-static-side .nav.metismenu > li > a:focus {
      background: var(--s20-sb-hover-bg) !important; color: var(--s20-sb-hover) !important;
      text-decoration: none !important;
    }
    nav.navbar-default.navbar-static-side .nav.metismenu > li.active > a {
      background: var(--s20-accent) !important; color: #fff !important;
    }
    nav.navbar-default.navbar-static-side .nav.metismenu > li > a .s20-icon {
      flex-shrink:0 !important; width:18px !important; height:18px !important;
      display:inline-flex !important; align-items:center !important; justify-content:center !important;
      margin-right:10px !important; color:inherit !important; transition:margin 0.2s !important;
    }
    nav.navbar-default.navbar-static-side .nav.metismenu > li > a .s20-icon svg { width:16px !important; height:16px !important; }
    nav.navbar-default.navbar-static-side .nav-label {
      color: var(--s20-sb-section) !important; font-size:10px !important; font-weight:600 !important;
      text-transform:uppercase !important; letter-spacing:0.06em !important;
      padding: 14px 16px 4px !important; transition: opacity 0.15s !important;
    }
    nav.navbar-default.navbar-static-side .label,
    nav.navbar-default.navbar-static-side .badge {
      background: #ef4444 !important; border-radius:10px !important;
      font-size:10px !important; padding:1px 6px !important; margin-left:auto !important;
    }

    /* Injected logo */
    #s20-sidebar-logo {
      height:48px; min-height:48px; display:flex; align-items:center;
      padding:0 14px; border-bottom:1px solid var(--s20-sb-border);
      gap:10px; flex-shrink:0; overflow:hidden;
    }
    #s20-sidebar-logo .s20-lm {
      width:26px; height:26px; background:var(--s20-accent); border-radius:7px;
      display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#fff;
    }
    #s20-sidebar-logo .s20-lt {
      font-size:13px; font-weight:600; color:var(--s20-text); white-space:nowrap;
    }

    /* Collapse button */
    #s20-sidebar-footer { padding:6px; border-top:1px solid var(--s20-sb-border); flex-shrink:0; margin-top:auto; }
    #s20-collapse-btn {
      display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px;
      font-size:12.5px; color:var(--s20-sub); cursor:pointer; white-space:nowrap; overflow:hidden;
      transition:background 0.15s, color 0.15s; user-select:none;
    }
    #s20-collapse-btn:hover { background:var(--s20-sb-hover-bg); color:var(--s20-sb-hover); }
    #s20-collapse-btn svg { flex-shrink:0; }

    /* ══════════════════
       ACTION BAR
       ══════════════════ */
    .crm-actions .ibox-content {
      background: var(--s20-surface) !important; border:none !important;
      border-bottom: 1px solid var(--s20-border-soft) !important;
      padding: 8px 14px !important; border-radius:0 !important;
      box-shadow:none !important; display:flex !important;
      align-items:center !important; gap:5px !important; flex-wrap:wrap !important;
    }
    .crm-actions .btn {
      border-radius:7px !important; font-size:12.5px !important;
      font-weight:500 !important; padding:5px 13px !important;
      border:none !important; box-shadow:none !important; transition:all 0.15s !important;
    }
    .crm-actions .btn-success { background:var(--s20-accent) !important; color:#fff !important; }
    .crm-actions .btn-success:hover:not(:disabled) { background:var(--s20-accent-h) !important; }
    .crm-actions .btn-success[disabled] { background:var(--s20-accent-soft) !important; color:var(--s20-sub) !important; opacity:1 !important; }
    .crm-actions .btn-danger { background:rgba(239,68,68,.12) !important; color:#f87171 !important; }
    .crm-actions .btn-danger:hover:not(:disabled) { background:#ef4444 !important; color:#fff !important; }
    .crm-actions .btn-danger[disabled] { background:var(--s20-ghost-bg) !important; color:var(--s20-sub) !important; opacity:1 !important; }
    .crm-actions .btn-info { background:var(--s20-ghost-bg) !important; color:var(--s20-ghost-text) !important; border:1px solid var(--s20-ghost-bdr) !important; }
    .crm-actions .btn-info:hover { background:var(--s20-sb-hover-bg) !important; color:var(--s20-text) !important; }
    .crm-actions .btn-default,.crm-actions .btn-white { background:var(--s20-ghost-bg) !important; color:var(--s20-ghost-text) !important; border:1px solid var(--s20-ghost-bdr) !important; }
    .crm-actions .btn-default:hover,.crm-actions .btn-white:hover { background:var(--s20-sb-hover-bg) !important; color:var(--s20-text) !important; }
    .crm-actions .btn-primary { background:var(--s20-accent) !important; color:#fff !important; }
    .crm-actions .btn-primary:hover { background:var(--s20-accent-h) !important; }

    .summary { font-size:12px !important; color:var(--s20-muted) !important; }
    .summary .label { background:var(--s20-tag-bg) !important; color:var(--s20-tag) !important; border-radius:6px !important; font-size:11px !important; font-weight:500 !important; padding:3px 8px !important; }

    /* ══════════════
       TABLE
       ══════════════ */
    table.crm-table { border-collapse:separate !important; border-spacing:0 !important; background:var(--s20-surface) !important; }
    table.crm-table thead th { background:var(--s20-th-bg) !important; color:var(--s20-th) !important; font-size:11px !important; font-weight:600 !important; text-transform:uppercase !important; letter-spacing:0.04em !important; padding:10px 12px !important; border-bottom:1px solid var(--s20-border) !important; border-top:none !important; white-space:nowrap !important; }
    table.crm-table thead th a { color:var(--s20-th) !important; }
    table.crm-table thead th a:hover { color:var(--s20-accent) !important; }
    table.crm-table tbody td { padding:10px 12px !important; border-bottom:1px solid var(--s20-row-bdr) !important; border-top:none !important; font-size:13px !important; color:var(--s20-text) !important; vertical-align:middle !important; background:var(--s20-surface) !important; }
    table.crm-table.table-striped > tbody > tr:nth-of-type(odd) > td { background:var(--s20-surface) !important; }
    table.crm-table.table-hover > tbody > tr:hover > td { background:var(--s20-row-hover) !important; }
    table.crm-table > tbody > tr.selected > td, table.crm-table > tbody > tr.info > td { background:var(--s20-row-sel) !important; }
    span.not-set { color:var(--s20-sub) !important; font-style:italic !important; font-size:12px !important; }

    /* ════════════
       DROPDOWNS
       ════════════ */
    .dropdown-menu { background:var(--s20-dd-bg) !important; border:1px solid var(--s20-dd-bdr) !important; border-radius:10px !important; box-shadow:var(--s20-shadow) !important; padding:4px !important; }
    .dropdown-menu > li > a { border-radius:6px !important; padding:7px 12px !important; font-size:13px !important; color:var(--s20-text) !important; }
    .dropdown-menu > li > a:hover { background:var(--s20-dd-hover) !important; color:var(--s20-text) !important; }

    /* ════════════
       PAGINATION
       ════════════ */
    .pagination > li > a,.pagination > li > span { border-radius:6px !important; margin:0 2px !important; border:1px solid var(--s20-border) !important; color:var(--s20-sub) !important; background:transparent !important; font-size:13px !important; }
    .pagination > .active > a,.pagination > .active > span { background:var(--s20-accent) !important; border-color:var(--s20-accent) !important; color:#fff !important; }

    /* ════════════
       IBOX
       ════════════ */
    .ibox { box-shadow:0 1px 3px rgba(0,0,0,.06) !important; border-radius:10px !important; overflow:hidden !important; }
    .ibox-title { background:var(--s20-surface) !important; border-bottom:1px solid var(--s20-border-soft) !important; padding:12px 16px !important; color:var(--s20-text) !important; }
    .ibox-content:not(.crm-actions .ibox-content) { background:var(--s20-surface) !important; padding:16px !important; }

    /* ════════════
       FORMS
       ════════════ */
    .form-control { background:var(--s20-surface) !important; border-color:var(--s20-border) !important; color:var(--s20-text) !important; }
    .form-control:focus { border-color:var(--s20-accent) !important; box-shadow:0 0 0 2px var(--s20-accent-soft) !important; }
    .form-control::placeholder { color:var(--s20-muted) !important; }

    /* ════════════════
       MISC CLEANUP
       ════════════════ */
    /* Белый фон оставшихся панелей */
    .white-bg { background:var(--s20-surface) !important; }
    /* Убрать белые рамки Bootstrap panels */
    .panel { background:var(--s20-surface) !important; border-color:var(--s20-border) !important; }
    .panel-heading { background:var(--s20-th-bg) !important; border-color:var(--s20-border) !important; color:var(--s20-text) !important; }
    /* Скроллбар */
    ::-webkit-scrollbar { width:6px; height:6px; }
    ::-webkit-scrollbar-track { background:var(--s20-surface2); }
    ::-webkit-scrollbar-thumb { background:var(--s20-border); border-radius:3px; }
    ::-webkit-scrollbar-thumb:hover { background:var(--s20-sub); }
  `;

  const THEME_KEY   = 's20-theme';
  const SIDEBAR_KEY = 's20-col';

  function injectCSS() {
    if (document.getElementById('s20-ui-modern')) return;
    const style = document.createElement('style');
    style.id = 's20-ui-modern';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  function getTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-s20-theme', theme === 'light' ? 'light' : '');
    localStorage.setItem(THEME_KEY, theme);
    updateThemeBtn();
    try { chrome.storage.sync.set({ [THEME_KEY]: theme }); } catch (_) {}
  }

  function updateThemeBtn() {
    const btn = document.getElementById('s20-theme-toggle');
    if (!btn) return;
    const dark = getTheme() !== 'light';
    btn.innerHTML = dark
      ? ICONS.sun + '<span style="margin-left:5px">Светлая</span>'
      : ICONS.moon + '<span style="margin-left:5px">Тёмная</span>';
  }

  // ── Sidebar collapse ──────────────────────────────────────────────────────
  function getSidebarCol() { return localStorage.getItem(SIDEBAR_KEY) === '1'; }

  function applySidebar(col) {
    document.body.classList.toggle('s20-col', col);
    localStorage.setItem(SIDEBAR_KEY, col ? '1' : '0');
    updateColBtn();
    try { chrome.storage.sync.set({ [SIDEBAR_KEY]: col }); } catch (_) {}
  }

  function updateColBtn() {
    const btn = document.getElementById('s20-collapse-btn');
    if (!btn) return;
    const col = getSidebarCol();
    btn.innerHTML = col
      ? ICONS.sidebarOpen
      : ICONS.sidebarClose + '<span class="s20-hc" style="margin-left:10px">Свернуть</span>';
    btn.title = col ? 'Развернуть' : 'Свернуть';
  }

  // ── Icons ─────────────────────────────────────────────────────────────────
  function replaceIonIcons() {
    document.querySelectorAll(
      'nav.navbar-default.navbar-static-side i[class*="ion-"]'
    ).forEach(icon => {
      if (icon.dataset.s20r) return;
      icon.dataset.s20r = '1';
      const name = Array.from(icon.classList).reduce((f, c) => f || ION_MAP[c] || null, null) || 'home';
      icon.className = 's20-icon';
      icon.innerHTML = ICONS[name] || ICONS.home;
    });
  }

  function addNavTooltips() {
    document.querySelectorAll(
      'nav.navbar-default.navbar-static-side .nav.metismenu > li > a:not([data-s20-tip])'
    ).forEach(a => {
      const c = a.cloneNode(true);
      c.querySelectorAll('i,.label,.badge').forEach(el => el.remove());
      const text = c.textContent.trim();
      if (text) a.setAttribute('data-s20-tip', text);
    });
  }

  // ── Sidebar logo ──────────────────────────────────────────────────────────
  function injectSidebarLogo() {
    if (document.getElementById('s20-sidebar-logo')) return;
    const sb = document.querySelector('nav.navbar-default.navbar-static-side');
    if (!sb) return;
    const el = document.createElement('div');
    el.id = 's20-sidebar-logo';
    el.innerHTML = `<div class="s20-lm">${ICONS.grid}</div><span class="s20-lt s20-hc">АйДаКемп</span>`;
    sb.insertBefore(el, sb.firstChild);
  }

  // ── Collapse button ───────────────────────────────────────────────────────
  function injectCollapseButton() {
    if (document.getElementById('s20-sidebar-footer')) return;
    const sb = document.querySelector('nav.navbar-default.navbar-static-side');
    if (!sb) return;
    const footer = document.createElement('div');
    footer.id = 's20-sidebar-footer';
    const btn = document.createElement('div');
    btn.id = 's20-collapse-btn';
    footer.appendChild(btn);
    sb.appendChild(footer);
    btn.addEventListener('click', () => applySidebar(!getSidebarCol()));
    updateColBtn();
  }

  // ── Theme toggle — ПРАВЫЙ nav ─────────────────────────────────────────────
  function injectThemeToggle() {
    if (document.getElementById('s20-theme-toggle')) return;

    // Пробуем правый nav сначала, потом любой navbar-top-links
    const rightNav = document.querySelector('.nav.navbar-top-links.navbar-right')
                  || document.querySelector('.nav.navbar-top-links');
    if (!rightNav) return;

    const li = document.createElement('li');
    li.id = 's20-theme-li';

    const btn = document.createElement('button');
    btn.id = 's20-theme-toggle';
    btn.addEventListener('click', () => applyTheme(getTheme() === 'light' ? 'dark' : 'light'));

    li.appendChild(btn);
    // Вставляем первым в ПРАВЫЙ nav (слева от имени пользователя)
    rightNav.insertBefore(li, rightNav.firstChild);
    updateThemeBtn();
  }

  // ── Branch tabs ───────────────────────────────────────────────────────────
  function buildBranchTabs() {
    const dropdownLi = Array.from(
      document.querySelectorAll('li.dropdown.dropdown-hover.pull-left')
    ).find(li => li.querySelector('i.fa.fa-building-o'));

    if (!dropdownLi || dropdownLi.dataset.tabified) return;
    const menu = dropdownLi.querySelector('ul.dropdown-menu');
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll('li > a'));
    if (!items.length) return;

    dropdownLi.dataset.tabified = '1';
    const wrapper = document.createElement('li');
    wrapper.className = 'pull-left border-right';
    wrapper.style.listStyle = 'none';

    const tabs = document.createElement('div');
    tabs.id = 's20-branch-tabs';

    items.forEach(link => {
      const icon = link.querySelector('i');
      const isActive = !icon || icon.style.opacity !== '0.1';
      const c = link.cloneNode(true);
      c.querySelectorAll('i').forEach(el => el.remove());
      const label = c.textContent.trim();
      const tab = document.createElement('a');
      tab.href = link.href || '#';
      tab.textContent = label;
      if (isActive) tab.classList.add('active');
      tabs.appendChild(tab);
    });

    wrapper.appendChild(tabs);
    dropdownLi.parentNode.replaceChild(wrapper, dropdownLi);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectCSS();
    applyTheme(getTheme());
    applySidebar(getSidebarCol());
    injectSidebarLogo();
    injectCollapseButton();
    injectThemeToggle();
    replaceIonIcons();
    addNavTooltips();
    buildBranchTabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const obs = new MutationObserver(() => {
    buildBranchTabs();
    replaceIonIcons();
    addNavTooltips();
    if (!document.getElementById('s20-theme-toggle')) injectThemeToggle();
    if (!document.getElementById('s20-collapse-btn'))  injectCollapseButton();
    if (!document.getElementById('s20-sidebar-logo'))  injectSidebarLogo();
  });
  (document.body
    ? Promise.resolve()
    : new Promise(r => document.addEventListener('DOMContentLoaded', r))
  ).then(() => obs.observe(document.body, { childList: true, subtree: true }));

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes[THEME_KEY])   applyTheme(changes[THEME_KEY].newValue);
      if (changes[SIDEBAR_KEY]) applySidebar(changes[SIDEBAR_KEY].newValue);
    });
  } catch (_) {}

})();
