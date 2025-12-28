#!/usr/bin/env bun

/**
 * HTTP Server for MCP Google Tasks Server
 *
 * This server exposes the MCP server over HTTP transport using the official
 * MCP SDK WebStandardStreamableHTTPServerTransport (perfect for Bun).
 *
 * Usage:
 *   bun run server:http
 *   PORT=3000 bun run server:http
 *   HOST=localhost PORT=3000 bun run server:http
 *
 * Default:
 *   - Port: 21184
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
import { createMcpServer, SERVER_INFO } from './server-setup.js';

async function main() {
  const port = parseInt(process.env.PORT || '21184', 10);
  const host = process.env.HOST || '::';

  // Map to track server+transport pairs by session ID
  // Each session gets its own server AND transport instance
  // This is necessary because McpServer can only be connected to ONE transport at a time
  const sessions = new Map<
    string,
    {
      server: ReturnType<typeof createMcpServer>['server'];
      transport: WebStandardStreamableHTTPServerTransport;
    }
  >();

  // Create Bun HTTP server - transport handles all MCP requests automatically
  // Using "::" for IPv6 (dual-stack, also listens on IPv4)
  Bun.serve({
    hostname: host,
    port: port,
    fetch: async (req) => {
      // Extract session ID from request headers if present
      const sessionId = req.headers.get('mcp-session-id');

      // Log incoming request for debugging
      console.error(
        `[HTTP] ${req.method} request, sessionId: ${sessionId ?? 'none'}, sessions: ${sessions.size}`
      );

      // Reuse existing session or create new one
      let session = sessionId ? sessions.get(sessionId) : undefined;

      if (!session) {
        console.error(`[HTTP] Creating new session (server + transport)`);

        // Create new server AND transport for new session
        // McpServer can only be connected to ONE transport, so each session needs its own server
        const { server } = createMcpServer();
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (id) => {
            console.error(`[MCP] Session initialized: ${id}`);
            sessions.set(id, { server, transport });
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

        session = { server, transport };
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
