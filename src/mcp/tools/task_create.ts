/**
 * Tool handler for creating Google Tasks
 */

import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleTasksService } from '../../services/GoogleTasksService.js';
import { wrapError } from '../../utils/errors.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';
import { taskSchema, dueDateSchema } from '../schemas/task.js';

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
  due: dueDateSchema,
  listId: z.string().min(1, 'List ID cannot be empty').optional(),
});

/**
 * Output schema for tasks_create tool
 */
export const tasksCreateOutputSchema = z.object({
  task: taskSchema,
});

/**
 * Checks if two tasks match based on title, notes, and due date
 */
function tasksMatch(
  existing: { title: string; notes?: string; due?: string },
  requested: { title: string; notes?: string; due?: string }
): boolean {
  // Title must match exactly
  if (existing.title !== requested.title) {
    return false;
  }

  // Notes must match (both undefined/empty or same value)
  const existingNotes = existing.notes || undefined;
  const requestedNotes = requested.notes || undefined;
  if (existingNotes !== requestedNotes) {
    return false;
  }

  // Due date must match (both undefined or same value)
  // Compare only the date part since times can vary
  const existingDue = existing.due?.split('T')[0];
  const requestedDue = requested.due?.split('T')[0];
  if (existingDue !== requestedDue) {
    return false;
  }

  return true;
}

/**
 * Creates the create task tool handler
 * Implements idempotency: if a task with the same title, notes, and due date exists, returns it instead of creating a duplicate
 */
export function createCreateTaskHandler(
  service: GoogleTasksService
): ToolCallback<typeof tasksCreateInputSchema> {
  return async (args) => {
    try {
      const { title, notes, due, listId } = args;
      const targetListId = listId ?? '@default';

      console.error(
        `[task_create] Request to create task: "${title}" in list: ${targetListId}`
      );

      // Check for existing task with same properties (idempotency)
      const existingTasks = await service.getTasks(targetListId);
      const matchingTask = existingTasks.find((t) =>
        tasksMatch(t, { title, notes, due })
      );

      if (matchingTask) {
        console.error(
          `[task_create] Found existing task with same properties: "${matchingTask.title}" (id: ${matchingTask.id})`
        );

        return createSuccessResponse({ task: matchingTask });
      }

      // No matching task found, create a new one
      const task = await service.createTask(
        {
          title,
          notes,
          due,
        },
        targetListId
      );

      console.error(
        `[task_create] Task created successfully: "${task.title}" (id: ${task.id})`
      );

      return createSuccessResponse({ task });
    } catch (error) {
      const wrappedError = wrapError(error);
      return createErrorResponse(wrappedError.message);
    }
  };
}
