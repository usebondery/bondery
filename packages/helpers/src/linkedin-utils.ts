/**
 * LinkedIn URL utilities.
 *
 * Derives canonical LinkedIn profile/company/school URLs from the stored
 * identifier (handle or numeric ID). This keeps the database lean — only the
 * identifier is persisted and the full URL is reconstructed on demand.
 */

/**
 * Builds the canonical LinkedIn company URL from a stored identifier.
 *
 * @param id The company handle or numeric ID (e.g. "zs-associates" or "960796").
 * @returns Full URL (e.g. "https://www.linkedin.com/company/zs-associates/"), or null.
 */
export function linkedinCompanyUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  return `https://www.linkedin.com/company/${id}/`;
}

/**
 * Builds the canonical LinkedIn school URL from a stored identifier.
 *
 * @param id The school handle or numeric ID (e.g. "university-of-michigan" or "18915").
 * @returns Full URL (e.g. "https://www.linkedin.com/school/university-of-michigan/"), or null.
 */
export function linkedinSchoolUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  return `https://www.linkedin.com/school/${id}/`;
}

/**
 * Extracts the handle/slug from a full LinkedIn company or school URL.
 * e.g. "https://www.linkedin.com/company/zs-associates/" → "zs-associates"
 *      "https://www.linkedin.com/school/university-of-michigan/" → "university-of-michigan"
 *
 * Returns the input unchanged if it does not match a LinkedIn URL pattern
 * (i.e. it is already a plain identifier).
 *
 * @param urlOrId A full LinkedIn URL or a bare handle/ID.
 * @returns The extracted handle/ID, or null if input is falsy.
 */
export function extractLinkedinId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const match = urlOrId.match(
    /linkedin\.com\/(?:company|school|organization|showcase)\/([^/?#]+)/i,
  );
  return match ? match[1].toLowerCase() : urlOrId;
}
