/**
 * In-memory storage for OAuth state
 * For production use Redis or database
 */

import type {
  PendingAuthorization,
  RegisteredClient,
  StoredTokenData,
} from './types.js';

// Map: state -> PendingAuthorization
export const pendingAuthorizations = new Map<string, PendingAuthorization>();

// Map: ourCode -> PendingAuthorization (for /token lookup)
export const codeToAuthorization = new Map<string, PendingAuthorization>();

// Map: client_id -> client metadata (for Dynamic Client Registration)
export const registeredClients = new Map<string, RegisteredClient>();

// Map: access_token -> StoredTokenData (for server-side token refresh)
// This allows the server to refresh tokens transparently when they expire
export const tokenStore = new Map<string, StoredTokenData>();

// Cleanup old authorizations every 10 minutes
const AUTHORIZATION_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Token data TTL: 30 days (refresh tokens are long-lived)
const TOKEN_DATA_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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
  // Cleanup old token data
  for (const [key, data] of tokenStore) {
    if (now - data.createdAt > TOKEN_DATA_TTL_MS) {
      tokenStore.delete(key);
    }
  }
}, 60 * 1000); // Check every minute

/**
 * Store token data for later refresh
 */
export function storeTokenData(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number
): void {
  const data: StoredTokenData = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    createdAt: Date.now(),
  };
  tokenStore.set(accessToken, data);
  console.error(
    `[TokenStore] Stored token data, expires in ${expiresInSeconds}s, total tokens: ${tokenStore.size}`
  );
}

/**
 * Get stored token data by access token
 */
export function getTokenData(accessToken: string): StoredTokenData | undefined {
  return tokenStore.get(accessToken);
}

/**
 * Update access token after refresh (migrate data to new key)
 */
export function updateAccessToken(
  oldAccessToken: string,
  newAccessToken: string,
  expiresInSeconds: number
): void {
  const data = tokenStore.get(oldAccessToken);
  if (data) {
    tokenStore.delete(oldAccessToken);
    data.accessToken = newAccessToken;
    data.expiresAt = Date.now() + expiresInSeconds * 1000;
    tokenStore.set(newAccessToken, data);
    console.error(
      `[TokenStore] Updated access token, new expiry in ${expiresInSeconds}s`
    );
  }
}
