/** Better Auth mount path on the API host (`api.example.com/auth/*`). */
export const BETTER_AUTH_BASE_PATH = "/auth" as const;

/** Path under {@link BETTER_AUTH_BASE_PATH}, e.g. `/auth/oauth2/token`. */
export function betterAuthPath(segment: string): string {
  const suffix = segment.startsWith("/") ? segment : `/${segment}`;
  return `${BETTER_AUTH_BASE_PATH}${suffix}`;
}

const OAUTH_AUTHORIZATION_SERVER_WELL_KNOWN_PATH =
  "/.well-known/oauth-authorization-server" as const;
const OPENID_CONFIGURATION_WELL_KNOWN_PATH = "/.well-known/openid-configuration" as const;

/** RFC 8414 authorization-server metadata document for the configured base path. */
export function betterAuthAuthorizationServerMetadataPath(): string {
  return `${OAUTH_AUTHORIZATION_SERVER_WELL_KNOWN_PATH}${BETTER_AUTH_BASE_PATH}`;
}

/**
 * RFC 8414 documents: path-inserted canonical plus origin-root alias.
 * Same JSON; headless clients often probe the origin-root URL.
 */
export function betterAuthAuthorizationServerMetadataPaths(): string[] {
  return [betterAuthAuthorizationServerMetadataPath(), OAUTH_AUTHORIZATION_SERVER_WELL_KNOWN_PATH];
}

/** OIDC discovery document under the Better Auth base path. */
export function betterAuthOpenIdConfigurationPath(): string {
  return betterAuthPath(OPENID_CONFIGURATION_WELL_KNOWN_PATH);
}

/**
 * OIDC discovery documents: `/auth` canonical plus origin-root and
 * path-inserted aliases for issuer `{API}/auth`.
 */
export function betterAuthOpenIdConfigurationPaths(): string[] {
  return [
    betterAuthOpenIdConfigurationPath(),
    OPENID_CONFIGURATION_WELL_KNOWN_PATH,
    `${OPENID_CONFIGURATION_WELL_KNOWN_PATH}${BETTER_AUTH_BASE_PATH}`,
  ];
}

/** RFC 9728 protected-resource metadata (root document). */
export const BETTER_AUTH_PROTECTED_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource" as const;

function betterAuthResourcePath(resourcePath: string): string {
  return resourcePath.startsWith("/") ? resourcePath.replace(/\/+$/, "") : `/${resourcePath}`;
}

/**
 * RFC 9728 paths: Better Auth `mcp()` root + path-inserted documents, plus the
 * `{resourcePath}/.well-known/oauth-protected-resource` concatenation some
 * clients build from the MCP URL.
 */
export function betterAuthProtectedResourceMetadataPaths(resourcePath = "/mcp"): string[] {
  const inserted = betterAuthResourcePath(resourcePath);
  return [
    BETTER_AUTH_PROTECTED_RESOURCE_METADATA_PATH,
    `${BETTER_AUTH_PROTECTED_RESOURCE_METADATA_PATH}${inserted}`,
    `${inserted}${BETTER_AUTH_PROTECTED_RESOURCE_METADATA_PATH}`,
  ];
}

/**
 * Every public OAuth/OIDC discovery path (canonical + aliases). Keep Fastify
 * routes and the unauthenticated allowlist in lockstep via this list.
 */
export function publicOAuthDiscoveryPaths(): string[] {
  return [
    ...betterAuthAuthorizationServerMetadataPaths(),
    ...betterAuthOpenIdConfigurationPaths(),
    ...betterAuthProtectedResourceMetadataPaths(),
  ];
}

