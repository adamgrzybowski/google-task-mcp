/**
 * Tool handler for deleting Google Tasks
 */

import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleTasksService } from '../../services/GoogleTasksService.js';
import { wrapError } from '../../utils/errors.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';

/**
 * Input schema for tasks_delete tool
 */
export const tasksDeleteInputSchema = z.object({
  listId: z.string().min(1, 'List ID cannot be empty'),
  taskId: z.string().min(1, 'Task ID cannot be empty'),
});

/**
 * Output schema for tasks_delete tool
 */
export const tasksDeleteOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

/**
 * Creates the delete task tool handler
 */
export function createTaskDeleteHandler(
  service: GoogleTasksService
): ToolCallback<typeof tasksDeleteInputSchema> {
  return async (args) => {
    try {
      const { listId, taskId } = args;
      await service.deleteTask(listId, taskId);

      return createSuccessResponse({
        success: true,
        message: `Task ${taskId} deleted successfully`,
      });
    } catch (error) {
      const wrappedError = wrapError(error);
      return createErrorResponse(wrappedError.message);
    }
  };
}

