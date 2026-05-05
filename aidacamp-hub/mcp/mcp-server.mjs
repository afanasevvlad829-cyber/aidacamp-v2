import { createRequire } from 'module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

const require = createRequire(import.meta.url);

// Загружаем все инструменты (с обёрткой на случай если файл ещё не создан)
function loadTool(path, exportName, fallbackName) {
  try {
    const mod = require(path);
    return mod[exportName];
  } catch (e) {
    console.error(`⚠️  Tool ${fallbackName} not loaded: ${e.message}`);
    return null;
  }
}

const tools = [
  loadTool('./tools/kb-search.js', 'kbSearchTool', 'kb_search'),
  loadTool('./tools/kb-search-semantic.js', 'kbSearchSemanticTool', 'kb_search_semantic'),
  loadTool('./tools/kb-add.js', 'kbAddTool', 'kb_add'),
  loadTool('./tools/metrics-summary.js', 'metricsSummaryTool', 'metrics_summary'),
  loadTool('./tools/direct-stats.js', 'directStatsTool', 'direct_stats'),
  loadTool('./tools/vk-stats.js', 'vkStatsTool', 'vk_stats'),
  loadTool('./tools/metrika-stats.js', 'metrikaStatsTool', 'metrika_stats'),
  loadTool('./tools/crm-clients.js', 'crmClientsTool', 'crm_clients'),
  loadTool('./tools/sync-status.js', 'syncStatusTool', 'sync_status'),
].filter(Boolean);

const toolMap = new Map(tools.map(t => [t.name, t]));

const server = new Server(
  { name: 'aidacamp-hub', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Список инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }))
}));

// Вызов инструмента
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const tool = toolMap.get(name);
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  try {
    const result = await tool.execute(args || {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Tool ${name} failed: ${error.message}`
    );
  }
});

// Запуск
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`✅ Aidacamp Hub MCP server running (${tools.length} tools loaded)`);
}

main().catch(error => {
  console.error('Fatal:', error);
  process.exit(1);
});
