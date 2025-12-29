# Implementation Roadmap

## Phase 1: Project Setup ✅

- [x] Initialize Bun project
- [x] Setup TypeScript configuration
- [x] Create project directory structure
- [x] Install dependencies: `@modelcontextprotocol/sdk`, `googleapis`
- [x] Setup Prettier & ESLint

## Phase 2: Google Tasks API Client ✅

- [x] Create `GoogleTasksService` class
- [x] Implement `getTaskLists()` method
- [x] Implement `createTask()`, `updateTask()`, `deleteTask()` methods
- [x] Add automatic token refresh

## Phase 3: MCP Protocol ✅

- [x] Create `createMcpServer.ts` factory
- [x] Setup HTTP transport with `WebStandardStreamableHTTPServerTransport`
- [x] Implement session management

## Phase 4: Tool Handlers ✅

- [x] `tasklists_list` - List task lists
- [x] `tasks_list` - List tasks
- [x] `task_create` - Create task
- [x] `task_update` - Update task
- [x] `task_delete` - Delete task

## Phase 5: OAuth 2.0 Implementation ✅

- [x] OAuth metadata endpoints (RFC 8414)
- [x] `/authorize` - Redirect to Google
- [x] `/callback` - Handle Google callback
- [x] `/token` - Token exchange
- [x] `/register` - Dynamic Client Registration (RFC 7591)
- [x] Protected resource metadata (RFC 9728)

## Phase 6: Refactoring ✅

- [x] Split OAuth handlers into separate files
- [x] Extract types, storage, helpers
- [x] Create router pattern

## Phase 7: Documentation ✅

- [x] Update README with OAuth flow
- [x] Document all endpoints
- [x] Add architecture diagram

## Future Enhancements

- [ ] PKCE verification (currently skipped)
- [ ] Redis/database storage for production
- [ ] Rate limiting
- [ ] Request logging/metrics
- [ ] Docker deployment guide
