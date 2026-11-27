import { t } from "./manifest-targets.js";
import type { EnvVarDef } from "./manifest-types.js";

export const RUNTIME_ENTRIES: EnvVarDef[] = [
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
      "Image tag for api and webapp: production CalVer pin (X.Y.Z). Omit it to run the version the compose file names. The release workflow pins it on production Dokploy. Staging Dokploy may pin a named RC (`X.Y.Z-rc.N`) or floating `:beta` (RC cuts only). RC is not a self-host channel.",
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
    canonical: "BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR",
    deployExample: { group: "Image pin", include: true, value: "" },
    description:
      "Host folder that Traefik's file provider watches. The traefik-transport job writes the API and storage serversTransports there. Empty: Dokploy's /etc/dokploy/traefik/dynamic. Coolify: /data/coolify/proxy/dynamic. Without Traefik, use docker-compose.override.yml.example instead.",
    exampleValue: "",
    group: "Infra",
    requiredIn: [],
    secret: false,
    targets: [],
  },
  {
    canonical: "BONDERY_INFRA_INTERNAL_API_URL",
    description:
      "Webapp SSR/BFF API base URL: the API's HTTPS listener (Compose: https://${BONDERY_INFRA_TRAEFIK_PREFIX}-api:26631). Browser clients keep using BONDERY_PUBLIC_API_URL. Local dev: https://127.0.0.1:26631",
    exampleValue: "https://127.0.0.1:26631",
    group: "Infra",
    requiredIn: [],
    secret: false,
    targets: [t("webapp")],
  },
  {
    canonical: "BONDERY_INFRA_INTERNAL_API_CA_FILE",
    description:
      "Optional. PEM certificate(s) the webapp adds to the CAs it trusts for BONDERY_INFRA_INTERNAL_API_URL (https:// only). Compose sets it for the bundled stack. Local dev: created by pnpm run api:secrets; the path is relative to apps/webapp",
    exampleValue: "../../.temp/api-secrets/client/ca.crt",
    group: "Infra",
    requiredIn: [],
    secret: false,
    targets: [t("webapp")],
  },
  {
    canonical: "BONDERY_PRIVATE_API_TLS_CERT_FILE",
    deployExample: { include: false },
    description:
      "Certificate (PEM) of the API's HTTPS listener. The API serves HTTPS only and does not start without it and BONDERY_PRIVATE_API_TLS_KEY_FILE. Compose sets it for the bundled stack. Local dev: created by pnpm run api:secrets; the path is relative to apps/api",
    exampleValue: "../../.temp/api-secrets/server/tls.crt",
    group: "Infra",
    requiredIn: [],
    secret: false,
    targets: [t("api")],
  },
  {
    canonical: "BONDERY_PRIVATE_API_TLS_KEY_FILE",
    deployExample: { include: false },
    description:
      "Private key (PEM) of the API's HTTPS listener. Compose sets it for the bundled stack. Local dev: created by pnpm run api:secrets; the path is relative to apps/api",
    exampleValue: "../../.temp/api-secrets/server/tls.key",
    group: "Infra",
    requiredIn: [],
    secret: false,
    targets: [t("api")],
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
    canonical: "BONDERY_INFRA_CARDDAV_ENABLED",
    deployExample: { group: "Optional integrations (API)", include: true, value: "false" },
    description:
      "Deployment switch for CardDAV contact sync (true | false). Off by default. When off, the API registers no /dav/* and no /.well-known/carddav route, so both answer 404. Read once at boot: restart the API after a change. Also the incident kill switch.",
    exampleValue: "false",
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

  // --- Ops (build-time only) ---

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
  {
    canonical: "BONDERY_MCP_INSPECTOR_CIMD_URL",
    description:
      "Optional HTTPS Client ID Metadata URL override for `pnpm mcp:inspect` (defaults to the public MCPJam Inspector CIMD)",
    exampleValue: "",
    group: "Local dev (contributor)",
    requiredIn: [],
    secret: false,
    targets: [],
    turboAffectsCache: false,
  },
  {
    canonical: "BONDERY_DEV_MOBILE_API_URL",
    description:
      "Optional. HTTPS URL of the dev API for the mobile app, over Tailscale: https://<machine>.<tailnet>.ts.net:26631. pnpm run dev:mobile-api sets it; pnpm run env gives it to the mobile app as BONDERY_PUBLIC_API_URL. Phones and emulators cannot use the Portless URL",
    exampleValue: "",
    group: "Local dev (contributor)",
    requiredIn: [],
    secret: false,
    targets: [],
    turboAffectsCache: false,
  },
  {
    canonical: "BONDERY_DEV_TAILSCALE_HOST",
    description:
      "Optional. Tailscale MagicDNS name of this PC, for pnpm run dev:remote-laptop: <machine>.<tailnet>.ts.net. Set it when neither BONDERY_DEV_MOBILE_API_URL nor tailscale status has the name",
    exampleValue: "",
    group: "Local dev (contributor)",
    requiredIn: [],
    secret: false,
    targets: [],
    turboAffectsCache: false,
  },
  {
    canonical: "BONDERY_DEV_TLS_TEST_DATABASE_URL",
    description:
      "Optional. Owner URL of a TLS-only Postgres (host localhost) for the live TLS tests in packages/db and apps/api, for example the dev database on port 54322. Without it those tests skip",
    exampleValue: "",
    group: "Local dev (contributor)",
    requiredIn: [],
    secret: false,
    targets: [],
    turboAffectsCache: false,
  },
  {
    canonical: "BONDERY_DEV_TLS_TEST_CA_FILE",
    description:
      "Optional. CA file for BONDERY_DEV_TLS_TEST_DATABASE_URL, for example .temp/postgres-secrets/client/ca.crt",
    exampleValue: "",
    group: "Local dev (contributor)",
    requiredIn: [],
    secret: false,
    targets: [],
    turboAffectsCache: false,
  },
];
