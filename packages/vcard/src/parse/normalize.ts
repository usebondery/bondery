import type { ParsedVCard, VCard, VCardParseOptions, VCardRaw } from "#model.js";
import { parseContentLine } from "#parse/line-parsing.js";
import {
  decodeStructuredValue,
  decodeTextList,
  decodeTextValue,
  getParameter,
  getParameterValues,
  normalizeMediaUri,
  parseAddress,
  parseCommonText,
  parseDateValue,
  parsePref,
  parseRelated,
  parseTel,
  parseTimezone,
} from "#parse/property-parsing.js";

const LEGACY_VERSIONS = new Set(["2.1", "3.0", "4.0"]);

function createEmptyCard(raw: VCardRaw): VCard {
  return {
    addresses: [],
    categories: [],
    customProperties: [],
    emails: [],
    fullName: "",
    instantMessaging: [],
    keys: [],
    kind: "individual",
    languages: [],
    logos: [],
    nicknames: [],
    notes: [],
    organizations: [],
    phones: [],
    photos: [],
    raw,
    related: [],
    roles: [],
    sounds: [],
    titles: [],
    urls: [],
  };
}

function normalizeRawCard(raw: VCardRaw): VCard {
  const card = createEmptyCard(raw);

  for (const property of raw.properties) {
    switch (property.name) {
      case "FN":
        if (!card.fullName) {
          card.fullName = decodeTextValue(property.value);
        }
        break;
      case "N": {
        const [familyNames, givenNames, additionalNames, honorificPrefixes, honorificSuffixes] =
          decodeStructuredValue(property.value);
        card.name = {
          additionalNames: additionalNames ?? [],
          familyNames: familyNames ?? [],
          givenNames: givenNames ?? [],
          honorificPrefixes: honorificPrefixes ?? [],
          honorificSuffixes: honorificSuffixes ?? [],
        };
        break;
      }
      case "NICKNAME":
        card.nicknames.push(...decodeTextList(property.value));
        break;
      case "EMAIL":
        card.emails.push(parseCommonText(property));
        break;
      case "TEL":
        card.phones.push(parseTel(property));
        break;
      case "ADR":
        card.addresses.push(parseAddress(property));
        break;
      case "TITLE":
        card.titles.push(parseCommonText(property));
        break;
      case "ROLE":
        card.roles.push(parseCommonText(property));
        break;
      case "ORG":
        card.organizations.push({
          altId: getParameter(property, "ALTID")?.values[0],
          language: getParameter(property, "LANGUAGE")?.values[0],
          pid: getParameterValues(property, "PID"),
          pref: parsePref(property),
          types: getParameterValues(property, "TYPE").map((value) => value.toLowerCase()),
          values: decodeStructuredValue(property.value).flat(),
        });
        break;
      case "IMPP":
        card.instantMessaging.push(parseCommonText(property));
        break;
      case "URL":
        card.urls.push(parseCommonText(property));
        break;
      case "NOTE":
        card.notes.push(parseCommonText(property));
        break;
      case "LANG":
        card.languages.push(parseCommonText(property));
        break;
      case "PHOTO":
        card.photos.push(normalizeMediaUri(property));
        break;
      case "LOGO":
        card.logos.push(normalizeMediaUri(property));
        break;
      case "SOUND":
        card.sounds.push(normalizeMediaUri(property));
        break;
      case "KEY":
        card.keys.push(normalizeMediaUri(property));
        break;
      case "CATEGORIES":
        card.categories.push(...decodeTextList(property.value));
        break;
      case "BDAY":
        card.birthday = parseDateValue(property);
        break;
      case "ANNIVERSARY":
        card.anniversary = parseDateValue(property);
        break;
      case "TZ":
        card.timezone = parseTimezone(property);
        break;
      case "GEO":
        card.geo = decodeTextValue(property.value);
        break;
      case "UID":
        card.uid = decodeTextValue(property.value);
        break;
      case "REV":
        card.revision = decodeTextValue(property.value);
        break;
      case "PRODID":
        card.productId = decodeTextValue(property.value);
        break;
      case "KIND":
        card.kind = decodeTextValue(property.value) || "individual";
        break;
      case "RELATED":
        card.related.push(parseRelated(property));
        break;
      case "BEGIN":
      case "END":
      case "VERSION":
        break;
      default:
        card.customProperties.push(property);
        break;
    }
  }

  if (!card.fullName && card.name) {
    card.fullName = [
      ...card.name.honorificPrefixes,
      ...card.name.givenNames,
      ...card.name.additionalNames,
      ...card.name.familyNames,
      ...card.name.honorificSuffixes,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return card;
}

export function parseEntity(lines: string[], options: VCardParseOptions): ParsedVCard {
  const properties = lines.map(parseContentLine);
  const raw: VCardRaw = {
    properties,
    version: properties.find((property) => property.name === "VERSION")?.value ?? null,
    warnings: [],
  };

  const version = raw.version;
  if (!version) {
    throw new Error("VCARD is missing VERSION.");
  }

  if (options.strictVersion && version !== "4.0") {
    throw new Error(`Unsupported vCard version ${version}.`);
  }

  if (!LEGACY_VERSIONS.has(version)) {
    raw.warnings.push(`Unrecognized vCard version ${version}. Parsed best-effort.`);
  }

  if (!properties.some((property) => property.name === "FN")) {
    raw.warnings.push("VCARD is missing FN.");
  }

  const beginIndex = properties.findIndex(
    (property) => property.name === "BEGIN" && property.value.toUpperCase() === "VCARD",
  );
  const versionIndex = properties.findIndex((property) => property.name === "VERSION");
  const endIndex = properties.findIndex(
    (property) => property.name === "END" && property.value.toUpperCase() === "VCARD",
  );

  if (beginIndex !== 0) {
    raw.warnings.push("BEGIN:VCARD should be the first property.");
  }

  if (versionIndex !== 1) {
    raw.warnings.push("VERSION should appear immediately after BEGIN:VCARD.");
  }

  if (endIndex !== properties.length - 1) {
    raw.warnings.push("END:VCARD should be the final property.");
  }

  return {
    card: normalizeRawCard(raw),
    raw,
  };
}
