export const WEBSITE_ROUTES = {
  ABOUT: "/about",
  APP_GROUP: "/app",
  BLOG: "/blog",
  CONTACT: "/contact",
  DOCS: "/docs",
  HOME: "/",
  LOGIN: "/login",
  PRIVACY: "/privacy",
  TERMS: "/terms",
};

export const API_ROUTES = {
  ADMIN_STATS: "/api/admin/stats",
  CHAT: "/api/chat",
  CHAT_SESSIONS: "/api/chat/sessions",
  CONTACTS: "/api/contacts",
  CONTACTS_ENRICH_QUEUE_COUNT: "/api/contacts/enrich-queue/count",
  CONTACTS_IMPORT_INSTAGRAM: "/api/contacts/import/instagram",
  CONTACTS_IMPORT_LINKEDIN: "/api/contacts/import/linkedin",
  CONTACTS_IMPORT_VCARD: "/api/contacts/import/vcard",
  CONTACTS_KEEP_IN_TOUCH_COUNT: "/api/contacts/keep-in-touch/count",
  CONTACTS_MAP_ADDRESS_PINS: "/api/contacts/map-address-pins",
  CONTACTS_MAP_PINS: "/api/contacts/map-pins",
  CONTACTS_MERGE: "/api/contacts/merge",
  CONTACTS_MERGE_RECOMMENDATIONS: "/api/contacts/merge-recommendations",
  CONTACTS_MERGE_RECOMMENDATIONS_COUNT: "/api/contacts/merge-recommendations/count",
  CONTACTS_MERGE_RECOMMENDATIONS_REFRESH: "/api/contacts/merge-recommendations/refresh",
  CONTACTS_SELECT: "/api/contacts/select",
  CONTACTS_SHARE: "/api/contacts/share",
  CONTACTS_UPCOMING_REMINDERS: "/api/contacts/important-dates/upcoming",
  EXTENSION: "/api/extension",
  GEOCODE: "/api/geocode",
  GEOCODE_SUGGEST: "/api/geocode/suggest",
  GEOCODE_TIMEZONE: "/api/geocode/timezone",
  GROUPS: "/api/groups",
  INTERACTIONS: "/api/interactions",
  INTERNAL_REMINDER_DIGEST: "/api/internal/reminder-digest",
  ME: "/api/me",
  ME_API_KEYS: "/api/me/api-keys",
  ME_FEEDBACK: "/api/me/feedback",
  ME_INITIALIZE: "/api/me/initialize",
  ME_ONBOARDING_COMPLETE: "/api/me/onboarding/complete",
  ME_ONBOARDING_IMPORT_FOLLOWUP: "/api/me/onboarding/import-followup",
  ME_PERSON: "/api/me/person",
  ME_PHOTO: "/api/me/photo",
  ME_SESSION: "/api/me/session",
  ME_SETTINGS: "/api/me/settings",
  ME_SETTINGS_GETTING_STARTED_DISMISS: "/api/me/settings/getting-started-dismiss",
  SUBSCRIPTIONS: "/api/subscriptions",
  SUBSCRIPTIONS_CHECKOUT: "/api/subscriptions/checkout",
  SUBSCRIPTIONS_PORTAL: "/api/subscriptions/portal",
  SUBSCRIPTIONS_SYNC: "/api/subscriptions/sync",
  SYNC: "/api/sync",
  SYNC_BOOTSTRAP: "/api/sync/bootstrap",
  SYNC_PULL: "/api/sync/pull",
  SYNC_PUSH: "/api/sync/push",
  SYNC_WS: "/api/sync/ws",
  SYNC_WS_TICKET: "/api/sync/ws-ticket",
  TAGS: "/api/tags",
  WEBHOOKS_POLAR: "/api/webhooks/polar",
} as const;

export const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/lpcmokfekjjejnpobhbkgmjkodfhpmha";

/**
 * Minimum Chrome extension version required by the API.
 * Requests from extensions below this version receive HTTP 426 Upgrade Required.
 * Set to "0.0.0" to disable enforcement.
 */
export const MIN_EXTENSION_VERSION: string = "1.7.4";

export const HELP_DOCS_URL = "https://bondery.gitbook.io";
export const CHANGELOG_URL = `${HELP_DOCS_URL}/changelog`;

export const GITHUB_REPO_URL = "https://api.github.com/repos/usebondery/bondery";
export const STATUS_PAGE_URL = "https://bondery.openstatus.dev/";
export const SUPPORT_EMAIL = "team@usebondery.com";

/** The webapp product name used in browser tab titles and metadata. */
export const WEBAPP_NAME = "Bondery";

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
  ONBOARDING: "/app/onboarding",
  PEOPLE: "/app/people",
  PERSON: "/app/person",
  SETTINGS: "/app/settings",
  STATS: "/app/admin/stats",
  UNAVAILABLE: "/app/unavailable",
};
