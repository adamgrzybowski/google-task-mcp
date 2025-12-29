/**
 * Tool handler for listing Google Tasks
 */

import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleTasksService } from '../../services/GoogleTasksService.js';
import { wrapError } from '../../utils/errors.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';
import { taskSchema } from '../schemas/task.js';

/**
 * Input schema for tasks_list tool
 */
export const tasksListInputSchema = z.object({
  listId: z.string().min(1, 'List ID cannot be empty').optional(),
});

/**
 * Output schema for tasks_list tool
 */
export const tasksListOutputSchema = z.object({
  tasks: z.array(taskSchema),
});

/**
 * Creates the list tasks tool handler
 */
export function createTasksListHandler(
  service: GoogleTasksService
): ToolCallback<typeof tasksListInputSchema> {
  return async (args) => {
    try {
      const { listId } = args;
      const targetListId = listId ?? '@default';

      console.error(`[tasks_list] Fetching tasks from list: ${targetListId}`);

      const tasks = await service.getTasks(targetListId);

      console.error(`[tasks_list] Found ${tasks.length} tasks`);

      return createSuccessResponse({ tasks });
    } catch (error) {
      console.error(`[tasks_list] Error fetching tasks:`, error);
      const wrappedError = wrapError(error);
      return createErrorResponse(wrappedError.message);
    }
  };
}
