/**
 * Application configuration constants for website
 */

function requirePublicEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Web app URL
 * Uses environment variable
 *
 */
export const WEBAPP_URL = requirePublicEnv("NEXT_PUBLIC_WEBAPP_URL");

/**
 * Website URL
 * Uses environment variable
 * */
export const WEBSITE_URL = requirePublicEnv("NEXT_PUBLIC_WEBSITE_URL");
