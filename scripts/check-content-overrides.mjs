#!/usr/bin/env node
/**
 * Страж реестра src/data/content-overrides.ts (точечные SEO-переопределения
 * текста в общих компонентах — см. заголовок самого файла).
 *
 * Ловит два случая протухания реестра:
 *  1. Путь страницы в реестре больше не существует в src/pages — запись
 *     осиротела после переименования/удаления страницы и никогда не
 *     применяется (импорт есть, а .astro-файла с этим путём уже нет).
 *  2. У записи нет `reason` — без него через полгода никто не поймёт,
 *     под какую цель Лабрики сделана правка и можно ли её убрать.
 *
 * Запускается на исходниках (не требует dist/build).
 */
import { readFileSync, existsSync } from 'node:fs';

const REGISTRY = 'src/data/content-overrides.ts';
const PAGES_DIR = 'src/pages';
const LANDINGS_DIR = 'src/data/landings';

if (!existsSync(REGISTRY)) {
  console.error(`FATAL: ${REGISTRY} не найден`);
  process.exit(1);
}

const src = readFileSync(REGISTRY, 'utf8');

// Верхнеуровневые записи реестра: '/some-path/': { ... }
// Границы блока ищем по балансу фигурных скобок, чтобы не зависеть от глубины вложенности.
const KEY_RE = /^\s*'(\/[^']*\/)':\s*\{/gm;

const missingPage = [];
const missingReason = [];
let total = 0;

let m;
while ((m = KEY_RE.exec(src))) {
  total++;
  const pagePath = m[1];
  const blockStart = m.index + m[0].length;

  // Находим конец блока балансом скобок.
  let depth = 1;
  let i = blockStart;
  while (depth > 0 && i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  const block = src.slice(blockStart, i);

  const slug = pagePath.replace(/^\/|\/$/g, '');
  const candidates = [
    `${PAGES_DIR}/${slug}.astro`,
    `${PAGES_DIR}/${slug}/index.astro`,
    // [slug].astro-лендинги (src/data/landings/*.ts) — общий шаблон без
    // отдельного .astro-файла, страница существует, если есть файл данных.
    `${LANDINGS_DIR}/${slug}.ts`,
  ];
  if (!candidates.some((c) => existsSync(c))) {
    missingPage.push(`${pagePath} — нет ни ${candidates.join(', ни ')}`);
  }

  // Число value: должно совпадать с числом reason: внутри блока —
  // иначе у какой-то записи забыли reason.
  const valueCount = (block.match(/\bvalue:/g) || []).length;
  const reasonCount = (block.match(/\breason:/g) || []).length;
  if (valueCount !== reasonCount) {
    missingReason.push(`${pagePath} — value: ${valueCount}, reason: ${reasonCount}`);
  }
}

if (missingPage.length) {
  console.error(`\nFATAL: ${missingPage.length} запис(ей) в ${REGISTRY} ссылаются на несуществующие страницы:`);
  for (const l of missingPage) console.error(`  ✗ ${l}`);
  console.error('\nСтраницу переименовали/удалили — либо перенести override на новый путь, либо удалить запись.\n');
  process.exit(1);
}

if (missingReason.length) {
  console.error(`\nFATAL: ${missingReason.length} запис(ей) без reason на каждое value:`);
  for (const l of missingReason) console.error(`  ✗ ${l}`);
  console.error('\nКаждое value обязано сопровождаться reason (дата + какую цель Лабрики закрывает).\n');
  process.exit(1);
}

console.log(`Content overrides OK: ${total} страниц(а) в реестре, все пути существуют, у всех записей есть reason`);
