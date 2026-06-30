/**
 * Online-only API (tier 2/3). Domain CRUD uses lib/domains/* + SQLite sync.
 */
export {
  buildContactVCardFilename,
  deleteContactPhoto,
  deleteMyAccount,
  fetchContactVCard,
  fetchGeocodeSuggestions,
  fetchSettings,
  shareContactEmail,
  updateSettings,
  uploadContactPhoto,
} from "./online-only";

export { apiRequest, getBearerHeaders } from "./transport";
