# Implementation Roadmap

## Completed ✅

- **Phase 1:** Project Setup (Bun, TypeScript, ESLint)
- **Phase 2:** Google Tasks API Client (`GoogleTasksService`)
- **Phase 3:** MCP Protocol (HTTP transport, session management)
- **Phase 4:** Tool Handlers (tasklists_list, tasks_list, task_create, task_update, task_delete)
- **Phase 5:** OAuth 2.0 (RFC 8414, Dynamic Client Registration)
- **Phase 6:** Refactoring (modular OAuth handlers)
- **Phase 7:** Documentation
- **Phase 8:** OAuth Token Stability (auto-refresh, persistent storage)

## TODO

- **stdio transport auth:** Currently `server-stdio.ts` doesn't handle OAuth. Need to add support for local token storage or environment-based auth for Cursor/Claude Desktop usage.
