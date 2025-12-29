/**
 * OAuth Discovery Endpoints
 * - /.well-known/oauth-authorization-server (RFC 8414)
 * - /.well-known/oauth-protected-resource (RFC 9728)
 * - /.well-known/openid-configuration
 */

import type { OAuthConfig } from '../types.js';
import { jsonResponse } from '../helpers.js';

/**
 * GET /.well-known/oauth-authorization-server
 *
 * Returns OAuth server metadata (RFC 8414)
 * ChatGPT uses this to discover authorization and token endpoints
 */
export function handleWellKnown(config: OAuthConfig): Response {
  const metadata = {
    issuer: config.serverBaseUrl,
    authorization_endpoint: `${config.serverBaseUrl}/authorize`,
    token_endpoint: `${config.serverBaseUrl}/token`,
    registration_endpoint: `${config.serverBaseUrl}/register`, // DCR endpoint
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'], // ChatGPT requires S256
    token_endpoint_auth_methods_supported: [
      'client_secret_post',
      'client_secret_basic',
    ],
    scopes_supported: ['https://www.googleapis.com/auth/tasks'],
  };

  console.error('[OAuth] ════════════════════════════════════════');
  console.error('[OAuth] Well-known oauth-authorization-server requested');
  console.error('[OAuth] Returning:', JSON.stringify(metadata, null, 2));
  return jsonResponse(metadata);
}

/**
 * GET /.well-known/oauth-protected-resource
 *
 * OAuth Protected Resource Metadata (RFC 9728)
 * ChatGPT checks this to understand the resource server
 */
export function handleProtectedResource(config: OAuthConfig): Response {
  const metadata = {
    resource: config.serverBaseUrl,
    authorization_servers: [config.serverBaseUrl], // We are our own auth server
    scopes_supported: ['https://www.googleapis.com/auth/tasks'],
    resource_documentation: 'https://developers.google.com/tasks',
  };
  console.error('[OAuth] ════════════════════════════════════════');
  console.error('[OAuth] Protected resource metadata requested');
  console.error('[OAuth] Returning:', JSON.stringify(metadata, null, 2));
  return jsonResponse(metadata);
}

/**
 * GET /.well-known/openid-configuration
 *
 * OpenID Connect Discovery (some clients check this too)
 */
export function handleOpenIdConfiguration(config: OAuthConfig): Response {
  const metadata = {
    issuer: config.serverBaseUrl,
    authorization_endpoint: `${config.serverBaseUrl}/authorize`,
    token_endpoint: `${config.serverBaseUrl}/token`,
    registration_endpoint: `${config.serverBaseUrl}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['https://www.googleapis.com/auth/tasks'],
  };
  console.error('[OAuth] ════════════════════════════════════════');
  console.error('[OAuth] OpenID configuration requested');
  console.error('[OAuth] Returning:', JSON.stringify(metadata, null, 2));
  return jsonResponse(metadata);
}

