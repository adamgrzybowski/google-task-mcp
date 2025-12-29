/**
 * Dynamic Client Registration Endpoint (RFC 7591)
 */

import type { OAuthConfig, RegisteredClient } from '../types.js';
import { jsonResponse, generateRandomString } from '../helpers.js';
import { registeredClients } from '../storage.js';

/**
 * POST /register
 *
 * Dynamic Client Registration (RFC 7591)
 * ChatGPT registers itself as an OAuth client before starting the auth flow.
 */
export async function handleClientRegistration(
  req: Request,
  _config: OAuthConfig
): Promise<Response> {
  console.error('[OAuth] ════════════════════════════════════════');
  console.error('[OAuth] /register - Dynamic Client Registration');

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(
      { error: 'invalid_request', error_description: 'Invalid JSON body' },
      400
    );
  }

  console.error('[OAuth] Registration request:', JSON.stringify(body, null, 2));

  const redirectUris = body.redirect_uris as string[] | undefined;
  const clientName = body.client_name as string | undefined;

  if (
    !redirectUris ||
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0
  ) {
    console.error('[OAuth] ✗ Missing redirect_uris');
    return jsonResponse(
      { error: 'invalid_request', error_description: 'redirect_uris required' },
      400
    );
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

  return jsonResponse(
    {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // Never expires
      redirect_uris: redirectUris,
      client_name: clientName,
      token_endpoint_auth_method: 'client_secret_post',
    },
    201
  );
}

