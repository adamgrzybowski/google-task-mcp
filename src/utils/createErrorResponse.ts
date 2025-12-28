/**
 * Creates an error MCP tool response
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function createErrorResponse(message: string): CallToolResult {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}

