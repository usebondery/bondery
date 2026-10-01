/**
 * Server-only website config. Import from Server Components, route handlers, and
 * metadata — not from `"use client"` modules. Pass values into clients as props.
 */

function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Public API origin (`BONDERY_PUBLIC_API_URL`). No trailing slash. */
export const API_URL = requireValue(
  "BONDERY_PUBLIC_API_URL",
  process.env.BONDERY_PUBLIC_API_URL,
).replace(/\/+$/, "");

/** Public web app origin (`BONDERY_PUBLIC_WEBAPP_URL`). */
export const WEBAPP_URL = requireValue(
  "BONDERY_PUBLIC_WEBAPP_URL",
  process.env.BONDERY_PUBLIC_WEBAPP_URL,
);

/** Public marketing site origin (`BONDERY_PUBLIC_WEBSITE_URL`). */
export const WEBSITE_URL = requireValue(
  "BONDERY_PUBLIC_WEBSITE_URL",
  process.env.BONDERY_PUBLIC_WEBSITE_URL,
);

/** Read the marketing origin at call time (metadata routes that await `connection()`). */
export function getWebsiteUrl(): string {
  const name = "BONDERY_PUBLIC_WEBSITE_URL";
  return requireValue(name, process.env[name]);
}
