/**
 * Shared task schemas for MCP tools
 */

import { z } from 'zod';

/**
 * Zod schema for a single task (used in output schemas)
 */
export const taskSchema = z.object({
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
});

/**
 * Zod schema for due date validation (RFC3339 format)
 */
export const dueDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    'Due date must be in RFC3339 format (e.g., 2024-12-31T23:59:59Z)'
  )
  .optional();
