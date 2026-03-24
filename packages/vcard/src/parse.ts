import type {
  ParsedVCard,
  VCard,
  VCardAddress,
  VCardDateValue,
  VCardMedia,
  VCardParameter,
  VCardParseOptions,
  VCardPhone,
  VCardProperty,
  VCardRaw,
  VCardRelated,
  VCardTextValue,
  VCardTimezone,
} from "./model.js";

const LEGACY_VERSIONS = new Set(["2.1", "3.0", "4.0"]);
const STRUCTURED_PROPERTIES = new Set(["N", "ADR", "ORG"]);
const LIST_PROPERTIES = new Set(["NICKNAME", "CATEGORIES"]);

function unfoldLines(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const physicalLines = normalized.split("\n");
  const logicalLines: string[] = [];

  for (const line of physicalLines) {
    // RFC 6350 folding: continuation line starts with space or tab
    if ((line.startsWith(" ") || line.startsWith("\t")) && logicalLines.length > 0) {
      logicalLines[logicalLines.length - 1] += line.slice(1);
      continue;
    }

    // vCard 2.1 quoted-printable soft line break: previous line ends with '='
    if (
      logicalLines.length > 0 &&
      logicalLines[logicalLines.length - 1].endsWith("=") &&
      isQuotedPrintableLine(logicalLines[logicalLines.length - 1])
    ) {
      // Remove trailing '=' and append current line
      logicalLines[logicalLines.length - 1] =
        logicalLines[logicalLines.length - 1].slice(0, -1) + line;
      continue;
    }

    if (line.length > 0) {
      logicalLines.push(line);
    }
  }

  return logicalLines;
}

/** Checks whether a content line has ENCODING=QUOTED-PRINTABLE in the property parameters. */
function isQuotedPrintableLine(line: string): boolean {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return false;
  const left = line.slice(0, colonIndex).toUpperCase();
  return left.includes("ENCODING=QUOTED-PRINTABLE");
}

/**
 * Decodes a quoted-printable encoded string to a UTF-8 string.
 * Handles multi-byte UTF-8 sequences (e.g. =C4=8D → č).
 */
function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < value.length) {
    if (value[i] === "=" && i + 2 < value.length) {
      const hex = value.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    // Plain ASCII character
    bytes.push(value.charCodeAt(i));
    i += 1;
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

function findContentDelimiter(line: string): number {
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    }
    if (char === ":" && !quoted) {
      return index;
    }
  }

  return -1;
}

function splitSemicolonTokens(value: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }

    if (char === ";" && !quoted) {
      tokens.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  tokens.push(current);
  return tokens;
}

function splitCommaTokens(value: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      tokens.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  tokens.push(current);
  return tokens;
}

function parseParameters(tokens: string[]): VCardParameter[] {
  const parameters: VCardParameter[] = [];

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    const equalsIndex = token.indexOf("=");
    if (equalsIndex === -1) {
      parameters.push({ name: "TYPE", values: [token.toLowerCase()] });
      continue;
    }

    const name = token.slice(0, equalsIndex).trim().toUpperCase();
    const rawValue = token.slice(equalsIndex + 1).trim();
    const values = splitCommaTokens(rawValue).map((value) => value.replace(/^"|"$/g, ""));
    parameters.push({ name, values });
  }

  return parameters;
}

function parseContentLine(line: string): VCardProperty {
  const delimiterIndex = findContentDelimiter(line);
  if (delimiterIndex === -1) {
    throw new Error(`Invalid content line without value delimiter: ${line}`);
  }

  const left = line.slice(0, delimiterIndex);
  const value = line.slice(delimiterIndex + 1);
  const tokens = splitSemicolonTokens(left);
  const [nameToken, ...parameterTokens] = tokens;
  const groupSeparatorIndex = nameToken.indexOf(".");

  const group = groupSeparatorIndex === -1 ? undefined : nameToken.slice(0, groupSeparatorIndex);
  const name = (groupSeparatorIndex === -1 ? nameToken : nameToken.slice(groupSeparatorIndex + 1))
    .trim()
    .toUpperCase();

  const parameters = parseParameters(parameterTokens);

  // Decode quoted-printable value when the encoding parameter is present (vCard 2.1/3.0)
  const encoding = parameters.find((p) => p.name === "ENCODING")?.values[0]?.toLowerCase();
  const decodedValue = encoding === "quoted-printable" ? decodeQuotedPrintable(value) : value;

  return {
    group,
    name,
    parameters,
    value: decodedValue,
  };
}

