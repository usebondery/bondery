/**
 * Shared address / location formatting helpers.
 *
 * These produce consistent, human-readable strings from structured address
 * fields.  Both the API server and the webapp import from here so the format
 * stays in sync.
 */

/** Input fields accepted by {@link formatPlaceLabel}. */
export interface PlaceLabelFields {
  city?: string | null;
  state?: string | null;
  countryCode?: string | null;
}

/** Input fields accepted by {@link formatAddressLabel}. */
export interface AddressLabelFields {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  state?: string | null;
  countryCode?: string | null;
}

/**
 * Formats a location into a compact location label such as
 * `"Brno, South Moravian Region, CZ"`.
 *
 * Missing parts are silently skipped — e.g. if only `city` and `countryCode`
 * are set the result is `"Brno, CZ"`.  Returns an empty string when every
 * field is null/undefined/empty.
 *
 * @param fields - Structured location fields (all optional).
 * @returns Comma-separated label, or `""`.
 */
export function formatPlaceLabel(fields: PlaceLabelFields): string {
  const parts: string[] = [];

  if (fields.city?.trim()) parts.push(fields.city.trim());
  if (fields.state?.trim()) parts.push(fields.state.trim());
  if (fields.countryCode?.trim()) parts.push(fields.countryCode.trim());

  return parts.join(", ");
}

/**
 * Formats a full address into a single-line label such as
 * `"Hlavní 5, Apt 3, Brno 60200, South Moravian Region, CZ"`.
 *
 * City and postal code are joined with a space (`"Brno 60200"`).  If only one
 * of them is available it appears alone.  All other null/empty segments are
 * silently omitted.
 *
 * @param fields - Structured address fields (all optional).
 * @returns Comma-separated label, or `""`.
 */
export function formatAddressLabel(fields: AddressLabelFields): string {
  const parts: string[] = [];

  if (fields.addressLine1?.trim()) parts.push(fields.addressLine1.trim());
  if (fields.addressLine2?.trim()) parts.push(fields.addressLine2.trim());

  // City + postal code grouped together: "Brno 60200"
  const city = fields.city?.trim() ?? "";
  const zip = fields.postalCode?.trim() ?? "";
  const cityZip = [city, zip].filter(Boolean).join(" ");
  if (cityZip) parts.push(cityZip);

  if (fields.state?.trim()) parts.push(fields.state.trim());
  if (fields.countryCode?.trim()) parts.push(fields.countryCode.trim());

  return parts.join(", ");
}
