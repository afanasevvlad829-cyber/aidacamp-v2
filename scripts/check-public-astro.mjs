import { spawnSync } from 'node:child_process';

// Дизайн (2026-07-26): тайпчек (этот скрипт) гейтит ТОЛЬКО прод, не dev.
// SKIP_ASTRO_CHECK=1 ставится в .github/workflows/quality-gate.yml (гейт
// мержа в dev — быстрый, без тайпчека) и в job `build` deploy.yml (общий
// dist/ для dev+prod, тоже без тайпчека). Реальный прогон — только в job
// `promote` deploy.yml (`npm run check:public` БЕЗ этого флага), прямо перед
// автопромоутом dev→main: единственное место, где тайпчек кого-то блокирует.
// Локальный/ручной `npm run build` эту переменную не видит и проверяет как обычно.
if (process.env.SKIP_ASTRO_CHECK === '1') {
  console.log(
    'Public Astro check SKIPPED (SKIP_ASTRO_CHECK=1) — тайпчек для этого прогона отложен до прод-гейта (deploy.yml:promote).',
  );
  process.exit(0);
}

// Те же зоны исключены в tsconfig.astro-check.json — то есть ДО проверки, а не
// после. Этот список оставлен страховкой на случай, если ошибка всё же просочится
// (например, файл из исключённой зоны импортируют из публичной страницы — тогда
// tsc проверит его по графу зависимостей, несмотря на exclude).
const excluded = [
  'src/pages/lanit-v5.astro',
  'src/pages/smena2-editor.astro',
  'src/pages/onboarding.astro',
  'src/pages/portal/',
  'src/pages/admin/',
  'src/pages/demo/',
  'src/test/',
];

// --tsconfig сужает объём проверки до того, что этот гейт реально гейтит.
// Замер 14.08.2026 (локально, 838 файлов): 213с → 140с, минус треть времени.
// Экономия больше, чем доля исключённых строк (10%), потому что вместе с
// portal/admin/demo уходит весь их граф зависимостей и demo/blocks.astro на
// 1700 строк.
const result = spawnSync(
  process.execPath,
  [
    '--max-old-space-size=6144',
    './node_modules/.bin/astro',
    'check',
    '--tsconfig',
    'tsconfig.astro-check.json',
    '--minimumSeverity',
    'error',
    '--minimumFailingSeverity',
    'error',
  ],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, '');
const diagnostics = output
  .split('\n')
  .map((line) => {
    const match = line.match(/^(.+?):\d+:\d+ - error ts\(\d+\):/);
    return match ? { file: match[1], line } : null;
  })
  .filter(Boolean);

const publicErrors = diagnostics.filter(
  ({ file }) => file.startsWith('src/') && !excluded.some((path) => file === path || file.startsWith(path)),
);

if (result.error) {
  console.error(`Public Astro check could not run: ${result.error.message}`);
  process.exit(1);
}

if (publicErrors.length > 0) {
  const counts = new Map();
  for (const { file } of publicErrors) counts.set(file, (counts.get(file) ?? 0) + 1);
  console.error(`Public Astro check found ${publicErrors.length} errors:`);
  for (const [file, count] of [...counts].sort()) console.error(`- ${file}: ${count}`);
  // Сам текст диагностики: без него по логу CI видно только «в index.astro
  // 1 ошибка», а какая — приходится угадывать. 02.08.2026 это стоило полдня
  // простоя прода: гейт держал все выкаты, а причина была не видна.
  console.error('\nДиагностика:');
  for (const { line } of publicErrors) console.error(`  ${line.trim()}`);
  process.exit(1);
}

console.log(`Public Astro check OK. Internal/legacy exclusions: ${excluded.join(', ')}`);
