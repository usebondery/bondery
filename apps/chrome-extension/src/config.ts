/**
 * Chrome Extension Configuration
 *
 * Environment variables are automatically loaded by Parcel from:
 * - .env
 * - .env.local
 * - .env.[NODE_ENV]
 * - .env.[NODE_ENV].local
 */

export const config = {
  /** Webapp base URL (used for API calls and redirects) */
  appUrl: process.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000",

  /** Supabase project URL (for OAuth token endpoints) */
  supabaseUrl: process.env.PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",

  /** OAuth 2.1 client ID registered in Supabase Dashboard */
  oauthClientId: process.env.PRIVATE_SUPABASE_OAUTH_CLIENT_ID || "",
} as const;
