/**
 * Application configuration constants for website
 */

function requireValue(name: string, value: string | undefined): string {
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
// Static process.env.* access — Next.js only inlines NEXT_PUBLIC_* for the client this way.
export const WEBAPP_URL = requireValue(
  "NEXT_PUBLIC_WEBAPP_URL",
  process.env.NEXT_PUBLIC_WEBAPP_URL,
);

/**
 * Website URL
 * Uses environment variable
 * */
export const WEBSITE_URL = requireValue(
  "NEXT_PUBLIC_WEBSITE_URL",
  process.env.NEXT_PUBLIC_WEBSITE_URL,
);
