/**
 * OAuth Configuration
 */

import type { OAuthConfig } from './types.js';

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
