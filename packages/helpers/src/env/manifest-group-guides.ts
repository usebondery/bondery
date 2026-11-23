/** Comments rendered under group headers in generated `.env.example` files. */

/** Optional multi-line comments rendered under a group header in generated `*.example` files. */
export const ENV_GROUP_GUIDES: Readonly<Record<string, readonly string[]>> = {
  "API secrets": ["Generate:", "  openssl rand -hex 32   # BONDERY_PRIVATE_SERVICE_SECRET"],
  Auth: [
    "Local secrets you invent (not issued by GitHub/LinkedIn):",
    "  openssl rand -hex 32   # BONDERY_PRIVATE_BETTER_AUTH_SECRETS → set as 1:<output>",
    "  openssl rand -hex 16   # BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID",
    "  openssl rand -hex 32   # BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET",
    "  openssl rand -hex 16   # BONDERY_PUBLIC_OAUTH_CLIENT_ID (chrome extension)",
    "  openssl rand -hex 32   # BONDERY_PRIVATE_WEBAPP_SESSION_SECRET",
    "",
    "GitHub / LinkedIn OAuth apps: callback URL must be on the API host (not the webapp):",
    "  <BONDERY_PUBLIC_API_URL>/auth/callback/github  (or /linkedin)",
    "  Local Portless: https://api.usebondery.test/auth/callback/github",
    "  Then run: pnpm run provision:oauth-clients",
  ],
  Database: [
    "Generate a Postgres password:",
    "  openssl rand -base64 24 | tr -d '/+=' | head -c 32   # BONDERY_PRIVATE_POSTGRES_PASSWORD",
    "pnpm run env derives DATABASE_URL for api/db from this password.",
    "Postgres is TLS-only: pnpm run start:postgres creates the CA in .temp/postgres-secrets; DATABASE_SSL_* point clients at it.",
  ],
  Mobile: [
    "Web local issuer is Portless HTTPS (*.usebondery.test).",
    "Device/emulator may still use loopback raw ports below.",
  ],
  "Public URLs": [
    "Local web stack uses Portless HTTPS (website/webapp/api).",
    "Webapp SSR calls the API's HTTPS listener: BONDERY_INFRA_INTERNAL_API_URL=https://127.0.0.1:26631 with BONDERY_INFRA_INTERNAL_API_CA_FILE (pnpm run api:secrets creates the CA; the browser still uses the public API URL).",
  ],
  Storage: [
    "Local dev: bundled SeaweedFS defaults below are fine.",
    "Production secret key: openssl rand -hex 32   # BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY",
  ],
};

