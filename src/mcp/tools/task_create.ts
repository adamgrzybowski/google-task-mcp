/**
 * Tool handler for creating Google Tasks
 */

import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleTasksService } from '../../services/GoogleTasksService.js';
import { wrapError } from '../../utils/errors.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';

/**
 * Input schema for tasks_create tool
 */
export const tasksCreateInputSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(1024, 'Task title must be 1024 characters or less'),
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
  listId: z.string().min(1, 'List ID cannot be empty').optional(),
});

/**
 * Output schema for tasks_create tool
 */
export const tasksCreateOutputSchema = z.object({
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
 * Creates the create task tool handler
 */
export function createCreateTaskHandler(
  service: GoogleTasksService
): ToolCallback<typeof tasksCreateInputSchema> {
  return async (args) => {
    try {
      const { title, notes, due, listId } = args;

      const task = await service.createTask(
        {
          title,
          notes,
          due,
        },
        listId ?? '@default'
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
      const wrappedError = wrapError(error);
      return createErrorResponse(wrappedError.message);
    }
  };
}

