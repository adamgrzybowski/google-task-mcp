/**
 * OAuth Callback Endpoint
 */

import { generateRandomString } from '../helpers.js';
import { pendingAuthorizations, codeToAuthorization } from '../storage.js';

/**
 * GET /callback
 *
 * Handles callback from Google OAuth.
 * Receives authorization code from Google, generates our own code,
 * and redirects to ChatGPT's callback.
 *
 * Query params from Google:
 * - code: Google's authorization code
 * - state: The state we sent to Google (to find pending auth)
 */
export function handleCallback(req: Request): Response {
  const url = new URL(req.url);
  const params = url.searchParams;

  console.error('[OAuth] ════════════════════════════════════════');
  console.error('[OAuth] /callback from Google received');
  console.error('[OAuth] All query params:');
  for (const [key, value] of params.entries()) {
    if (key === 'code') {
      console.error(`[OAuth]   ${key}: ${value.substring(0, 20)}...`);
    } else {
      console.error(`[OAuth]   ${key}: ${value}`);
    }
  }

  const googleCode = params.get('code');
  const state = params.get('state');
  const error = params.get('error');

  // Handle errors from Google
  if (error) {
    console.error(`[OAuth] ✗ Google returned error: ${error}`);
    return new Response(`Authorization failed: ${error}`, { status: 400 });
  }

  if (!googleCode || !state) {
    console.error('[OAuth] ✗ Missing code or state from Google');
    return new Response('Missing code or state', { status: 400 });
  }

  // Find pending authorization
  const pendingAuth = pendingAuthorizations.get(state);
  if (!pendingAuth) {
    console.error(`[OAuth] ✗ No pending authorization for state: ${state}`);
    console.error(
      `[OAuth]   Available states: ${Array.from(pendingAuthorizations.keys()).join(', ') || 'none'}`
    );
    return new Response('Invalid or expired state', { status: 400 });
  }

  console.error(`[OAuth] ✓ Found pending auth for state: ${state}`);

  // Store Google code and generate our own code for ChatGPT
  const ourCode = generateRandomString(32);
  pendingAuth.googleCode = googleCode;
  pendingAuth.ourCode = ourCode;

  // Store mapping from our code to authorization
  codeToAuthorization.set(ourCode, pendingAuth);

  // Build redirect URL to ChatGPT
  const redirectUrl = new URL(pendingAuth.chatgptRedirectUri);
  redirectUrl.searchParams.set('code', ourCode);
  redirectUrl.searchParams.set('state', pendingAuth.chatgptState);

  console.error(`[OAuth] Redirecting to ChatGPT: ${redirectUrl.toString()}`);

  // Redirect to ChatGPT
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
    },
  });
}
