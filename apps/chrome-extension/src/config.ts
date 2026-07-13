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
  /** API base URL */
  apiUrl: import.meta.env.WXT_API_URL,
  /** Webapp base URL (used for app navigation and redirects) */
  appUrl: import.meta.env.WXT_WEBAPP_URL,

  /** OAuth 2.1 client ID registered in Supabase Dashboard */
  oauthClientId: import.meta.env.WXT_SUPABASE_OAUTH_CLIENT_ID,

  /** Supabase project URL (for OAuth token endpoints) */
  supabaseUrl: import.meta.env.WXT_SUPABASE_URL,
} as const;
