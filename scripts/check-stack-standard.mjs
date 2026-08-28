import fs from 'node:fs';

const standard = JSON.parse(fs.readFileSync(new URL('../STACK_STANDARD.json', import.meta.url)));
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const packageLock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url)));
const failures = [];

const declared = (name) => packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];
const locked = (name) => packageLock.packages?.[`node_modules/${name}`]?.version;
const expect = (actual, expected, label) => {
  if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual ?? 'missing'}`);
};

expect(fs.readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim(), standard.node, '.nvmrc');

expect(packageJson.engines?.node, standard.engines, 'engines.node');

for (const [name, version] of Object.entries(standard.packages)) {
  expect(declared(name), version, `package.json ${name}`);
  expect(locked(name), version, `package-lock.json ${name}`);
}

if (!standard.policy.allowDirectVite && declared('vite')) {
  failures.push('package.json vite: direct dependency is not allowed; Astro owns Vite');
}
expect(locked('vite'), standard.transitive.vite, 'package-lock.json vite');

for (const profile of Object.values(standard.optionalProfiles)) {
  for (const [name, version] of Object.entries(profile)) {
    if (declared(name) !== undefined) {
      expect(declared(name), version, `package.json ${name}`);
      expect(locked(name), version, `package-lock.json ${name}`);
    }
  }
}

if (failures.length) {
  console.error('Stack standard drift detected:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Stack standard OK: Node ${standard.node}, Astro ${standard.packages.astro}, TypeScript ${standard.packages.typescript}, Tailwind ${standard.packages.tailwindcss}, Vite ${standard.transitive.vite}`);
