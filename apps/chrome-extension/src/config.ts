/**
 * Chrome Extension Configuration
 *
 * Environment variables are loaded by WXT/Vite from:
 * - .env
 * - .env.local
 * - .env.[mode]
 * - .env.[mode].local
 *
 * Product vars use BONDERY_PUBLIC_* (see vite.envPrefix in wxt.config.ts).
 * Framework vars like WXT_DEBUG remain on the WXT_ prefix.
 */

export const config = {
  /** API base URL */
  apiUrl: import.meta.env.BONDERY_PUBLIC_API_URL,
  /** Webapp base URL (used for app navigation and redirects) */
  appUrl: import.meta.env.BONDERY_PUBLIC_WEBAPP_URL,

  /** OAuth 2.1 client ID registered in Supabase Dashboard */
  oauthClientId: import.meta.env.BONDERY_PUBLIC_SUPABASE_OAUTH_CLIENT_ID,

  /** Supabase project URL (for OAuth token endpoints) */
  supabaseUrl: import.meta.env.BONDERY_PUBLIC_SUPABASE_URL,
} as const;
