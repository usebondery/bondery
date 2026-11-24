import "server-only";

import { getApiUrl, getWebappUrl, getWebsiteUrl, requireEnv } from "@/lib/env";

/**
 * Server-only website config. Import from Server Components, route handlers, and
 * metadata — not from `"use client"` modules. Pass values into clients as props.
 *
 * The env reads live in `lib/env.ts`; this module turns the required values into
 * constants for page metadata. Use `getWebsiteUrl()` from `lib/env.ts` in
 * `robots.ts` and `sitemap.ts`, which await `connection()`.
 */

const TRAILING_SLASHES = /\/+$/;

/** Public API origin (`BONDERY_PUBLIC_API_URL`). No trailing slash. */
export const API_URL = requireEnv("BONDERY_PUBLIC_API_URL", getApiUrl()).replace(
  TRAILING_SLASHES,
  "",
);

/** Public web app origin (`BONDERY_PUBLIC_WEBAPP_URL`). */
export const WEBAPP_URL = requireEnv("BONDERY_PUBLIC_WEBAPP_URL", getWebappUrl());

/** Public marketing site origin (`BONDERY_PUBLIC_WEBSITE_URL`). */
export const WEBSITE_URL = requireEnv("BONDERY_PUBLIC_WEBSITE_URL", getWebsiteUrl());
