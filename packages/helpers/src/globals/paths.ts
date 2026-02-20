export const WEBSITE_ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  LOGIN: "/login",
  CONTACT: "/contact",
  APP_GROUP: "/app",
};

export const API_ROUTES = {
  CONTACTS: "/api/contacts",
  CONTACTS_UPCOMING_REMINDERS: "/api/contacts/important-events/upcoming",
  CONTACTS_IMPORT_LINKEDIN: "/api/contacts/import/linkedin",
  CONTACTS_IMPORT_INSTAGRAM: "/api/contacts/import/instagram",
  GROUPS: "/api/groups",
  EVENTS: "/api/events",
  SETTINGS: "/api/settings",
  ACCOUNT: "/api/account",
  ACCOUNT_PERSON: "/api/account/person",
  ACCOUNT_PHOTO: "/api/account/photo",
  FEEDBACK: "/api/feedback",
  REMINDERS: "/api/reminders",
  REDIRECT: "/api/redirect",
} as const;

export const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/lpcmokfekjjejnpobhbkgmjkodfhpmha";

export const HELP_DOCS_URL = "https://bondery.gitbook.io";

export const GITHUB_REPO_URL = "https://api.github.com/repos/usebondery/bondery";
export const STATUS_PAGE_URL = "https://bondery.openstatus.dev/";
export const SUPPORT_EMAIL = "team@usebondery.com";

export const SOCIAL_LINKS = {
  github: "https://github.com/usebondery/bondery",
  linkedin: "https://www.linkedin.com/company/bondery",
  reddit: "https://www.reddit.com/r/bondery",
  x: "https://x.com/usebondery",
} as const;

export const WEBAPP_ROUTES = {
  HOME: "/app/home",
  PEOPLE: "/app/people",
  GROUPS: "/app/groups",
  TIMELINE: "/app/timeline",
  PERSON: "/app/person",
  SETTINGS: "/app/settings",
  ACCOUNT: "/app/account",
  FEEDBACK: "/app/feedback",
  LOGIN: "/login",
  APP_GROUP: "/app",
  DEFAULT_PAGE_AFTER_LOGIN: "/app/home",
};
