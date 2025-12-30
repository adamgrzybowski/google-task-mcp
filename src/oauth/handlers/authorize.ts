/**
 * OAuth Authorization Endpoint
 */

import { google } from 'googleapis';
import type { OAuthConfig, PendingAuthorization } from '../types.js';
import { jsonResponse } from '../helpers.js';
import { pendingAuthorizations } from '../storage.js';

/**
 * GET /authorize
 *
 * Handles authorization request from ChatGPT.
 * Redirects user to Google OAuth consent screen.
 *
 * Query params from ChatGPT:
 * - response_type: "code"
 * - client_id: ChatGPT's client ID (optional)
 * - redirect_uri: Where to redirect after auth (ChatGPT's callback)
 * - state: Random string for CSRF protection
 * - scope: Requested scopes
 * - code_challenge: PKCE challenge (optional)
 * - code_challenge_method: "S256" or "plain" (optional)
 */
export function handleAuthorize(req: Request, config: OAuthConfig): Response {
  const url = new URL(req.url);
  const params = url.searchParams;

  console.error('[OAuth] ════════════════════════════════════════');
  console.error('[OAuth] /authorize request received');
  console.error('[OAuth] All query params:');
  for (const [key, value] of params.entries()) {
    console.error(`[OAuth]   ${key}: ${value}`);
  }

  const redirectUri = params.get('redirect_uri');
  const state = params.get('state');
  const codeChallenge = params.get('code_challenge');
  const codeChallengeMethod = params.get('code_challenge_method');

  // Validate required params
  if (!redirectUri) {
    console.error('[OAuth] ✗ Missing redirect_uri');
    return jsonResponse({ error: 'missing_redirect_uri' }, 400);
  }
  if (!state) {
    console.error('[OAuth] ✗ Missing state');
    return jsonResponse({ error: 'missing_state' }, 400);
  }

  console.error(`[OAuth] ✓ Valid params - state: ${state}`);

  // Store pending authorization
  const pendingAuth: PendingAuthorization = {
    chatgptRedirectUri: redirectUri,
    chatgptState: state,
    codeChallenge: codeChallenge ?? undefined,
    codeChallengeMethod: codeChallengeMethod ?? undefined,
    createdAt: Date.now(),
  };
  pendingAuthorizations.set(state, pendingAuth);

  // Build Google OAuth URL
  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    `${config.serverBaseUrl}/callback` // Google redirects back to our /callback
  );

  const googleAuthUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh_token
    prompt: 'consent', // Force consent to always get refresh_token
    scope: ['https://www.googleapis.com/auth/tasks'],
    state: state, // Pass through state so we can find the pending auth
  });

  console.error(`[OAuth] Redirecting to Google: ${googleAuthUrl}`);

  // Redirect user to Google
  return new Response(null, {
    status: 302,
    headers: {
      Location: googleAuthUrl,
    },
  });
}
