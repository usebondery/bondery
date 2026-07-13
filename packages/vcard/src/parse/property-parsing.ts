import type {
  VCardAddress,
  VCardDateValue,
  VCardMedia,
  VCardPhone,
  VCardProperty,
  VCardRelated,
  VCardTextValue,
  VCardTimezone,
} from "#model.js";

export function getParameter(property: VCardProperty, name: string) {
  return property.parameters.find((parameter) => parameter.name === name);
}

export function getParameterValues(property: VCardProperty, name: string): string[] {
  return property.parameters
    .filter((parameter) => parameter.name === name)
    .flatMap((parameter) => parameter.values)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function decodeTextValue(value: string): string {
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

export function decodeTextList(value: string): string[] {
  return splitEscaped(value, ",")
    .map((part) => decodeTextValue(part.trim()))
    .filter(Boolean);
}

export function decodeStructuredValue(value: string): string[][] {
  return splitEscaped(value, ";").map((component) => decodeTextList(component));
}

export function parsePref(property: VCardProperty): number | undefined {
  const pref = getParameter(property, "PREF")?.values[0];
  if (!pref) {
    return undefined;
  }

  const parsed = Number.parseInt(pref, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseCommonText(property: VCardProperty): VCardTextValue {
  return {
    altId: getParameter(property, "ALTID")?.values[0],
    language: getParameter(property, "LANGUAGE")?.values[0],
    pid: getParameterValues(property, "PID"),
    pref: parsePref(property),
    types: getParameterValues(property, "TYPE").map((value) => value.toLowerCase()),
    value: decodeTextValue(property.value),
  };
}

export function parseTel(property: VCardProperty): VCardPhone {
  const valueType = getParameter(property, "VALUE")?.values[0]?.toLowerCase();
  const rawValue = decodeTextValue(property.value);
  const uri = valueType === "uri" || rawValue.startsWith("tel:") ? rawValue : `tel:${rawValue}`;
  const value = uri.startsWith("tel:") ? uri.slice(4) : rawValue;

  return {
    altId: getParameter(property, "ALTID")?.values[0],
    pid: getParameterValues(property, "PID"),
    pref: parsePref(property),
    types: getParameterValues(property, "TYPE").map((type) => type.toLowerCase()),
    uri,
    value,
  };
}

export function normalizeMediaUri(property: VCardProperty): VCardMedia {
  const encoding = getParameter(property, "ENCODING")?.values[0]?.toLowerCase();
  const mediaType =
    getParameter(property, "MEDIATYPE")?.values[0] ?? getParameter(property, "TYPE")?.values[0];
  const rawValue = property.value.trim();

  if (rawValue.startsWith("data:")) {
    return {
      altId: getParameter(property, "ALTID")?.values[0],
      mediaType,
      pid: getParameterValues(property, "PID"),
      pref: parsePref(property),
      source: "data-uri",
      types: getParameterValues(property, "TYPE").map((type) => type.toLowerCase()),
      uri: rawValue,
    };
  }

  if (encoding === "b" || encoding === "base64") {
    const normalizedMediaType = mediaType?.includes("/")
      ? mediaType
      : mediaType
        ? `image/${mediaType.toLowerCase()}`
        : "application/octet-stream";
    return {
      altId: getParameter(property, "ALTID")?.values[0],
      mediaType: normalizedMediaType,
      pid: getParameterValues(property, "PID"),
      pref: parsePref(property),
      source: "legacy-inline",
      types: getParameterValues(property, "TYPE").map((type) => type.toLowerCase()),
      uri: `data:${normalizedMediaType};base64,${rawValue.replace(/\s+/g, "")}`,
    };
  }

  return {
    altId: getParameter(property, "ALTID")?.values[0],
    mediaType,
    pid: getParameterValues(property, "PID"),
    pref: parsePref(property),
    source: "uri",
    types: getParameterValues(property, "TYPE").map((type) => type.toLowerCase()),
    uri: decodeTextValue(rawValue),
  };
}

export function parseAddress(property: VCardProperty): VCardAddress {
  const [poBox, extended, street, locality, region, postalCode, country] = decodeStructuredValue(
    property.value,
  );
  return {
    altId: getParameter(property, "ALTID")?.values[0],
    country: country ?? [],
    extended: extended ?? [],
    geo: getParameter(property, "GEO")?.values[0],
    label: getParameter(property, "LABEL")?.values[0],
    locality: locality ?? [],
    pid: getParameterValues(property, "PID"),
    poBox: poBox ?? [],
    postalCode: postalCode ?? [],
    pref: parsePref(property),
    region: region ?? [],
    street: street ?? [],
    types: getParameterValues(property, "TYPE").map((value) => value.toLowerCase()),
    tz: getParameter(property, "TZ")?.values[0],
  };
}

export function parseDateValue(property: VCardProperty): VCardDateValue {
  const valueType =
    getParameter(property, "VALUE")?.values[0]?.toLowerCase() === "text"
      ? "text"
      : "date-and-or-time";
  return {
    calscale: getParameter(property, "CALSCALE")?.values[0],
    value: decodeTextValue(property.value),
    valueType,
  };
}

export function parseTimezone(property: VCardProperty): VCardTimezone {
  const rawType = getParameter(property, "VALUE")?.values[0]?.toLowerCase();
  const valueType = rawType === "uri" || rawType === "utc-offset" ? rawType : "text";
  return {
    value: decodeTextValue(property.value),
    valueType,
  };
}

export function parseRelated(property: VCardProperty): VCardRelated {
  const valueType =
    getParameter(property, "VALUE")?.values[0]?.toLowerCase() === "text" ? "text" : "uri";
  return {
    altId: getParameter(property, "ALTID")?.values[0],
    pid: getParameterValues(property, "PID"),
    pref: parsePref(property),
    types: getParameterValues(property, "TYPE").map((value) => value.toLowerCase()),
    value: decodeTextValue(property.value),
    valueType,
  };
}
