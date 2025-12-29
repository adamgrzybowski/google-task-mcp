#!/usr/bin/env bun

/**
 * HTTP Server for MCP Google Tasks Server
 *
 * This server exposes the MCP server over HTTP transport using the official
 * MCP SDK WebStandardStreamableHTTPServerTransport (perfect for Bun).
 *
 * Features:
 * - MCP protocol over HTTP
 * - OAuth 2.0 authorization (optional)
 *
 * Usage:
 *   bun run server:http
 *   PORT=3000 bun run server:http
 *   HOST=localhost PORT=3000 bun run server:http
 *
 * OAuth mode (set OAUTH_SERVER_URL to enable):
 *   OAUTH_SERVER_URL=https://example.com bun run server:http
 *
 * Default:
 *   - Port: 20187
 *   - Host: :: (IPv6 dual-stack, also accepts IPv4)
 */

// Ensure we're running with Bun, not Node.js
if (typeof Bun === 'undefined') {
  console.error('❌ Error: This server requires Bun runtime.');
  console.error('   Please run with: bun run server:http');
  console.error('   Or use: bun run src/server-http.ts');
  process.exit(1);
}

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer, SERVER_INFO } from './mcp/createMcpServer.js';
import {
  handleOAuthRequest,
  createOAuthConfig,
  type OAuthConfig,
} from './oauth/index.js';

/**
 * Extract access token from Authorization header
 */
function extractAccessToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  // Support "Bearer <token>" format
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function main() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  // Check if OAuth is enabled (OAUTH_SERVER_URL is set)
  const oauthEnabled = !!process.env.OAUTH_SERVER_URL;
  let oauthConfig: OAuthConfig | null = null;

  if (oauthEnabled) {
    try {
      oauthConfig = createOAuthConfig();
      console.log(`🔐 OAuth enabled`);
      console.log(`   Authorization: ${oauthConfig.serverBaseUrl}/authorize`);
      console.log(`   Token: ${oauthConfig.serverBaseUrl}/token`);
    } catch (error) {
      console.error('❌ Failed to initialize OAuth:', error);
      process.exit(1);
    }
  } else {
    console.log(`⚠️  OAuth disabled (set OAUTH_SERVER_URL to enable)`);
  }

  // Map to track server+transport pairs by session ID
  // Each session gets its own server AND transport instance
  // This is necessary because McpServer can only be connected to ONE transport at a time
  const sessions = new Map<
    string,
    {
      server: ReturnType<typeof createMcpServer>['server'];
      transport: WebStandardStreamableHTTPServerTransport;
      accessToken?: string; // Store access token for the session
    }
  >();

  // Create Bun HTTP server - transport handles all MCP requests automatically
  // Using "::" for IPv6 (dual-stack, also listens on IPv4)
  Bun.serve({
    hostname: host,
    port: port,
    fetch: async (req) => {
      const url = new URL(req.url);

      // Log ALL incoming requests
      console.error(`\n[HTTP] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.error(`[HTTP] ${req.method} ${url.pathname}${url.search}`);
      console.error(`[HTTP] Headers:`);
      for (const [key, value] of req.headers.entries()) {
        // Don't log full Authorization token for security
        if (key.toLowerCase() === 'authorization') {
          console.error(`[HTTP]   ${key}: ${value.substring(0, 20)}...`);
        } else {
          console.error(`[HTTP]   ${key}: ${value}`);
        }
      }

      // Handle OAuth requests first (if enabled)
      if (oauthConfig) {
        const oauthResponse = await handleOAuthRequest(req, oauthConfig);
        if (oauthResponse) {
          console.error(
            `[HTTP] → OAuth handler responded with ${oauthResponse.status}`
          );
          return oauthResponse;
        }
      }

      // Extract access token from Authorization header
      const accessToken = extractAccessToken(req);

      // If OAuth is enabled, require access token for MCP requests
      if (oauthEnabled && !accessToken) {
        console.error(`[HTTP] ✗ 401 Unauthorized - no token provided`);
        // Return 401 with WWW-Authenticate header per RFC 9728 / OpenAI spec
        // This tells ChatGPT where to find the protected resource metadata
        const wwwAuth = `Bearer resource_metadata="${oauthConfig?.serverBaseUrl}/.well-known/oauth-protected-resource", scope="https://www.googleapis.com/auth/tasks"`;
        console.error(`[HTTP]   WWW-Authenticate: ${wwwAuth}`);
        return new Response(
          JSON.stringify({
            error: 'unauthorized',
            message: 'Missing Authorization header',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'WWW-Authenticate': wwwAuth,
            },
          }
        );
      }

      // Extract session ID from request headers if present
      const sessionId = req.headers.get('mcp-session-id');

      // Log incoming request for debugging
      console.error(
        `[HTTP] ${req.method} ${url.pathname}, sessionId: ${sessionId ?? 'none'}, hasToken: ${!!accessToken}, sessions: ${sessions.size}`
      );

      // Reuse existing session or create new one
      let session = sessionId ? sessions.get(sessionId) : undefined;

      if (!session) {
        console.error(`[HTTP] Creating new session (server + transport)`);

        // Create new server AND transport for new session
        // McpServer can only be connected to ONE transport, so each session needs its own server
        // Pass access token if available (for OAuth mode)
        const { server } = createMcpServer(
          accessToken ? { accessToken } : undefined
        );
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (id) => {
            console.error(`[MCP] Session initialized: ${id}`);
            sessions.set(id, {
              server,
              transport,
              accessToken: accessToken ?? undefined,
            });
          },
          onsessionclosed: async (id) => {
            console.error(`[MCP] Session closed: ${id}`);
            const s = sessions.get(id);
            if (s) {
              try {
                await s.transport.close();
                await s.server.close();
              } catch {
                // Ignore errors during cleanup
              }
              sessions.delete(id);
            }
          },
        });

        // Connect the server to the transport
        await server.connect(transport);

        session = { server, transport, accessToken: accessToken ?? undefined };
      }

      const { transport } = session;

      // Liberalize Accept header - add missing text/event-stream if only application/json is present
      // This allows clients that only send application/json to work
      const acceptHeader = req.headers.get('Accept');
      if (
        acceptHeader &&
        acceptHeader.includes('application/json') &&
        !acceptHeader.includes('text/event-stream')
      ) {
        // Clone request and add missing Accept header
        const newHeaders = new Headers(req.headers);
        newHeaders.set('Accept', `${acceptHeader}, text/event-stream`);

        // Create new request with updated headers
        const modifiedReq = new Request(req.url, {
          method: req.method,
          headers: newHeaders,
          body: req.body,
        });

        return transport.handleRequest(modifiedReq);
      }

      // All requests go to MCP transport - it handles everything!
      return transport.handleRequest(req);
    },
  });

  console.log(`🚀 Google Tasks MCP HTTP server started`);
  console.log(`   Server: ${SERVER_INFO.name} v${SERVER_INFO.version}`);
  console.log(`   Listening on [${host}]:${port} (IPv6 dual-stack)`);
  console.log(`   MCP endpoint: http://[${host}]:${port}/`);
}

main().catch((error) => {
  console.error('Failed to start HTTP server:', error);
  process.exit(1);
});
