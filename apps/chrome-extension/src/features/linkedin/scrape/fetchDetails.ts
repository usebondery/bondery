/**
 * LinkedIn Full History Fetcher
 *
 * Strategy (in order):
 * 1. Resolve profileUrn from SDUI topcard componentkey (primary)
 * 2. Mine embedded `<code>` JSON blocks for Voyager data (secondary URN source)
 * 3. Voyager dash REST API endpoints with CSRF auth
 * 4. Return [] so the caller falls back to SDUI DOM scraping
 *
 * The content script runs on linkedin.com, so both approaches have full
 * cookie / same-origin access.
 */

export { fetchFullEducation } from "./fetchDetails/educationFetch";
export { fetchProfileLocation } from "./fetchDetails/profileLocation";
export { fetchFullWorkHistory } from "./fetchDetails/workHistoryFetch";