/** Multi-line comments under deploy group headers in `deploy/bondery/.env.example`. */
export const DEPLOY_GROUP_GUIDES: Readonly<Record<string, readonly string[]>> = {
  "Better Auth": [
    "Generate local secrets (not issued by GitHub/LinkedIn):",
    "  openssl rand -hex 32   # BONDERY_PRIVATE_BETTER_AUTH_SECRETS → set as 1:<output>",
    "  openssl rand -hex 32   # BONDERY_PRIVATE_SERVICE_SECRET",
    "",
    "GitHub / LinkedIn OAuth apps: callback URL on the API host (not the webapp):",
    "  https://<BONDERY_INFRA_API_DOMAIN>/auth/callback/github  (or /linkedin)",
    "OAuth clients are provisioned automatically on api pre_start (release-migrate).",
    "",
    "Native passkeys (optional): BONDERY_PUBLIC_ANDROID_SHA256_CERT_FINGERPRINTS on the API",
    "adds android:apk-key-hash WebAuthn origins. Leave empty to skip Android passkey origins.",
  ],
  "Chrome extension OAuth": ["Generate: openssl rand -hex 16   # BONDERY_PUBLIC_OAUTH_CLIENT_ID"],
  Email: ["SMTP settings (env_file → api only)."],
  "Image pin": [
    "Omit BONDERY_INFRA_VERSION on production to pull :production, or pin X.Y.Z. Staging may pin a named RC or :beta (RC cuts only). RC is not a self-host channel.",
    "BONDERY_INFRA_TRAEFIK_PREFIX defaults to bondery. Infisical staging: bondery-beta. Infisical production: bondery or omit.",
    "BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR: leave empty on Dokploy. Another Traefik: the host folder its file provider watches (Coolify: /data/coolify/proxy/dynamic).",
  ],
  "Image tags": [
    "Omit to pull the floating production channel. Pin to semver for reproducible deploys / rollback.",
  ],
  Postgres: [
    "Generate:",
    "  openssl rand -base64 24 | tr -d '/+=' | head -c 32   # BONDERY_PRIVATE_POSTGRES_PASSWORD",
    "Compose builds DATABASE_URL from this password — do not set DATABASE_URL in .env.",
    "Compose publishes Postgres on 127.0.0.1 only (SSH tunnels). Default host port 5432; a second stack on the same VPS must set BONDERY_INFRA_POSTGRES_HOST_PORT (beta: 5433).",
    "Postgres is TLS-only; the stack-secrets job creates its CA. Tunnelled tools need sslmode=verify-full and the CA (deploy/bondery/scripts/postgres-ca.sh).",
  ],
  "Public hostnames": [
    "Traefik Host() rules use these; Compose derives https://… URLs for the apps (no scheme here).",
  ],
  Redis: ["Bundled Redis (default). Advanced: run API alone with a managed Redis URL."],
  Storage: [
    "S3 credentials are rendered into SeaweedFS at container start (see deploy/bondery/seaweedfs/entrypoint.sh).",
    "Production secret key: openssl rand -hex 32   # BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY",
    "The API reaches SeaweedFS over HTTPS; the stack-secrets job creates its CA and Compose sets the endpoint.",
  ],
  Stripe: ["Stripe live-mode placeholders — replace with Dashboard values."],
  "Webapp OAuth": [
    "Generate:",
    "  openssl rand -hex 16   # BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID",
    "  openssl rand -hex 32   # BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET",
    "  openssl rand -hex 32   # BONDERY_PRIVATE_WEBAPP_SESSION_SECRET",
    "Passed to the webapp container via compose environment (BFF OAuth session).",
  ],
};

/** Multi-line comments under ops group headers in `deploy/ops/.env.example`. */
export const OPS_GROUP_GUIDES: Readonly<Record<string, readonly string[]>> = {
  "Build metadata": ["Optional build metadata surfaced in the container"],
  "Image tags": [
    "Omit to pull the floating production channel. Pin to semver for reproducible deploys / rollback.",
  ],
  "Mobile associated domains": [
    "Optional. Native passkeys need apple-app-site-association (Team ID) and assetlinks.json (SHA-256 fingerprints).",
    "If unset, those well-known files return 404. Do not invent Team IDs or fingerprints.",
  ],
  "Public hostnames": [
    "Public hostnames (no scheme). Compose derives https://… URLs and Traefik Host().",
  ],
};

/** Multi-line comments under plausible group headers in `deploy/plausible/.env.example`. */
export const PLAUSIBLE_GROUP_GUIDES: Readonly<Record<string, readonly string[]>> = {
  "Plausible options": [
    "Compose maps these to Plausible CE container env (BASE_URL, DISABLE_REGISTRATION).",
  ],
  "Plausible secrets": [
    "Generate:",
    "  openssl rand -base64 48   # BONDERY_PRIVATE_PLAUSIBLE_SECRET_KEY_BASE",
    "  openssl rand -base64 32   # BONDERY_PRIVATE_PLAUSIBLE_TOTP_VAULT_KEY",
    "  openssl rand -base64 24 | tr -d '/+=' | head -c 32   # BONDERY_PRIVATE_PLAUSIBLE_POSTGRES_PASSWORD",
    "Compose builds DATABASE_URL from the Postgres password — do not set DATABASE_URL in Dokploy.",
  ],
  "Public hostname": [
    "Traefik Host() rule (no scheme). Compose derives BASE_URL as https://<domain>.",
  ],
};
