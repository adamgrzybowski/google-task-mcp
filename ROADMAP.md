# Implementation Roadmap

## Phase 1: Project Setup

- [ ] Initialize Bun project (`bun init`)
- [ ] Setup TypeScript configuration (`tsconfig.json`)
- [ ] Create project directory structure
- [ ] Setup `.env.example` with required variables
- [ ] Create `package.json` with dependencies
- [ ] Install dependencies: `@modelcontextprotocol/sdk`, `googleapis`
- [ ] Create basic `README.md`

## Phase 2: Google OAuth & API Client

- [ ] Create `src/google/types.ts` with Google Tasks types
- [ ] Create `src/google/oauth.ts` for OAuth token management
  - [ ] Implement token refresh logic
  - [ ] Implement in-memory token storage
- [ ] Create `src/google/client.ts` for Google Tasks API client
  - [ ] Implement `GoogleTasksClient` class
  - [ ] Implement `getTaskLists()` method
  - [ ] Implement `createTask(listId, task)` method
  - [ ] Add automatic token refresh
  - [ ] Add basic error handling
- [ ] Test Google API connection manually

## Phase 3: MCP Protocol Foundation

- [ ] Create `src/mcp/types.ts` with MCP type definitions
- [ ] Create `src/utils/errors.ts` for error utilities
- [ ] Create `src/index.ts` as entry point
  - [ ] Initialize MCP server with stdio transport
  - [ ] Setup basic server structure

## Phase 4: Tool Handlers

- [ ] Create `src/mcp/tools/tasklists.ts`
  - [ ] Implement `tasklists_list` tool handler
  - [ ] Define JSON Schema for tool
  - [ ] Add parameter validation
  - [ ] Return MCP-formatted response
- [ ] Create `src/mcp/tools/tasks.ts`
  - [ ] Implement `tasks_create` tool handler
  - [ ] Define JSON Schema for tool
  - [ ] Add parameter validation (title, notes, due, listId)
  - [ ] Add input length limits
  - [ ] Return MCP-formatted response
- [ ] Register tools in `src/index.ts`

## Phase 5: Integration & Testing

- [ ] Connect tool handlers to Google Tasks Client
- [ ] Test `tasklists_list` tool end-to-end
- [ ] Test `tasks_create` tool end-to-end
- [ ] Handle error cases gracefully
- [ ] Test OAuth token refresh flow
- [ ] Verify MCP protocol compliance

## Phase 6: Documentation & Polish

- [ ] Update `README.md` with setup instructions
- [ ] Document OAuth setup process
- [ ] Add usage examples
- [ ] Document environment variables
- [ ] Add troubleshooting section
- [ ] Test with actual ChatGPT MCP client

## Future Enhancements (Post-MVP)

- [ ] Add `tasks_list` tool
- [ ] Add `tasks_complete` tool
- [ ] Add `tasks_delete` tool
- [ ] Improve error messages
- [ ] Add request logging
- [ ] Add input sanitization
- [ ] Support for multiple users (if needed)

