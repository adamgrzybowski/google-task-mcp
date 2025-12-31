# Google Tasks MCP Server

MCP server for Google Tasks API integration. Allows MCP clients (like ChatGPT) to manage your Google Tasks.

## Quick Start

### 1. Install dependencies

```bash
bun install
```

### 2. Get Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Google Tasks API** (APIs & Services → Library)
4. Create OAuth credentials (APIs & Services → Credentials → Create → OAuth client ID)
   - Type: Web application
   - Redirect URI: `https://YOUR_SERVER/callback`
5. Copy Client ID and Client Secret

### 3. Configure environment

Create `.env` file:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
OAUTH_SERVER_URL=https://your-server.example.com
PORT=3000  # optional, default: 3000
```

### 4. Run

```bash
bun run server:http
```

## Docker

Build and run with Docker Compose:

```bash
# Start
bun run docker:up

# Stop
bun run docker:down
```

The container exposes port 20187 → internal 3000.

## MCP Tools

| Tool             | Description            |
| ---------------- | ---------------------- |
| `tasklists_list` | List all task lists    |
| `tasks_list`     | List tasks from a list |
| `task_create`    | Create a new task      |
| `task_update`    | Update a task          |
| `task_delete`    | Delete a task          |

## Development

```bash
bun run lint        # ESLint
bun run lint:fix    # ESLint with auto-fix
bun run format      # Prettier
bun run typecheck   # TypeScript check
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details.

## License

MIT
