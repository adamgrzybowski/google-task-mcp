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
- [x] Create `src/index.ts` as entry point
  - [x] Initialize MCP server with stdio transport
  - [x] Setup basic server structure

## Phase 4: Tool Handlers

- [x] Create `src/mcp/tools/tasklists.ts` - `tasklists_list` tool
- [x] Create `src/mcp/tools/task_create.ts` - `task_create` tool
- [x] Create `src/mcp/tools/tasks_list.ts` - `tasks_list` tool
- [x] Create `src/mcp/tools/task_update.ts` - `task_update` tool
- [x] Create `src/mcp/tools/task_delete.ts` - `task_delete` tool
- [x] Register tools in `src/index.ts`

## Phase 5: Integration & Testing

- [x] Connect tool handlers to Google Tasks Client
- [ ] Test `tasklists_list` tool end-to-end
- [ ] Test `task_create` tool end-to-end
- [ ] Test `tasks_list` tool end-to-end
- [ ] Test `task_update` tool end-to-end
- [ ] Test `task_delete` tool end-to-end
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

- [ ] Add `tasks_complete` tool (or use `task_update` with status='completed')
- [ ] Improve error messages
- [ ] Add request logging
- [ ] Add input sanitization
- [ ] Support for multiple users (if needed)
