import type {
  VCard,
  VCardAddress,
  VCardMedia,
  VCardParameter,
  VCardProperty,
  VCardSerializeOptions,
  VCardTextValue,
} from "./model.js";

const UTF8_ENCODER = new TextEncoder();

function getUtf8ByteLength(value: string): number {
  return UTF8_ENCODER.encode(value).length;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function escapeTextList(values: string[]): string {
  return values.map((value) => escapeText(value)).join(",");
}

function encodeParameterValue(value: string): string {
  if (/[:,;]/.test(value) || value.includes(",") || /^\s|\s$/.test(value)) {
    return `"${value}"`;
  }
  return value;
}

function serializeParameters(parameters: VCardParameter[]): string {
  if (parameters.length === 0) {
    return "";
  }

  return parameters
    .map(
      (parameter) =>
        `;${parameter.name.toUpperCase()}=${parameter.values.map(encodeParameterValue).join(",")}`,
    )
    .join("");
}

function buildContentLine(property: VCardProperty): string {
  const groupPrefix = property.group ? `${property.group}.` : "";
  return `${groupPrefix}${property.name.toUpperCase()}${serializeParameters(property.parameters)}:${property.value}`;
}

function foldLine(line: string): string[] {
  if (getUtf8ByteLength(line) <= 75) {
    return [line];
  }

  const chunks: string[] = [];
  let current = "";

  for (const character of line) {
    const next = `${current}${character}`;
    if (getUtf8ByteLength(next) > 75) {
      chunks.push(current);
      current = character;
      continue;
    }

    current = next;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`));
}

function appendLine(lines: string[], property: VCardProperty): void {
  const contentLine = buildContentLine(property);
  lines.push(...foldLine(contentLine));
}

function pushTextValues(lines: string[], name: string, values: VCardTextValue[]): void {
  for (const item of values) {
    const parameters: VCardParameter[] = [];
    if (item.types.length > 0) {
      parameters.push({ name: "TYPE", values: item.types.map((value) => value.toLowerCase()) });
    }
    if (item.pref !== undefined) {
      parameters.push({ name: "PREF", values: [String(item.pref)] });
    }
    if (item.language) {
      parameters.push({ name: "LANGUAGE", values: [item.language] });
    }
    if (item.altId) {
      parameters.push({ name: "ALTID", values: [item.altId] });
    }
    if (item.pid && item.pid.length > 0) {
      parameters.push({ name: "PID", values: item.pid });
    }
    appendLine(lines, { name, parameters, value: escapeText(item.value) });
  }
}

function pushMediaValues(lines: string[], name: string, values: VCardMedia[]): void {
  for (const item of values) {
    if (item.source === "data-uri") {
      // Use ENCODING=b format for broad client compatibility (Google Contacts, etc.)
      const dataUriMatch = item.uri.match(/^data:([^;]+);base64,(.+)$/s);
      if (dataUriMatch) {
        const mimeType = dataUriMatch[1];
        const base64Data = dataUriMatch[2];
        const typeSubtype = (mimeType.split("/")[1] ?? "jpeg").toUpperCase();
        const parameters: VCardParameter[] = [
          { name: "ENCODING", values: ["b"] },
          { name: "TYPE", values: [typeSubtype] },
        ];
        if (item.pref !== undefined) {
          parameters.push({ name: "PREF", values: [String(item.pref)] });
        }
        appendLine(lines, { name, parameters, value: base64Data });
        continue;
      }
    }

    const parameters: VCardParameter[] = [{ name: "VALUE", values: ["uri"] }];
    if (item.mediaType) {
      parameters.push({ name: "MEDIATYPE", values: [item.mediaType] });
    }
    if (item.types.length > 0) {
      parameters.push({ name: "TYPE", values: item.types.map((value) => value.toLowerCase()) });
    }
    if (item.pref !== undefined) {
      parameters.push({ name: "PREF", values: [String(item.pref)] });
    }
    if (item.altId) {
      parameters.push({ name: "ALTID", values: [item.altId] });
    }
    if (item.pid && item.pid.length > 0) {
      parameters.push({ name: "PID", values: item.pid });
    }
    appendLine(lines, { name, parameters, value: item.uri });
  }
}

function pushAddress(lines: string[], address: VCardAddress): void {
  const parameters: VCardParameter[] = [];
  if (address.types.length > 0) {
    parameters.push({ name: "TYPE", values: address.types.map((value) => value.toLowerCase()) });
  }
  if (address.pref !== undefined) {
    parameters.push({ name: "PREF", values: [String(address.pref)] });
  }
  if (address.label) {
    parameters.push({ name: "LABEL", values: [escapeText(address.label)] });
  }
  if (address.tz) {
    parameters.push({ name: "TZ", values: [address.tz] });
  }
  if (address.altId) {
    parameters.push({ name: "ALTID", values: [address.altId] });
  }
  if (address.pid && address.pid.length > 0) {
    parameters.push({ name: "PID", values: address.pid });
  }

  appendLine(lines, {
    name: "ADR",
    parameters,
    value: [
      escapeTextList(address.poBox),
      escapeTextList(address.extended),
      escapeTextList(address.street),
      escapeTextList(address.locality),
      escapeTextList(address.region),
      escapeTextList(address.postalCode),
      escapeTextList(address.country),
    ].join(";"),
  });
}

/**
 * Serializes a normalized vCard to RFC 6350 text/vcard output.
 *
 * @param card Normalized card model.
 * @param options Serialization settings.
 * @returns CRLF-delimited vCard 4.0 text.
 */
export function serializeVCard(card: VCard, options: VCardSerializeOptions = {}): string {
  const lines: string[] = [];

  appendLine(lines, { name: "BEGIN", parameters: [], value: "VCARD" });
  appendLine(lines, { name: "VERSION", parameters: [], value: "4.0" });

  if (options.includeProductId !== false) {
    appendLine(lines, {
      name: "PRODID",
      parameters: [],
      value: options.productId ?? card.productId ?? "-//BONDERY//NONSGML Bondery v1.0//EN",
    });
  }

  appendLine(lines, { name: "KIND", parameters: [], value: card.kind || "individual" });
  appendLine(lines, { name: "FN", parameters: [], value: escapeText(card.fullName) });

  if (card.name) {
    appendLine(lines, {
      name: "N",
      parameters: [],
      value: [
        escapeTextList(card.name.familyNames),
        escapeTextList(card.name.givenNames),
        escapeTextList(card.name.additionalNames),
        escapeTextList(card.name.honorificPrefixes),
        escapeTextList(card.name.honorificSuffixes),
      ].join(";"),
    });
  }

  if (card.uid) {
    appendLine(lines, { name: "UID", parameters: [], value: card.uid });
  }

  if (card.birthday) {
    appendLine(lines, {
      name: "BDAY",
      parameters: card.birthday.valueType === "text" ? [{ name: "VALUE", values: ["text"] }] : [],
      value: escapeText(card.birthday.value),
    });
  }

  if (card.anniversary) {
    appendLine(lines, {
      name: "ANNIVERSARY",
      parameters:
        card.anniversary.valueType === "text" ? [{ name: "VALUE", values: ["text"] }] : [],
      value: escapeText(card.anniversary.value),
    });
  }

  if (card.timezone) {
    appendLine(lines, {
      name: "TZ",
      parameters:
        card.timezone.valueType === "text"
          ? []
          : [{ name: "VALUE", values: [card.timezone.valueType] }],
      value: card.timezone.value,
    });
  }

  if (card.geo) {
    appendLine(lines, {
      name: "GEO",
      parameters: [{ name: "VALUE", values: ["uri"] }],
      value: card.geo,
    });
  }

  if (card.revision) {
    appendLine(lines, { name: "REV", parameters: [], value: card.revision });
  }

  pushTextValues(lines, "TITLE", card.titles);
  pushTextValues(lines, "ROLE", card.roles);
  pushTextValues(lines, "EMAIL", card.emails);

  for (const phone of card.phones) {
    const parameters: VCardParameter[] = [{ name: "VALUE", values: ["uri"] }];
    if (phone.types.length > 0) {
      parameters.push({ name: "TYPE", values: phone.types.map((value) => value.toLowerCase()) });
    }
    if (phone.pref !== undefined) {
      parameters.push({ name: "PREF", values: [String(phone.pref)] });
    }
    if (phone.altId) {
      parameters.push({ name: "ALTID", values: [phone.altId] });
    }
    if (phone.pid && phone.pid.length > 0) {
      parameters.push({ name: "PID", values: phone.pid });
    }
    appendLine(lines, { name: "TEL", parameters, value: phone.uri });
  }

  pushTextValues(lines, "IMPP", card.instantMessaging);
  pushTextValues(lines, "URL", card.urls);
  pushTextValues(lines, "NOTE", card.notes);
  pushTextValues(lines, "LANG", card.languages);

  for (const organization of card.organizations) {
    const parameters: VCardParameter[] = [];
    if (organization.types.length > 0) {
      parameters.push({
        name: "TYPE",
        values: organization.types.map((value) => value.toLowerCase()),
      });
    }
    if (organization.pref !== undefined) {
      parameters.push({ name: "PREF", values: [String(organization.pref)] });
    }
    if (organization.language) {
      parameters.push({ name: "LANGUAGE", values: [organization.language] });
    }
    if (organization.altId) {
      parameters.push({ name: "ALTID", values: [organization.altId] });
    }
    if (organization.pid && organization.pid.length > 0) {
      parameters.push({ name: "PID", values: organization.pid });
    }

    appendLine(lines, {
      name: "ORG",
      parameters,
      value: organization.values.map((value) => escapeText(value)).join(";"),
    });
  }

  for (const address of card.addresses) {
    pushAddress(lines, address);
  }

  if (card.nicknames.length > 0) {
    appendLine(lines, {
      name: "NICKNAME",
      parameters: [],
      value: card.nicknames.map((nickname) => escapeText(nickname)).join(","),
    });
  }

  if (card.categories.length > 0) {
    appendLine(lines, {
      name: "CATEGORIES",
      parameters: [],
      value: card.categories.map((category) => escapeText(category)).join(","),
    });
  }

  pushMediaValues(lines, "PHOTO", card.photos);
  pushMediaValues(lines, "LOGO", card.logos);
  pushMediaValues(lines, "SOUND", card.sounds);
  pushMediaValues(lines, "KEY", card.keys);

  for (const related of card.related) {
    const parameters: VCardParameter[] = [];
    if (related.valueType === "text") {
      parameters.push({ name: "VALUE", values: ["text"] });
    }
    if (related.types.length > 0) {
      parameters.push({ name: "TYPE", values: related.types.map((value) => value.toLowerCase()) });
    }
    if (related.pref !== undefined) {
      parameters.push({ name: "PREF", values: [String(related.pref)] });
    }
    if (related.altId) {
      parameters.push({ name: "ALTID", values: [related.altId] });
    }
    if (related.pid && related.pid.length > 0) {
      parameters.push({ name: "PID", values: related.pid });
    }
    appendLine(lines, {
      name: "RELATED",
      parameters,
      value: related.valueType === "text" ? escapeText(related.value) : related.value,
    });
  }

  for (const property of card.customProperties) {
    appendLine(lines, property);
  }

  appendLine(lines, { name: "END", parameters: [], value: "VCARD" });

  return `${lines.join("\r\n")}\r\n`;
}
