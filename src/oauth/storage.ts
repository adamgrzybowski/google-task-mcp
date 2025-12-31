/**
 * OAuth state storage
 *
 * - Pending authorizations & codes: in-memory (short-lived, OK to lose on restart)
 * - Token data: persisted to JSON file (survives restarts)
 */

import type {
  PendingAuthorization,
  RegisteredClient,
  StoredTokenData,
} from './types.js';

// ============================================================================
// Configuration
// ============================================================================

const TOKEN_STORAGE_PATH = process.env.TOKEN_STORAGE_PATH || '.tokens.json';

// ============================================================================
// In-memory storage (short-lived, OK to lose on restart)
// ============================================================================

// Map: state -> PendingAuthorization
export const pendingAuthorizations = new Map<string, PendingAuthorization>();

// Map: ourCode -> PendingAuthorization (for /token lookup)
export const codeToAuthorization = new Map<string, PendingAuthorization>();

// Map: client_id -> client metadata (for Dynamic Client Registration)
export const registeredClients = new Map<string, RegisteredClient>();

// ============================================================================
// Persistent token storage (JSON file)
// ============================================================================

// Map: access_token -> StoredTokenData (for server-side token refresh)
// This allows the server to refresh tokens transparently when they expire
export const tokenStore = new Map<string, StoredTokenData>();

/**
 * Load token store from JSON file
 */
async function loadTokenStore(): Promise<void> {
  try {
    const file = Bun.file(TOKEN_STORAGE_PATH);
    if (await file.exists()) {
      const data = (await file.json()) as Record<string, StoredTokenData>;
      const now = Date.now();
      let loaded = 0;
      let expired = 0;

      for (const [key, value] of Object.entries(data)) {
        // Skip expired tokens (older than 30 days)
        if (now - value.createdAt > TOKEN_DATA_TTL_MS) {
          expired++;
          continue;
        }
        tokenStore.set(key, value);
        loaded++;
      }

      console.error(
        `[TokenStore] Loaded ${loaded} tokens from ${TOKEN_STORAGE_PATH}` +
          (expired > 0 ? ` (${expired} expired, skipped)` : '')
      );
    } else {
      console.error(
        `[TokenStore] No existing token file at ${TOKEN_STORAGE_PATH}`
      );
    }
  } catch (error) {
    console.error(`[TokenStore] Failed to load tokens:`, error);
  }
}

/**
 * Save token store to JSON file
 */
async function saveTokenStore(): Promise<void> {
  try {
    const data: Record<string, StoredTokenData> = {};
    for (const [key, value] of tokenStore) {
      data[key] = value;
    }
    await Bun.write(TOKEN_STORAGE_PATH, JSON.stringify(data, null, 2));
    console.error(
      `[TokenStore] Saved ${tokenStore.size} tokens to ${TOKEN_STORAGE_PATH}`
    );
  } catch (error) {
    console.error(`[TokenStore] Failed to save tokens:`, error);
  }
}

// Load tokens on module initialization
await loadTokenStore();

// ============================================================================
// Cleanup intervals
// ============================================================================

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
  // Cleanup old token data (and save if any were removed)
  let removed = 0;
  for (const [key, data] of tokenStore) {
    if (now - data.createdAt > TOKEN_DATA_TTL_MS) {
      tokenStore.delete(key);
      removed++;
    }
  }
  if (removed > 0) {
    saveTokenStore();
  }
}, 60 * 1000); // Check every minute

// ============================================================================
// Token store API
// ============================================================================

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
  // Persist to file
  saveTokenStore();
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
    // Persist to file
    saveTokenStore();
  }
}
