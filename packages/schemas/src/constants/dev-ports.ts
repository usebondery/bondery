/**
 * Local dev ports — "Dial BOND" (B-O-N-D = 2-6-6-3 on a phone keypad).
 * Dev-only; production uses host `PORT` env and public domains.
 */

/** Bondery first-party HTTP dev servers (2663x block). */
export const DEV_PORTS = {
  /** Reserved: internal admin / one-off dev utilities */
  ADMIN: 26638,
  API: 26631,
  EMAIL_PREVIEW: 26639,
  EXTENSION: 26633,
  MOBILE: 26634,
  /** Local API Redis (`apps/redis`) */
  REDIS: 26636,
  /** Reserved: Storybook / component docs */
  STORYBOOK: 26635,
  /** Reserved: Swagger UI dev server */
  SWAGGER_UI: 26637,
  WEBAPP: 26632,
  WEBSITE: 26630,
} as const;

/** Supabase local stack (5432x — Postgres ecosystem convention). */
export const SUPABASE_PORTS = {
  ANALYTICS: 54327,
  /** Supabase Edge Functions inspector (not in 5432x decade). */
  EDGE_INSPECTOR: 8083,
  GATEWAY: 54321,
  INBUCKET: 54324,
  INBUCKET_POP3: 54326,
  INBUCKET_SMTP: 54325,
  POOLER: 54329,
  POSTGRES: 54322,
  SHADOW_DB: 54320,
  STUDIO: 54323,
} as const;

/** Local Redis URL when `npm run start -w redis` is running. */
export const DEV_REDIS_URL = `redis://127.0.0.1:${DEV_PORTS.REDIS}` as const;

export const DEV_URLS = {
  api: `http://localhost:${DEV_PORTS.API}`,
  emailPreview: `http://localhost:${DEV_PORTS.EMAIL_PREVIEW}`,
  extension: `http://localhost:${DEV_PORTS.EXTENSION}`,
  inbucket: `http://127.0.0.1:${SUPABASE_PORTS.INBUCKET}`,
  mobile: `http://localhost:${DEV_PORTS.MOBILE}`,
  redis: DEV_REDIS_URL,
  supabase: `http://127.0.0.1:${SUPABASE_PORTS.GATEWAY}`,
  supabaseStudio: `http://127.0.0.1:${SUPABASE_PORTS.STUDIO}`,
  webapp: `http://localhost:${DEV_PORTS.WEBAPP}`,
  website: `http://localhost:${DEV_PORTS.WEBSITE}`,
} as const;

export const DEV_SYNC_WS_URL = `ws://localhost:${DEV_PORTS.API}/api/sync/ws`;
