/**
 * LinkedIn Full History Fetcher
 *
 * Strategy (in order):
 * 1. Resolve profileUrn from SDUI topcard componentkey (primary)
 * 2. Mine embedded `<code>` JSON blocks for Voyager data (secondary URN source)
 * 3. Voyager dash REST API endpoints with CSRF auth
 * 4. Return [] so the caller falls back to SDUI DOM scraping
 *
 * Isolated-world `fetch` is extension-origin (`chrome-extension://…`), not the
 * LinkedIn page. `credentials: "same-origin"` therefore omits `li_at` /
 * `JSESSIONID` and Voyager returns empty. Use `include` so host_permissions
 * send the page session cookies.
 */

export { fetchFullEducation } from "./fetchDetails/educationFetch";
export { fetchProfileLocation, fetchVoyagerProfileMeta } from "./fetchDetails/profileLocation";
export { fetchFullWorkHistory } from "./fetchDetails/workHistoryFetch";
