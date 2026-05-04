#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 TEST PHASE 1: Проверка структуры файлов\n');

const requiredFiles = [
  'scripts/parse-mcp-config.js',
  'scripts/validate-tokens.js',
  'scripts/inventory-tokens.js',
  'db/migrations/001_variables_vault.sql'
];

let allGood = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const icon = exists ? '✅' : '❌';
  console.log(`${icon} ${file}`);
  if (!exists) allGood = false;
});

console.log();

if (!allGood) {
  console.log('❌ NOT ALL FILES PRESENT\n');
  process.exit(1);
}

// Проверить что inventory-tokens.js експортирует необходимые функции
try {
  const inventory = require('./scripts/inventory-tokens.js');
  if (typeof inventory.executePhase1 !== 'function') {
    console.log('❌ executePhase1 не найден в модуле\n');
    process.exit(1);
  }
  console.log('✅ inventory-tokens.js содержит executePhase1\n');
} catch (e) {
  console.log(`❌ Ошибка при загрузке inventory-tokens.js: ${e.message}\n`);
  process.exit(1);
}

console.log('✅ PHASE 1: Все проверки пройдены\n');
