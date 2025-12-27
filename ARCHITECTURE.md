# MCP Google Tasks – System Architecture

## 1. System Purpose

The goal of the system is to create a **custom, independent MCP server** that enables:

- creating tasks in **Google Tasks**,
- invoking these actions from the **native ChatGPT application** (and other MCP clients).

The system runs on **Bun** and uses **stdio transport** for MCP communication.

---

## 2. System Architecture

### 2.1. Data Flow Diagram

```
┌─────────────────┐
│  MCP Client     │
│  (ChatGPT)      │
└────────┬────────┘
         │
         │ MCP Protocol (stdio, JSON-RPC)
         │
         ▼
┌─────────────────────────────────────────┐
│      MCP Google Tasks Server (Bun)      │
│  ┌───────────────────────────────────┐  │
│  │  MCP Protocol Handler              │  │
│  │  - Request routing                 │  │
│  │  - Tool registration               │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Tool Handlers                     │  │
│  │  - tasklists_list                  │  │
│  │  - tasks_create                    │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Google Tasks Client               │  │
│  │  - OAuth token management          │  │
│  │  - API calls                       │  │
│  └───────────┬───────────────────────┘  │
└──────────────┼───────────────────────────┘
               │
               │ OAuth 2.0, REST API
               │
               ▼
┌─────────────────────────┐
│   Google Tasks API      │
└─────────────────────────┘
```

### 2.2. System Components

#### **MCP Protocol Handler**

- Handles MCP protocol-compliant communication
- Routes requests to appropriate tool handlers
- Registers available tools
- Handles JSON-RPC over stdio

#### **Tool Handlers**

- Implementations of task operations
- Each handler is responsible for one action
- Return results in MCP format

#### **Google Tasks Client**

- OAuth token management (refresh, in-memory storage)
- Executes requests to Google Tasks API
- Basic error handling

#### **OAuth Service**

- OAuth 2.0 authorization flow
- Refresh token storage (in-memory)
- Manual OAuth setup (user provides tokens)

---

## 3. Project Structure

### 3.1. Directory Structure

```
google-task-mcp/
├── src/
│   ├── index.ts
│   ├── mcp/
│   │   ├── tools/
│   │   │   ├── tasklists.ts
│   │   │   └── tasks.ts
│   │   └── types.ts
│   ├── google/
│   │   ├── client.ts
│   │   ├── oauth.ts
│   │   └── types.ts
│   └── utils/
│       └── errors.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 4. Data Models

- MCP tools defined with JSON Schema
- Google Tasks API types (TaskList, Task)
- Internal parameter types for tool handlers

---

## 5. Operation Flow

1. MCP Client sends tool call request
2. MCP Protocol Handler routes to appropriate tool handler
3. Tool Handler validates parameters and calls Google Tasks Client
4. Google Tasks Client manages OAuth tokens and makes API calls
5. Response flows back through the chain to MCP Client

---

## 6. Technology Stack

### Core

- **Runtime**: Bun (v1.x)
- **Language**: TypeScript
- **Protocol**: MCP (Model Context Protocol)

### Libraries

- `@modelcontextprotocol/sdk` - MCP SDK
- `googleapis` - Google API client

---

## 7. Configuration

Environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN` (user provides after OAuth setup)

---

## 8. MCP Interface (Tools)

- **tasklists_list** (Read): Returns list of user's task lists
- **tasks_create** (Write): Creates a new task with `{ title, notes?, due?, listId? }`

---

## 9. Security

- OAuth 2.0 with scope limited to Google Tasks
- Refresh token stored in-memory (user provides via env var)
- Tokens **never reach the LLM**
- Basic input validation with length limits

---

## 10. Deployment

Run locally with `bun run dev`. The server uses stdio transport for MCP communication.
