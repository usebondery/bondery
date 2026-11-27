import { normalizePhoneParts } from "@bondery/helpers/phone";
import type {
  CardAddressType,
  CardDavPersonInput,
  CardEmailInputType,
  CardPhoneInputType,
} from "#carddav-projection.js";
import { YEARLESS_SENTINEL_YEAR } from "#carddav-projection.js";
import { splitUnescaped, unescapeVCardText } from "#carddav-text.js";
import type { VCardProperty } from "#model.js";
import { getParameter } from "#parse/property-parsing.js";
import { APPLE_STANDARD_LABEL_RE, DATE_TYPE_LABELS } from "#serialize-v3.js";

const TEL_SCHEME_RE = /^tel:/i;
const DATE_RE = /^(\d{4})-?(\d{2})-?(\d{2})(?:[T ].*)?$/;
const YEARLESS_DATE_RE = /^--(\d{2})-?(\d{2})$/;
const DATA_URI_RE = /^data:([^;,]+)?(;base64)?,(.*)$/s;
const WHITESPACE_RE = /\s+/g;
const PLAIN_DATE_LABEL_RE = /^(Birthday|Anniversary|Name day|Graduation|Other)(?:: ([\s\S]*))?$/;
const MAX_DAY = 31;
const MAX_MONTH = 12;

interface DeviceCardPhoto {
  bytes: Uint8Array;
  mediaType: string;
}

function plainText(value: string): string {
  return unescapeVCardText(value).trim();
}

function isPreferred(entry: VCardProperty, types: string[]): boolean {
  return types.includes("pref") || getParameter(entry, "PREF")?.values[0] === "1";
}

function labelIncludes(label: string | null, word: string): boolean {
  return label?.toLowerCase().includes(word) ?? false;
}

function phoneType(types: string[], label: string | null): CardPhoneInputType {
  if (
    types.some((type) => type === "cell" || type === "iphone" || type === "mobile") ||
    labelIncludes(label, "mobile") ||
    labelIncludes(label, "iphone")
  ) {
    return "mobile";
  }
  return types.includes("work") || labelIncludes(label, "work") ? "work" : "home";
}

function emailType(types: string[], label: string | null): Exclude<CardEmailInputType, "personal"> {
  return types.includes("work") || labelIncludes(label, "work") ? "work" : "home";
}

function addressType(types: string[]): CardAddressType {
  if (types.includes("work")) {
    return "work";
  }
  return types.includes("home") ? "home" : "other";
}

/** Phone number of a device as digits with a leading plus. A national number needs a country. */
function deviceNumber(value: string, defaultCountry: string | null): string {
  const raw = value.replace(TEL_SCHEME_RE, "");
  if (raw.trim().startsWith("+")) {
    return raw;
  }
  const normalized = normalizePhoneParts("", raw, { defaultCountry });
  return "error" in normalized ? raw : `${normalized.prefix}${normalized.value}`;
}

/** Date of a device as `YYYY-MM-DD`, with year 1904 when the year is unknown. */
function deviceDate(entry: VCardProperty): string | null {
  const value = plainText(entry.value);
  const yearless = YEARLESS_DATE_RE.exec(value);
  const full = DATE_RE.exec(value);
  const omitYear = getParameter(entry, "X-APPLE-OMIT-YEAR") !== undefined;
  const year = yearless ? String(YEARLESS_SENTINEL_YEAR) : full?.[1];
  const month = yearless ? yearless[1] : full?.[2];
  const day = yearless ? yearless[2] : full?.[3];
  if (!(year && month && day)) {
    return null;
  }
  const inRange = (part: string, max: number): boolean => Number(part) >= 1 && Number(part) <= max;
  if (!(inRange(month, MAX_MONTH) && inRange(day, MAX_DAY))) {
    return null;
  }
  return `${omitYear ? YEARLESS_SENTINEL_YEAR : year}-${month}-${day}`;
}

function dateTypeFromLabel(label: string | null): {
  note: string;
  type: CardDavPersonInput["importantDates"][number]["type"];
} {
  const typeByLabel = Object.entries(DATE_TYPE_LABELS) as [
    CardDavPersonInput["importantDates"][number]["type"],
    string,
  ][];
  const typeOf = (name: string) =>
    typeByLabel.find(([, known]) => known.toLowerCase() === name.toLowerCase())?.[0] ?? "other";

  if (!label) {
    return { note: "", type: "other" };
  }
  const standard = APPLE_STANDARD_LABEL_RE.exec(label);
  if (standard) {
    return { note: "", type: typeOf(standard[1] ?? "") };
  }
  const plain = PLAIN_DATE_LABEL_RE.exec(label);
  if (plain) {
    return { note: plain[2] ?? "", type: typeOf(plain[1] ?? "") };
  }
  return { note: label, type: "other" };
}

function decodePhoto(entry: VCardProperty): DeviceCardPhoto | null {
  const encoding = getParameter(entry, "ENCODING")?.values[0]?.toLowerCase();
  const declared =
    getParameter(entry, "MEDIATYPE")?.values[0] ?? getParameter(entry, "TYPE")?.values[0];
  const toMediaType = (value: string | undefined): string => {
    if (!value) {
      return "image/jpeg";
    }
    const lower = value.toLowerCase();
    if (lower.includes("/")) {
      return lower;
    }
    return lower === "jpg" ? "image/jpeg" : `image/${lower}`;
  };

  const dataUri = DATA_URI_RE.exec(entry.value.trim());
  let base64: string | null = null;
  if (dataUri) {
    base64 = dataUri[2] ? (dataUri[3] ?? null) : null;
  } else if (encoding === "b" || encoding === "base64") {
    base64 = entry.value;
  }
  if (!base64) {
    return null;
  }
  const bytes = Buffer.from(base64.replace(WHITESPACE_RE, ""), "base64");
  if (bytes.length === 0) {
    return null;
  }
  return { bytes: new Uint8Array(bytes), mediaType: toMediaType(dataUri?.[1] ?? declared) };
}

function component(value: string): string {
  return splitUnescaped(value, ",").map(plainText).filter(Boolean).join(" ");
}

export type { DeviceCardPhoto };
export {
  addressType,
  component,
  dateTypeFromLabel,
  decodePhoto,
  deviceDate,
  deviceNumber,
  emailType,
  isPreferred,
  phoneType,
  plainText,
};