function getParameter(property: VCardProperty, name: string): VCardParameter | undefined {
  return property.parameters.find((parameter) => parameter.name === name);
}

function getParameterValues(property: VCardProperty, name: string): string[] {
  return property.parameters
    .filter((parameter) => parameter.name === name)
    .flatMap((parameter) => parameter.values)
    .map((value) => value.trim())
    .filter(Boolean);
}

function decodeTextValue(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function splitEscaped(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      current += `\\${char}`;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === separator) {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (escaped) {
    current += "\\";
  }

  parts.push(current);
  return parts;
}

function decodeTextList(value: string): string[] {
  return splitEscaped(value, ",")
    .map((part) => decodeTextValue(part.trim()))
    .filter(Boolean);
}

function decodeStructuredValue(value: string): string[][] {
  return splitEscaped(value, ";").map((component) => decodeTextList(component));
}

function parsePref(property: VCardProperty): number | undefined {
  const pref = getParameter(property, "PREF")?.values[0];
  if (!pref) {
    return undefined;
  }

  const parsed = Number.parseInt(pref, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCommonText(property: VCardProperty): VCardTextValue {
  return {
    value: decodeTextValue(property.value),
    language: getParameter(property, "LANGUAGE")?.values[0],
    pref: parsePref(property),
    types: getParameterValues(property, "TYPE").map((value) => value.toLowerCase()),
    altId: getParameter(property, "ALTID")?.values[0],
    pid: getParameterValues(property, "PID"),
  };
}

function parseTel(property: VCardProperty): VCardPhone {
  const valueType = getParameter(property, "VALUE")?.values[0]?.toLowerCase();
  const rawValue = decodeTextValue(property.value);
  const uri = valueType === "uri" || rawValue.startsWith("tel:") ? rawValue : `tel:${rawValue}`;
  const value = uri.startsWith("tel:") ? uri.slice(4) : rawValue;

  return {
    value,
    uri,
    pref: parsePref(property),
    types: getParameterValues(property, "TYPE").map((type) => type.toLowerCase()),
    altId: getParameter(property, "ALTID")?.values[0],
    pid: getParameterValues(property, "PID"),
  };
}

function normalizeMediaUri(property: VCardProperty): VCardMedia {
  const encoding = getParameter(property, "ENCODING")?.values[0]?.toLowerCase();
  const mediaType =
    getParameter(property, "MEDIATYPE")?.values[0] ?? getParameter(property, "TYPE")?.values[0];
  const rawValue = property.value.trim();

  if (rawValue.startsWith("data:")) {
    return {
      uri: rawValue,
      mediaType,
      pref: parsePref(property),
      types: getParameterValues(property, "TYPE").map((type) => type.toLowerCase()),
      altId: getParameter(property, "ALTID")?.values[0],
      pid: getParameterValues(property, "PID"),
      source: "data-uri",
    };
  }

  if (encoding === "b" || encoding === "base64") {
    const normalizedMediaType = mediaType?.includes("/")
      ? mediaType
      : mediaType
        ? `image/${mediaType.toLowerCase()}`
        : "application/octet-stream";
    return {
      uri: `data:${normalizedMediaType};base64,${rawValue.replace(/\s+/g, "")}`,
      mediaType: normalizedMediaType,
      pref: parsePref(property),
      types: getParameterValues(property, "TYPE").map((type) => type.toLowerCase()),
      altId: getParameter(property, "ALTID")?.values[0],
      pid: getParameterValues(property, "PID"),
      source: "legacy-inline",
    };
  }

  return {
    uri: decodeTextValue(rawValue),
    mediaType,
    pref: parsePref(property),
    types: getParameterValues(property, "TYPE").map((type) => type.toLowerCase()),
    altId: getParameter(property, "ALTID")?.values[0],
    pid: getParameterValues(property, "PID"),
    source: "uri",
  };
}

function parseAddress(property: VCardProperty): VCardAddress {
  const [poBox, extended, street, locality, region, postalCode, country] = decodeStructuredValue(
    property.value,
  );
  return {
    poBox: poBox ?? [],
    extended: extended ?? [],
    street: street ?? [],
    locality: locality ?? [],
    region: region ?? [],
    postalCode: postalCode ?? [],
    country: country ?? [],
    label: getParameter(property, "LABEL")?.values[0],
    geo: getParameter(property, "GEO")?.values[0],
    tz: getParameter(property, "TZ")?.values[0],
    pref: parsePref(property),
    types: getParameterValues(property, "TYPE").map((value) => value.toLowerCase()),
    altId: getParameter(property, "ALTID")?.values[0],
    pid: getParameterValues(property, "PID"),
  };
}

function parseDateValue(property: VCardProperty): VCardDateValue {
  const valueType =
    getParameter(property, "VALUE")?.values[0]?.toLowerCase() === "text"
      ? "text"
      : "date-and-or-time";
  return {
    value: decodeTextValue(property.value),
    valueType,
    calscale: getParameter(property, "CALSCALE")?.values[0],
  };
}

function parseTimezone(property: VCardProperty): VCardTimezone {
  const rawType = getParameter(property, "VALUE")?.values[0]?.toLowerCase();
  const valueType = rawType === "uri" || rawType === "utc-offset" ? rawType : "text";
  return {
    value: decodeTextValue(property.value),
    valueType,
  };
}

function parseRelated(property: VCardProperty): VCardRelated {
  const valueType =
    getParameter(property, "VALUE")?.values[0]?.toLowerCase() === "text" ? "text" : "uri";
  return {
    value: decodeTextValue(property.value),
    valueType,
    pref: parsePref(property),
    types: getParameterValues(property, "TYPE").map((value) => value.toLowerCase()),
    altId: getParameter(property, "ALTID")?.values[0],
    pid: getParameterValues(property, "PID"),
  };
}

function createEmptyCard(raw: VCardRaw): VCard {
  return {
    kind: "individual",
    fullName: "",
    nicknames: [],
    phones: [],
    emails: [],
    addresses: [],
    instantMessaging: [],
    urls: [],
    languages: [],
    titles: [],
    roles: [],
    organizations: [],
    notes: [],
    categories: [],
    photos: [],
    logos: [],
    sounds: [],
    keys: [],
    related: [],
    raw,
    customProperties: [],
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
          familyNames: familyNames ?? [],
          givenNames: givenNames ?? [],
          additionalNames: additionalNames ?? [],
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
          values: decodeStructuredValue(property.value).flat(),
          pref: parsePref(property),
          types: getParameterValues(property, "TYPE").map((value) => value.toLowerCase()),
          language: getParameter(property, "LANGUAGE")?.values[0],
          altId: getParameter(property, "ALTID")?.values[0],
          pid: getParameterValues(property, "PID"),
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

function parseEntity(lines: string[], options: VCardParseOptions): ParsedVCard {
  const properties = lines.map(parseContentLine);
  const raw: VCardRaw = {
    version: properties.find((property) => property.name === "VERSION")?.value ?? null,
    properties,
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
    raw,
    card: normalizeRawCard(raw),
  };
}

/**
 * Parses one or more vCard entities from a text/vcard payload.
 *
 * @param input Raw vCard text.
 * @param options Parse behavior flags.
 * @returns Parsed raw and normalized cards.
 */
export function parseVCards(input: string, options: VCardParseOptions = {}): ParsedVCard[] {
  const lines = unfoldLines(input);
  const entities: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    if (line.toUpperCase() === "BEGIN:VCARD") {
      current = [line];
      continue;
    }

    if (!current) {
      continue;
    }

    current.push(line);

    if (line.toUpperCase() === "END:VCARD") {
      entities.push(current);
      current = null;
    }
  }

  if (current) {
    throw new Error("Unterminated VCARD entity.");
  }

  if (entities.length === 0) {
    throw new Error("No VCARD entities found.");
  }

  return entities.map((entity) => parseEntity(entity, options));
}

/**
 * Parses a single vCard entity from text.
 *
 * @param input Raw vCard text containing exactly one card.
 * @param options Parse behavior flags.
 * @returns Parsed raw and normalized card.
 */
export function parseVCard(input: string, options: VCardParseOptions = {}): ParsedVCard {
  const cards = parseVCards(input, options);
  if (cards.length !== 1) {
    throw new Error(`Expected exactly one VCARD entity but found ${cards.length}.`);
  }
  return cards[0];
}
