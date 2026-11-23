/**
 * Local dev ports — "Dial BOND" (B-O-N-D = 2-6-6-3 on a phone keypad).
 * Dev-only; production uses host `PORT` env and public domains.
 */

/** Default bundled local Postgres password (matches `EXAMPLE_POSTGRES_PASSWORD` in env manifest). */
export const DEV_POSTGRES_PASSWORD = "your-super-secret-and-long-postgres-password" as const;

/** Bondery first-party HTTP dev servers (2663x block). */
export const DEV_PORTS = {
  /** Reserved: internal admin / one-off dev utilities */
  ADMIN: 26_638,
  /** The API's only listener, HTTPS (Portless, the webapp's server side, `tailscale serve`) */
  API: 26_631,
  EMAIL_PREVIEW: 26_639,
  EXTENSION: 26_633,
  /** Local Mailpit SMTP (`deploy/bondery/docker-compose.dev-mail.yml`) */
  MAILPIT_SMTP: 26_640,
  /** Local Mailpit UI and HTTP API */
  MAILPIT_UI: 26_641,
  MOBILE: 26_634,
  /** Local dev Postgres (`deploy/bondery/docker-compose.dev-db.yml`) */
  POSTGRES: 54_322,
  /** Local API Redis (`deploy/bondery/docker-compose.dev-redis.yml`) */
  REDIS: 26_636,
  /** Reserved: Storybook / component docs */
  STORYBOOK: 26_635,
  /** Reserved: Swagger UI dev server */
  SWAGGER_UI: 26_637,
  WEBAPP: 26_632,
  WEBSITE: 26_630,
} as const;

/**
 * Local Redis URL when `pnpm run start:redis` is running. TLS only, like every Redis (see the
 * bondery-security skill). The API also needs BONDERY_PRIVATE_REDIS_PASSWORD_FILE,
 * BONDERY_PRIVATE_REDIS_TLS_CA_FILE, BONDERY_PRIVATE_REDIS_TLS_CERT_FILE, and
 * BONDERY_PRIVATE_REDIS_TLS_KEY_FILE.
 */
export const DEV_REDIS_URL = `rediss://127.0.0.1:${DEV_PORTS.REDIS}` as const;

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

export const DEV_SYNC_WS_URL = "wss://api.usebondery.test/sync/ws";
