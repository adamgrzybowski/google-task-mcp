# Google Tasks MCP Server

A Model Context Protocol (MCP) server that enables integration with Google Tasks API, allowing you to create and manage tasks from MCP clients like ChatGPT.

## Features

- List Google Tasks task lists
- Create new tasks in Google Tasks
- OAuth 2.0 authentication with automatic token refresh
- MCP protocol compliance

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.x or later)
- Google Cloud Project with Tasks API enabled
- OAuth 2.0 credentials (Client ID, Client Secret, Refresh Token)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
bun install
```

3. Copy `.env.example` to `.env` and fill in your Google OAuth credentials:

```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
   - `GOOGLE_REFRESH_TOKEN` - Your OAuth Refresh Token

## Usage

Run the MCP server:

```bash
bun run dev
```

The server uses stdio transport for MCP communication and can be configured in MCP clients like ChatGPT.

## Architecture

### Data Flow

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

### System Components

- **MCP Protocol Handler**: Handles MCP protocol-compliant communication, routes requests, registers tools, handles JSON-RPC over stdio
- **Tool Handlers**: Implementations of task operations, each responsible for one action, return results in MCP format
- **Google Tasks Client**: OAuth token management (refresh, in-memory storage), executes API requests, basic error handling
- **OAuth Service**: OAuth 2.0 authorization flow, refresh token storage (in-memory), manual OAuth setup

### Operation Flow

1. MCP Client sends tool call request
2. MCP Protocol Handler routes to appropriate tool handler
3. Tool Handler validates parameters and calls Google Tasks Client
4. Google Tasks Client manages OAuth tokens and makes API calls
5. Response flows back through the chain to MCP Client

## Project Structure

```
google-task-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── mcp/
│   │   ├── tools/            # MCP tool handlers
│   │   │   ├── tasklists.ts
│   │   │   └── tasks.ts
│   │   └── types.ts          # MCP type definitions
│   ├── google/
│   │   ├── client.ts         # Google Tasks API client
│   │   ├── oauth.ts          # OAuth token management
│   │   └── types.ts          # Google API types
│   └── utils/
│       └── errors.ts         # Error utilities
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Technology Stack

- **Runtime**: Bun (v1.x)
- **Language**: TypeScript
- **Protocol**: MCP (Model Context Protocol)
- **Libraries**: `@modelcontextprotocol/sdk`, `googleapis`

## MCP Interface (Tools)

- **tasklists_list** (Read): Returns list of user's task lists
- **tasks_create** (Write): Creates a new task with `{ title, notes?, due?, listId? }`

## Security

- OAuth 2.0 with scope limited to Google Tasks
- Refresh token stored in-memory (user provides via env var)
- Tokens **never reach the LLM**
- Basic input validation with length limits

## Development

Built with Bun, TypeScript, and the MCP SDK. The server uses stdio transport for MCP communication.

## License

Private project
