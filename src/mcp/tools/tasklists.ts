/**
 * Tool handler for listing Google Tasks task lists
 */

import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GoogleTasksService } from '../../services/GoogleTasksService.js';
import { wrapError } from '../../utils/errors.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';

/**
 * Input schema for tasklists_list tool (no parameters needed)
 */
export const tasklistsListInputSchema = z.object({});

/**
 * Output schema for tasklists_list tool
 */
export const tasklistsListOutputSchema = z.object({
  taskLists: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      kind: z.string().optional(),
      etag: z.string().optional(),
      updated: z.string().optional(),
      selfLink: z.string().optional(),
    })
  ),
});

/**
 * Creates the tasklists_list tool handler
 */
export function createTasklistsListHandler(
  service: GoogleTasksService
): ToolCallback<typeof tasklistsListInputSchema> {
  return async () => {
    try {
      const taskLists = await service.getTaskLists();
      const mappedLists = taskLists.map((list) => ({
        id: list.id,
        title: list.title,
        kind: list.kind,
        etag: list.etag,
        updated: list.updated,
        selfLink: list.selfLink,
      }));

      return createSuccessResponse({ taskLists: mappedLists });
    } catch (error) {
      const wrappedError = wrapError(error);
      return createErrorResponse(wrappedError.message);
    }
  };
}
