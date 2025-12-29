/**
 * Tool handler for updating Google Tasks
 */

import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleTasksService } from '../../services/GoogleTasksService.js';
import { wrapError } from '../../utils/errors.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';

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
  due: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
      'Due date must be in RFC3339 format (e.g., 2024-12-31T23:59:59Z)'
    )
    .optional(),
  status: z.enum(['needsAction', 'completed']).optional(),
});

/**
 * Output schema for tasks_update tool
 */
export const tasksUpdateOutputSchema = z.object({
  task: z.object({
    id: z.string().optional(),
    title: z.string(),
    notes: z.string().optional(),
    status: z.enum(['needsAction', 'completed']).optional(),
    due: z.string().optional(),
    completed: z.string().optional(),
    updated: z.string().optional(),
    selfLink: z.string().optional(),
    position: z.string().optional(),
    kind: z.string().optional(),
    etag: z.string().optional(),
    parent: z.string().optional(),
    hidden: z.boolean().optional(),
    deleted: z.boolean().optional(),
  }),
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

      return createSuccessResponse({
        task: {
          id: task.id,
          title: task.title,
          notes: task.notes,
          status: task.status,
          due: task.due,
          completed: task.completed,
          updated: task.updated,
          selfLink: task.selfLink,
          position: task.position,
          kind: task.kind,
          etag: task.etag,
          parent: task.parent,
          hidden: task.hidden,
          deleted: task.deleted,
        },
      });
    } catch (error) {
      console.error(`[task_update] Error updating task ${args.taskId}:`, error);
      const wrappedError = wrapError(error);
      return createErrorResponse(wrappedError.message);
    }
  };
}
