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

/**
 * Lazily-built reverse map from English country display name → ISO 3166-1
 * alpha-2 code, e.g. `"United States" → "US"`.
 *
 * Built once on first call using the built-in `Intl.DisplayNames` API —
 * no extra dependencies, no network requests.
 */
let _countryNameToCode: Map<string, string> | null = null;

function getCountryNameToCodeMap(): Map<string, string> {
  if (_countryNameToCode) return _countryNameToCode;

  _countryNameToCode = new Map();
  const names = new Intl.DisplayNames(["en"], { type: "region" });

  // Iterate all known ISO 3166-1 alpha-2 codes (A–Z × A–Z)
  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i) + String.fromCharCode(j);
      try {
        const name = names.of(code);
        if (name && name !== code) {
          _countryNameToCode.set(name, code);
        }
      } catch {
        // ignore unsupported codes
      }
    }
  }

  return _countryNameToCode;
}

/** US state full name → 2-letter USPS abbreviation. */
const US_STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

/**
 * Shortens a free-text location string by:
 * 1. Replacing the trailing country name with its ISO 3166-1 alpha-2 code.
 * 2. When the country is "US", also replacing the preceding US state name
 *    with its standard USPS 2-letter abbreviation.
 *
 * Examples:
 * - `"Oregon, United States"` → `"OR, US"`
 * - `"Stanford, California, US"` → `"Stanford, CA, US"`
 * - `"Princeton, New Jersey, United States"` → `"Princeton, NJ, US"`
 * - `"Prague, Czech Republic"` → `"Prague, CZ"`
 * - `"London"` → `"London"` (no country segment, returned as-is)
 *
 * @param location - Raw location string as stored on the contact.
 * @returns Abbreviated location string, or the original if no match is found.
 */
export function abbreviateLocationCountry(location: string | null | undefined): string {
  if (!location?.trim()) return location ?? "";

  const parts = location.split(",").map((p) => p.trim());
  const lastPart = parts[parts.length - 1];

  const countryCode = getCountryNameToCodeMap().get(lastPart) ?? (lastPart === "US" ? "US" : null);
  if (!countryCode) return location;

  parts[parts.length - 1] = countryCode;

  // For US locations, also abbreviate the state segment (second-to-last part)
  if (countryCode === "US" && parts.length >= 2) {
    const stateIndex = parts.length - 2;
    const stateAbbr = US_STATE_ABBREVIATIONS[parts[stateIndex]];
    if (stateAbbr) {
      parts[stateIndex] = stateAbbr;
    }
  }

  return parts.join(", ");
}
