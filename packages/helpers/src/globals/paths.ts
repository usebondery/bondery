export const WEBSITE_ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  BLOG: "/blog",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  LOGIN: "/login",
  CONTACT: "/contact",
  APP_GROUP: "/app",
  DOCS: "/docs",
};

export const API_ROUTES = {
  CONTACTS: "/api/contacts",
  CONTACTS_MAP_PINS: "/api/contacts/map-pins",
  CONTACTS_MAP_ADDRESS_PINS: "/api/contacts/map-address-pins",
  CONTACTS_MERGE: "/api/contacts/merge",
  CONTACTS_MERGE_RECOMMENDATIONS: "/api/contacts/merge-recommendations",
  CONTACTS_MERGE_RECOMMENDATIONS_REFRESH: "/api/contacts/merge-recommendations/refresh",
  CONTACTS_UPCOMING_REMINDERS: "/api/contacts/important-dates/upcoming",
  CONTACTS_IMPORT_LINKEDIN: "/api/contacts/import/linkedin",
  CONTACTS_IMPORT_INSTAGRAM: "/api/contacts/import/instagram",
  CONTACTS_IMPORT_VCARD: "/api/contacts/import/vcard",
  GROUPS: "/api/groups",
  TAGS: "/api/tags",
  INTERACTIONS: "/api/interactions",
  ME: "/api/me",
  ME_PERSON: "/api/me/person",
  ME_PHOTO: "/api/me/photo",
  ME_SETTINGS: "/api/me/settings",
  ME_FEEDBACK: "/api/me/feedback",
  INTERNAL_REMINDER_DIGEST: "/api/internal/reminder-digest",
  EXTENSION: "/api/extension",
  CONTACTS_SHARE: "/api/contacts/share",
  ADMIN_STATS: "/api/admin/stats",
} as const;

export const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/lpcmokfekjjejnpobhbkgmjkodfhpmha";

/**
 * Minimum Chrome extension version required by the API.
 * Requests from extensions below this version receive HTTP 426 Upgrade Required.
 * Set to "0.0.0" to disable enforcement.
 */
export const MIN_EXTENSION_VERSION: string = "1.4.1";

export const HELP_DOCS_URL = "https://bondery.gitbook.io";

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
  github: "https://github.com/usebondery/bondery",
  linkedin: "https://www.linkedin.com/company/bondery",
  reddit: "https://www.reddit.com/r/bondery",
  x: "https://x.com/usebondery",
  discord: "https://discord.gg/vsTAMBMwxx",
} as const;

export const WEBAPP_ROUTES = {
  HOME: "/app/home",
  MAP: "/app/map",
  PEOPLE: "/app/people",
  KEEP_IN_TOUCH: "/app/keep-in-touch",
  FIX_CONTACTS: "/app/fix",
  GROUPS: "/app/groups",
  INTERACTIONS: "/app/interactions",
  PERSON: "/app/person",
  MYSELF: "/app/myself",
  SETTINGS: "/app/settings",
  ACCOUNT: "/app/account",
  STATS: "/app/admin/stats",
  LOGIN: "/login",
  APP_GROUP: "/app",
  DEFAULT_PAGE_AFTER_LOGIN: "/app/home",
};
