#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { parseMCPConfig } = require('./parse-mcp-config.js');
const { validateMetricaToken, validateDirectToken, validateVKToken, validateCRMToken } = require('./validate-tokens.js');

// Собрать переменные из .env файла на сервере
async function collectFromEnvFile() {
  const envPath = '/opt/mcp/.env';
  const vars = {};
  
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️  ${envPath} не найден`);
    return vars;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      // Убрать кавычки если есть
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      vars[key.trim()] = value;
    }
  });

  return vars;
}

// Определить инструмент по названию переменной
function identifyInstrument(key) {
  if (key.includes('METRICA') || key.includes('YANDEX_METRICA')) return 'metrica';
  if (key.includes('DIRECT') || key.includes('YANDEX_DIRECT')) return 'direct';
  if (key.includes('VK_')) return 'vk';
  if (key.includes('ALFA') || key.includes('CRM')) return 'crm';
  if (key.includes('TELEGRAM')) return 'telegram';
  if (key.includes('OPENAI')) return 'openai';
  if (key.includes('ANTHROPIC')) return 'anthropic';
  if (key.includes('DATABASE') || key.includes('DB_')) return 'database';
  return null;
}

// Определить scope проекта
function identifyProject(key) {
  if (key.includes('AIDACAMP')) return 'aidacamp';
  if (key.includes('CODIMS')) return 'codims';
  if (key.includes('MCP')) return 'mcp';
  return 'shared';
}

// Валидировать один токен
async function validateToken(instrument, key, value) {
  if (!value || value.length < 5) return 'skipped';
  
  try {
    switch (instrument) {
      case 'metrica':
        const metricaResult = await validateMetricaToken(value);
        return metricaResult.status === 'VALID' ? 'valid' : 'invalid';
      case 'direct':
        const directResult = await validateDirectToken(value);
        return directResult.status === 'VALID' ? 'valid' : 'invalid';
      case 'vk':
        const vkResult = await validateVKToken(value);
        return vkResult.status === 'VALID' ? 'valid' : 'invalid';
      case 'crm':
        const crmResult = await validateCRMToken(value);
        return crmResult.status === 'VALID' ? 'valid' : 'invalid';
      default:
        return 'skipped';
    }
  } catch (error) {
    return 'error';
  }
}

// Вставить переменные в БД
async function insertIntoVault(pool, variables) {
  console.log('💾 Вставляю переменные в БД...\n');
  
  let inserted = 0;
  let errors = 0;
  
  for (const [key, value] of Object.entries(variables)) {
    const visibility = (value && value.length > 20) || key.includes('TOKEN') || key.includes('KEY') ? 'secret' : 'public';
    const instrument = identifyInstrument(key);
    const projectScope = identifyProject(key);
    
    let testResult = 'skipped';
    if (visibility === 'secret' && instrument) {
      testResult = await validateToken(instrument, key, value);
    }

    const query = `
      INSERT INTO variables_vault (key, value, value_type, visibility, instrument, project_scope, status, last_tested, test_result)
      VALUES ($1, $2, 'string', $3, $4, $5, 'active', NOW(), $6)
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW(), test_result = $6;
    `;

    try {
      await pool.query(query, [key, value, visibility, instrument, projectScope, testResult]);
      console.log(`  ├─ ${key} (${instrument || 'unknown'}) - ${testResult}`);
      inserted++;
    } catch (error) {
      console.error(`  ├─ ${key} - ERROR: ${error.message}`);
      errors++;
    }
  }
  
  return { inserted, errors };
}

// Main функция фазы 1
async function executePhase1() {
  console.log('🔧 ФАЗА 1: Инвентаризация токенов\n');

  const pool = new Pool({
    user: 'postgres',
    password: 'postgres_hub_pass_2026',
    host: 'localhost',
    port: 5432,
    database: 'aidacamp_hub'
  });

  try {
    // Собрать из разных источников
    console.log('📦 Собираю переменные из разных источников...\n');
    
    const fromEnv = await collectFromEnvFile();
    const fromMCP = parseMCPConfig();
    
    // Объединить, избегая дублей
    const allVars = { ...fromEnv, ...fromMCP };
    console.log(`✅ Собрано: ${Object.keys(allVars).length} переменных\n`);

    // Вставить в БД
    const { inserted, errors } = await insertIntoVault(pool, allVars);

    // Проверить результат
    const countResult = await pool.query('SELECT COUNT(*) as count FROM variables_vault');
    const count = countResult.rows[0].count;
    
    console.log(`\n✅ ФАЗА 1 ЗАВЕРШЕНА`);
    console.log(`  └─ Вставлено: ${inserted}`);
    console.log(`  └─ Ошибок: ${errors}`);
    console.log(`  └─ Всего в БД: ${count}\n`);

    return { success: true, inserted, errors, total: count };

  } catch (error) {
    console.error('❌ ОШИБКА ФАЗЫ 1:', error.message);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

// Запуск если вызван как скрипт
if (require.main === module) {
  executePhase1().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    process.exit(1);
  });
}

module.exports = { executePhase1, identifyInstrument, identifyProject, validateToken, insertIntoVault };
