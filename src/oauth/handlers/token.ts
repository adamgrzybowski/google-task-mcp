/**
 * OAuth Token Endpoint
 */

import { google } from 'googleapis';
import type { OAuthConfig } from '../types.js';
import { jsonResponse } from '../helpers.js';
import { codeToAuthorization, pendingAuthorizations } from '../storage.js';

/**
 * POST /token
 *
 * Handles token exchange request from ChatGPT.
 * Exchanges our code for Google tokens and returns them.
 *
 * Body params:
 * - grant_type: "authorization_code" or "refresh_token"
 * - code: Our authorization code (for authorization_code grant)
 * - refresh_token: Refresh token (for refresh_token grant)
 * - redirect_uri: Must match the original redirect_uri
 * - code_verifier: PKCE verifier (if code_challenge was used)
 * - client_id: ChatGPT's client ID (optional)
 * - client_secret: ChatGPT's client secret (optional)
 */
export async function handleToken(
  req: Request,
  config: OAuthConfig
): Promise<Response> {
  // Parse body (supports both form-urlencoded and JSON)
  let body: Record<string, string> = {};

  const contentType = req.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = (await req.json()) as Record<string, string>;
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    for (const [key, value] of params) {
      body[key] = value;
    }
  }

  const grantType = body.grant_type;

  console.error('[OAuth] ════════════════════════════════════════');
  console.error('[OAuth] /token request received');
  console.error(`[OAuth] grant_type: ${grantType}`);
  console.error('[OAuth] Body params:');
  for (const [key, value] of Object.entries(body)) {
    if (key === 'code' || key === 'refresh_token' || key === 'client_secret') {
      console.error(`[OAuth]   ${key}: ${String(value).substring(0, 20)}...`);
    } else {
      console.error(`[OAuth]   ${key}: ${value}`);
    }
  }

  // Handle different grant types
  if (grantType === 'authorization_code') {
    return handleAuthorizationCodeGrant(body, config);
  } else if (grantType === 'refresh_token') {
    return handleRefreshTokenGrant(body, config);
  } else {
    return jsonResponse({ error: 'unsupported_grant_type' }, 400);
  }
}

async function handleAuthorizationCodeGrant(
  body: Record<string, string>,
  config: OAuthConfig
): Promise<Response> {
  const code = body.code;

  if (!code) {
    return jsonResponse({ error: 'missing_code' }, 400);
  }

  // Find authorization by our code
  const pendingAuth = codeToAuthorization.get(code);
  if (!pendingAuth || !pendingAuth.googleCode) {
    console.error(`[OAuth] Invalid or expired code: ${code}`);
    return jsonResponse({ error: 'invalid_grant' }, 400);
  }

  // TODO: Verify PKCE code_verifier if code_challenge was used
  // (Skipped for simplicity, but should be implemented for production)

  // Exchange Google code for tokens
  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    `${config.serverBaseUrl}/callback`
  );

  try {
    console.error('[OAuth] Exchanging Google code for tokens...');
    const { tokens } = await oauth2Client.getToken(pendingAuth.googleCode);

    console.error('[OAuth] ✓ Successfully exchanged code for tokens');
    console.error(
      `[OAuth]   access_token: ${tokens.access_token?.substring(0, 20)}...`
    );
    console.error(
      `[OAuth]   refresh_token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'none'}`
    );
    console.error(
      `[OAuth]   expires_in: ${tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600}s`
    );

    // Clean up
    codeToAuthorization.delete(code);
    pendingAuthorizations.delete(pendingAuth.chatgptState);

    // Return tokens to ChatGPT
    return jsonResponse({
      access_token: tokens.access_token,
      token_type: 'Bearer',
      expires_in: tokens.expiry_date
        ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
        : 3600,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
    });
  } catch (error) {
    console.error('[OAuth] ✗ Failed to exchange code:', error);
    return jsonResponse(
      {
        error: 'invalid_grant',
        error_description:
          error instanceof Error ? error.message : 'Failed to exchange code',
      },
      400
    );
  }
}

async function handleRefreshTokenGrant(
  body: Record<string, string>,
  config: OAuthConfig
): Promise<Response> {
  const refreshToken = body.refresh_token;

  if (!refreshToken) {
    return jsonResponse({ error: 'missing_refresh_token' }, 400);
  }

  // Use Google to refresh the token
  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    console.error('[OAuth] Successfully refreshed token');

    return jsonResponse({
      access_token: credentials.access_token,
      token_type: 'Bearer',
      expires_in: credentials.expiry_date
        ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
        : 3600,
      // Note: Google doesn't always return a new refresh_token
      ...(credentials.refresh_token && {
        refresh_token: credentials.refresh_token,
      }),
    });
  } catch (error) {
    console.error('[OAuth] Failed to refresh token:', error);
    return jsonResponse(
      {
        error: 'invalid_grant',
        error_description:
          error instanceof Error ? error.message : 'Failed to refresh token',
      },
      400
    );
  }
}
