#!/usr/bin/env bun

/**
 * MCP Server with stdio transport
 *
 * This server uses stdio transport for MCP communication.
 * It is designed to be used by MCP clients that launch it as a subprocess.
 */

// Ensure we're running with Bun, not Node.js
if (typeof Bun === 'undefined') {
  console.error('❌ Error: This server requires Bun runtime.');
  console.error('   Please run with: bun run server:stdio');
  console.error('   Or use: bun run src/server-stdio.ts');
  process.exit(1);
}

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer, SERVER_INFO } from './mcp/createMcpServer.js';

/**
 * Main function to start the MCP server
 */
async function main() {
  const { server } = createMcpServer();

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log that server is ready (this will be sent to stderr, not stdout)
  console.error('Google Tasks MCP server started');
  console.error(`Server: ${SERVER_INFO.name} v${SERVER_INFO.version}`);
  console.error(
    'Registered tools: tasklists_list, task_create, tasks_list, task_update, task_delete'
  );
}

// Start the server
main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
