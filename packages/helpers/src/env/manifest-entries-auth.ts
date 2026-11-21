import { t } from "./manifest-targets.js";
import type { EnvVarDef } from "./manifest-types.js";

export const AUTH_ENTRIES: EnvVarDef[] = [
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
    canonical: "BONDERY_AUTH_REVIEWER_EMAIL",
    deployExample: {
      commented: true,
      group: "Better Auth",
      include: true,
      value: "",
    },
    description:
      "Optional reviewer magic-link address. Empty disables reviewer sign-in. The value stays in Infisical.",
    dokploySync: { targets: ["services"] },
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
];
