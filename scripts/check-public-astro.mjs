import { spawnSync } from 'node:child_process';

// deploy.sh гоняет этот же npm run build ещё раз для dev и для prod — на том
// же коммите, что уже прошёл этот check как required-проверка quality-gate.yml
// (branch protection на dev/main требует зелёный `quality`, которая тоже
// вызывает `astro check`). SKIP_ASTRO_CHECK=1 ставится только в
// .github/workflows/deploy.yml — там гарантия свежая. Локальный/ручной
// `npm run build` эту переменную не видит и проверяет как обычно.
if (process.env.SKIP_ASTRO_CHECK === '1') {
  console.log(
    'Public Astro check SKIPPED (SKIP_ASTRO_CHECK=1) — уже пройден как required-проверка quality-gate на этом коммите.',
  );
  process.exit(0);
}

const excluded = [
  'src/pages/lanit-v5.astro',
  'src/pages/smena2-editor.astro',
  'src/pages/onboarding.astro',
  'src/pages/portal/',
  'src/pages/admin/',
  'src/pages/demo/',
  'src/test/',
];

const result = spawnSync(
  process.execPath,
  [
    '--max-old-space-size=6144',
    './node_modules/.bin/astro',
    'check',
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
  .map((line) => line.match(/^(.+?):\d+:\d+ - error ts\(\d+\):/))
  .filter(Boolean)
  .map((match) => match[1]);

const publicErrors = diagnostics.filter(
  (file) => file.startsWith('src/') && !excluded.some((path) => file === path || file.startsWith(path)),
);

if (result.error) {
  console.error(`Public Astro check could not run: ${result.error.message}`);
  process.exit(1);
}

if (publicErrors.length > 0) {
  const counts = new Map();
  for (const file of publicErrors) counts.set(file, (counts.get(file) ?? 0) + 1);
  console.error(`Public Astro check found ${publicErrors.length} errors:`);
  for (const [file, count] of [...counts].sort()) console.error(`- ${file}: ${count}`);
  process.exit(1);
}

console.log(`Public Astro check OK. Internal/legacy exclusions: ${excluded.join(', ')}`);
