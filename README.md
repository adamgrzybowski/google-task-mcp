# Google Tasks MCP Server

A Model Context Protocol (MCP) server that enables integration with Google Tasks API, allowing you to create and manage tasks from MCP clients like ChatGPT.

## Features

- List Google Tasks task lists
- List tasks from a task list
- Create new tasks in Google Tasks
- Update existing tasks (title, notes, due date, status)
- Delete tasks from Google Tasks
- OAuth 2.0 authentication (user logs in via browser)
- MCP protocol compliance

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.x or later)
- Google Cloud Project with Tasks API enabled
- OAuth 2.0 credentials (Client ID, Client Secret)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
bun install
```

3. Create a `.env` file with your credentials (see Configuration below)

## Configuration

### Environment Variables

| Variable               | Required | Description                     |
| ---------------------- | -------- | ------------------------------- |
| `GOOGLE_CLIENT_ID`     | Yes      | Google OAuth Client ID          |
| `GOOGLE_CLIENT_SECRET` | Yes      | Google OAuth Client Secret      |
| `OAUTH_SERVER_URL`     | Yes      | Public HTTPS URL of your server |
| `PORT`                 | No       | Server port (default: `20187`)  |
| `HOST`                 | No       | Bind address (default: `::`)    |

### Example `.env`

```bash
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
OAUTH_SERVER_URL=https://mcp.example.com
PORT=20187
```

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Tasks API**:
   - Go to **APIs & Services** > **Library**
   - Search for "Google Tasks API"
   - Click **Enable**
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - Name: "Google Tasks MCP"
   - Add **Authorized redirect URI**: `https://YOUR_SERVER/callback`
   - Click **Create**
5. Copy **Client ID** and **Client Secret** to your `.env`

## Usage

### Running the Server

```bash
bun run server:http
```

The server exposes:

- MCP protocol endpoints for tool calls
- OAuth endpoints for user authentication

### OAuth Endpoints

| Endpoint                                  | Description                             |
| ----------------------------------------- | --------------------------------------- |
| `/.well-known/oauth-authorization-server` | OAuth metadata discovery                |
| `/.well-known/oauth-protected-resource`   | Protected resource metadata             |
| `/authorize`                              | Starts OAuth flow (redirects to Google) |
| `/callback`                               | Handles Google OAuth callback           |
| `/token`                                  | Exchanges authorization code for tokens |
| `/register`                               | Dynamic Client Registration (RFC 7591)  |

### OAuth Flow

1. Client calls `/.well-known/oauth-authorization-server` to discover endpoints
2. Client redirects user to `/authorize`
3. `/authorize` redirects to Google OAuth
4. Google redirects back to `/callback` with authorization code
5. `/callback` redirects to client with our code
6. Client calls `/token` to exchange code for tokens
7. Client uses access token to make MCP requests

## Architecture

```
┌─────────────────┐
│  MCP Client     │
│  (ChatGPT)      │
└────────┬────────┘
         │
         │ MCP Protocol (HTTP, JSON-RPC)
         │
         ▼
┌─────────────────────────────────────────┐
│      MCP Google Tasks Server (Bun)      │
│  ┌───────────────────────────────────┐  │
│  │  OAuth Handler                     │  │
│  │  - /authorize, /callback, /token   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  MCP Protocol Handler              │  │
│  │  - Request routing                 │  │
│  │  - Tool registration               │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Tool Handlers                     │  │
│  │  - tasklists_list                  │  │
│  │  - task_create                     │  │
│  │  - tasks_list                      │  │
│  │  - task_update                     │  │
│  │  - task_delete                     │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Google Tasks Service              │  │
│  │  - API calls                       │  │
│  │  - Automatic token refresh         │  │
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

## Project Structure

```
google-task-mcp/
├── src/
│   ├── server-http.ts           # HTTP server entry point
│   ├── server-stdio.ts          # STDIO server (legacy/local use)
│   ├── mcp/
│   │   ├── createMcpServer.ts   # MCP server factory
│   │   ├── schemas/
│   │   │   └── task.ts          # Zod schemas for validation
│   │   └── tools/               # MCP tool handlers
│   │       ├── tasklists.ts
│   │       ├── task_create.ts
│   │       ├── tasks_list.ts
│   │       ├── task_update.ts
│   │       └── task_delete.ts
│   ├── oauth/                   # OAuth 2.0 implementation
│   │   ├── index.ts             # Re-exports
│   │   ├── router.ts            # OAuth request routing
│   │   ├── config.ts            # OAuth configuration
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── storage.ts           # In-memory state storage
│   │   ├── helpers.ts           # Utility functions
│   │   └── handlers/
│   │       ├── wellKnown.ts     # Discovery endpoints
│   │       ├── authorize.ts     # /authorize
│   │       ├── callback.ts      # /callback
│   │       ├── token.ts         # /token
│   │       └── register.ts      # /register (DCR)
│   ├── services/
│   │   └── GoogleTasksService.ts
│   └── utils/
│       ├── errors.ts
│       ├── createSuccessResponse.ts
│       └── createErrorResponse.ts
├── package.json
├── tsconfig.json
└── README.md
```

## MCP Tools

| Tool             | Type  | Description                       |
| ---------------- | ----- | --------------------------------- |
| `tasklists_list` | Read  | Returns list of user's task lists |
| `tasks_list`     | Read  | Returns tasks from a task list    |
| `task_create`    | Write | Creates a new task                |
| `task_update`    | Write | Updates an existing task          |
| `task_delete`    | Write | Deletes a task                    |

## Technology Stack

- **Runtime**: Bun (v1.x)
- **Language**: TypeScript
- **Protocol**: MCP (Model Context Protocol)
- **Libraries**: `@modelcontextprotocol/sdk`, `googleapis`

## Security

- OAuth 2.0 with scope limited to Google Tasks
- Access tokens stored per-session in memory
- Tokens **never reach the LLM**
- HTTPS required for production
- PKCE support (S256)

## Development

```bash
# Run server
bun run server:http

# Lint
bun run lint

# Format
bun run format

# Type check
bun run typecheck
```

## License

Private project
