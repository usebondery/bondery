import type { DeviceCardPhoto } from "#carddav-parse-values.js";
import {
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
} from "#carddav-parse-values.js";
import type {
  CardDavPersonInput,
  CardExtras,
  CardProfilePlatform,
  CardProjection,
} from "#carddav-projection.js";
import { joinHeadline, projectCard } from "#carddav-projection.js";
import {
  buildContentLine,
  normalizeNewlines,
  splitUnescaped,
  unescapeVCardText,
} from "#carddav-text.js";
import type { VCardProperty } from "#model.js";
import { getParameter, getParameterValues } from "#parse/property-parsing.js";
import { parseVCard } from "#parse.js";
import { APPLE_STANDARD_LABEL_RE, fallbackDisplayName } from "#serialize-v3.js";

/** Largest size of the serialized extras of one card, in bytes. */
const MAX_CARD_EXTRAS_BYTES: number = 64 * 1024;

const STRUCTURAL_NAMES = new Set(["BEGIN", "END", "VERSION"]);

/** Properties a card never keeps as extras: the server owns them or maps them. */
const DROPPED_NAMES = new Set([
  "UID",
  "PRODID",
  "REV",
  "KIND",
  "X-ADDRESSBOOKSERVER-KIND",
  "N",
  "FN",
  "TITLE",
  "ORG",
  "PHOTO",
  "TEL",
  "EMAIL",
  "ADR",
  "URL",
]);

const PROFILE_PLATFORMS: readonly CardProfilePlatform[] = ["linkedin", "instagram", "facebook"];
const MESSENGER_SCHEMES = ["whatsapp", "signal"] as const;

const NAME_SPLIT_RE = /\s+/;
const LABEL_NAME = "X-ABLABEL";
const LINE_BREAK_RE = /\n/g;
const DEVICE_LINE_TERMINATOR_OCTETS = 2;

type DeviceCardErrorCode = "extras_too_large" | "invalid_vcard" | "missing_uid";

type DeviceCardParseResult =
  | {
      extras: CardExtras;
      kind: "person";
      /** Set when the card carries an inline photo. */
      photo?: DeviceCardPhoto;
      /** `photoVersion` is null here. The caller sets it after it stores the photo. */
      projection: CardProjection;
      uid: string;
    }
  | { kind: "opaque"; uid: string }
  | {
      code: DeviceCardErrorCode;
      /** For `extras_too_large`, the caller answers 507. */
      kind: "error";
      message: string;
    };

interface ParseDeviceCardOptions {
  /** ISO country of the user. Reads national phone numbers as numbers of that country. */
  defaultCountry?: string | null;
}

interface Claims {
  claimed: Set<VCardProperty>;
  properties: VCardProperty[];
}

/** Marks a property as read. Returns the text of its `itemN.X-ABLabel`, which is read with it. */
function claim(claims: Claims, entry: VCardProperty): string | null {
  claims.claimed.add(entry);
  if (!entry.group) {
    return null;
  }
  const label = claims.properties.find(
    (candidate) => candidate.group === entry.group && candidate.name === LABEL_NAME,
  );
  if (!label) {
    return null;
  }
  claims.claimed.add(label);
  return unescapeVCardText(label.value).trim();
}

function readName(
  claims: Claims,
  extras: CardExtras,
): Pick<CardDavPersonInput, "firstName" | "lastName" | "middleName"> {
  const names = claims.properties.filter((entry) => entry.name === "N");
  const [first] = names;
  for (const entry of names) {
    claims.claimed.add(entry);
  }
  if (!first) {
    return { firstName: "", lastName: null, middleName: null };
  }
  const [family = "", given = "", additional = "", prefix = "", suffix = ""] = splitUnescaped(
    first.value,
    ";",
  );
  extras.namePrefix = prefix;
  extras.nameSuffix = suffix;
  return {
    firstName: component(given),
    lastName: component(family) || null,
    middleName: component(additional) || null,
  };
}

/** Splits a display name into first, middle and last name. Used when `N` has no name. */
function splitDisplayName(
  fullName: string,
): Pick<CardDavPersonInput, "firstName" | "lastName" | "middleName"> {
  const [firstName = "", ...rest] = fullName.split(NAME_SPLIT_RE).filter(Boolean);
  const lastName = rest.pop() ?? null;
  return { firstName, lastName, middleName: rest.join(" ") || null };
}

function readHeadline(claims: Claims): string | null {
  const firstText = (name: string, read: (value: string) => string): string | null => {
    const found = claims.properties.filter((entry) => entry.name === name);
    for (const entry of found) {
      claims.claimed.add(entry);
    }
    return found.map((entry) => read(entry.value)).find(Boolean) ?? null;
  };
  // Only the organization name is kept. A department after the first `;` is not kept.
  const orgName = (value: string): string => component(splitUnescaped(value, ";")[0] ?? "");
  return joinHeadline(firstText("TITLE", plainText), firstText("ORG", orgName));
}

