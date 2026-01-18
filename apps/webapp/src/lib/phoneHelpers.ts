/**
 * Phone number utilities and country codes
 */

export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  { code: "US", name: "United States", dialCode: "+1", flag: "us" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "ca" },
  { code: "AG", name: "Antigua and Barbuda", dialCode: "+1-268", flag: "ag" },
  { code: "AI", name: "Anguilla", dialCode: "+1-264", flag: "ai" },
  { code: "AS", name: "American Samoa", dialCode: "+1-684", flag: "as" },
  { code: "BB", name: "Barbados", dialCode: "+1-246", flag: "bb" },
  { code: "BM", name: "Bermuda", dialCode: "+1-441", flag: "bm" },
  { code: "BS", name: "Bahamas", dialCode: "+1-242", flag: "bs" },
  { code: "DM", name: "Dominica", dialCode: "+1-767", flag: "dm" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1-809", flag: "do" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1-829", flag: "do" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1-849", flag: "do" },
  { code: "GD", name: "Grenada", dialCode: "+1-473", flag: "gd" },
  { code: "GU", name: "Guam", dialCode: "+1-671", flag: "gu" },
  { code: "JM", name: "Jamaica", dialCode: "+1-876", flag: "jm" },
  { code: "KN", name: "Saint Kitts and Nevis", dialCode: "+1-869", flag: "kn" },
  { code: "KY", name: "Cayman Islands", dialCode: "+1-345", flag: "ky" },
  { code: "LC", name: "Saint Lucia", dialCode: "+1-758", flag: "lc" },
  {
    code: "MP",
    name: "Northern Mariana Islands",
    dialCode: "+1-670",
    flag: "mp",
  },
  { code: "MS", name: "Montserrat", dialCode: "+1-664", flag: "ms" },
  { code: "PR", name: "Puerto Rico", dialCode: "+1-787", flag: "pr" },
  { code: "PR", name: "Puerto Rico", dialCode: "+1-939", flag: "pr" },
  { code: "SX", name: "Sint Maarten", dialCode: "+1-721", flag: "sx" },
  {
    code: "TC",
    name: "Turks and Caicos Islands",
    dialCode: "+1-649",
    flag: "tc",
  },
  { code: "TT", name: "Trinidad and Tobago", dialCode: "+1-868", flag: "tt" },
  {
    code: "VC",
    name: "Saint Vincent and the Grenadines",
    dialCode: "+1-784",
    flag: "vc",
  },
  {
    code: "VG",
    name: "British Virgin Islands",
    dialCode: "+1-284",
    flag: "vg",
  },
  { code: "VI", name: "U.S. Virgin Islands", dialCode: "+1-340", flag: "vi" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "gb" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "de" },
  { code: "FR", name: "France", dialCode: "+33", flag: "fr" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "it" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "es" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "ru" },
  { code: "KZ", name: "Kazakhstan", dialCode: "+7", flag: "kz" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "eg" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "za" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "gr" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "nl" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "be" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "pt" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "ie" },
  { code: "LU", name: "Luxembourg", dialCode: "+352", flag: "lu" },
  { code: "IS", name: "Iceland", dialCode: "+354", flag: "is" },
  { code: "AL", name: "Albania", dialCode: "+355", flag: "al" },
  { code: "MT", name: "Malta", dialCode: "+356", flag: "mt" },
  { code: "CY", name: "Cyprus", dialCode: "+357", flag: "cy" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "fi" },
  { code: "BG", name: "Bulgaria", dialCode: "+359", flag: "bg" },
  { code: "HU", name: "Hungary", dialCode: "+36", flag: "hu" },
  { code: "LT", name: "Lithuania", dialCode: "+370", flag: "lt" },
  { code: "LV", name: "Latvia", dialCode: "+371", flag: "lv" },
  { code: "EE", name: "Estonia", dialCode: "+372", flag: "ee" },
  { code: "MD", name: "Moldova", dialCode: "+373", flag: "md" },
  { code: "AM", name: "Armenia", dialCode: "+374", flag: "am" },
  { code: "BY", name: "Belarus", dialCode: "+375", flag: "by" },
  { code: "AD", name: "Andorra", dialCode: "+376", flag: "ad" },
  { code: "MC", name: "Monaco", dialCode: "+377", flag: "mc" },
  { code: "SM", name: "San Marino", dialCode: "+378", flag: "sm" },
  { code: "VA", name: "Vatican City", dialCode: "+379", flag: "va" },
  { code: "UA", name: "Ukraine", dialCode: "+380", flag: "ua" },
  { code: "RS", name: "Serbia", dialCode: "+381", flag: "rs" },
  { code: "ME", name: "Montenegro", dialCode: "+382", flag: "me" },
  { code: "HR", name: "Croatia", dialCode: "+385", flag: "hr" },
  { code: "SI", name: "Slovenia", dialCode: "+386", flag: "si" },
  { code: "BA", name: "Bosnia and Herzegovina", dialCode: "+387", flag: "ba" },
  { code: "MK", name: "North Macedonia", dialCode: "+389", flag: "mk" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "cz" },
  { code: "SK", name: "Slovakia", dialCode: "+421", flag: "sk" },
  { code: "LI", name: "Liechtenstein", dialCode: "+423", flag: "li" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "at" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "gb" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "dk" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "se" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "no" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "pl" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "de" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "pe" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "mx" },
  { code: "CU", name: "Cuba", dialCode: "+53", flag: "cu" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "ar" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "br" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "cl" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "co" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "ve" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "my" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "au" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "id" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "ph" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "nz" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "sg" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "th" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "jp" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "kr" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "vn" },
  { code: "CN", name: "China", dialCode: "+86", flag: "cn" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "tr" },
  { code: "IN", name: "India", dialCode: "+91", flag: "in" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "pk" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", flag: "af" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "lk" },
  { code: "MM", name: "Myanmar", dialCode: "+95", flag: "mm" },
  { code: "IR", name: "Iran", dialCode: "+98", flag: "ir" },
  { code: "SS", name: "South Sudan", dialCode: "+211", flag: "ss" },
  { code: "MA", name: "Morocco", dialCode: "+212", flag: "ma" },
  { code: "DZ", name: "Algeria", dialCode: "+213", flag: "dz" },
  { code: "TN", name: "Tunisia", dialCode: "+216", flag: "tn" },
  { code: "LY", name: "Libya", dialCode: "+218", flag: "ly" },
  { code: "GM", name: "Gambia", dialCode: "+220", flag: "gm" },
  { code: "SN", name: "Senegal", dialCode: "+221", flag: "sn" },
  { code: "MR", name: "Mauritania", dialCode: "+222", flag: "mr" },
  { code: "ML", name: "Mali", dialCode: "+223", flag: "ml" },
  { code: "GN", name: "Guinea", dialCode: "+224", flag: "gn" },
  { code: "CI", name: "Ivory Coast", dialCode: "+225", flag: "ci" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", flag: "bf" },
  { code: "NE", name: "Niger", dialCode: "+227", flag: "ne" },
  { code: "TG", name: "Togo", dialCode: "+228", flag: "tg" },
  { code: "BJ", name: "Benin", dialCode: "+229", flag: "bj" },
  { code: "MU", name: "Mauritius", dialCode: "+230", flag: "mu" },
  { code: "LR", name: "Liberia", dialCode: "+231", flag: "lr" },
  { code: "SL", name: "Sierra Leone", dialCode: "+232", flag: "sl" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "gh" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "ng" },
  { code: "TD", name: "Chad", dialCode: "+235", flag: "td" },
  {
    code: "CF",
    name: "Central African Republic",
    dialCode: "+236",
    flag: "cf",
  },
  { code: "CM", name: "Cameroon", dialCode: "+237", flag: "cm" },
  { code: "CV", name: "Cape Verde", dialCode: "+238", flag: "cv" },
  { code: "ST", name: "Sao Tome and Principe", dialCode: "+239", flag: "st" },
  { code: "GQ", name: "Equatorial Guinea", dialCode: "+240", flag: "gq" },
  { code: "GA", name: "Gabon", dialCode: "+241", flag: "ga" },
  { code: "CG", name: "Republic of the Congo", dialCode: "+242", flag: "cg" },
  {
    code: "CD",
    name: "Democratic Republic of the Congo",
    dialCode: "+243",
    flag: "cd",
  },
  { code: "AO", name: "Angola", dialCode: "+244", flag: "ao" },
  { code: "GW", name: "Guinea-Bissau", dialCode: "+245", flag: "gw" },
  {
    code: "IO",
    name: "British Indian Ocean Territory",
    dialCode: "+246",
    flag: "io",
  },
  { code: "SC", name: "Seychelles", dialCode: "+248", flag: "sc" },
  { code: "SD", name: "Sudan", dialCode: "+249", flag: "sd" },
  { code: "RW", name: "Rwanda", dialCode: "+250", flag: "rw" },
  { code: "ET", name: "Ethiopia", dialCode: "+251", flag: "et" },
  { code: "SO", name: "Somalia", dialCode: "+252", flag: "so" },
  { code: "DJ", name: "Djibouti", dialCode: "+253", flag: "dj" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "ke" },
  { code: "TZ", name: "Tanzania", dialCode: "+255", flag: "tz" },
  { code: "UG", name: "Uganda", dialCode: "+256", flag: "ug" },
  { code: "BI", name: "Burundi", dialCode: "+257", flag: "bi" },
  { code: "MZ", name: "Mozambique", dialCode: "+258", flag: "mz" },
  { code: "ZM", name: "Zambia", dialCode: "+260", flag: "zm" },
  { code: "MG", name: "Madagascar", dialCode: "+261", flag: "mg" },
  { code: "RE", name: "Réunion", dialCode: "+262", flag: "re" },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263", flag: "zw" },
  { code: "NA", name: "Namibia", dialCode: "+264", flag: "na" },
  { code: "MW", name: "Malawi", dialCode: "+265", flag: "mw" },
  { code: "LS", name: "Lesotho", dialCode: "+266", flag: "ls" },
  { code: "BW", name: "Botswana", dialCode: "+267", flag: "bw" },
  { code: "SZ", name: "Eswatini", dialCode: "+268", flag: "sz" },
  { code: "KM", name: "Comoros", dialCode: "+269", flag: "km" },
  { code: "SH", name: "Saint Helena", dialCode: "+290", flag: "sh" },
  { code: "ER", name: "Eritrea", dialCode: "+291", flag: "er" },
  { code: "AW", name: "Aruba", dialCode: "+297", flag: "aw" },
  { code: "FO", name: "Faroe Islands", dialCode: "+298", flag: "fo" },
  { code: "GL", name: "Greenland", dialCode: "+299", flag: "gl" },
  { code: "GI", name: "Gibraltar", dialCode: "+350", flag: "gi" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "pt" },
  { code: "LU", name: "Luxembourg", dialCode: "+352", flag: "lu" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "ie" },
  { code: "IS", name: "Iceland", dialCode: "+354", flag: "is" },
  { code: "AL", name: "Albania", dialCode: "+355", flag: "al" },
  { code: "MT", name: "Malta", dialCode: "+356", flag: "mt" },
  { code: "CY", name: "Cyprus", dialCode: "+357", flag: "cy" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "fi" },
  { code: "BG", name: "Bulgaria", dialCode: "+359", flag: "bg" },
  { code: "LT", name: "Lithuania", dialCode: "+370", flag: "lt" },
  { code: "LV", name: "Latvia", dialCode: "+371", flag: "lv" },
  { code: "EE", name: "Estonia", dialCode: "+372", flag: "ee" },
  { code: "MD", name: "Moldova", dialCode: "+373", flag: "md" },
  { code: "AM", name: "Armenia", dialCode: "+374", flag: "am" },
  { code: "BY", name: "Belarus", dialCode: "+375", flag: "by" },
  { code: "AD", name: "Andorra", dialCode: "+376", flag: "ad" },
  { code: "MC", name: "Monaco", dialCode: "+377", flag: "mc" },
  { code: "SM", name: "San Marino", dialCode: "+378", flag: "sm" },
  { code: "VA", name: "Vatican City", dialCode: "+379", flag: "va" },
  { code: "UA", name: "Ukraine", dialCode: "+380", flag: "ua" },
  { code: "RS", name: "Serbia", dialCode: "+381", flag: "rs" },
  { code: "ME", name: "Montenegro", dialCode: "+382", flag: "me" },
  { code: "HR", name: "Croatia", dialCode: "+385", flag: "hr" },
  { code: "SI", name: "Slovenia", dialCode: "+386", flag: "si" },
  { code: "BA", name: "Bosnia and Herzegovina", dialCode: "+387", flag: "ba" },
  { code: "MK", name: "North Macedonia", dialCode: "+389", flag: "mk" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "cz" },
  { code: "SK", name: "Slovakia", dialCode: "+421", flag: "sk" },
  { code: "LI", name: "Liechtenstein", dialCode: "+423", flag: "li" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "at" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "gb" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "dk" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "se" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "no" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "pl" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "de" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "pe" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "mx" },
  { code: "CU", name: "Cuba", dialCode: "+53", flag: "cu" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "ar" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "br" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "cl" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "co" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "ve" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "my" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "au" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "id" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "ph" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "nz" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "sg" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "th" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "jp" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "kr" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "vn" },
  { code: "CN", name: "China", dialCode: "+86", flag: "cn" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "tr" },
  { code: "IN", name: "India", dialCode: "+91", flag: "in" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "pk" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", flag: "af" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "lk" },
  { code: "MM", name: "Myanmar", dialCode: "+95", flag: "mm" },
  { code: "IR", name: "Iran", dialCode: "+98", flag: "ir" },
  // ... (full ITU-T E.164 list continues)
];

/**
 * Parse a phone number and extract country code and number
 * @param phoneNumber - Full phone number with or without +
 * @returns Object with dialCode and number, or null if invalid
 */
export function parsePhoneNumber(phoneNumber: string): {
  dialCode: string;
  number: string;
} | null {
  if (!phoneNumber) return null;

  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // Ensure it starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  // Try to match against known country codes (longest first)
  const sortedCodes = [...countryCodes].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const country of sortedCodes) {
    if (cleaned.startsWith(country.dialCode)) {
      return {
        dialCode: country.dialCode,
        number: cleaned.substring(country.dialCode.length),
      };
    }
  }

  // If no match, assume +1 (US/Canada) if starts with +1
  if (cleaned.startsWith("+1")) {
    return {
      dialCode: "+1",
      number: cleaned.substring(2),
    };
  }

  // Default: treat everything after + as area code + number
  return {
    dialCode: "+1",
    number: cleaned.substring(1),
  };
}

/**
 * Format a phone number for display
 * @param phoneNumber - Full phone number
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const parsed = parsePhoneNumber(phoneNumber);
  if (!parsed) return phoneNumber;

  const { dialCode, number } = parsed;

  // Simple formatting: add spaces every 3-4 digits
  const formatted = number.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");

  return `${dialCode} ${formatted}`;
}

/**
 * Combine dial code and number into full phone number
 * @param dialCode - Country dial code (e.g., "+1")
 * @param number - Phone number without country code
 * @returns Full phone number
 */
export function combinePhoneNumber(dialCode: string, number: string): string {
  const cleanNumber = number.replace(/\D/g, "");
  return dialCode + cleanNumber;
}
