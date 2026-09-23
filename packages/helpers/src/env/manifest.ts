/**
 * Canonical environment variable contract for the Bondery monorepo.
 *
 * Humans edit root `.env.local` using these canonical names.
 * `pnpm run env` copies identity (or documented aliases) into per-app files.
 *
 * Naming:
 * - BONDERY_PUBLIC_*  — safe for clients
 * - BONDERY_PRIVATE_* — secrets (API / auth setup)
 * - BONDERY_INFRA_*   — deploy / runtime plumbing
 * - BONDERY_DEV_*     — local API dev boot only (never set in Compose/production)
 * - BONDERY_OPS_*     — CI only (never synced into app local files)
 */

import { DEV_PORTS } from "@bondery/schemas/constants/dev-ports";

export type EnvEnvironment = "development" | "production";

export type TargetId = "api" | "webapp" | "website" | "mobile" | "chrome-extension" | "db";

export type EnvTargetWrite = {
  /** App / package id */
  id: TargetId;
  /**
   * Name written into the target file.
   * Defaults to the canonical name when omitted (identity).
   */
  runtimeName?: string;
  /**
   * When set, derive the value from another canonical key (e.g. callback URL).
   * If `transform` is omitted, copies the source value as-is under `runtimeName`.
   */
  deriveFrom?: string;
  /** Optional value transform when deriving */
  transform?: "local-postgres-database-url" | "webapp-auth-callback";
};

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
    "  Local example: http://localhost:26631/auth/callback/github",
    "  Then run: pnpm run provision:oauth-clients",
  ],
  Database: [
    "Generate a Postgres password:",
    "  openssl rand -base64 24 | tr -d '/+=' | head -c 32   # BONDERY_PRIVATE_POSTGRES_PASSWORD",
    "pnpm run env derives DATABASE_URL for api/db from this password.",
  ],
  Storage: [
    "Local dev: bundled SeaweedFS defaults below are fine.",
    "Production secret key: openssl rand -hex 32   # BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY",
  ],
};

