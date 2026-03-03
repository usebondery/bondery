export {
  WEBSITE_ROUTES,
  API_ROUTES,
  WEBAPP_ROUTES,
  GITHUB_REPO_URL,
  CHROME_EXTENSION_URL,
  HELP_DOCS_URL,
  SUPPORT_EMAIL,
  STATUS_PAGE_URL,
  SOCIAL_LINKS,
} from "./globals/paths.js";
export { SOCIAL_PLATFORM_URL_DETAILS } from "./globals/social-platform-urls.js";
export { IMPORTANT_EVENT_TYPE_META } from "./globals/important-events.js";
export { parseInstagramUsername } from "./instagram/parseInstagramUsername.js";
export type {
  ParseInstagramUsernameInput,
  ParsedInstagramName,
} from "./instagram/parseInstagramUsername.js";
export { stripEmojis, stripNameTitles, extractNameParts, cleanPersonName } from "./name-utils.js";
