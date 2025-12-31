# Architecture

## Overview

```
┌─────────────────┐
│  MCP Client     │
│  (ChatGPT)      │
└────────┬────────┘
         │ MCP Protocol (HTTP)
         ▼
┌─────────────────────────────────────────┐
│         server-http.ts                  │
│  ┌───────────────────────────────────┐  │
│  │  OAuth Handler (oauth/)           │  │
│  │  /authorize, /callback, /token    │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  MCP Transport                    │  │
│  │  WebStandardStreamableHTTP        │  │
│  └───────────────────────────────────┘  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         createMcpServer.ts              │
│  ┌───────────────────────────────────┐  │
│  │  Tool Handlers (tools/)           │  │
│  │  tasklists, task_create, etc.     │  │
│  └───────────────────────────────────┘  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│       GoogleTasksService.ts             │
│  Google Tasks API wrapper               │
└────────────────┬────────────────────────┘
                 │ OAuth 2.0 / REST
                 ▼
┌─────────────────────────┐
│   Google Tasks API      │
└─────────────────────────┘
```

## Project Structure

```
src/
├── server-http.ts          # HTTP entry point
├── server-stdio.ts         # stdio entry point (not working with OAuth yet)
├── mcp/
│   ├── createMcpServer.ts  # MCP server factory
│   ├── schemas/
│   │   └── task.ts         # Zod validation schemas
│   └── tools/              # MCP tool handlers
├── oauth/                  # OAuth 2.0 implementation
│   ├── handlers/           # Endpoint handlers
│   └── ...
├── services/
│   └── GoogleTasksService.ts
└── utils/
    ├── createSuccessResponse.ts
    └── createErrorResponse.ts
```

## Files

### Entry Points

#### `server-http.ts`

HTTP server using Bun's native `Bun.serve()`. Handles:

- OAuth request routing (delegates to `oauth/router.ts`)
- MCP session management (one McpServer + Transport per session)
- Access token extraction from Authorization header
- Accept header normalization for compatibility

#### `server-stdio.ts`

stdio transport for local MCP clients (Cursor, Claude Desktop). Currently requires environment variables for auth - OAuth not yet supported.

### MCP Layer

#### `mcp/createMcpServer.ts`

Factory function that creates configured McpServer instance:

- Registers all tools
- Creates GoogleTasksService with appropriate auth mode (access token or refresh token)
- Exports `SERVER_INFO` for version identification

#### `mcp/schemas/task.ts`

Shared Zod schemas:

- `taskSchema` - Google Task object structure
- `dueDateSchema` - RFC3339 date format validation

#### `mcp/tools/*.ts`

Each file exports:

- `inputSchema` - Zod schema for tool parameters
- `outputSchema` - Zod schema for response (documentation only)
- `create*Handler(service)` - Factory returning tool callback

Pattern:

```typescript
export function createSomeHandler(
  service: GoogleTasksService
): ToolCallback<typeof inputSchema> {
  return async (args) => {
    try {
      const result = await service.someMethod(args);
      return createSuccessResponse(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResponse(message);
    }
  };
}
```

### OAuth Layer

#### `oauth/router.ts` + `oauth/handlers/`

Routes requests to endpoint handlers:

- `/.well-known/*` → `wellKnown.ts` - OAuth/OIDC discovery metadata
- `/authorize` → `authorize.ts` - Redirects to Google OAuth
- `/callback` → `callback.ts` - Receives Google auth code, redirects to client
- `/token` → `token.ts` - Exchanges codes for tokens, handles refresh
- `/register` → `register.ts` - Dynamic Client Registration (RFC 7591)

#### `oauth/storage.ts`

In-memory storage for:

- Pending authorizations (state → redirect_uri mapping)
- Token data (access_token → refresh_token mapping for auto-refresh)
- Registered clients (DCR)

#### `oauth/types.ts`

TypeScript interfaces for OAuth entities.

#### `oauth/config.ts`

Creates OAuthConfig from environment variables.

#### `oauth/helpers.ts`

Utility functions: `generateRandomString`, `jsonResponse`.

### Services

#### `services/GoogleTasksService.ts`

Google Tasks API wrapper using `googleapis` library. Supports two auth modes:

- **Refresh token mode**: Has client credentials, can auto-refresh tokens
- **Access token mode**: Token only, expires after ~1h

Methods:

- `getTaskLists()` - List all task lists
- `getTasks(listId)` - List tasks in a list
- `createTask(task, listId)` - Create task
- `updateTask(listId, taskId, updates)` - Update task
- `deleteTask(listId, taskId)` - Delete task
- `checkConnection()` - Health check

### Utils

#### `utils/createSuccessResponse.ts`

Creates MCP CallToolResult with both `content` (text) and `structuredContent` (object).

#### `utils/createErrorResponse.ts`

Creates MCP CallToolResult with `isError: true`.

## OAuth Flow

```
Client                    Server                      Google
  │                         │                           │
  │ GET /authorize          │                           │
  │ ?redirect_uri=...       │                           │
  │ &state=...              │                           │
  │────────────────────────>│                           │
  │                         │                           │
  │      302 Redirect       │                           │
  │<────────────────────────│                           │
  │                         │                           │
  │ GET accounts.google.com/o/oauth2/auth               │
  │─────────────────────────────────────────────────────>
  │                         │                           │
  │                    [User logs in]                   │
  │                         │                           │
  │      302 Redirect to /callback?code=...            │
  │<─────────────────────────────────────────────────────
  │                         │                           │
  │ GET /callback?code=...  │                           │
  │────────────────────────>│                           │
  │                         │                           │
  │      302 Redirect       │                           │
  │      ?code=our_code     │                           │
  │<────────────────────────│                           │
  │                         │                           │
  │ POST /token             │                           │
  │ code=our_code           │                           │
  │────────────────────────>│                           │
  │                         │ POST /token               │
  │                         │ code=google_code          │
  │                         │──────────────────────────>│
  │                         │                           │
  │                         │ {access_token, refresh}   │
  │                         │<──────────────────────────│
  │                         │                           │
  │ {access_token}          │                           │
  │<────────────────────────│                           │
```

## Session Management

Each MCP session gets its own:

- `McpServer` instance
- `WebStandardStreamableHTTPServerTransport` instance
- `GoogleTasksService` instance (with user's tokens)

This is required because McpServer can only be connected to one transport at a time.

Sessions are stored in a Map keyed by session ID (UUID generated on first request).

## Security

- Tokens stored in memory only (not persisted)
- Tokens never reach the LLM - only tool results
- HTTPS required in production
- PKCE (S256) supported for OAuth
- Scope limited to `https://www.googleapis.com/auth/tasks`
