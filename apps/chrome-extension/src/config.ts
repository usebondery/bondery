/**
 * Chrome Extension Configuration
 *
 * Environment variables are loaded by WXT (via Vite) from:
 * - .env
 * - .env.local
 * - .env.[mode]
 * - .env.[mode].local
 */

export const config = {
  /** Webapp base URL (used for API calls and redirects) */
  appUrl: import.meta.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000",

  /** Supabase project URL (for OAuth token endpoints) */
  supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",

  /** OAuth 2.1 client ID registered in Supabase Dashboard */
  oauthClientId: import.meta.env.PRIVATE_SUPABASE_OAUTH_CLIENT_ID || "",
} as const;