function readChannels(
  claims: Claims,
  defaultCountry: string | null,
): Pick<CardDavPersonInput, "emails" | "phones"> {
  const phones: CardDavPersonInput["phones"] = [];
  const emails: CardDavPersonInput["emails"] = [];

  for (const entry of claims.properties) {
    if (entry.name !== "TEL") {
      continue;
    }
    const label = claim(claims, entry);
    const value = plainText(entry.value);
    if (value) {
      const types = getParameterValues(entry, "TYPE").map((type) => type.toLowerCase());
      phones.push({
        preferred: isPreferred(entry, types),
        prefix: "",
        sortOrder: phones.length,
        type: phoneType(types, label),
        value: deviceNumber(value, defaultCountry),
      });
    }
  }
  for (const entry of claims.properties) {
    if (entry.name !== "EMAIL") {
      continue;
    }
    const label = claim(claims, entry);
    const value = plainText(entry.value);
    if (value) {
      const types = getParameterValues(entry, "TYPE").map((type) => type.toLowerCase());
      emails.push({
        preferred: isPreferred(entry, types),
        sortOrder: emails.length,
        type: emailType(types, label),
        value,
      });
    }
  }
  return { emails, phones };
}

function readAddresses(claims: Claims): CardDavPersonInput["addresses"] {
  return claims.properties
    .filter((entry) => entry.name === "ADR")
    .map((entry) => {
      const label = claim(claims, entry);
      const [
        poBox = "",
        extended = "",
        street = "",
        city = "",
        state = "",
        postalCode = "",
        country = "",
      ] = splitUnescaped(entry.value, ";").map(component);
      const types = getParameterValues(entry, "TYPE").map((type) => type.toLowerCase());
      return {
        city,
        country,
        label: label && !APPLE_STANDARD_LABEL_RE.test(label) ? label : null,
        line1: street,
        line2: [extended, poBox].filter(Boolean).join(", "),
        postalCode,
        state,
        type: addressType(types),
      };
    });
}

function readSocials(claims: Claims): CardDavPersonInput["socials"] {
  const socials: CardDavPersonInput["socials"] = [];

  for (const entry of claims.properties) {
    const value = plainText(entry.value);
    if (entry.name === "URL") {
      claim(claims, entry);
      if (value) {
        socials.push({ handle: value, platform: "website" });
      }
    } else if (entry.name === "X-SOCIALPROFILE") {
      const platform = getParameterValues(entry, "TYPE")
        .map((type) => type.toLowerCase())
        .find((type): type is CardProfilePlatform =>
          PROFILE_PLATFORMS.includes(type as CardProfilePlatform),
        );
      if (platform && value) {
        claim(claims, entry);
        socials.push({ handle: value, platform });
      }
    } else if (entry.name === "IMPP") {
      const service = getParameterValues(entry, "X-SERVICE-TYPE")[0]?.toLowerCase();
      const platform = MESSENGER_SCHEMES.find(
        (scheme) => service === scheme || value.toLowerCase().startsWith(`${scheme}:`),
      );
      if (platform) {
        claim(claims, entry);
        const prefix = `${platform}:`;
        const handle = value.toLowerCase().startsWith(prefix) ? value.slice(prefix.length) : value;
        socials.push({ handle, platform });
      }
    }
  }
  return socials;
}

function readDates(claims: Claims): CardDavPersonInput["importantDates"] {
  const dates: CardDavPersonInput["importantDates"] = [];

  for (const entry of claims.properties) {
    if (entry.name !== "BDAY" && entry.name !== "ANNIVERSARY" && entry.name !== "X-ABDATE") {
      continue;
    }
    const date = deviceDate(entry);
    if (!date) {
      continue;
    }
    const label = claim(claims, entry);
    if (entry.name === "BDAY") {
      dates.push({ date, note: null, type: "birthday" });
    } else if (entry.name === "ANNIVERSARY") {
      dates.push({ date, note: null, type: "anniversary" });
    } else {
      const { note, type } = dateTypeFromLabel(label);
      dates.push({ date, note: note || null, type });
    }
  }
  return dates;
}

function readPhoto(claims: Claims): DeviceCardPhoto | undefined {
  const photos = claims.properties.filter((entry) => entry.name === "PHOTO");
  for (const entry of photos) {
    claims.claimed.add(entry);
  }
  for (const entry of photos) {
    const photo = decodePhoto(entry);
    if (photo) {
      return photo;
    }
  }
  return undefined;
}

