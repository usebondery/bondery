/**
 * Chrome Extension Configuration
 *
 * Environment variables are loaded by WXT/Vite from:
 * - .env
 * - .env.local
 * - .env.[mode]
 * - .env.[mode].local
 *
 * Note: Environment variables must be prefixed with WXT_ or VITE_
 * to be available at runtime.
 */

export const config = {
  /** Webapp base URL (used for app navigation and redirects) */
  appUrl: import.meta.env.WXT_WEBAPP_URL || "http://localhost:3000",

  /** API base URL (defaults to appUrl when API is hosted on the same origin) */
  apiUrl: import.meta.env.WXT_API_URL || import.meta.env.WXT_WEBAPP_URL || "http://localhost:3000",

  /** Supabase project URL (for OAuth token endpoints) */
  supabaseUrl: import.meta.env.WXT_SUPABASE_URL || "http://127.0.0.1:54321",

  /** OAuth 2.1 client ID registered in Supabase Dashboard */
  oauthClientId: import.meta.env.WXT_OAUTH_CLIENT_ID || "",
} as const;
