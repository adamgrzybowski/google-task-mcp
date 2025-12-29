/**
 * In-memory storage for OAuth state
 * For production use Redis or database
 */

import type { PendingAuthorization, RegisteredClient } from './types.js';

// Map: state -> PendingAuthorization
export const pendingAuthorizations = new Map<string, PendingAuthorization>();

// Map: ourCode -> PendingAuthorization (for /token lookup)
export const codeToAuthorization = new Map<string, PendingAuthorization>();

// Map: client_id -> client metadata (for Dynamic Client Registration)
export const registeredClients = new Map<string, RegisteredClient>();

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