/** Operator-facing sections in `deploy/bondery/.env.example` (order matters). */
export const DEPLOY_GROUP_ORDER = [
  "Image tags",
  "Public hostnames",
  "Redis",
  "Postgres",
  "Better Auth",
  "Webapp OAuth",
  "Chrome extension OAuth",
  "Storage",
  "Email",
  "Stripe",
  "Optional integrations (API)",
  "Optional webapp analytics",
  "Optional API admin analytics",
  "Build metadata",
] as const;

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
  ],
  "Chrome extension OAuth": ["Generate: openssl rand -hex 16   # BONDERY_PUBLIC_OAUTH_CLIENT_ID"],
  Email: ["SMTP settings (env_file → api only)."],
  "Image pin": [
    "Omit BONDERY_INFRA_VERSION on production to pull :production, or pin X.Y.Z. Staging may pin a named RC or :beta (RC cuts only). RC is not a self-host channel.",
    "BONDERY_INFRA_TRAEFIK_PREFIX defaults to bondery. Infisical staging: bondery-beta. Infisical production: bondery or omit.",
  ],
  "Image tags": [
    "Omit to pull the floating production channel. Pin to semver for reproducible deploys / rollback.",
  ],
  Postgres: [
    "Generate:",
    "  openssl rand -base64 24 | tr -d '/+=' | head -c 32   # BONDERY_PRIVATE_POSTGRES_PASSWORD",
    "Compose builds DATABASE_URL from this password — do not set DATABASE_URL in .env.",
  ],
  "Public hostnames": [
    "Traefik Host() rules use these; Compose derives https://… URLs for the apps (no scheme here).",
  ],
  Redis: ["Bundled Redis (default). Advanced: run API alone with a managed Redis URL."],
  Storage: [
    "S3 credentials are rendered into SeaweedFS at container start (see deploy/bondery/seaweedfs/entrypoint.sh).",
    "Production secret key: openssl rand -hex 32   # BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY",
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

/** Operator-facing sections in `deploy/ops/.env.example` (order matters). */
export const OPS_GROUP_ORDER = [
  "Image tags",
  "Public hostnames",
  "Website analytics",
  "Build metadata",
] as const;

/** Operator-facing sections in `deploy/plausible/.env.example` (order matters). */
export const PLAUSIBLE_GROUP_ORDER = [
  "Public hostname",
  "Plausible secrets",
  "Plausible options",
] as const;

/** Multi-line comments under ops group headers in `deploy/ops/.env.example`. */
export const OPS_GROUP_GUIDES: Readonly<Record<string, readonly string[]>> = {
  "Build metadata": ["Optional build metadata surfaced in the container"],
  "Image tags": [
    "Omit to pull the floating production channel. Pin to semver for reproducible deploys / rollback.",
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

export type DeployExample = {
  /** Include in generated `deploy/bondery/.env.example` */
  include: boolean;
  /** Override `exampleValue` for deploy operators */
  value?: string;
  /** Operator-facing section header */
  group?: string;
  /** Render as `# KEY=value` (optional image tag pins) */
  commented?: boolean;
};

/** Same shape as `DeployExample` — ops marketing stack (`deploy/ops/.env.example`). */
export type OpsExample = DeployExample;

/** Infisical → Dokploy sync payload (`deploy/scripts/sync-infisical-to-dokploy.mjs`). */
export type DokploySync = {
  /** Dokploy compose stacks that receive this key on sync */
  targets: readonly DokploySyncTarget[];
};

export type DokploySyncTarget =
  | "website"
  | "website-beta"
  | "plausible"
  | "services"
  | "services-beta";

/** Same shape as `DeployExample` — Plausible CE stack (`deploy/plausible/.env.example`). */
export type PlausibleExample = DeployExample;

/** Boot profile for starting a target without a `.env` file (OpenAPI gen, integration tests). */
export type BootExample = {
  /** Include in boot env even when not `requiredIn` for the environment (rare) */
  include?: boolean;
  /** Override when `exampleValue` is empty or a human placeholder */
  value?: string;
};

export type ExampleProfile = "development" | "production" | "deploy" | "ops" | "plausible";

export type EnvVarDef = {
  canonical: string;
  description: string;
  /** Include in generated root `.env.local.example` */
  exampleValue: string;
  /** Group header in generated files */
  group: string;
  requiredIn: EnvEnvironment[];
  secret: boolean;
  targets: EnvTargetWrite[];
  /** Self-host compose operator example (`deploy/bondery/.env.example`) */
  deployExample?: DeployExample;
  /** Ops marketing Compose operator example (`deploy/ops/.env.example`) */
  opsExample?: OpsExample;
  /** Infisical production → Dokploy compose env sync */
  dokploySync?: DokploySync;
  /** Plausible CE Compose operator example (`deploy/plausible/.env.example`) */
  plausibleExample?: PlausibleExample;
  /** Boot without `.env` (OpenAPI generation, API integration tests) */
  boot?: BootExample;
  /** When false, omit from turbo cache env arrays (rare) */
  turboAffectsCache?: boolean;
  /**
   * When true, `pnpm run env:pull` may fetch this key from Infisical into root `.env.local`.
   * Shared team secrets only — never inventable per-machine OAuth client ids (see block below).
   */
  syncable?: boolean;
  /** Omit from generated root `.env.local.example` (derived at `pnpm run env` sync). */
  omitFromRootExample?: boolean;
};

/**
 * Infisical `env:pull` — keys with `syncable: true` are pulled into root `.env.local`.
 *
 * Already synced: SMTP, GitHub OAuth, Maps, S3/storage, SERVICE_SECRET, DO_NOT_TRACK,
 * Stripe API keys + price IDs, Anthropic, PostHog, BONDERY_PRIVATE_POSTGRES_PASSWORD.
 *
 * Good candidates to add `syncable: true` when the team shares them in Infisical:
 * - BONDERY_PRIVATE_AUTH_LINKEDIN_CLIENT_ID / _SECRET — LinkedIn login locally
 * - BONDERY_PRIVATE_PLATFORM_ADMIN_EMAILS — who gets admin on fresh DB bootstrap
 *
 * Usually keep local-only (do not sync):
 * - BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET — Stripe CLI `listen` signing secret is per machine
 *   (`pnpm run setup:stripe`). Infisical production/staging still hold Dashboard endpoint secrets
 *   for those deploys; `syncable` does not read or write Infisical.
 * - BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID, BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET,
 *   BONDERY_PRIVATE_WEBAPP_SESSION_SECRET — invented per dev machine; run setup:dev / provision:oauth-clients
 * - BONDERY_PRIVATE_BETTER_AUTH_SECRETS — can be shared or per-env; team policy
 * - BONDERY_PRIVATE_REDIS_URL — local Docker Redis unless using shared remote Redis
 * - BONDERY_PUBLIC_*_URL localhost ports — machine-specific unless using ngrok shared URLs
 * - BONDERY_DEV_* — local API boot toggles only
 * - BONDERY_INFRA_* — deploy hostnames / image tags, not local dev
 */

/** Resolve example value for a manifest entry and generation profile. */
export function resolveExampleValue(entry: EnvVarDef, profile: ExampleProfile): string {
  if (profile === "deploy") {
    return entry.deployExample?.value ?? entry.exampleValue;
  }
  if (profile === "ops") {
    return entry.opsExample?.value ?? entry.exampleValue;
  }
  if (profile === "plausible") {
    return entry.plausibleExample?.value ?? entry.exampleValue;
  }

  let value = entry.exampleValue;
  if (profile === "production") {
    if (entry.canonical.includes("WEBAPP_URL") && value.includes("localhost")) {
      value = "https://app.usebondery.com";
    } else if (entry.canonical.includes("WEBSITE_URL") && value.includes("localhost")) {
      value = "https://usebondery.com";
    } else if (entry.canonical.includes("API_URL") && value.includes("localhost")) {
      value = "https://api.usebondery.com";
    } else if (entry.canonical === "BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED") {
      value = "false";
    }
  }
  return value;
}

/** Sort deploy example rows by DEPLOY_GROUP_ORDER then key. */
export function sortDeployExampleRows<T extends { group: string; key: string }>(rows: T[]): T[] {
  const groupRank = new Map(DEPLOY_GROUP_ORDER.map((group, index) => [group, index]));
  return [...rows].sort((a, b) => {
    const rankA = groupRank.get(a.group as (typeof DEPLOY_GROUP_ORDER)[number]) ?? 999;
    const rankB = groupRank.get(b.group as (typeof DEPLOY_GROUP_ORDER)[number]) ?? 999;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.key.localeCompare(b.key);
  });
}

/** Sort ops example rows by OPS_GROUP_ORDER then key. */
export function sortOpsExampleRows<T extends { group: string; key: string }>(rows: T[]): T[] {
  const groupRank = new Map(OPS_GROUP_ORDER.map((group, index) => [group, index]));
  return [...rows].sort((a, b) => {
    const rankA = groupRank.get(a.group as (typeof OPS_GROUP_ORDER)[number]) ?? 999;
    const rankB = groupRank.get(b.group as (typeof OPS_GROUP_ORDER)[number]) ?? 999;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.key.localeCompare(b.key);
  });
}

/** Sort plausible example rows by PLAUSIBLE_GROUP_ORDER then key. */
export function sortPlausibleExampleRows<T extends { group: string; key: string }>(rows: T[]): T[] {
  const groupRank = new Map(PLAUSIBLE_GROUP_ORDER.map((group, index) => [group, index]));
  return [...rows].sort((a, b) => {
    const rankA = groupRank.get(a.group as (typeof PLAUSIBLE_GROUP_ORDER)[number]) ?? 999;
    const rankB = groupRank.get(b.group as (typeof PLAUSIBLE_GROUP_ORDER)[number]) ?? 999;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.key.localeCompare(b.key);
  });
}

export type SyncTargetConfig = {
  id: TargetId;
  /** Relative to repo root */
  devFile: string;
  /** Relative to repo root — committed example regenerated by `pnpm run env:examples` */
  exampleFile: string;
  /** Optional alternate example for production shape */
  productionExampleFile?: string;
  /** Relative to repo root — where `pnpm run env:production` writes */
  productionFile?: string;
};

/** Where `pnpm run env:development` / `pnpm run env:production` write per-app local files */
export const SYNC_TARGETS: SyncTargetConfig[] = [
  {
    devFile: "apps/api/.env.development.local",
    exampleFile: "apps/api/.env.development.example",
    id: "api",
    productionExampleFile: "apps/api/.env.production.example",
    productionFile: "apps/api/.env.production.local",
  },
  {
    devFile: "apps/webapp/.env.development.local",
    exampleFile: "apps/webapp/.env.development.example",
    id: "webapp",
    productionExampleFile: "apps/webapp/.env.production.example",
    productionFile: "apps/webapp/.env.production.local",
  },
  {
    devFile: "apps/website/.env.development.local",
    exampleFile: "apps/website/.env.development.local.example",
    id: "website",
    productionExampleFile: "apps/website/.env.production.local.example",
    productionFile: "apps/website/.env.production.local",
  },
  {
    devFile: "apps/mobile/.env.local",
    exampleFile: "apps/mobile/.env.example",
    id: "mobile",
  },
  {
    devFile: "apps/chrome-extension/.env.development.local",
    exampleFile: "apps/chrome-extension/.env.development.example",
    id: "chrome-extension",
    productionExampleFile: "apps/chrome-extension/.env.production.example",
    productionFile: "apps/chrome-extension/.env.production.local",
  },
  {
    devFile: "packages/db/.env.local",
    exampleFile: "packages/db/.env.local.example",
    id: "db",
  },
];

function t(id: TargetId, runtimeName?: string): EnvTargetWrite {
  return runtimeName ? { id, runtimeName } : { id };
}

const LOCAL_POSTGRES_USER = "postgres";
const LOCAL_POSTGRES_DB = "bondery";
const LOCAL_POSTGRES_HOST = "127.0.0.1";
export const EXAMPLE_POSTGRES_PASSWORD = "your-super-secret-and-long-postgres-password";

/** Bundled local Postgres URL for `pnpm run env` derivation (matches `docker-compose.dev-db.yml`). */
export function buildLocalPostgresDatabaseUrl(password: string): string {
  return `postgresql://${LOCAL_POSTGRES_USER}:${encodeURIComponent(password)}@${LOCAL_POSTGRES_HOST}:${DEV_PORTS.POSTGRES}/${LOCAL_POSTGRES_DB}`;
}

export const ENV_MANIFEST: EnvVarDef[] = [
  // --- Public URLs ---
  {
    canonical: "BONDERY_PUBLIC_API_URL",
    description: "Public API base URL (no trailing /api)",
    exampleValue: "http://localhost:26631",
    group: "Public URLs",
    requiredIn: ["development", "production"],
    secret: false,
    targets: [t("api"), t("webapp"), t("chrome-extension"), t("mobile")],
  },
  {
    canonical: "BONDERY_PUBLIC_WEBAPP_URL",
    description: "Public webapp origin",
    exampleValue: "http://localhost:26632",
    group: "Public URLs",
    requiredIn: ["development", "production"],
    secret: false,
    targets: [t("api"), t("webapp"), t("website"), t("chrome-extension"), t("mobile")],
  },
  {
    canonical: "BONDERY_PUBLIC_WEBSITE_URL",
    description: "Public marketing website origin",
    exampleValue: "http://localhost:26630",
    group: "Public URLs",
    requiredIn: ["development", "production"],
    secret: false,
    targets: [t("api"), t("webapp"), t("website"), t("mobile")],
  },
  {
    canonical: "BONDERY_PUBLIC_WEBAUTHN_RP_ID",
    deployExample: {
      commented: true,
      group: "Better Auth",
      include: true,
      value: "",
    },
    description:
      "Optional WebAuthn rpID override for self-host DNS that does not match the cookie parent domain. Do not set for hosted Bondery. Never an IP.",
    exampleValue: "",
    group: "Public URLs",
    requiredIn: [],
    secret: false,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS",
    description: "Comma-separated extra CORS origins (e.g. Expo web)",
    exampleValue: "http://localhost:26634",
    group: "Public URLs",
    requiredIn: [],
    secret: false,
    targets: [t("api")],
  },

  // --- Database ---
  {
    canonical: "DATABASE_URL",
    description: "Postgres connection string (Prisma + API)",
    exampleValue: buildLocalPostgresDatabaseUrl(EXAMPLE_POSTGRES_PASSWORD),
    group: "Database",
    omitFromRootExample: true,
    requiredIn: ["development", "production"],
    secret: true,
    targets: [
      {
        deriveFrom: "BONDERY_PRIVATE_POSTGRES_PASSWORD",
        id: "api",
        transform: "local-postgres-database-url",
      },
      {
        deriveFrom: "BONDERY_PRIVATE_POSTGRES_PASSWORD",
        id: "db",
        transform: "local-postgres-database-url",
      },
    ],
  },
  {
    canonical: "BONDERY_PRIVATE_POSTGRES_PASSWORD",
    deployExample: {
      group: "Postgres",
      include: true,
      value: "your-super-secret-and-long-postgres-password",
    },
    description: "Postgres password for bundled self-hosted database",
    exampleValue: EXAMPLE_POSTGRES_PASSWORD,
    group: "Database",
    requiredIn: ["development", "production"],
    secret: true,
    syncable: true,
    targets: [t("db")],
  },

  // --- Auth (Better Auth) ---
  {
    canonical: "BONDERY_PRIVATE_BETTER_AUTH_SECRETS",
    deployExample: {
      group: "Better Auth",
      include: true,
      value: "1:your-super-secret-better-auth-secret-min-32-chars",
    },
    description:
      "Better Auth versioned secrets (format: version:secret[,version:secret...]; highest version first)\nGenerate: openssl rand -hex 32 — then set as 1:<output>",
    exampleValue: "1:your-super-secret-better-auth-secret-min-32-chars",
    group: "Auth",
    requiredIn: ["development", "production"],
    secret: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_AUTH_GITHUB_CLIENT_ID",
    deployExample: { group: "Better Auth", include: true, value: "" },
    description:
      "GitHub OAuth client id for Better Auth (from GitHub → Settings → Developer settings → OAuth apps)",
    exampleValue: "",
    group: "Auth",
    requiredIn: [],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_AUTH_GITHUB_CLIENT_SECRET",
    deployExample: { group: "Better Auth", include: true, value: "" },
    description:
      "GitHub OAuth client secret for Better Auth (shown once when you create the OAuth app)",
    exampleValue: "",
    group: "Auth",
    requiredIn: [],
    secret: true,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_AUTH_LINKEDIN_CLIENT_ID",
    deployExample: { group: "Better Auth", include: true, value: "" },
    description:
      "LinkedIn OAuth client id for Better Auth (from LinkedIn Developer Portal → your app)",
    exampleValue: "",
    group: "Auth",
    requiredIn: [],
    secret: false,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_AUTH_LINKEDIN_CLIENT_SECRET",
    deployExample: { group: "Better Auth", include: true, value: "" },
    description: "LinkedIn OAuth client secret for Better Auth (from LinkedIn Developer Portal)",
    exampleValue: "",
    group: "Auth",
    requiredIn: [],
    secret: true,
    targets: [t("api")],
  },
  {
    boot: { value: "test-extension-oauth-client" },
    canonical: "BONDERY_PUBLIC_OAUTH_CLIENT_ID",
    deployExample: { group: "Chrome extension OAuth", include: true, value: "" },
    description:
      "Chrome extension OAuth client id. Also consumed by the API's deployment-time OAuth client provisioning.\nGenerate: openssl rand -hex 16",
    exampleValue: "",
    group: "Auth",
    requiredIn: ["development", "production"],
    secret: false,
    targets: [t("api"), t("chrome-extension")],
  },
  {
    canonical: "BONDERY_EXTENSION_FLAVOR",
    description:
      "Chrome extension bake flavor. CI: production (CWS, omit manifest.key) or staging (RC zip, include key). Unset locally (treated as local).",
    exampleValue: "",
    group: "Auth",
    omitFromRootExample: true,
    requiredIn: [],
    secret: false,
    targets: [t("chrome-extension")],
  },
  {
    boot: { value: "test-webapp-oauth-client" },
    canonical: "BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID",
    deployExample: { group: "Webapp OAuth", include: true, value: "your-webapp-oauth-client-id" },
    description:
      "Webapp's own OAuth client id (confidential BFF client of the API's oauth-provider)\nGenerate: openssl rand -hex 16",
    exampleValue: "",
    group: "Auth",
    requiredIn: ["development", "production"],
    secret: false,
    targets: [t("api"), t("webapp")],
  },
  {
    boot: { value: "test-webapp-oauth-client-secret-32chars-min" },
    canonical: "BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET",
    deployExample: {
      group: "Webapp OAuth",
      include: true,
      value: "your-super-secret-webapp-oauth-client-secret-min-32-chars",
    },
    description:
      "Webapp's own OAuth client secret (never exposed to the browser). The API only ever stores/verifies its hash via deployment-time provisioning; it never round-trips the plaintext value.\nGenerate: openssl rand -hex 32",
    exampleValue: "",
    group: "Auth",
    requiredIn: ["development", "production"],
    secret: true,
    targets: [t("api"), t("webapp")],
  },
  {
    canonical: "BONDERY_PRIVATE_WEBAPP_SESSION_SECRET",
    deployExample: {
      group: "Webapp OAuth",
      include: true,
      value: "your-super-secret-webapp-session-secret-min-32-chars",
    },
    description:
      "Symmetric key (≥32 chars) for encrypting the webapp's own session cookie\nGenerate: openssl rand -hex 32",
    exampleValue: "your-super-secret-webapp-session-secret-min-32-chars",
    group: "Auth",
    requiredIn: ["development", "production"],
    secret: true,
    targets: [t("webapp")],
  },

  // --- Storage ---
  {
    canonical: "BONDERY_PUBLIC_STORAGE_URL",
    deployExample: {
      group: "Storage",
      include: true,
      value: "https://storage.usebondery.com",
    },
    description: "Public base URL for SeaweedFS S3 objects (no trailing slash).",
    exampleValue: "http://127.0.0.1:8333",
    group: "Storage",
    requiredIn: ["development", "production"],
    secret: false,
    syncable: true,
    targets: [t("api"), t("mobile")],
  },
  {
    canonical: "BONDERY_PRIVATE_S3_ENDPOINT",
    deployExample: {
      group: "Storage",
      include: true,
      value: "http://seaweedfs-s3:8333",
    },
    description:
      "SeaweedFS S3 gateway URL (local dev: 127.0.0.1; Compose: http://seaweedfs-s3:8333).",
    exampleValue: "http://127.0.0.1:8333",
    group: "Storage",
    requiredIn: ["development", "production"],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_S3_REGION",
    deployExample: { group: "Storage", include: true, value: "eu-central-1" },
    description: "S3 region accepted by SeaweedFS (any value).",
    exampleValue: "eu-central-1",
    group: "Storage",
    requiredIn: ["development", "production"],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_S3_ACCESS_KEY_ID",
    deployExample: { group: "Storage", include: true, value: "bondery_access_key" },
    description: "SeaweedFS S3 access key id (API client + rendered into seaweedfs-s3 at startup).",
    exampleValue: "bondery_access_key",
    group: "Storage",
    requiredIn: ["development", "production"],
    secret: true,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY",
    deployExample: {
      group: "Storage",
      include: true,
      value: "bondery_secret_key_change_me",
    },
    description:
      "SeaweedFS S3 secret access key (API client + rendered into seaweedfs-s3 at startup). Local dev: any string; production: openssl rand -hex 32",
    exampleValue: "bondery_secret_key_change_me",
    group: "Storage",
    requiredIn: ["development", "production"],
    secret: true,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_INFRA_API_DOMAIN",
    deployExample: {
      group: "Public hostnames",
      include: true,
      value: "api.usebondery.com",
    },
    description: "Public API hostname for Traefik Host() rules (no scheme).",
    exampleValue: "api.usebondery.com",
    group: "Infra",
    requiredIn: ["production"],
    secret: false,
    targets: [],
  },
  {
    canonical: "BONDERY_INFRA_WEBAPP_DOMAIN",
    deployExample: {
      group: "Public hostnames",
      include: true,
      value: "app.usebondery.com",
    },
    description: "Public webapp hostname for Traefik Host() rules (no scheme).",
    dokploySync: { targets: ["website", "services"] },
    exampleValue: "app.usebondery.com",
    group: "Infra",
    opsExample: {
      group: "Public hostnames",
      include: true,
      value: "app.usebondery.com",
    },
    requiredIn: ["production"],
    secret: false,
    targets: [],
  },
  {
    canonical: "BONDERY_INFRA_WEBSITE_DOMAIN",
    deployExample: {
      group: "Public hostnames",
      include: true,
      value: "usebondery.com",
    },
    description:
      "Public marketing website hostname (no scheme). Compose derives BONDERY_PUBLIC_WEBSITE_URL for api/webapp.",
    dokploySync: { targets: ["website", "services"] },
    exampleValue: "usebondery.com",
    group: "Infra",
    opsExample: {
      group: "Public hostnames",
      include: true,
      value: "usebondery.com",
    },
    requiredIn: ["production"],
    secret: false,
    targets: [],
  },
  {
    canonical: "BONDERY_INFRA_PLAUSIBLE_DOMAIN",
    description: "Public Plausible CE hostname for Traefik Host() rules (no scheme).",
    dokploySync: { targets: ["website", "plausible"] },
    exampleValue: "plausible.usebondery.com",
    group: "Infra",
    opsExample: {
      group: "Website analytics",
      include: true,
      value: "plausible.usebondery.com",
    },
    plausibleExample: {
      group: "Public hostname",
      include: true,
      value: "plausible.usebondery.com",
    },
    requiredIn: ["production"],
    secret: false,
    targets: [],
  },
  {
    canonical: "BONDERY_INFRA_PLAUSIBLE_DISABLE_REGISTRATION",
    description: "Plausible CE sign-up policy (maps to DISABLE_REGISTRATION in the container).",
    dokploySync: { targets: ["plausible"] },
    exampleValue: "invite_only",
    group: "Infra",
    plausibleExample: {
      group: "Plausible options",
      include: true,
      value: "invite_only",
    },
    requiredIn: [],
    secret: false,
    targets: [],
  },
  {
    canonical: "BONDERY_PRIVATE_PLAUSIBLE_POSTGRES_PASSWORD",
    description: "Postgres password for the Plausible CE metadata database.",
    dokploySync: { targets: ["plausible"] },
    exampleValue: "",
    group: "Database",
    plausibleExample: { group: "Plausible secrets", include: true, value: "" },
    requiredIn: ["production"],
    secret: true,
    targets: [],
  },
  {
    canonical: "BONDERY_PRIVATE_PLAUSIBLE_SECRET_KEY_BASE",
    description: "Plausible CE SECRET_KEY_BASE (session signing).",
    dokploySync: { targets: ["plausible"] },
    exampleValue: "",
    group: "Analytics",
    plausibleExample: { group: "Plausible secrets", include: true, value: "" },
    requiredIn: ["production"],
    secret: true,
    targets: [],
  },
  {
    canonical: "BONDERY_PRIVATE_PLAUSIBLE_TOTP_VAULT_KEY",
    description: "Plausible CE TOTP_VAULT_KEY (2FA encryption).",
    dokploySync: { targets: ["plausible"] },
    exampleValue: "",
    group: "Analytics",
    plausibleExample: { group: "Plausible secrets", include: true, value: "" },
    requiredIn: ["production"],
    secret: true,
    targets: [],
  },
  {
    canonical: "BONDERY_INFRA_WEBSITE_IMAGE_TAG",
    description:
      "Website container image tag. Infisical production: production (or omit for compose default :production). Infisical staging: beta. Synced to website and website-beta Dokploy apps.",
    dokploySync: { targets: ["website"] },
    exampleValue: "",
    group: "Infra",
    opsExample: {
      commented: true,
      group: "Image tags",
      include: true,
    },
    requiredIn: [],
    secret: false,
    targets: [],
    turboAffectsCache: false,
  },
  {
    canonical: "BONDERY_INFRA_STORAGE_DOMAIN",
    deployExample: {
      group: "Storage",
      include: true,
      value: "storage.usebondery.com",
    },
    description: "Public hostname for SeaweedFS S3 (Traefik Host rule in compose).",
    exampleValue: "storage.usebondery.com",
    group: "Storage",
    requiredIn: [],
    secret: false,
    targets: [t("api")],
  },

  // --- API secrets ---
  {
    boot: { value: "dummy-service-secret-for-boot-env-32chars" },
    canonical: "BONDERY_PRIVATE_SERVICE_SECRET",
    deployExample: {
      group: "Better Auth",
      include: true,
      value: "your-service-secret-min-32-chars",
    },
    description: "Internal service-to-service HMAC secret\nGenerate: openssl rand -hex 32",
    exampleValue: "<your-service-secret>",
    group: "API secrets",
    requiredIn: ["development", "production"],
    secret: true,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_PLATFORM_ADMIN_EMAILS",
    description:
      "Comma-separated operator emails promoted to user.role=admin by provision-platform-admins at deploy",
    exampleValue: "ops@example.com",
    group: "API secrets",
    requiredIn: [],
    secret: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_PLATFORM_ADMIN_USER_IDS",
    description:
      "Optional break-glass comma-separated user UUIDs with platform admin access (Better Auth adminUserIds)",
    exampleValue: "",
    group: "API secrets",
    requiredIn: [],
    secret: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_EMAIL_HOST",
    deployExample: { group: "Email", include: true, value: "smtp.example.com" },
    description: "SMTP host",
    exampleValue: "smtp.example.com",
    group: "Email",
    requiredIn: ["development", "production"],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_EMAIL_PORT",
    deployExample: { group: "Email", include: true, value: "587" },
    description: "SMTP port",
    exampleValue: "587",
    group: "Email",
    requiredIn: ["development", "production"],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_EMAIL_USER",
    deployExample: { group: "Email", include: true, value: "username" },
    description: "SMTP username",
    exampleValue: "robot@example.com",
    group: "Email",
    requiredIn: ["development", "production"],
    secret: true,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_EMAIL_PASS",
    deployExample: { group: "Email", include: true, value: "your-email-password" },
    description: "SMTP password",
    exampleValue: "your-email-password",
    group: "Email",
    requiredIn: ["development", "production"],
    secret: true,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_EMAIL_ADDRESS",
    deployExample: { group: "Email", include: true, value: "robot@usebondery.com" },
    description: "From address for transactional email",
    exampleValue: "robot@example.com",
    group: "Email",
    requiredIn: ["development", "production"],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_EMAIL_REPLY_TO",
    deployExample: { group: "Email", include: true, value: "team@usebondery.com" },
    description: "Reply-To address for automated transactional email",
    exampleValue: "team@usebondery.com",
    group: "Email",
    requiredIn: ["development", "production"],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_REDIS_URL",
    deployExample: { group: "Redis", include: true, value: "redis://redis:6379" },
    description: "Redis connection URL",
    exampleValue: "redis://127.0.0.1:26636",
    group: "Redis",
    requiredIn: ["development", "production"],
    secret: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_STRIPE_SECRET_KEY",
    deployExample: {
      group: "Stripe",
      include: true,
      value: "sk_live_<your-stripe-secret-key>",
    },
    description: "Stripe API secret key",
    exampleValue: "sk_test_<your-stripe-secret-key>",
    group: "Stripe",
    requiredIn: ["production"],
    secret: true,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET",
    deployExample: {
      group: "Stripe",
      include: true,
      value: "whsec_<your-stripe-webhook-secret>",
    },
    description: "Stripe webhook signing secret",
    exampleValue: "whsec_<your-stripe-webhook-secret>",
    group: "Stripe",
    requiredIn: ["production"],
    secret: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED",
    deployExample: { group: "Stripe", include: true, value: "false" },
    description: "Enable in-app subscription upgrades (true | false)",
    exampleValue: "false",
    group: "Stripe",
    requiredIn: [],
    secret: false,
    syncable: true,
    targets: [t("api"), t("webapp")],
  },
  {
    canonical: "BONDERY_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    deployExample: {
      group: "Stripe",
      include: true,
      value: "pk_live_<your-stripe-publishable-key>",
    },
    description: "Stripe publishable key for embedded Checkout",
    exampleValue: "pk_test_<your-stripe-publishable-key>",
    group: "Stripe",
    requiredIn: ["production"],
    secret: false,
    syncable: true,
    targets: [t("api"), t("webapp")],
  },
  {
    canonical: "BONDERY_PUBLIC_STRIPE_PRICE_ID_MONTHLY",
    deployExample: { group: "Stripe", include: true, value: "price_<monthly>" },
    description: "Stripe Price ID for monthly Premium",
    exampleValue: "price_<monthly>",
    group: "Stripe",
    requiredIn: ["production"],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PUBLIC_STRIPE_PRICE_ID_ANNUAL",
    deployExample: { group: "Stripe", include: true, value: "price_<annual>" },
    description: "Stripe Price ID for annual Premium",
    exampleValue: "price_<annual>",
    group: "Stripe",
    requiredIn: ["production"],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PUBLIC_MAPS_URL",
    deployExample: {
      group: "Optional integrations (API)",
      include: true,
      value: "https://api.mapy.com",
    },
    description: "Mapy.com API base URL",
    exampleValue: "https://api.mapy.com",
    group: "Maps",
    requiredIn: [],
    secret: false,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_MAPS_KEY",
    deployExample: { group: "Optional integrations (API)", include: true, value: "" },
    description: "Mapy.com API key",
    exampleValue: "<your-maps-api-key>",
    group: "Maps",
    requiredIn: [],
    secret: true,
    syncable: true,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_ANTHROPIC_API_KEY",
    deployExample: { group: "Optional integrations (API)", include: true, value: "" },
    description: "Anthropic API key for AI features",
    exampleValue: "sk-ant-<your-anthropic-api-key>",
    group: "AI",
    requiredIn: [],
    secret: true,
    syncable: true,
    targets: [t("api")],
  },

  // --- Analytics ---
  {
    canonical: "BONDERY_PUBLIC_POSTHOG_KEY",
    deployExample: { group: "Optional webapp analytics", include: true, value: "" },
    description: "PostHog project API key (browser and server capture)",
    exampleValue: "",
    group: "Analytics",
    requiredIn: [],
    secret: false,
    syncable: true,
    targets: [t("api"), t("webapp")],
  },
  {
    canonical: "BONDERY_PUBLIC_POSTHOG_HOST",
    deployExample: { group: "Optional webapp analytics", include: true, value: "" },
    description: "PostHog host URL (browser and server capture)",
    exampleValue: "",
    group: "Analytics",
    requiredIn: [],
    secret: false,
    syncable: true,
    targets: [t("api"), t("webapp")],
  },
  {
    canonical: "BONDERY_PUBLIC_PLAUSIBLE_DOMAIN",
    description:
      "Plausible site domain (marketing hostname registered in self-hosted Plausible CE)",
    exampleValue: "",
    group: "Analytics",
    requiredIn: [],
    secret: false,
    syncable: true,
    targets: [t("website")],
  },
  {
    canonical: "BONDERY_PUBLIC_PLAUSIBLE_HOST",
    description: "Self-hosted Plausible CE base URL (script and event requests)",
    exampleValue: "",
    group: "Analytics",
    requiredIn: [],
    secret: false,
    syncable: true,
    targets: [t("website")],
  },
  {
    canonical: "DO_NOT_TRACK",
    description: "Disable analytics / vendor telemetry when true",
    exampleValue: "true",
    group: "Analytics",
    requiredIn: [],
    secret: false,
    syncable: true,
    targets: [t("api"), t("webapp"), t("website")],
  },

  // --- Infra (optional local) ---
  {
    canonical: "BONDERY_INFRA_VERSION",
    deployExample: {
      commented: true,
      group: "Image pin",
      include: true,
    },
    description:
      "Image tag for api and webapp: production CalVer pin (X.Y.Z), or omit for floating `:production`. Staging Dokploy may pin a named RC (`X.Y.Z-rc.N`) or floating `:beta` (RC cuts only). RC is not a self-host channel.",
    exampleValue: "",
    group: "Infra",
    opsExample: { group: "Build metadata", include: true, value: "" },
    requiredIn: [],
    secret: false,
    targets: [t("api"), t("webapp"), t("website")],
    turboAffectsCache: false,
  },
  {
    canonical: "BONDERY_INFRA_TRAEFIK_PREFIX",
    deployExample: {
      group: "Image pin",
      include: true,
      value: "bondery",
    },
    description:
      "Traefik router and service name prefix. Defaults to bondery in Compose. Infisical staging: bondery-beta. Infisical production: bondery or omit. Same names on one Traefik steal production HTTPS routes.",
    dokploySync: { targets: ["website"] },
    exampleValue: "bondery",
    group: "Infra",
    opsExample: { group: "Public hostnames", include: true, value: "bondery" },
    requiredIn: [],
    secret: false,
    targets: [],
  },
  {
    canonical: "BONDERY_INFRA_GIT_SHA",
    deployExample: { group: "Build metadata", include: true, value: "" },
    description: "Git SHA surfaced in runtime config and health probes",
    exampleValue: "",
    group: "Infra",
    opsExample: { group: "Build metadata", include: true, value: "" },
    requiredIn: [],
    secret: false,
    targets: [t("api"), t("webapp"), t("website")],
  },
  {
    canonical: "BONDERY_INFRA_CHROME_EXTENSION_ID",
    deployExample: {
      group: "Public hostnames",
      include: true,
      value: "lpcmokfekjjejnpobhbkgmjkodfhpmha",
    },
    description:
      "Chrome Web Store extension ID. Derives the https://{id}.chromiumapp.org/ OAuth redirect URI and allows chrome-extension://{id} CORS on the authorization server.",
    exampleValue: "lpcmokfekjjejnpobhbkgmjkodfhpmha",
    group: "Infra",
    requiredIn: [],
    secret: false,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PUBLIC_SYNC_DEBUG",
    description: "Mobile sync debug logging (1/true)",
    exampleValue: "",
    group: "Mobile",
    requiredIn: [],
    secret: false,
    targets: [t("mobile")],
  },

  // --- Local dev (API boot only; not used in Compose pre_start) ---
  {
    canonical: "BONDERY_DEV_SKIP_RELEASE_MIGRATE",
    description:
      "When true, skip release-migrate (prisma deploy + functions.sql + OAuth + platform admins) on API dev boot",
    exampleValue: "",
    group: "Local dev (API)",
    requiredIn: [],
    secret: false,
    targets: [t("api")],
    turboAffectsCache: false,
  },
  {
    canonical: "BONDERY_DEV_SKIP_STORAGE_BUCKETS",
    description: "When true, skip SeaweedFS bucket ensure on API dev boot",
    exampleValue: "",
    group: "Local dev (API)",
    requiredIn: [],
    secret: false,
    targets: [t("api")],
    turboAffectsCache: false,
  },
];

/** System / pass-through vars always listed in turbo globalPassThroughEnv */
export const TURBO_SYSTEM_PASSTHROUGH = [
  "PATH",
  "WINDIR",
  "HOME",
  "USERPROFILE",
  "TMP",
  "TEMP",
  "TMPDIR",
  "NODE_ENV",
  "CI",
  "GITHUB_ACTIONS",
  "TURBO_TELEMETRY_DISABLED",
  "TURBO_TEAM",
  "TURBO_TOKEN",
  "npm_package_version",
  "METRO_MAX_WORKERS",
  "PORT",
  "LOG_LEVEL",
  "SYNC_WAKE_ENABLED",
  "NEXT_RUNTIME",
  "DO_NOT_TRACK",
  "NO_COLOR",
  "FORCE_COLOR",
] as const;

/** Infisical production keys read by sync workflow (never uploaded to Dokploy). */
export const OPS_DOKPLOY_SYNC_CONFIG_KEYS = [
  "BONDERY_OPS_DOKPLOY_HOST",
  "BONDERY_OPS_DOKPLOY_API_KEY",
  "BONDERY_OPS_DOKPLOY_OPS_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK",
  "BONDERY_OPS_DOKPLOY_SERVICES_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK",
  "BONDERY_OPS_DOKPLOY_PLAUSIBLE_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_PLAUSIBLE_DEPLOY_WEBHOOK",
  "BONDERY_OPS_DOKPLOY_STAGING_SERVICES_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK",
  "BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK",
] as const;

/** Keys never synced to deploy/bondery Dokploy compose (derived in compose or Dokploy UI). */
export const SERVICES_DOKPLOY_SYNC_EXCLUDE = new Set<string>([
  "BONDERY_INFRA_GIT_SHA",
  "BONDERY_INFRA_VERSION",
  "BONDERY_PRIVATE_S3_ENDPOINT",
  "BONDERY_PUBLIC_STORAGE_URL",
]);

export const DOKPLOY_SYNC_TARGETS = {
  plausible: {
    composeIdKey: "BONDERY_OPS_DOKPLOY_PLAUSIBLE_COMPOSE_ID",
    webhookKey: "BONDERY_OPS_DOKPLOY_PLAUSIBLE_DEPLOY_WEBHOOK",
    /** Satisfy Dokploy watch-path checks when CI triggers the deploy webhook. */
    webhookPathSentinels: ["deploy/plausible"],
  },
  services: {
    composeIdKey: "BONDERY_OPS_DOKPLOY_SERVICES_COMPOSE_ID",
    webhookKey: "BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK",
    webhookPathSentinels: ["deploy/bondery"],
  },
  "services-beta": {
    composeIdKey: "BONDERY_OPS_DOKPLOY_STAGING_SERVICES_COMPOSE_ID",
    webhookBranch: "main",
    webhookKey: "BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK",
    webhookPathSentinels: ["deploy/bondery"],
  },
  website: {
    composeIdKey: "BONDERY_OPS_DOKPLOY_OPS_COMPOSE_ID",
    webhookKey: "BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK",
    webhookPathSentinels: ["deploy/ops"],
  },
  "website-beta": {
    composeIdKey: "BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_COMPOSE_ID",
    webhookBranch: "main",
    webhookKey: "BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK",
    webhookPathSentinels: ["deploy/ops"],
  },
} as const satisfies Record<
  DokploySyncTarget,
  {
    composeIdKey: (typeof OPS_DOKPLOY_SYNC_CONFIG_KEYS)[number];
    webhookKey: (typeof OPS_DOKPLOY_SYNC_CONFIG_KEYS)[number];
    webhookPathSentinels: readonly string[];
    webhookBranch?: string;
  }
>;

/** Map Dokploy sync target to manifest payload target (beta stacks reuse production key sets). */
export function resolveDokploySyncPayloadTarget(target: DokploySyncTarget): DokploySyncTarget {
  if (target === "services-beta") {
    return "services";
  }
  if (target === "website-beta") {
    return "website";
  }
  return target;
}

/** Git ref branch for Dokploy deploy webhook payload (default release). */
export function getDokploySyncWebhookBranch(target: DokploySyncTarget): string {
  const branch = DOKPLOY_SYNC_TARGETS[target] as { webhookBranch?: string };
  return branch.webhookBranch ?? "release";
}

/** Ops secrets — GitHub Actions only; never written by `pnpm run env` */
export const OPS_ENV_VARS = [
  "BONDERY_OPS_DOKPLOY_HOST",
  "BONDERY_OPS_DOKPLOY_API_KEY",
  "BONDERY_OPS_DOKPLOY_OPS_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK",
  "BONDERY_OPS_DOKPLOY_SERVICES_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK",
  "BONDERY_OPS_DOKPLOY_PLAUSIBLE_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_PLAUSIBLE_DEPLOY_WEBHOOK",
  "BONDERY_OPS_DOKPLOY_STAGING_SERVICES_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK",
  "BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_COMPOSE_ID",
  "BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK",
  "BONDERY_OPS_CHROME_PUBLISHER_ID",
  "PRIVATE_CHROME_SERVICE_ACCOUNT_KEY_JSON",
  "PRIVATE_CHROME_PRIVATE_SIGNING_KEY",
  "BONDERY_OPS_DISCORD_WEBHOOK_URL",
  "BONDERY_OPS_GHCR_WRITE_TOKEN",
  "BONDERY_OPS_REDDIT_CLIENT_ID",
  "BONDERY_OPS_REDDIT_CLIENT_SECRET",
  "BONDERY_OPS_REDDIT_PASSWORD",
  "BONDERY_OPS_REDDIT_USERNAME",
  "BONDERY_OPS_TURBO_TEAM",
  "BONDERY_OPS_TURBO_TOKEN",
] as const;

export type DokploySyncRow = { key: string; value: string };

/** Whether a manifest entry is uploaded for the given Dokploy sync target. */
export function entrySyncsToDokployTarget(entry: EnvVarDef, target: DokploySyncTarget): boolean {
  const syncTargets = entry.dokploySync?.targets;
  if (syncTargets?.includes(target)) {
    return true;
  }

  const inheritedTarget =
    target === "website-beta" ? "website" : target === "services-beta" ? "services" : null;
  if (inheritedTarget && syncTargets?.includes(inheritedTarget)) {
    return true;
  }

  if (
    (target === "services" || target === "services-beta") &&
    entry.deployExample?.include &&
    !SERVICES_DOKPLOY_SYNC_EXCLUDE.has(entry.canonical)
  ) {
    return true;
  }

  return false;
}

/** @deprecated Use collectDokploySyncRows(env, "website") */
export function collectOpsSyncRows(env: Record<string, string>): {
  missingRequired: string[];
  rows: DokploySyncRow[];
} {
  return collectDokploySyncRows(env, "website");
}

/** Build Dokploy upload rows for a sync target from Infisical-loaded env. */
export function collectDokploySyncRows(
  env: Record<string, string>,
  target: DokploySyncTarget,
): {
  missingRequired: string[];
  rows: DokploySyncRow[];
} {
  const rows: DokploySyncRow[] = [];
  const missingRequired: string[] = [];

  for (const entry of ENV_MANIFEST) {
    if (!entrySyncsToDokployTarget(entry, target)) {
      continue;
    }

    const raw = env[entry.canonical];
    const value = raw?.trim() ?? "";

    if (entry.requiredIn.includes("production") && value === "") {
      missingRequired.push(entry.canonical);
      continue;
    }

    if (value === "") {
      continue;
    }

    rows.push({ key: entry.canonical, value });
  }

  rows.sort((a, b) => a.key.localeCompare(b.key, "en", { sensitivity: "variant" }));

  return {
    missingRequired,
    rows,
  };
}

export function applyTransform(transform: EnvTargetWrite["transform"], value: string): string {
  const base = value.replace(/\/$/, "");
  if (transform === "webapp-auth-callback") {
    return `${base}/auth/callback`;
  }
  if (transform === "local-postgres-database-url") {
    return buildLocalPostgresDatabaseUrl(value);
  }
  return value;
}

/** Manifest entries eligible for `pnpm run env:pull` (Infisical → root `.env.local`). */
export function getSyncableEnvVars(): EnvVarDef[] {
  return ENV_MANIFEST.filter((entry) => entry.syncable === true);
}

export function getRequiredVarsForTarget(
  targetId: TargetId,
  environment: EnvEnvironment,
): string[] {
  const names = new Set<string>();
  for (const entry of ENV_MANIFEST) {
    if (!entry.requiredIn.includes(environment)) {
      continue;
    }
    for (const target of entry.targets) {
      if (target.id !== targetId) {
        continue;
      }
      names.add(target.runtimeName ?? entry.canonical);
    }
  }
  return [...names].sort();
}

export function getRuntimeNamesForTarget(targetId: TargetId): string[] {
  const names = new Set<string>();
  for (const entry of ENV_MANIFEST) {
    if (entry.turboAffectsCache === false) {
      continue;
    }
    for (const target of entry.targets) {
      if (target.id !== targetId) {
        continue;
      }
      names.add(target.runtimeName ?? entry.canonical);
    }
  }
  return [...names].sort();
}

export function getAllRuntimeNames(): string[] {
  const names = new Set<string>();
  for (const entry of ENV_MANIFEST) {
    names.add(entry.canonical);
    for (const target of entry.targets) {
      names.add(target.runtimeName ?? entry.canonical);
    }
  }
  for (const name of OPS_ENV_VARS) {
    names.add(name);
  }
  return [...names].sort();
}

export function resolveCanonicalValue(
  rootEnv: Record<string, string>,
  entry: EnvVarDef,
  target: EnvTargetWrite,
): string | undefined {
  if (target.deriveFrom) {
    const source = rootEnv[target.deriveFrom];
    if (source === undefined || source === "") {
      return undefined;
    }
    return applyTransform(target.transform, source);
  }
  const value = rootEnv[entry.canonical];
  if (value === undefined) {
    return undefined;
  }
  return value;
}