/** Quoted-printable values are already decoded by the parser, so the marker must go. */
function normalizeExtra(entry: VCardProperty): VCardProperty {
  const encoding = getParameter(entry, "ENCODING")?.values[0]?.toLowerCase();
  if (encoding !== "quoted-printable") {
    return {
      group: entry.group,
      name: entry.name,
      parameters: entry.parameters,
      value: entry.value,
    };
  }
  return {
    group: entry.group,
    name: entry.name,
    parameters: entry.parameters.filter(
      (parameter) => parameter.name !== "ENCODING" && parameter.name !== "CHARSET",
    ),
    value: normalizeNewlines(entry.value).replace(LINE_BREAK_RE, "\\n"),
  };
}

function extrasSize(properties: VCardProperty[]): number {
  const encoder = new TextEncoder();
  return properties.reduce(
    (total, entry) =>
      total + encoder.encode(buildContentLine(entry)).length + DEVICE_LINE_TERMINATOR_OCTETS,
    0,
  );
}

function isGroupCard(properties: VCardProperty[]): boolean {
  return properties.some((entry) => {
    if (entry.name !== "KIND" && entry.name !== "X-ADDRESSBOOKSERVER-KIND") {
      return false;
    }
    const kind = entry.value.trim().toLowerCase();
    return kind !== "" && kind !== "individual";
  });
}

/**
 * Reads a card a device sent (vCard 2.1, 3.0 or 4.0).
 *
 * - An individual card gives the projection, the extras and the photo.
 * - A group card (`X-ADDRESSBOOKSERVER-KIND:group`, `KIND:group` or any other kind) gives only
 *   its UID. The caller stores the raw text as it is.
 * - Extras hold every property the projection does not map, with group and parameters. They
 *   never hold `VERSION`, `PRODID`, `REV`, `UID`, a mapped property or the label of a mapped
 *   property. They exceed 64 KB only in an `extras_too_large` error.
 *
 * Phone numbers are read as numbers of `defaultCountry` when they have no country code. A
 * card with no name and an email or phone number as `FN` gets no name: the caller applies the
 * rule "first name is the first email" when it creates a person.
 *
 * @param text One vCard.
 * @param options Parse settings.
 * @returns A person, an opaque group card or a typed error.
 */
function parseDeviceCard(
  text: string,
  options: ParseDeviceCardOptions = {},
): DeviceCardParseResult {
  let parsed: ReturnType<typeof parseVCard>;
  try {
    parsed = parseVCard(text);
  } catch (error) {
    return {
      code: "invalid_vcard",
      kind: "error",
      message: error instanceof Error ? error.message : "The vCard cannot be parsed.",
    };
  }

  const properties = parsed.raw.properties.filter((entry) => !STRUCTURAL_NAMES.has(entry.name));
  const uid = plainText(properties.find((entry) => entry.name === "UID")?.value ?? "");
  if (!uid) {
    return { code: "missing_uid", kind: "error", message: "The vCard has no UID." };
  }
  if (isGroupCard(properties)) {
    return { kind: "opaque", uid };
  }

  const claims: Claims = { claimed: new Set(), properties };
  const extras: CardExtras = { namePrefix: "", nameSuffix: "", properties: [] };
  const defaultCountry = options.defaultCountry ?? null;

  const name = readName(claims, extras);
  const headline = readHeadline(claims);
  const channels = readChannels(claims, defaultCountry);
  const addresses = readAddresses(claims);
  const socials = readSocials(claims);
  const importantDates = readDates(claims);
  const photo = readPhoto(claims);

  const input: CardDavPersonInput = {
    addresses,
    ...channels,
    ...name,
    headline,
    id: uid,
    importantDates,
    photoVersion: null,
    socials,
  };

  let projection = projectCard(input);
  const fullName = plainText(properties.find((entry) => entry.name === "FN")?.value ?? "");
  const hasName = projection.name.first || projection.name.middle || projection.name.last;
  if (!hasName && fullName && fullName !== fallbackDisplayName(projection)) {
    projection = projectCard({ ...input, ...splitDisplayName(fullName) });
  }

  extras.properties = properties
    .filter((entry) => !(claims.claimed.has(entry) || DROPPED_NAMES.has(entry.name)))
    .map(normalizeExtra);

  if (extrasSize(extras.properties) > MAX_CARD_EXTRAS_BYTES) {
    return {
      code: "extras_too_large",
      kind: "error",
      message: `The card keeps more than ${MAX_CARD_EXTRAS_BYTES} bytes of extra properties.`,
    };
  }

  return { extras, kind: "person", photo, projection, uid };
}

export type { DeviceCardErrorCode, DeviceCardParseResult, DeviceCardPhoto, ParseDeviceCardOptions };

export { MAX_CARD_EXTRAS_BYTES, parseDeviceCard };
