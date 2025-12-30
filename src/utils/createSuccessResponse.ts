/**
 * Creates a successful MCP tool response with both content and structuredContent
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function createSuccessResponse(data: unknown): CallToolResult {
  const jsonText = JSON.stringify(data, null, 2);

  return {
    content: [
      {
        type: 'text' as const,
        text: jsonText,
      },
    ],
    structuredContent: data as Record<string, unknown>,
  };
}
