// scripts/refactor-faq-schema.mjs
// Transforms inline FAQPage JSON-LD to <FAQSchema items={...} /> component usage
// Also removes duplicate inline BreadcrumbList from LandingLayout pages

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const PAGES_DIR = '/work/repo/src/pages';
const EXCEPTIONS = [
  'dlya-kompaniy.astro',
  'lager-na-osenie-kanikuly.astro',
  'lager-dlya-podrostkov.astro',
  'lager-na-zimnie-kanikuly.astro',
];

function walk(dir) {
  const results = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) results.push(...walk(p));
    else if (f.endsWith('.astro')) results.push(p);
  }
  return results;
}

// Find the end of a JSON.stringify( call by counting brackets
function findJsonStringifyEnd(content, startIdx) {
  // startIdx points to the character AFTER "JSON.stringify("
  let depth = 1;
  let i = startIdx;
  let inString = false;
  let escape = false;

  while (i < content.length && depth > 0) {
    const ch = content[i];
    if (escape) { escape = false; i++; continue; }
    if (ch === '\\' && inString) { escape = true; i++; continue; }
    if (ch === '"' && !escape) { inString = !inString; i++; continue; }
    if (!inString) {
      if (ch === '(' || ch === '{' || ch === '[') depth++;
      else if (ch === ')' || ch === '}' || ch === ']') {
        depth--;
        if (depth === 0) return i; // points to the closing paren of stringify
      }
    }
    i++;
  }
  return -1;
}

function extractFAQBlock(content) {
  // Find: <script type="application/ld+json" set:html={JSON.stringify(
  const marker = '<script type="application/ld+json" set:html={JSON.stringify(';
  let searchFrom = 0;

  while (true) {
    const scriptStart = content.indexOf(marker, searchFrom);
    if (scriptStart === -1) return null;

    const jsonStart = scriptStart + marker.length;
    const jsonEnd = findJsonStringifyEnd(content, jsonStart);
    if (jsonEnd === -1) { searchFrom = scriptStart + 1; continue; }

    const jsonStr = content.slice(jsonStart, jsonEnd); // everything between stringify( and )

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      searchFrom = scriptStart + 1;
      continue;
    }

    if (data && data['@type'] === 'FAQPage' && Array.isArray(data.mainEntity)) {
      // Find the full script tag end: should be )} />
      const scriptEnd = content.indexOf('/>', jsonEnd);
      if (scriptEnd === -1) { searchFrom = scriptStart + 1; continue; }
      const fullEnd = scriptEnd + 2; // include />

      return {
        fullBlock: content.slice(scriptStart, fullEnd),
        start: scriptStart,
        end: fullEnd,
        mainEntity: data.mainEntity,
      };
    }

    searchFrom = scriptStart + 1;
  }
}

function extractBreadcrumbBlock(content) {
  const marker = '<script type="application/ld+json" set:html={JSON.stringify(';
  let searchFrom = 0;

  while (true) {
    const scriptStart = content.indexOf(marker, searchFrom);
    if (scriptStart === -1) return null;

    const jsonStart = scriptStart + marker.length;
    const jsonEnd = findJsonStringifyEnd(content, jsonStart);
    if (jsonEnd === -1) { searchFrom = scriptStart + 1; continue; }

    const jsonStr = content.slice(jsonStart, jsonEnd);

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      searchFrom = scriptStart + 1;
      continue;
    }

    if (data && data['@type'] === 'BreadcrumbList') {
      const scriptEnd = content.indexOf('/>', jsonEnd);
      if (scriptEnd === -1) { searchFrom = scriptStart + 1; continue; }
      const fullEnd = scriptEnd + 2;

      return {
        fullBlock: content.slice(scriptStart, fullEnd),
        start: scriptStart,
        end: fullEnd,
      };
    }

    searchFrom = scriptStart + 1;
  }
}

