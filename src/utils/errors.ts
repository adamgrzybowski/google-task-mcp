/**
 * Error utilities for MCP server
 */

/**
 * Custom error class for MCP tool errors
 */
export class McpToolError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'McpToolError';
  }
}

/**
 * Creates a standardized error message for tool failures
 */
export function createToolError(
  message: string,
  code?: string,
  data?: unknown
): McpToolError {
  return new McpToolError(message, code, data);
}

/**
 * Wraps an unknown error into a McpToolError
 */
export function wrapError(error: unknown): McpToolError {
  if (error instanceof McpToolError) {
    return error;
  }

  if (error instanceof Error) {
    return new McpToolError(error.message, undefined, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new McpToolError('An unknown error occurred', 'UNKNOWN_ERROR', {
    originalError: error,
  });
}
