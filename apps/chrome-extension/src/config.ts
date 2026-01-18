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
  // App URL - automatically injected by Parcel based on NODE_ENV
  // INFO: At dev time, using parcel watch the .env variables are not loaded, only at build time? apparently
  appUrl: process.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000",
} as const;
