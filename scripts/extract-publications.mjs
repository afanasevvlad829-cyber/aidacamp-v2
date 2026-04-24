#!/usr/bin/env node
// Extracts text from publication_*.docx files and saves as .txt in _notes/АйДаКемп/Публикации/

import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const downloadsDir = '/Users/vladimirafanasev/Downloads';
const outputDir = '/Users/vladimirafanasev/Aidacamp-cloude/_notes/АйДаКемп/Публикации';

const files = fs.readdirSync(downloadsDir)
  .filter(f => f.startsWith('publication_') && f.endsWith('.docx'))
  .sort();

console.log(`Found ${files.length} publication docx files\n`);

for (const file of files) {
  const inputPath = path.join(downloadsDir, file);
  // Skip duplicates — "(1)" version
  if (file.includes('(1)')) {
    console.log(`⏭ Skipping duplicate: ${file}`);
    continue;
  }

  try {
    const result = await mammoth.extractRawText({ path: inputPath });
    const text = result.value.trim();

    // Extract ID from filename: publication_XXXX.docx → XXXX
    const id = file.replace('publication_', '').replace('.docx', '');
    const outputPath = path.join(outputDir, `publication_${id}.txt`);

    // Get first line as title preview
    const firstLine = text.split('\n').find(l => l.trim().length > 5) || 'без заголовка';
    const wordCount = text.split(/\s+/).length;

    fs.writeFileSync(outputPath, text, 'utf8');
    console.log(`✓ ${id} — "${firstLine.slice(0, 60)}" (${wordCount} слов)`);

    if (result.messages.length > 0) {
      result.messages.forEach(m => console.log(`  ⚠ ${m.message}`));
    }
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
  }
}

console.log('\nDone! Files saved to:', outputDir);
