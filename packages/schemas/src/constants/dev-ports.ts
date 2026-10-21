/**
 * Local dev ports — "Dial BOND" (B-O-N-D = 2-6-6-3 on a phone keypad).
 * Dev-only; production uses host `PORT` env and public domains.
 */

/** Default bundled local Postgres password (matches `EXAMPLE_POSTGRES_PASSWORD` in env manifest). */
export const DEV_POSTGRES_PASSWORD = "your-super-secret-and-long-postgres-password" as const;

/** Bondery first-party HTTP dev servers (2663x block). */
export const DEV_PORTS = {
  /** Reserved: internal admin / one-off dev utilities */
  ADMIN: 26638,
  API: 26631,
  EMAIL_PREVIEW: 26639,
  EXTENSION: 26633,
  /** Local Mailpit SMTP (`deploy/bondery/docker-compose.dev-mail.yml`) */
  MAILPIT_SMTP: 26640,
  /** Local Mailpit UI and HTTP API */
  MAILPIT_UI: 26641,
  MOBILE: 26634,
  /** Local dev Postgres (`deploy/bondery/docker-compose.dev-db.yml`) */
  POSTGRES: 54322,
  /** Local API Redis (`deploy/bondery/docker-compose.dev-redis.yml`) */
  REDIS: 26636,
  /** Reserved: Storybook / component docs */
  STORYBOOK: 26635,
  /** Reserved: Swagger UI dev server */
  SWAGGER_UI: 26637,
  WEBAPP: 26632,
  WEBSITE: 26630,
} as const;

/** Local Redis URL when `pnpm run start:redis` is running. */
export const DEV_REDIS_URL = `redis://127.0.0.1:${DEV_PORTS.REDIS}` as const;

/** Local public origins for the Portless HTTPS web stack (website / webapp / api). */
export const DEV_URLS = {
  api: "https://api.usebondery.test",
  emailPreview: `http://localhost:${DEV_PORTS.EMAIL_PREVIEW}`,
  extension: `http://localhost:${DEV_PORTS.EXTENSION}`,
  mailpitUi: "https://mail.usebondery.test",
  mobile: `http://localhost:${DEV_PORTS.MOBILE}`,
  postgres: `postgresql://postgres:${encodeURIComponent(DEV_POSTGRES_PASSWORD)}@127.0.0.1:${DEV_PORTS.POSTGRES}/bondery`,
  redis: DEV_REDIS_URL,
  webapp: "https://app.usebondery.test",
  website: "https://usebondery.test",
} as const;

export const DEV_SYNC_WS_URL = "wss://api.usebondery.test/api/sync/ws";
