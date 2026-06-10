/**
 * Shared portal search widget.
 * Call initPortalSearch() once per page that embeds the search UI.
 *
 * Expected DOM ids (all created server-side in the .astro template):
 *   portal-search-data   — <script type="application/json"> with SearchEntry[]
 *   portal-search        — <input type="search">
 *   portal-search-results — <ul> for result items
 *   portal-search-empty  — <p> "nothing found" message
 *   portal-cards         — container toggled while search is active
 */

const SNIPPET = 160;
const MAX_RESULTS = 15;
const DEBOUNCE_MS = 150;

interface SearchEntry {
  title: string;
  url: string;
  group: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function snippet(text: string, q: string): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return text.slice(0, SNIPPET).trim() + (text.length > SNIPPET ? '…' : '');
  const half = Math.floor((SNIPPET - q.length) / 2);
  const start = Math.max(0, idx - half);
  const end = Math.min(text.length, start + SNIPPET);
  let s = text.slice(start, end).trim();
  if (start > 0) s = '…' + s;
  if (end < text.length) s = s + '…';
  return s;
}

function search(entries: SearchEntry[], q: string): SearchEntry[] {
  const needle = q.toLowerCase();
  const matched: { e: SearchEntry; rank: number }[] = [];
  for (const e of entries) {
    const inTitle = e.title.toLowerCase().includes(needle);
    const inText = (e.text || '').toLowerCase().includes(needle);
    if (inTitle || inText) matched.push({ e, rank: inTitle ? 0 : 1 });
  }
  matched.sort((a, b) => a.rank - b.rank);
  return matched.slice(0, MAX_RESULTS).map((m) => m.e);
}

function render(
  entries: SearchEntry[],
  q: string,
  results: HTMLElement,
  empty: HTMLElement,
): void {
  const found = search(entries, q);
  results.innerHTML = '';
  if (found.length === 0) {
    results.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  results.classList.remove('hidden');
  for (const e of found) {
    const li = document.createElement('li');
    li.innerHTML =
      '<a href="' +
      escapeHtml(e.url) +
      '" target="_blank" rel="noopener" class="block rounded-[16px] border border-border bg-white p-4 card-shadow transition hover:border-primary">' +
      '<span class="block text-[18px] font-semibold text-navy-950">' +
      escapeHtml(e.title) +
      '</span>' +
      '<span class="mt-1 block text-[14px] font-medium text-primary">' +
      escapeHtml(e.group) +
      '</span>' +
      '<span class="mt-1 block text-[16px] leading-[1.5] text-body-muted">' +
      escapeHtml(snippet(e.text || '', q.toLowerCase())) +
      '</span>' +
      '</a>';
    results.appendChild(li);
  }
}

export function initPortalSearch(): void {
  const dataTag = document.getElementById('portal-search-data');
  const input = document.getElementById('portal-search') as HTMLInputElement | null;
  const results = document.getElementById('portal-search-results');
  const empty = document.getElementById('portal-search-empty');
  const cards = document.getElementById('portal-cards');
  if (!dataTag || !input || !results || !empty || !cards) return;

  let entries: SearchEntry[] = [];
  try {
    entries = JSON.parse(dataTag.textContent || '[]');
  } catch {
    entries = [];
  }

  let timer: ReturnType<typeof setTimeout>;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim();
      if (!q) {
        results.classList.add('hidden');
        empty.classList.add('hidden');
        results.innerHTML = '';
        cards.classList.remove('hidden');
        return;
      }
      cards.classList.add('hidden');
      render(entries, q, results, empty);
    }, DEBOUNCE_MS);
  });
}
