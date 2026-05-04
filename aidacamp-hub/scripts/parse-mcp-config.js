const fs = require('fs');

function parseMCPConfig() {
  const mcpPath = '/opt/mcp/mcp-server.mjs';
  
  if (!fs.existsSync(mcpPath)) {
    console.error(`❌ File not found: ${mcpPath}`);
    return {};
  }

  const content = fs.readFileSync(mcpPath, 'utf-8');
  
  // Regex patterns для поиска переменных
  const patterns = [
    /const\s+(\w+)\s*=\s*['"](.+?)['"]/g,           // const VAR = "value"
    /const\s+(\w+)\s*=\s*process\.env\.(\w+)/g,     // const VAR = process.env.OTHER
    /(\w+):\s*['"](.+?)['"]/g                        // property: "value"
  ];

  const found = {};

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      const value = match[2] || match[3] || '';
      
      // Фильтр: только CONSTANT_LIKE переменные (минимум 3 символа, не lowercase)
      if (key && key !== key.toLowerCase() && key.length > 2) {
        found[key] = value;
      }
    }
  });

  return found;
}

const vars = parseMCPConfig();
console.log('🔍 Найдено hardcoded переменных в mcp-server.mjs:');
Object.entries(vars).forEach(([key, value]) => {
  const display = value.length > 40 ? value.substring(0, 40) + '...' : value;
  console.log(`  ├─ ${key}: ${display}`);
});
console.log(`\n✅ Всего найдено: ${Object.keys(vars).length} переменных\n`);

module.exports = { parseMCPConfig };
