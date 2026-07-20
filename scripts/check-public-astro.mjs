import { spawnSync } from 'node:child_process';

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
