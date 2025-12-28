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

  const { server: mcpServer } = createMcpServer();

  // Create HTTP transport - it handles all MCP protocol requests
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  // Connect MCP server to transport
  await mcpServer.connect(transport);

  // Create Bun HTTP server - transport handles all MCP requests automatically
  // Using "::" for IPv6 (dual-stack, also listens on IPv4)
  Bun.serve({
    hostname: host,
    port: port,
    fetch(req) {
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
