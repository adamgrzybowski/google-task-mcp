/**
 * MCP Server factory
 *
 * Creates and configures the MCP server with all tools registered.
 * Used by both stdio and HTTP transports.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { GoogleTasksService } from '../services/GoogleTasksService.js';
import {
  createTasklistsListHandler,
  tasklistsListInputSchema,
  tasklistsListOutputSchema,
} from './tools/tasklists.js';
import {
  createCreateTaskHandler,
  tasksCreateInputSchema,
  tasksCreateOutputSchema,
} from './tools/task_create.js';
import {
  createTasksListHandler,
  tasksListInputSchema,
  tasksListOutputSchema,
} from './tools/tasks_list.js';
import {
  createTaskUpdateHandler,
  tasksUpdateInputSchema,
  tasksUpdateOutputSchema,
} from './tools/task_update.js';
import {
  createTaskDeleteHandler,
  tasksDeleteInputSchema,
  tasksDeleteOutputSchema,
} from './tools/task_delete.js';

/**
 * Server information
 */
export const SERVER_INFO: Implementation = {
  name: 'google-task-mcp',
  version: '0.1.0',
};

/**
 * Register all tools with the MCP server
 */
export function registerTools(
  server: McpServer,
  service: GoogleTasksService
): void {
  server.registerTool(
    'tasklists_list',
    {
      title: 'List Task Lists',
      description:
        'Returns a list of all Google Tasks task lists for the authenticated user',
      inputSchema: tasklistsListInputSchema,
      outputSchema: tasklistsListOutputSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
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
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
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
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
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
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    createTaskUpdateHandler(service)
  );

  server.registerTool(
    'task_delete',
    {
      title: 'Delete Task',
      description:
        'Deletes a task from the specified Google Tasks list. This operation permanently removes the task.',
      inputSchema: tasksDeleteInputSchema,
      outputSchema: tasksDeleteOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    createTaskDeleteHandler(service)
  );
}

/**
 * Options for creating MCP server
 */
export interface CreateMcpServerOptions {
  /**
   * If provided, use this access token instead of refresh token from env.
   * Used by HTTP server when OAuth is enabled.
   */
  accessToken?: string;
}

/**
 * Create and configure an MCP server instance
 */
export function createMcpServer(options?: CreateMcpServerOptions): {
  server: McpServer;
  service: GoogleTasksService;
} {
  // Create service based on options
  const service = options?.accessToken
    ? GoogleTasksService.fromAccessToken(options.accessToken)
    : GoogleTasksService.fromEnv();

  const server = new McpServer(SERVER_INFO, {
    capabilities: {
      tools: {},
    },
  });

  registerTools(server, service);

  return { server, service };
}
