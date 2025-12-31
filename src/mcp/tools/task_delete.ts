/**
 * Tool handler for deleting Google Tasks
 */

import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleTasksService } from '../../services/GoogleTasksService.js';
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
 * Checks if an error is a "not found" error (HTTP 404)
 */
function isNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('404') ||
      message.includes('not found') ||
      message.includes('notfound')
    );
  }
  return false;
}

/**
 * Creates the delete task tool handler
 * Implements idempotency: if the task doesn't exist (already deleted), returns success
 */
export function createTaskDeleteHandler(
  service: GoogleTasksService
): ToolCallback<typeof tasksDeleteInputSchema> {
  return async (args) => {
    try {
      const { listId, taskId } = args;

      console.error(
        `[task_delete] Deleting task ${taskId} from list ${listId}`
      );

      await service.deleteTask(listId, taskId);

      console.error(`[task_delete] Task ${taskId} deleted successfully`);

      return createSuccessResponse({
        success: true,
        message: `Task ${taskId} deleted successfully`,
      });
    } catch (error) {
      // Idempotency: if task is already deleted (404), treat as success
      if (isNotFoundError(error)) {
        console.error(
          `[task_delete] Task ${args.taskId} not found (already deleted), returning success`
        );
        return createSuccessResponse({
          success: true,
          message: `Task ${args.taskId} was already deleted`,
        });
      }

      console.error(`[task_delete] Error deleting task ${args.taskId}:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResponse(message);
    }
  };
}
