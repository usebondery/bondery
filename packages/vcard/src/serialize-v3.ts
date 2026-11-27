import { createSocialUrl } from "@bondery/helpers";
import type {
  CardAddress,
  CardDate,
  CardExtras,
  CardMessenger,
  CardPhone,
  CardProjection,
} from "#carddav-projection.js";
import {
  buildContentLine,
  escapeVCardText,
  foldContentLine,
  normalizeNewlines,
} from "#carddav-text.js";
import type { VCardParameter, VCardProperty } from "#model.js";

/** Product identifier of cards the server writes. */
const CARDDAV_PRODID = "-//Bondery//CardDAV//EN";

/** Year Apple writes for a date with no year, and the value of `X-APPLE-OMIT-YEAR`. */
const APPLE_OMIT_YEAR = "1604";

/** Standard Apple labels are written as `_$!<Name>!$_`. */
const APPLE_STANDARD_LABEL_RE: RegExp = /^_\$!<(.*)>!\$_$/s;

/** Labels the writer gives to important dates, and the reader maps back. */
const DATE_TYPE_LABELS: Record<CardDate["type"], string> = {
  anniversary: "Anniversary",
  birthday: "Birthday",
  graduation: "Graduation",
  nameday: "Name day",
  other: "Other",
};

const MESSENGER_SERVICES: Record<CardMessenger["platform"], string> = {
  signal: "Signal",
  whatsapp: "WhatsApp",
};

const PHONE_TYPES: Record<CardPhone["type"], string> = {
  home: "HOME",
  mobile: "CELL",
  work: "WORK",
};

/** Properties the writer sets itself. An extra with one of these names never overrides it. */
const OWNED_PROPERTY_NAMES = new Set([
  "BEGIN",
  "END",
  "VERSION",
  "PRODID",
  "REV",
  "UID",
  "N",
  "FN",
  "TITLE",
  "ORG",
  "PHOTO",
]);

const GROUP_RE = /^item(\d+)$/;
const LINE_BREAK_RE = /\n/g;

interface SerializeCardV3Options {
  extras: CardExtras;
  /** Stored avatar bytes. Written as `PHOTO;ENCODING=b;TYPE=JPEG`. */
  photo?: { jpegBytes: Uint8Array };
  uid: string;
}

function property(
  name: string,
  value: string,
  parameters: VCardParameter[] = [],
  group?: string,
): VCardProperty {
  return { group, name, parameters, value };
}

function typeParameter(...types: Array<string | false>): VCardParameter {
  return { name: "TYPE", values: types.filter((type): type is string => type !== false) };
}

/** Text value: RFC 2426 escaping. */
function text(value: string): string {
  return escapeVCardText(value);
}

/** Value of a URI type: raw, with no line break that could end the content line. */
function singleLine(value: string): string {
  return normalizeNewlines(value).replace(LINE_BREAK_RE, "");
}

function displayName(projection: CardProjection): string {
  const { first, middle, last } = projection.name;
  const name = [first, middle, last].filter(Boolean).join(" ");
  // FN is required, so a person with no name shows an email or phone number. The reader
  // knows this rule and does not turn that value back into a name.
  return name || (fallbackDisplayName(projection) ?? "");
}

/** FN the writer gives a card with no name. The reader uses it to ignore that FN. */
function fallbackDisplayName(projection: Pick<CardProjection, "emails" | "phones">): string | null {
  return projection.emails[0]?.value ?? projection.phones[0]?.value ?? null;
}

function nameProperties(projection: CardProjection, extras: CardExtras): VCardProperty[] {
  const { first, middle, last } = projection.name;
  return [
    property(
      "N",
      [text(last), text(first), text(middle), extras.namePrefix, extras.nameSuffix].join(";"),
    ),
    property("FN", text(displayName(projection))),
  ];
}

function headlineProperties(projection: CardProjection): VCardProperty[] {
  const { title, org } = projection.headline;
  return [
    ...(title ? [property("TITLE", text(title))] : []),
    ...(org ? [property("ORG", text(org))] : []),
  ];
}

function channelProperties(projection: CardProjection): VCardProperty[] {
  const phones = projection.phones.map((phone) =>
    property("TEL", text(phone.value), [
      typeParameter(PHONE_TYPES[phone.type], phone.preferred && "pref"),
    ]),
  );
  const emails = projection.emails.map((email) =>
    property("EMAIL", text(email.value), [
      typeParameter("INTERNET", email.type === "work" ? "WORK" : "HOME", email.preferred && "pref"),
    ]),
  );
  return [...phones, ...emails];
}

function addressValue(address: CardAddress): string {
  return [
    "",
    text(address.line2),
    text(address.line1),
    text(address.city),
    text(address.state),
    text(address.postalCode),
    text(address.country),
  ].join(";");
}

