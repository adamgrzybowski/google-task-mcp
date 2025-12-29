/**
 * Tool handler for updating Google Tasks
 */

import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleTasksService } from '../../services/GoogleTasksService.js';
import { wrapError } from '../../utils/errors.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';
import { taskSchema, dueDateSchema } from '../schemas/task.js';

/**
 * Input schema for tasks_update tool
 */
export const tasksUpdateInputSchema = z.object({
  listId: z.string().min(1, 'List ID cannot be empty'),
  taskId: z.string().min(1, 'Task ID cannot be empty'),
  title: z
    .string()
    .min(1, 'Task title cannot be empty')
    .max(1024, 'Task title must be 1024 characters or less')
    .optional(),
  notes: z
    .string()
    .max(8192, 'Task notes must be 8192 characters or less')
    .optional(),
  due: dueDateSchema,
  status: z.enum(['needsAction', 'completed']).optional(),
});

/**
 * Output schema for tasks_update tool
 */
export const tasksUpdateOutputSchema = z.object({
  task: taskSchema,
});

/**
 * Creates the update task tool handler
 */
export function createTaskUpdateHandler(
  service: GoogleTasksService
): ToolCallback<typeof tasksUpdateInputSchema> {
  return async (args) => {
    try {
      const { listId, taskId, title, notes, due, status } = args;

      console.error(
        `[task_update] Updating task ${taskId} in list ${listId}:`,
        JSON.stringify({ title, notes, due, status })
      );

      const task = await service.updateTask(listId, taskId, {
        title,
        notes,
        due,
        status,
      });

      console.error(
        `[task_update] Task updated successfully: "${task.title}" (id: ${task.id})`
      );

      return createSuccessResponse({ task });
    } catch (error) {
      console.error(`[task_update] Error updating task ${args.taskId}:`, error);
      const wrappedError = wrapError(error);
      return createErrorResponse(wrappedError.message);
    }
  };
}
