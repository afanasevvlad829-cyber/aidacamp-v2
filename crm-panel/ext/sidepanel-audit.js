// ── Audit panel UI ──────────────────────────────────────────────────────────
(function(){
  let open = false;
  window.s20AuditToggle = function() {
    open = !open;
    document.getElementById('s20-audit-body').style.display = open ? 'block' : 'none';
    document.getElementById('s20-audit-chev').style.transform = open ? 'rotate(180deg)' : '';
    document.getElementById('s20-audit-hint').style.display = open ? 'none' : '';
    if (open) s20RefreshAuditUI();
  };

  function s20RefreshAuditUI() {
    chrome.storage.local.get(['s20_audit'], result => {
      const audit = result.s20_audit || {};
      const pages = (audit['__pages'] || []).filter(p => p !== '__pages' && p !== '__updated');
      const cnt = pages.length;

      document.getElementById('s20-audit-cnt').textContent = cnt + ' стр.';
      const el = document.getElementById('s20-audit-pages');
      if (!cnt) {
        el.innerHTML = '<span style="color:#475569">Пока нет данных. Открой несколько страниц CRM.</span>';
      } else {
        let totalClasses = 0;
        pages.forEach(p => { totalClasses += Object.keys(audit[p] || {}).length; });
        el.innerHTML = `<b style="color:#e2e8f0">${cnt}</b> страниц · <b style="color:#e2e8f0">${totalClasses}</b> уникальных классов<br>` +
          pages.map(p => `<span style="color:#4f46e5">${p}</span>`).join('<br>');
      }
    });
  }

  window.s20ClearAudit = function() {
    chrome.storage.local.remove('s20_audit', () => {
      document.getElementById('s20-audit-cnt').textContent = '0 стр.';
      document.getElementById('s20-audit-pages').innerHTML = '<span style="color:#475569">Данные сброшены.</span>';
      s20ShowStatus('Данные очищены', '#ef4444');
    });
  };

  window.s20GeneratePatch = function() {
    chrome.storage.local.get(['s20_audit'], result => {
      const audit = result.s20_audit || {};
      const pages = (audit['__pages'] || []).filter(p => p !== '__pages' && p !== '__updated');
      if (!pages.length) { s20ShowStatus('Нет данных — открой страницы CRM', '#ef4444'); return; }

      // Merge all pages
      const merged = {}; // cls → { bg, color, border, accent, count, zones }
      pages.forEach(page => {
        const pageData = audit[page] || {};
        Object.entries(pageData).forEach(([cls, d]) => {
          if (!merged[cls]) merged[cls] = { bg: false, color: false, border: false, accent: false, count: 0, zones: {} };
          merged[cls].count += d.count || 1;
          merged[cls].bg     = merged[cls].bg     || d.bg;
          merged[cls].color  = merged[cls].color  || d.color;
          merged[cls].border = merged[cls].border || d.border;
          merged[cls].accent = merged[cls].accent || d.accent;
          Object.entries(d.zones || {}).forEach(([z, n]) => {
            merged[cls].zones[z] = (merged[cls].zones[z] || 0) + n;
          });
        });
      });

      // Sort by frequency
      const sorted = Object.entries(merged).sort((a, b) => b[1].count - a[1].count);

      // Always-override Bootstrap classes
      const ALWAYS = {
        'white-bg':           {bg:true},
        'ibox':               {bg:true,border:true},
        'ibox-content':       {bg:true},
        'ibox-title':         {bg:true,border:true,color:true},
        'ibox-footer':        {bg:true,border:true},
        'panel':              {bg:true,border:true},
        'panel-default':      {bg:true,border:true},
        'panel-body':         {bg:true},
        'panel-heading':      {bg:true,border:true,color:true},
        'panel-footer':       {bg:true,border:true},
        'well':               {bg:true,border:true},
        'list-group-item':    {bg:true,border:true,color:true},
        'modal-content':      {bg:true,border:true},
        'modal-header':       {bg:true,border:true},
        'modal-footer':       {bg:true,border:true},
        'modal-body':         {bg:true},
        'breadcrumb':         {bg:true},
        'card':               {bg:true,border:true},
        'card-header':        {bg:true,border:true,color:true},
        'card-body':          {bg:true},
        'nav-tabs':           {border:true},
        'tab-content':        {bg:true},
        'thumbnail':          {bg:true,border:true},
        'jumbotron':          {bg:true},
        'input-group-addon':  {bg:true,border:true,color:true},
        'select2-container':  {bg:true,border:true},
        'select2-selection':  {bg:true,border:true,color:true},
        'select2-dropdown':   {bg:true,border:true},
        'select2-results__option': {color:true},
        'select2-results__option--highlighted': {accent:true},
        'datepicker':         {bg:true,border:true},
        'datepicker-days':    {bg:true},
        'popover':            {bg:true,border:true},
        'popover-content':    {bg:true},
        'tooltip-inner':      {bg:true,color:true},
        'footer':             {bg:true,border:true},
        'crm-table':          {bg:true},
        'kv-grid-table':      {bg:true},
        'kv-table-wrap':      {bg:true},
      };

      const dt = new Date().toISOString().slice(0,16);
      const lines = [
        '/* ═══════════════════════════════════════════════════════════ */',
        '/* AUTO-GENERATED CSS PATCH  ' + dt + '                       */',
        '/* Pages: ' + pages.join(', ') + ' */',
        '/* Classes: ' + sorted.length + ' unique  */',
        '/* ═══════════════════════════════════════════════════════════ */',
        '',
        '/* ── Always-override Bootstrap/Inspinia ── */',
      ];

      Object.entries(ALWAYS).forEach(([cls, flags]) => {
        const r = [];
        if (flags.accent) { r.push('  background: var(--s20-accent) !important;'); r.push('  color: #fff !important;'); }
        else if (flags.bg) r.push('  background: var(--s20-surface) !important;');
        if (flags.color && !flags.accent)  r.push('  color: var(--s20-text) !important;');
        if (flags.border) r.push('  border-color: var(--s20-border) !important;');
        const sel = cls.includes(' ') ? cls : '.' + cls;
        if (r.length) { lines.push(sel+' {'); r.forEach(x=>lines.push(x)); lines.push('}'); }
      });

      // Zone grouping for audit-detected classes
      const zones = {};
      sorted.forEach(([cls, d]) => {
        const topZone = Object.entries(d.zones).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'content';
        if (!zones[topZone]) zones[topZone] = [];
        zones[topZone].push([cls, d]);
      });

      Object.entries(zones).forEach(([zone, clsList]) => {
        lines.push('', '/* ── ' + zone + ' (×' + clsList.length + ' classes) ── */');
        clsList.slice(0, 40).forEach(([cls, d]) => {
          if (ALWAYS[cls]) return;
          if (cls.length < 3) return;
          // Skip state classes
          if (/^(active|open|in|show|focus|disabled|selected|ng-|is-)/.test(cls)) return;
          // Skip utility / layout classes — they must NOT get blanket bg overrides
          if (/^(no-|m-|p-|pull-|push-|text-|font-|float-|d-|col-|flex-|align-|justify-|border-top$|border-bottom$|border-left$|border-right$|clearfix|hidden|visible|sr-)/.test(cls)) return;
          if (/^(btn$|btn-default$|btn-primary$|btn-sm$|btn-xs$|btn-lg$|btn-block$|btn-link$)/.test(cls)) return;
          if (/^(img$|img-|caption$|post$|skip-export$)/.test(cls)) return;
          // Skip FullCalendar event coloring — would hide events
          if (/^fc-event/.test(cls)) return;
          // Skip MUI / CSS-in-JS hashed classes — too specific, will break
          if (/^(css-|Mui|MuiBox)/.test(cls)) return;
          const r = [];
          if (d.bg)     r.push('  background: var(--s20-surface) !important;');
          if (d.color)  r.push('  color: var(--s20-text) !important;');
          if (d.border) r.push('  border-color: var(--s20-border) !important;');
          if (d.accent) { r.push('  background: var(--s20-accent) !important;'); r.push('  color: #fff !important;'); }
          if (r.length) {
            lines.push('/* ×'+d.count+' */');
            lines.push('.'+cls+' {'); r.forEach(x=>lines.push(x)); lines.push('}');
          }
        });
      });

      const css = lines.join('\n');
      const blob = new Blob([css], {type:'text/css'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'crm-patch-'+Date.now()+'.css'; a.click();
      URL.revokeObjectURL(url);
      s20ShowStatus('✓ CSS патч скачан! (' + sorted.length + ' классов, ' + pages.length + ' страниц)', '#30d158');
    });
  };

  function s20ShowStatus(msg, color) {
    const el = document.getElementById('s20-audit-status');
    el.textContent = msg; el.style.color = color; el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  // Обновлять счётчик при открытии сайдпанели
  chrome.storage.local.get(['s20_audit'], result => {
    const audit = result.s20_audit || {};
    const cnt = (audit['__pages'] || []).filter(p => p !== '__pages' && p !== '__updated').length;
    if (cnt > 0) document.getElementById('s20-audit-cnt').textContent = cnt + ' стр.';
  });


  // ── Crawler controls ────────────────────────────────────────────────────────
  const CRAWL_KEY = 's20_crawl';

  window.s20CrawlStart = function() {
    // Get active tab URL to start from
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.url.includes('codim.s20.online')) {
        s20CrawlStatus('Открой CRM во вкладке браузера!', '#ef4444');
        return;
      }

      // Build initial state
      const state = {
        active: true,
        finished: false,
        queue: [],          // will be populated by crawler on first page
        visited: [],
        startedAt: Date.now(),
        updatedAt: Date.now(),
        lastPage: null,
        visitedCount: 0,
        queueCount: 0,
      };
      chrome.storage.local.set({ [CRAWL_KEY]: state }, () => {
        s20CrawlStatus('Запущен! Переключись на вкладку CRM.', '#30d158');
        document.getElementById('s20-crawl-start').style.display = 'none';
        document.getElementById('s20-crawl-stop').style.display  = 'block';
        document.getElementById('s20-crawl-bar-wrap').style.display = 'block';
        // Reload the CRM tab to kick off crawl from current page
        chrome.tabs.reload(tab.id);
      });
    });
  };

  window.s20CrawlStop = function() {
    chrome.storage.local.get([CRAWL_KEY], result => {
      const state = result[CRAWL_KEY] || {};
      state.active  = false;
      state.stopped = true;
      chrome.storage.local.set({ [CRAWL_KEY]: state }, () => {
        s20CrawlStatus('Остановлен. Посещено: ' + (state.visitedCount || 0) + ' стр.', '#fbbf24');
        document.getElementById('s20-crawl-start').style.display = 'block';
        document.getElementById('s20-crawl-stop').style.display  = 'none';
      });
    });
  };

  function s20CrawlStatus(msg, color) {
    const el = document.getElementById('s20-crawl-status');
    el.textContent = msg;
    el.style.color = color;
    el.style.display = 'block';
  }

  function s20UpdateCrawlUI(state) {
    if (!state) return;
    const visited = state.visitedCount || 0;
    const inQueue = state.queueCount   || 0;
    const total   = visited + inQueue;
    const pct     = total > 0 ? Math.round(visited / total * 100) : 0;

    document.getElementById('s20-crawl-bar').style.width = pct + '%';
    document.getElementById('s20-crawl-pct').textContent = pct + '%';
    document.getElementById('s20-crawl-label').textContent =
      visited + ' посещено · ' + inQueue + ' в очереди';
    if (state.lastPage) {
      document.getElementById('s20-crawl-cur').textContent = '→ ' + state.lastPage;
    }

    // Visited list
    if (state.visited && state.visited.length) {
      const vis = document.getElementById('s20-crawl-visited');
      vis.style.display = 'block';
      vis.innerHTML = state.visited.slice(-15).reverse()
        .map(p => '<div style="color:#334155">✓ ' + p + '</div>').join('');
    }

    if (state.finished || !state.active) {
      document.getElementById('s20-crawl-start').style.display = 'block';
      document.getElementById('s20-crawl-stop').style.display  = 'none';
      if (state.finished) {
        s20CrawlStatus('✅ Готово! ' + visited + ' страниц собрано. Скачай CSS патч ↓', '#30d158');
        document.getElementById('s20-crawl-bar').style.background = '#30d158';
      }
    }
  }

  // Poll crawler state every 1.5s
  setInterval(() => {
    chrome.storage.local.get([CRAWL_KEY], result => {
      const state = result[CRAWL_KEY];
      if (state && (state.active || state.finished)) {
        document.getElementById('s20-crawl-bar-wrap').style.display = 'block';
        s20UpdateCrawlUI(state);
      }
    });
  }, 1500);

  // Слушать обновления от content script
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.s20_audit) {
      const audit = changes.s20_audit.newValue || {};
      const cnt = (audit['__pages'] || []).filter(p => p !== '__pages' && p !== '__updated').length;
      document.getElementById('s20-audit-cnt').textContent = cnt + ' стр.';
      if (open) s20RefreshAuditUI();
    }
  });
})();

// ── Wire up buttons via addEventListener (CSP: no inline onclick) ───────────
document.addEventListener('DOMContentLoaded', function () {
  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  bind('s20-crawl-start', s20CrawlStart);
  bind('s20-crawl-stop',  s20CrawlStop);
  bind('s20-btn-patch',   s20GeneratePatch);
  bind('s20-btn-clear',   s20ClearAudit);
  bind('s20-audit-hdr',   s20AuditToggle);
});
