/**
 * Chrome Extension Configuration
 *
 * Environment variables are automatically loaded by WXT (via Vite) from:
 * - .env
 * - .env.local
 * - .env.[mode]
 * - .env.[mode].local
 */

export const config = {
  // App URL - automatically injected by WXT based on build mode
  appUrl: import.meta.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000",
} as const;
