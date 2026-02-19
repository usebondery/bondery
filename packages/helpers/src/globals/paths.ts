export const WEBSITE_ROUTES = {
  HOME: "/",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  LOGIN: "/login",
  CONTACT: "/contact",
  APP_GROUP: "/app",
};

export const API_ROUTES = {
  CONTACTS: "/api/contacts",
  CONTACTS_IMPORT_LINKEDIN: "/api/contacts/import/linkedin",
  CONTACTS_IMPORT_INSTAGRAM: "/api/contacts/import/instagram",
  GROUPS: "/api/groups",
  ACTIVITIES: "/api/activities",
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

export const GITHUB_REPO_URL = "https://api.github.com/repos/usebondery/bondery";

export const WEBAPP_ROUTES = {
  PEOPLE: "/app/people",
  GROUPS: "/app/groups",
  TIMELINE: "/app/timeline",
  PERSON: "/app/person",
  SETTINGS: "/app/settings",
  ACCOUNT: "/app/account",
  FEEDBACK: "/app/feedback",
  LOGIN: "/login",
  APP_GROUP: "/app",
  DEFAULT_PAGE_AFTER_LOGIN: "/app/people",
};
