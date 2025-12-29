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

import { google } from 'googleapis';

// ============================================================================
// Types
// ============================================================================

interface PendingAuthorization {
  // From ChatGPT's /authorize request
  chatgptRedirectUri: string;
  chatgptState: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;

  // From Google's /callback response
  googleCode?: string;

  // Our generated code for ChatGPT
  ourCode?: string;

  // Timestamps
  createdAt: number;
}

export interface OAuthConfig {
  googleClientId: string;
  googleClientSecret: string;
  serverBaseUrl: string; // e.g., "https://srv51-20187.wykr.es"
}

// ============================================================================
// Storage (in-memory - for production use Redis or database)
// ============================================================================

// Map: state -> PendingAuthorization
const pendingAuthorizations = new Map<string, PendingAuthorization>();

// Map: ourCode -> PendingAuthorization (for /token lookup)
const codeToAuthorization = new Map<string, PendingAuthorization>();

// Map: client_id -> client metadata (for Dynamic Client Registration)
interface RegisteredClient {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  client_name?: string;
  created_at: number;
}
const registeredClients = new Map<string, RegisteredClient>();

// Cleanup old authorizations every 10 minutes
const AUTHORIZATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
  const now = Date.now();
  for (const [key, auth] of pendingAuthorizations) {
    if (now - auth.createdAt > AUTHORIZATION_TTL_MS) {
      pendingAuthorizations.delete(key);
    }
  }
  for (const [key, auth] of codeToAuthorization) {
    if (now - auth.createdAt > AUTHORIZATION_TTL_MS) {
      codeToAuthorization.delete(key);
    }
  }
}, 60 * 1000); // Check every minute

// ============================================================================
// Helper Functions
// ============================================================================

function generateRandomString(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

function jsonResponse(data: object, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

// ============================================================================
// OAuth Handlers
// ============================================================================

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
    console.error(`[OAuth]   Available states: ${Array.from(pendingAuthorizations.keys()).join(', ') || 'none'}`);
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
    console.error(`[OAuth]   access_token: ${tokens.access_token?.substring(0, 20)}...`);
    console.error(`[OAuth]   refresh_token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'none'}`);
    console.error(`[OAuth]   expires_in: ${tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600}s`);

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

// ============================================================================
// Main Router
// ============================================================================

export function createOAuthConfig(): OAuthConfig {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const serverBaseUrl = process.env.OAUTH_SERVER_URL;

  if (!googleClientId || !googleClientSecret) {
    throw new Error(
      'Missing required environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET'
    );
  }

  if (!serverBaseUrl) {
    throw new Error(
      'Missing required environment variable: OAUTH_SERVER_URL (e.g., https://srv51-20187.wykr.es)'
    );
  }

  return {
    googleClientId,
    googleClientSecret,
    serverBaseUrl,
  };
}

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
  // ChatGPT checks this to understand the resource server
  if (
    pathname === '/.well-known/oauth-protected-resource' &&
    req.method === 'GET'
  ) {
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

  // OpenID Connect Discovery (some clients check this too)
  if (
    pathname === '/.well-known/openid-configuration' &&
    req.method === 'GET'
  ) {
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

/**
 * POST /register
 *
 * Dynamic Client Registration (RFC 7591)
 * ChatGPT registers itself as an OAuth client before starting the auth flow.
 */
async function handleClientRegistration(
  req: Request,
  config: OAuthConfig
): Promise<Response> {
  console.error('[OAuth] ════════════════════════════════════════');
  console.error('[OAuth] /register - Dynamic Client Registration');

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'invalid_request', error_description: 'Invalid JSON body' }, 400);
  }

  console.error('[OAuth] Registration request:', JSON.stringify(body, null, 2));

  const redirectUris = body.redirect_uris as string[] | undefined;
  const clientName = body.client_name as string | undefined;

  if (!redirectUris || !Array.isArray(redirectUris) || redirectUris.length === 0) {
    console.error('[OAuth] ✗ Missing redirect_uris');
    return jsonResponse({ error: 'invalid_request', error_description: 'redirect_uris required' }, 400);
  }

  // Generate client credentials
  const clientId = `chatgpt_${generateRandomString(16)}`;
  const clientSecret = generateRandomString(32);

  const client: RegisteredClient = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: redirectUris,
    client_name: clientName,
    created_at: Date.now(),
  };

  registeredClients.set(clientId, client);

  console.error(`[OAuth] ✓ Registered client: ${clientId}`);
  console.error(`[OAuth]   redirect_uris: ${redirectUris.join(', ')}`);

  return jsonResponse({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0, // Never expires
    redirect_uris: redirectUris,
    client_name: clientName,
    token_endpoint_auth_method: 'client_secret_post',
  }, 201);
}
