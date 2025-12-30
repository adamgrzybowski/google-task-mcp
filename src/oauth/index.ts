/**
 * OAuth 2.0 Authorization Server implementation for MCP
 *
 * This module implements OAuth endpoints that allow ChatGPT (or other MCP clients)
 * to authenticate users via Google OAuth.
 *
 * Flow:
 * 1. ChatGPT calls /.well-known/oauth-authorization-server to discover endpoints
 * 2. ChatGPT redirects user to /authorize
 * 3. /authorize redirects user to Google OAuth
 * 4. Google redirects back to /callback with authorization code
 * 5. /callback redirects to ChatGPT with our own code
 * 6. ChatGPT calls /token to exchange code for tokens
 * 7. /token exchanges our code for Google tokens and returns them
 */

// Types
export type {
  OAuthConfig,
  PendingAuthorization,
  RegisteredClient,
} from './types.js';

// Config
export { createOAuthConfig } from './config.js';

// Router
export { handleOAuthRequest } from './router.js';

// Individual handlers (if needed for testing or custom routing)
export {
  handleWellKnown,
  handleProtectedResource,
  handleOpenIdConfiguration,
} from './handlers/wellKnown.js';
export { handleAuthorize } from './handlers/authorize.js';
export { handleCallback } from './handlers/callback.js';
export { handleToken } from './handlers/token.js';
export { handleClientRegistration } from './handlers/register.js';

// Helpers (if needed externally)
export { generateRandomString, jsonResponse } from './helpers.js';
