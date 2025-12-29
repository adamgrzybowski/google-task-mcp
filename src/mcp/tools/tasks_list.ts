/**
 * Tool handler for listing Google Tasks
 */

import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleTasksService } from '../../services/GoogleTasksService.js';
import { wrapError } from '../../utils/errors.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';

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
  tasks: z.array(
    z.object({
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
    })
  ),
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

      return createSuccessResponse({
        tasks: tasks.map((task) => ({
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
        })),
      });
    } catch (error) {
      console.error(`[tasks_list] Error fetching tasks:`, error);
      const wrappedError = wrapError(error);
      return createErrorResponse(wrappedError.message);
    }
  };
}
