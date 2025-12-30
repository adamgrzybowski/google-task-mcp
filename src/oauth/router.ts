/**
 * OAuth Router
 *
 * Routes OAuth-related requests to appropriate handlers.
 */

import type { OAuthConfig } from './types.js';
import {
  handleWellKnown,
  handleProtectedResource,
  handleOpenIdConfiguration,
} from './handlers/wellKnown.js';
import { handleAuthorize } from './handlers/authorize.js';
import { handleCallback } from './handlers/callback.js';
import { handleToken } from './handlers/token.js';
import { handleClientRegistration } from './handlers/register.js';

/**
 * Handle OAuth-related requests
 * Returns Response if handled, null if not an OAuth request
 */
export async function handleOAuthRequest(
  req: Request,
  config: OAuthConfig
): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // OAuth discovery (RFC 8414)
  if (
    pathname === '/.well-known/oauth-authorization-server' &&
    req.method === 'GET'
  ) {
    return handleWellKnown(config);
  }

  // OAuth Protected Resource Metadata (RFC 9728)
  if (
    pathname === '/.well-known/oauth-protected-resource' &&
    req.method === 'GET'
  ) {
    return handleProtectedResource(config);
  }

  // OpenID Connect Discovery
  if (
    pathname === '/.well-known/openid-configuration' &&
    req.method === 'GET'
  ) {
    return handleOpenIdConfiguration(config);
  }

  // Authorization endpoint
  if (pathname === '/authorize' && req.method === 'GET') {
    return handleAuthorize(req, config);
  }

  // Callback from Google
  if (pathname === '/callback' && req.method === 'GET') {
    return handleCallback(req);
  }

  // Token endpoint
  if (pathname === '/token' && req.method === 'POST') {
    return handleToken(req, config);
  }

  // Dynamic Client Registration (RFC 7591)
  if (pathname === '/register' && req.method === 'POST') {
    return handleClientRegistration(req, config);
  }

  // Not an OAuth request
  return null;
}
