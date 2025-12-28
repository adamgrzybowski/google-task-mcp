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
import { GoogleTasksService } from './services/GoogleTasksService.js';
import {
  createTasklistsListHandler,
  tasklistsListInputSchema,
  tasklistsListOutputSchema,
} from './mcp/tools/tasklists.js';
import {
  createCreateTaskHandler,
  tasksCreateInputSchema,
  tasksCreateOutputSchema,
} from './mcp/tools/task_create.js';
import {
  createTasksListHandler,
  tasksListInputSchema,
  tasksListOutputSchema,
} from './mcp/tools/tasks_list.js';
import {
  createTaskUpdateHandler,
  tasksUpdateInputSchema,
  tasksUpdateOutputSchema,
} from './mcp/tools/task_update.js';
import {
  createTaskDeleteHandler,
  tasksDeleteInputSchema,
  tasksDeleteOutputSchema,
} from './mcp/tools/task_delete.js';

/**
 * Server information
 */
const SERVER_INFO: Implementation = {
  name: 'google-task-mcp',
  version: '1.0.0',
};

/**
 * Load environment variables and create Google Tasks service
 */
function createGoogleTasksService(): GoogleTasksService {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing required environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN'
    );
  }

  return new GoogleTasksService(refreshToken, clientId, clientSecret);
}

/**
 * Register all tools with the MCP server
 */
function registerTools(server: McpServer, service: GoogleTasksService): void {
  server.registerTool(
    'tasklists_list',
    {
      title: 'List Task Lists',
      description:
        'Returns a list of all Google Tasks task lists for the authenticated user',
      inputSchema: tasklistsListInputSchema,
      outputSchema: tasklistsListOutputSchema,
    },
    createTasklistsListHandler(service)
  );

  server.registerTool(
    'task_create',
    {
      title: 'Create Task',
      description:
        'Creates a new task in the specified Google Tasks list. If listId is not provided, uses the default list.',
      inputSchema: tasksCreateInputSchema,
      outputSchema: tasksCreateOutputSchema,
    },
    createCreateTaskHandler(service)
  );

  server.registerTool(
    'tasks_list',
    {
      title: 'List Tasks',
      description:
        'Returns a list of all tasks from the specified Google Tasks list. If listId is not provided, uses the default list.',
      inputSchema: tasksListInputSchema,
      outputSchema: tasksListOutputSchema,
    },
    createTasksListHandler(service)
  );

  server.registerTool(
    'task_update',
    {
      title: 'Update Task',
      description:
        'Updates an existing task in the specified Google Tasks list. Only provided fields will be updated.',
      inputSchema: tasksUpdateInputSchema,
      outputSchema: tasksUpdateOutputSchema,
    },
    createTaskUpdateHandler(service)
  );

  server.registerTool(
    'task_delete',
    {
      title: 'Delete Task',
      description: 'Deletes a task from the specified Google Tasks list.',
      inputSchema: tasksDeleteInputSchema,
      outputSchema: tasksDeleteOutputSchema,
    },
    createTaskDeleteHandler(service)
  );
}

/**
 * Main function to start the MCP server
 */
async function main() {
  // Create Google Tasks service
  const service = createGoogleTasksService();

  // Create MCP server instance
  const server = new McpServer(SERVER_INFO, {
    capabilities: {
      tools: {},
    },
  });

  // Register all tools
  registerTools(server, service);

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
