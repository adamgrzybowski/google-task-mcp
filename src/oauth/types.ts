/**
 * OAuth 2.0 Types and Interfaces
 */

export interface PendingAuthorization {
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

export interface RegisteredClient {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  client_name?: string;
  created_at: number;
}
