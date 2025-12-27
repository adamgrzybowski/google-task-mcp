#!/usr/bin/env bun

/**
 * MCP Server Entry Point
 *
 * This is the main entry point for the Google Tasks MCP server.
 * It initializes the MCP server with stdio transport and sets up
 * the basic server structure.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';

/**
 * Server information
 */
const SERVER_INFO: Implementation = {
  name: 'google-task-mcp',
  version: '1.0.0',
};

/**
 * Main function to start the MCP server
 */
async function main() {
  // Create MCP server instance
  const server = new McpServer(SERVER_INFO, {
    capabilities: {
      tools: {},
    },
  });

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log that server is ready (this will be sent to stderr, not stdout)
  console.error('Google Tasks MCP server started');
  console.error(`Server: ${SERVER_INFO.name} v${SERVER_INFO.version}`);
}

// Start the server
main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

