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
 * LinkedIn schools are also company entities. Numeric IDs come from `fsd_company`
 * URNs and resolve under the `/company/` path. Named slugs (universalName) use the
 * `/school/` path.
 *
 * @param id The school handle or numeric ID (e.g. "university-of-michigan" or "15092563").
 * @returns Full URL (e.g. "https://www.linkedin.com/company/15092563/"), or null.
 */
export function linkedinSchoolUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  // Numeric IDs originate from company URNs (urn:li:fsd_company:N) → /company/ URL
  // Named slugs originate from miniSchool.universalName → /school/ URL
  if (/^\d+$/.test(id)) return `https://www.linkedin.com/company/${id}/`;
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
