# Implementation Roadmap

## Phase 1: Project Setup

- [x] Initialize Bun project (`bun init`)
- [x] Setup TypeScript configuration (`tsconfig.json`)
- [x] Create project directory structure
- [x] Setup `.env.example` with required variables
- [x] Create `package.json` with dependencies
- [x] Install dependencies: `@modelcontextprotocol/sdk`, `googleapis`
- [x] Setup Prettier configuration
- [x] Setup ESLint configuration
- [x] Create basic `README.md`

## Phase 2: Google OAuth & API Client

- [x] Create `src/services/GoogleTasksService.ts` for Google Tasks API client
  - [x] Include Google Tasks types in the same file
  - [x] Implement `GoogleTasksService` class
  - [x] Implement `getTaskLists()` method
  - [x] Implement `createTask(listId, task)` method
  - [x] Add automatic token refresh
  - [x] Add basic error handling
- [x] Test Google API connection manually
  - [x] Create `test-connection.ts` script
  - [x] Run test and verify connection works

## Phase 3: MCP Protocol Foundation

- [x] Create `src/utils/errors.ts` for error utilities
- [x] Create `src/server-stdio.ts` as stdio transport entry point
  - [x] Initialize MCP server with stdio transport
  - [x] Setup basic server structure
- [x] Create `src/server-setup.ts` for shared server setup code
  - [x] Extract common server initialization logic
  - [x] Extract tool registration logic
  - [x] Extract Google Tasks service creation

## Phase 4: Tool Handlers

- [x] Create `src/mcp/tools/tasklists.ts` - `tasklists_list` tool
- [x] Create `src/mcp/tools/task_create.ts` - `task_create` tool
- [x] Create `src/mcp/tools/tasks_list.ts` - `tasks_list` tool
- [x] Create `src/mcp/tools/task_update.ts` - `task_update` tool
- [x] Create `src/mcp/tools/task_delete.ts` - `task_delete` tool
- [x] Register tools in `src/server-setup.ts`

## Phase 5: Integration & Testing

- [x] Connect tool handlers to Google Tasks Client
- [x] Create connection test script (`test-connection.ts`) - read-only, safe to run
- [x] Handle error cases gracefully (all handlers use try-catch with wrapError)
- [x] Test OAuth token refresh flow (handled automatically by googleapis library)
- [x] Verify MCP protocol compliance (all tools use CallToolResult, inputSchema, outputSchema)

## Phase 6: HTTP Server Support

- [x] Create `src/server-http.ts` for HTTP transport
  - [x] Use `WebStandardStreamableHTTPServerTransport` from MCP SDK
  - [x] Implement health check endpoint (`/health`)
  - [x] Add deep health check with Google API connection test
  - [x] Support for custom PORT and HOST environment variables
- [x] Refactor code to eliminate duplication
  - [x] Extract shared setup to `src/server-setup.ts`
  - [x] Simplify both server files to focus on transport differences

## Phase 7: Documentation & Polish

- [x] Update `README.md` with setup instructions
- [x] Document OAuth setup process
- [x] Add usage examples for both stdio and HTTP servers
- [x] Document environment variables (PORT, HOST)
- [x] Add MCP client configuration examples
- [x] Document health check endpoints
- [ ] Add troubleshooting section
- [ ] Test with actual MCP clients (Claude Desktop, etc.)

## Future Enhancements (Post-MVP)

- [ ] Add `tasks_complete` tool (or use `task_update` with status='completed')
- [ ] Improve error messages
- [ ] Add request logging
- [ ] Add input sanitization
- [ ] Support for multiple users (if needed)
- [ ] Add authentication/authorization for HTTP server
- [ ] Add rate limiting for HTTP endpoints
- [ ] Add metrics/monitoring endpoints
- [ ] Support for WebSocket transport