function formatItems(mainEntity) {
  const items = mainEntity.map(q => ({
    q: q.name,
    a: q.acceptedAnswer?.text ?? '',
  }));

  const lines = items.map(item => {
    // Use JSON.stringify for safe quoting, then strip outer quotes
    const q = JSON.stringify(item.q);
    const a = JSON.stringify(item.a);
    return `    { q: ${q}, a: ${a} }`;
  });

  return `[\n${lines.join(',\n')}\n  ]`;
}

function hasImport(content, importPath) {
  return content.includes(`from '${importPath}'`) || content.includes(`from "${importPath}"`);
}

function addImport(content, importLine) {
  // Add after the last import in the frontmatter
  const frontmatterEnd = content.indexOf('---', 3);
  if (frontmatterEnd === -1) return content;

  // Find last import line position
  const frontmatter = content.slice(0, frontmatterEnd);
  const lastImportMatch = [...frontmatter.matchAll(/^import .+;\n/gm)].pop();

  if (lastImportMatch) {
    const insertAt = lastImportMatch.index + lastImportMatch[0].length;
    return content.slice(0, insertAt) + importLine + '\n' + content.slice(insertAt);
  }

  // Fallback: add before frontmatter end
  return content.slice(0, frontmatterEnd) + importLine + '\n' + content.slice(frontmatterEnd);
}

const files = walk(PAGES_DIR);
const changed = [];
const skipped = [];
let faqReplaced = 0;
let breadcrumbRemoved = 0;

for (const fpath of files) {
  const fname = fpath.split('/').pop();

  // Skip exception files
  if (EXCEPTIONS.includes(fname)) {
    skipped.push({ file: relative(PAGES_DIR, fpath), reason: '@graph format exception' });
    continue;
  }

  let content = readFileSync(fpath, 'utf8');

  // Only process LandingLayout pages
  if (!content.includes('LandingLayout')) continue;

  let modified = false;

  // --- Handle FAQPage ---
  const faqBlock = extractFAQBlock(content);
  if (faqBlock) {
    const itemsProp = formatItems(faqBlock.mainEntity);
    const replacement = `<FAQSchema items={${itemsProp}} />`;

    // Add import if needed
    if (!hasImport(content, '../components/FAQSchema.astro') && !hasImport(content, '../../components/FAQSchema.astro')) {
      // Determine the relative path
      const isSubdir = fpath.includes('/stati/') || fpath.includes('/shifts/') || fpath.includes('/geo/');
      const importPath = isSubdir ? '../../components/FAQSchema.astro' : '../components/FAQSchema.astro';
      content = addImport(content, `import FAQSchema from '${importPath}';`);
    }

    // Replace the inline block
    // Re-extract after potential import addition
    const faqBlock2 = extractFAQBlock(content);
    if (faqBlock2) {
      content = content.slice(0, faqBlock2.start) + replacement + content.slice(faqBlock2.end);
      faqReplaced++;
      modified = true;
    }
  }

  // --- Handle BreadcrumbList (remove duplicates from LandingLayout pages) ---
  const breadcrumbBlock = extractBreadcrumbBlock(content);
  if (breadcrumbBlock) {
    // Remove the inline BreadcrumbList (LandingLayout already provides one)
    // Remove including surrounding whitespace/newline
    let newContent = content.slice(0, breadcrumbBlock.start) + content.slice(breadcrumbBlock.end);
    // Clean up extra blank line
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    content = newContent;
    breadcrumbRemoved++;
    modified = true;
  }

  if (modified) {
    writeFileSync(fpath, content, 'utf8');
    changed.push(relative(PAGES_DIR, fpath));
  }
}

console.log(`\n=== Refactoring complete ===`);
console.log(`FAQPage replaced with FAQSchema component: ${faqReplaced}`);
console.log(`BreadcrumbList removed (duplicate): ${breadcrumbRemoved}`);
console.log(`\nChanged files (${changed.length}):`);
changed.forEach(f => console.log(`  ${f}`));
console.log(`\nSkipped (${skipped.length}):`);
skipped.forEach(s => console.log(`  ${s.file}: ${s.reason}`));
