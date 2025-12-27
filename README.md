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

### Getting OAuth Credentials

To access your private Google Tasks, you need to set up OAuth 2.0 credentials:

#### Step 1: Create OAuth Credentials in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Tasks API**:
   - Go to **APIs & Services** > **Library**
   - Search for "Google Tasks API"
   - Click **Enable**
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth client ID**
   - Application type: **Desktop app**
   - Name: "Google Tasks MCP" (or any name you prefer)
   - Click **Create**
5. Copy the **Client ID** and **Client Secret**
6. Add them to your `.env` file:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

#### Step 2: Get Your Refresh Token

After setting up Client ID and Client Secret, get your refresh token:

```bash
bun run get-oauth-token
```

This will:

1. Open a browser window asking you to sign in with your Google account
2. Ask for permission to access Google Tasks
3. Give you an authorization code
4. Exchange it for a refresh token
5. Save the refresh token to your `.env` file

**Important:** The refresh token allows the application to access your Google Tasks without you needing to sign in again. Keep it secure and never commit it to git.

#### How It Works

1. **Initial Authorization**: When you run `get-oauth-token`, you authorize the app to access your Google Tasks
2. **Refresh Token**: Google gives you a refresh token that doesn't expire (unless revoked)
3. **Automatic Token Refresh**: The app uses the refresh token to get new access tokens automatically when needed (access tokens expire after ~1 hour)
4. **No Re-authorization Needed**: Once you have the refresh token, you don't need to sign in again - everything happens automatically in the background

## Usage

### Testing the Connection

Before running the MCP server, you can test your Google API connection:

```bash
bun run test:connection
```

This will verify that your OAuth credentials are correct and that you can successfully connect to the Google Tasks API.

### Running the MCP Server

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

### System Components

- **MCP Protocol Handler**: Handles MCP protocol-compliant communication, routes requests, registers tools, handles JSON-RPC over stdio
- **Tool Handlers**: Implementations of task operations, each responsible for one action, return results in MCP format
- **Google Tasks Service**: Executes API requests with automatic OAuth token refresh (handled by googleapis), basic error handling

### Operation Flow

1. MCP Client sends tool call request
2. MCP Protocol Handler routes to appropriate tool handler
3. Tool Handler validates parameters and calls Google Tasks Service
4. Google Tasks Service makes API calls (googleapis handles OAuth token refresh automatically)
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
│   ├── services/
│   │   └── GoogleTasksService.ts  # Google Tasks API client & types
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
