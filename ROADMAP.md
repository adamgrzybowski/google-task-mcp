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

---

## Phase 8: OAuth Token Stability ✅

**Symptom:** Connections become unstable after ~1 hour with error:

```
Failed to fetch task lists: Request had invalid authentication credentials.
Expected OAuth 2 access token, login cookie or other valid authentication credential.
```

### Root Cause Analysis

| #   | Issue                                           | Severity  | Description                                                                                              |
| --- | ----------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| 1   | **Access token expires after ~1h**              | ✅ Fixed  | Google OAuth access tokens have TTL of ~3600 seconds                                                     |
| 2   | **MCP session outlives the token**              | ✅ Fixed  | Cursor/ChatGPT maintains one session for days, but token dies after 1h                                   |
| 3   | **No refresh mechanism in `access_token` mode** | ✅ Fixed  | `GoogleTasksService` in access_token mode cannot refresh - missing refresh_token, clientId, clientSecret |
| 4   | **No 401 handling in MCP layer**                | 🟠 High   | When token expires, client gets generic error instead of proper re-auth signal                           |
| 5   | **In-memory storage**                           | 🟡 Medium | Sessions and OAuth state lost on server restart                                                          |
| 6   | **No proactive token validation**               | 🟡 Medium | Server doesn't check token expiry before making requests                                                 |

### Tasks

#### P0 - Critical (Blocking) ✅

- [x] **Store refresh_token in MCP session**
  - Added `tokenStore` in `storage.ts` - maps access_token → refresh_token + expiry
  - `/token` handler now calls `storeTokenData()` after code exchange
  - `server-http.ts` looks up stored token data via `getTokenData()`

- [x] **Implement auto-refresh in GoogleTasksService**
  - Added `OAuthCredentials` interface to `createMcpServer.ts`
  - When refresh_token is available, uses `fromRefreshToken()` mode
  - `googleapis` library handles automatic token refresh transparently!

#### P1 - High Priority

- [ ] **Return proper 401 with WWW-Authenticate header**
  - When token expires, return 401 that triggers re-authorization
  - MCP client should then re-initiate OAuth flow

- [ ] **Proactive token validation**
  - Check `expires_at` timestamp before using token
  - Auto-refresh when <5 minutes remaining

#### P2 - Medium Priority

- [ ] **Persistent session storage**
  - Replace in-memory Map with Redis/SQLite
  - Sessions survive server restarts

### Implemented Architecture

```
NEW (auto-refresh enabled):
┌─────────┐    access_token    ┌─────────────────────┐         ┌────────────────────┐
│ ChatGPT │ ─────────────────► │ server-http.ts      │ ──────► │ GoogleTasksService │
└─────────┘                    │                     │         │ (refresh_token     │
                               │ 1. getTokenData()   │         │  mode)             │
                               │ 2. lookup refresh   │         └────────────────────┘
                               │    token            │                   │
                               └─────────────────────┘                   ▼
                                         │                      googleapis library
                                         ▼                      auto-refreshes! ✅
                               createMcpServer({
                                 oauthCredentials: {
                                   refreshToken,
                                   clientId,
                                   clientSecret
                                 }
                               })
```

**Key files changed:**

- `src/oauth/types.ts` - Added `StoredTokenData` interface
- `src/oauth/storage.ts` - Added `tokenStore`, `storeTokenData()`, `getTokenData()`
- `src/oauth/handlers/token.ts` - Calls `storeTokenData()` after code exchange
- `src/mcp/createMcpServer.ts` - Added `OAuthCredentials` option, uses `fromRefreshToken()`
- `src/server-http.ts` - Looks up refresh token, passes credentials to createMcpServer

---

## Future Enhancements

- [ ] PKCE verification (currently skipped)
- [ ] Rate limiting
- [ ] Request logging/metrics
- [ ] Docker deployment guide