export const WEBSITE_ROUTES = {
  ABOUT: "/about",
  API_REFERENCE: "/api-reference",
  APP_GROUP: "/app",
  BLOG: "/blog",
  CONTACT: "/contact",
  DOCS: "/docs",
  DOCS_API_REFERENCE: "/docs/api/api-reference",
  HOME: "/",
  LLMS_TXT: "/llms.txt",
  LOGIN: "/login",
  PRIVACY: "/privacy",
  SECURITY: "/security",
  TERMS: "/terms",
  WELL_KNOWN_LLMS_TXT: "/.well-known/llms.txt",
  WELL_KNOWN_MCP: "/.well-known/mcp",
  WELL_KNOWN_MCP_REGISTRY_AUTH: "/.well-known/mcp-registry-auth",
};

export const API_ROUTES = {
  API_REFERENCE: "/api-reference",
  CHAT: "/chat",
  CHAT_SESSIONS: "/chat/sessions",
  CONTACTS: "/contacts",
  CONTACTS_ENRICH_QUEUE_COUNT: "/contacts/enrich-queue/count",
  CONTACTS_IMPORT_INSTAGRAM: "/contacts/import/instagram",
  CONTACTS_IMPORT_LINKEDIN: "/contacts/import/linkedin",
  CONTACTS_IMPORT_VCARD: "/contacts/import/vcard",
  CONTACTS_KEEP_IN_TOUCH_COUNT: "/contacts/keep-in-touch/count",
  CONTACTS_MAP_ADDRESS_PINS: "/contacts/map-address-pins",
  CONTACTS_MAP_PINS: "/contacts/map-pins",
  CONTACTS_MERGE: "/contacts/merge",
  CONTACTS_MERGE_AVATARS: "/contacts/merge/avatars",
  CONTACTS_MERGE_RECOMMENDATIONS: "/contacts/merge-recommendations",
  CONTACTS_MERGE_RECOMMENDATIONS_COUNT: "/contacts/merge-recommendations/count",
  CONTACTS_MERGE_RECOMMENDATIONS_REFRESH: "/contacts/merge-recommendations/refresh",
  CONTACTS_SELECT: "/contacts/select",
  CONTACTS_SHARE: "/contacts/share",
  CONTACTS_UPCOMING_REMINDERS: "/contacts/important-dates/upcoming",
  DOCS_API: "/docs/api",
  EXTENSION: "/extension",
  GEOCODE: "/geocode",
  GEOCODE_SUGGEST: "/geocode/suggest",
  GEOCODE_TIMEZONE: "/geocode/timezone",
  GROUPS: "/groups",
  INTERACTIONS: "/interactions",
  MCP: "/mcp",
  ME: "/me",
  ME_API_KEYS: "/me/api-keys",
  ME_EXPORT: "/me/export",
  ME_EXPORT_SUMMARY: "/me/export/summary",
  ME_FEEDBACK: "/me/feedback",
  ME_IMPORT: "/me/import",
  ME_INITIALIZE: "/me/initialize",
  ME_MCP_CONSENTS: "/me/mcp-consents",
  ME_ONBOARDING_COMPLETE: "/me/onboarding/complete",
  ME_ONBOARDING_IMPORT_FOLLOWUP: "/me/onboarding/import-followup",
  ME_PERSON: "/me/person",
  ME_PHOTO: "/me/photo",
  ME_SESSION: "/me/session",
  ME_SETTINGS: "/me/settings",
  ME_SETTINGS_GETTING_STARTED_DISMISS: "/me/settings/getting-started-dismiss",
  ME_STEP_UP: "/me/step-up",
  OAUTH_PROVIDERS: "/oauth-providers",
  SUBSCRIPTIONS: "/subscriptions",
  SUBSCRIPTIONS_CHECKOUT: "/subscriptions/checkout",
  SUBSCRIPTIONS_PORTAL: "/subscriptions/portal",
  SUBSCRIPTIONS_SYNC: "/subscriptions/sync",
  SYNC: "/sync",
  SYNC_BOOTSTRAP: "/sync/bootstrap",
  SYNC_PULL: "/sync/pull",
  SYNC_PUSH: "/sync/push",
  SYNC_WS: "/sync/ws",
  SYNC_WS_TICKET: "/sync/ws-ticket",
  TAGS: "/tags",
  WEBHOOKS_STRIPE: "/webhooks/stripe",
  WELL_KNOWN_MCP: "/.well-known/mcp",
} as const;