function linkProperties(projection: CardProjection): VCardProperty[] {
  const urls = projection.websites.map((url) => property("URL", singleLine(url)));
  const profiles = projection.socialProfiles.map((profile) =>
    property("X-SOCIALPROFILE", singleLine(createSocialUrl(profile.platform, profile.handle)), [
      typeParameter(profile.platform),
    ]),
  );
  const messengers = projection.messengers.map((messenger) =>
    property("IMPP", singleLine(`${messenger.platform}:${messenger.handle}`), [
      { name: "X-SERVICE-TYPE", values: [MESSENGER_SERVICES[messenger.platform]] },
    ]),
  );
  return [...urls, ...profiles, ...messengers];
}

/** The date text and parameters of a card date. A date with no year uses the Apple form. */
function dateValue(date: string): { parameters: VCardParameter[]; value: string } {
  if (date.startsWith("--")) {
    return {
      parameters: [{ name: "X-APPLE-OMIT-YEAR", values: [APPLE_OMIT_YEAR] }],
      value: `${APPLE_OMIT_YEAR}-${date.slice(2)}`,
    };
  }
  return { parameters: [], value: date };
}

function dateLabel(entry: CardDate): string {
  const base = DATE_TYPE_LABELS[entry.type];
  if (entry.note) {
    return `${base}: ${entry.note}`;
  }
  return entry.type === "anniversary" || entry.type === "other" ? `_$!<${base}>!$_` : base;
}

/**
 * Hands out `itemN` group names that no extra uses, so a labelled property of the card never
 * joins a group of a device extra.
 */
function createGroupAllocator(extras: CardExtras): () => string {
  const taken = new Set<number>();
  for (const extra of extras.properties) {
    const match = extra.group ? GROUP_RE.exec(extra.group) : null;
    if (match) {
      taken.add(Number(match[1]));
    }
  }
  let next = 1;
  return () => {
    while (taken.has(next)) {
      next += 1;
    }
    const group = `item${next}`;
    next += 1;
    return group;
  };
}

function labelledAddressProperties(
  projection: CardProjection,
  nextGroup: () => string,
): VCardProperty[] {
  return projection.addresses.flatMap((address) => {
    const group = address.label ? nextGroup() : undefined;
    const adr = property(
      "ADR",
      addressValue(address),
      [typeParameter(address.type.toUpperCase())],
      group,
    );
    return group ? [adr, property("X-ABLabel", text(address.label), [], group)] : [adr];
  });
}

function dateProperties(projection: CardProjection, nextGroup: () => string): VCardProperty[] {
  const result: VCardProperty[] = [];
  if (projection.birthday) {
    const { parameters, value } = dateValue(projection.birthday);
    result.push(property("BDAY", value, parameters));
  }
  for (const entry of projection.otherDates) {
    const group = nextGroup();
    const { parameters, value } = dateValue(entry.date);
    result.push(
      property("X-ABDATE", value, [{ name: "TYPE", values: ["pointer"] }, ...parameters], group),
      property("X-ABLabel", text(dateLabel(entry)), [], group),
    );
  }
  return result;
}

function photoProperty(photo: SerializeCardV3Options["photo"]): VCardProperty[] {
  if (!photo || photo.jpegBytes.length === 0) {
    return [];
  }
  return [
    property("PHOTO", Buffer.from(photo.jpegBytes).toString("base64"), [
      { name: "ENCODING", values: ["b"] },
      { name: "TYPE", values: ["JPEG"] },
    ]),
  ];
}

function extraProperties(extras: CardExtras, projection: CardProjection): VCardProperty[] {
  return extras.properties.filter(
    (extra) =>
      !OWNED_PROPERTY_NAMES.has(extra.name) && !(extra.name === "BDAY" && projection.birthday),
  );
}

/**
 * Writes a card as vCard 3.0 text (RFC 2426) in the Apple dialect.
 *
 * The text depends only on the arguments: same input, same bytes. It has no `REV` line, because
 * a revision would change the text of an unchanged card.
 *
 * @param projection Canonical projection of the card.
 * @param options UID, device-owned extras and the optional photo.
 * @returns CRLF-delimited vCard text with lines folded at 75 octets.
 */
function serializeCardV3(projection: CardProjection, options: SerializeCardV3Options): string {
  const { extras } = options;
  const nextGroup = createGroupAllocator(extras);

  const properties: VCardProperty[] = [
    property("BEGIN", "VCARD"),
    property("VERSION", "3.0"),
    property("PRODID", CARDDAV_PRODID),
    property("UID", singleLine(options.uid)),
    ...nameProperties(projection, extras),
    ...headlineProperties(projection),
    ...channelProperties(projection),
    ...labelledAddressProperties(projection, nextGroup),
    ...linkProperties(projection),
    ...dateProperties(projection, nextGroup),
    ...photoProperty(options.photo),
    ...extraProperties(extras, projection),
    property("END", "VCARD"),
  ];

  const lines = properties.flatMap((entry) => foldContentLine(buildContentLine(entry)));
  return `${lines.join("\r\n")}\r\n`;
}

export type { SerializeCardV3Options };

export {
  APPLE_OMIT_YEAR,
  APPLE_STANDARD_LABEL_RE,
  CARDDAV_PRODID,
  DATE_TYPE_LABELS,
  fallbackDisplayName,
  serializeCardV3,
};