/** Browser-facing BFF path on the webapp origin (`/api/...`). */
export function toBffApiPath(apiPath: string): string {
  const normalized = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  if (normalized.startsWith("/api/")) {
    return normalized;
  }

  return `/api${normalized}`;
}

export const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/lpcmokfekjjejnpobhbkgmjkodfhpmha";

/**
 * Minimum Chrome extension version required by the API (HTTP 426 floor).
 * Always 3-part CalVer. Generated by `pnpm run sync-version` from the previous
 * production git tag — never the version being shipped, never Chrome 4-part.
 * Do not hand-edit. Set to "0.0.0" only to disable enforcement locally.
 */
export const MIN_EXTENSION_VERSION: string = "1.10.0";

/** One-shot account-delete nonce. Browser → BFF and BFF → API must forward it. */
export const BONDERY_STEP_UP_HEADER = "X-Bondery-Step-Up" as const;

export const HELP_DOCS_URL = "https://usebondery.com/docs";
export const CHANGELOG_URL = `${HELP_DOCS_URL}/changelog`;

export const GITHUB_REPO_URL = "https://api.github.com/repos/usebondery/bondery";
export const PUBLIC_ROADMAP_PLANE_URL =
  "https://sites.plane.so/issues/8a364296fbbc4c858adeb1952a72a451";
export const ROADMAP_URL = "https://usebondery.com/roadmap";
export const STATUS_PAGE_URL = "https://bondery.openstatus.dev/";
export const SUPPORT_EMAIL = "team@usebondery.com";

/** The webapp product name used in browser tab titles and metadata. */
export const WEBAPP_NAME = "Bondery";

/** Display name used in the web app manifest and browser install UI. */
export const PWA_APP_NAME = `${WEBAPP_NAME} PWA`;

/** Divider character used in browser tab titles, e.g. "Person • Bondery" */
export const METADATA_TITLE_DIVIDER = "•";

/**
 * Formats a page title for use in browser tab metadata.
 *
 * @param pageTitle - The page-specific title (e.g. a person's name or group label).
 * @returns A combined title string in the format "pageTitle ∘ Bondery".
 */
export function formatMetadataTitle(pageTitle: string): string {
  return `${pageTitle} ${METADATA_TITLE_DIVIDER} ${WEBAPP_NAME}`;
}

export const SOCIAL_LINKS = {
  discord: "https://discord.gg/vsTAMBMwxx",
  github: "https://github.com/usebondery/bondery",
  linkedin: "https://www.linkedin.com/company/bondery",
  reddit: "https://www.reddit.com/r/bondery",
  x: "https://x.com/usebondery",
} as const;

export const WEBAPP_ROUTES = {
  ACCOUNT: "/app/account",
  APP_GROUP: "/app",
  CHAT: "/app/chat",
  DEFAULT_PAGE_AFTER_LOGIN: "/app/home",
  FIX_CONTACTS: "/app/fix",
  GROUPS: "/app/groups",
  HOME: "/app/home",
  INTERACTIONS: "/app/interactions",
  KEEP_IN_TOUCH: "/app/keep-in-touch",
  LOGIN: "/login",
  MAP: "/app/map",
  MYSELF: "/app/myself",
  /** Authorization-server login continuation — see oauthProvider.loginPage. */
  OAUTH_LOGIN: "/oauth/login",
  ONBOARDING: "/app/onboarding",
  PEOPLE: "/app/people",
  PERSON: "/app/person",
  SETTINGS: "/app/settings",
  UNAVAILABLE: "/app/unavailable",
  WELL_KNOWN_CHANGE_PASSWORD: "/.well-known/change-password",
};
