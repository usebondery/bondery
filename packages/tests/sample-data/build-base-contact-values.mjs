/**
 * Derive `base-contact-values.json` from the Bondery export sample.
 *
 * The Bondery export under `bondery/export-files/` holds 70 people, 4 groups, 10 tags, and 20
 * interactions. That file is the source of truth for names, handles, and memberships. This script
 * turns it into the substitute-value table the anonymizers read, so the table cannot drift from
 * the export.
 *
 * What the export does not carry, this script synthesizes deterministically from the record index:
 * street line, postal code where the city is unknown, birthday where the record has none, phone
 * where the record has none, and an Instagram handle. Every synthesized value is non-personal and
 * stable across runs.
 *
 * The four original vCard identities stay first. The committed `.vcf` samples were anonymized from
 * them, so their names must keep resolving.
 *
 * Usage: node packages/tests/sample-data/build-base-contact-values.mjs [--check]
 * `--check` writes nothing and exits 1 when the file on disk is stale.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = path.join(HERE, "bondery", "export-files");
const OUTPUT_PATH = path.join(HERE, "base-contact-values.json");

const INDENT = 2;
const REGION_PREFIX = /^(state|province|federal state|constituent state|autonomous region) /;
const INTERACTION_COUNTER = /\s*\(\d+\)$/;
const FIRST_SYNTHETIC_BIRTH_YEAR = 1970;
const BIRTH_YEAR_SPAN = 35;
const BIRTH_MONTHS = 12;
const DAYS_PER_MONTH = 28;

/** Postal code and region for each city the export mentions. */
const CITIES = {
  Arlington: { country: "United States", countryCode: "US", postalCode: "76010", region: "Texas" },
  Austin: { country: "United States", countryCode: "US", postalCode: "78701", region: "Texas" },
  Barcelona: { country: "Spain", countryCode: "ES", postalCode: "08001", region: "Catalonia" },
  Bengaluru: { country: "India", countryCode: "IN", postalCode: "560001", region: "Karnataka" },
  Berkeley: {
    country: "United States",
    countryCode: "US",
    postalCode: "94704",
    region: "California",
  },
  Berlin: { country: "Germany", countryCode: "DE", postalCode: "10115", region: "Berlin" },
  "Big Wells": {
    country: "United States",
    countryCode: "US",
    postalCode: "78830",
    region: "Texas",
  },
  Boston: {
    country: "United States",
    countryCode: "US",
    postalCode: "02108",
    region: "Massachusetts",
  },
  Calgary: { country: "Canada", countryCode: "CA", postalCode: "T2P 1J9", region: "Alberta" },
  Cambridge: {
    country: "United States",
    countryCode: "US",
    postalCode: "02139",
    region: "Massachusetts",
  },
  Chicago: { country: "United States", countryCode: "US", postalCode: "60601", region: "Illinois" },
  Cupertino: {
    country: "United States",
    countryCode: "US",
    postalCode: "95014",
    region: "California",
  },
  Denver: { country: "United States", countryCode: "US", postalCode: "80202", region: "Colorado" },
  Gaylord: { country: "United States", countryCode: "US", postalCode: "49735", region: "Michigan" },
  Hampton: { country: "United States", countryCode: "US", postalCode: "23666", region: "Virginia" },
  "Ho Chi Minh City": {
    country: "Vietnam",
    countryCode: "VN",
    postalCode: "700000",
    region: "Ho Chi Minh City",
  },
  Kyoto: { country: "Japan", countryCode: "JP", postalCode: "600-8001", region: "Kyoto" },
  Lagos: { country: "Nigeria", countryCode: "NG", postalCode: "100001", region: "Lagos" },
  London: {
    country: "United Kingdom",
    countryCode: "GB",
    postalCode: "EC1A 1BB",
    region: "England",
  },
  "Los Angeles": {
    country: "United States",
    countryCode: "US",
    postalCode: "90001",
    region: "California",
  },
  Manchester: {
    country: "United Kingdom",
    countryCode: "GB",
    postalCode: "M1 1AE",
    region: "England",
  },
  Matsue: { country: "Japan", countryCode: "JP", postalCode: "690-0826", region: "Shimane" },
  McLean: { country: "United States", countryCode: "US", postalCode: "22101", region: "Virginia" },
  "Menlo Park": {
    country: "United States",
    countryCode: "US",
    postalCode: "94025",
    region: "California",
  },
  "Mexico City": {
    country: "Mexico",
    countryCode: "MX",
    postalCode: "06000",
    region: "Mexico City",
  },
  "Mission Viejo": {
    country: "United States",
    countryCode: "US",
    postalCode: "92691",
    region: "California",
  },
  Munich: { country: "Germany", countryCode: "DE", postalCode: "80331", region: "Bavaria" },
  Nashville: {
    country: "United States",
    countryCode: "US",
    postalCode: "37201",
    region: "Tennessee",
  },
  "New York City": {
    country: "United States",
    countryCode: "US",
    postalCode: "10001",
    region: "New York",
  },
  Nuenen: {
    country: "Netherlands",
    countryCode: "NL",
    postalCode: "5671 AA",
    region: "North Brabant",
  },
  Oxford: {
    country: "United Kingdom",
    countryCode: "GB",
    postalCode: "OX1 1DP",
    region: "England",
  },
  "Palo Alto": {
    country: "United States",
    countryCode: "US",
    postalCode: "94301",
    region: "California",
  },
  Portland: { country: "United States", countryCode: "US", postalCode: "97201", region: "Oregon" },
  Princeton: {
    country: "United States",
    countryCode: "US",
    postalCode: "08540",
    region: "New Jersey",
  },
  Redmond: {
    country: "United States",
    countryCode: "US",
    postalCode: "98052",
    region: "Washington",
  },
  "San Francisco": {
    country: "United States",
    countryCode: "US",
    postalCode: "94105",
    region: "California",
  },
  Seattle: {
    country: "United States",
    countryCode: "US",
    postalCode: "98101",
    region: "Washington",
  },
  Seoul: { country: "South Korea", countryCode: "KR", postalCode: "04524", region: "Seoul" },
  Stanford: {
    country: "United States",
    countryCode: "US",
    postalCode: "94305",
    region: "California",
  },
  Summit: {
    country: "United States",
    countryCode: "US",
    postalCode: "07901",
    region: "New Jersey",
  },
  Taipei: { country: "Taiwan", countryCode: "TW", postalCode: "100", region: "Taipei" },
  Thessaloniki: {
    country: "Greece",
    countryCode: "GR",
    postalCode: "546 22",
    region: "Central Macedonia",
  },
  Toronto: { country: "Canada", countryCode: "CA", postalCode: "M5H 2N2", region: "Ontario" },
  Tucson: { country: "United States", countryCode: "US", postalCode: "85701", region: "Arizona" },
  Vienna: { country: "Austria", countryCode: "AT", postalCode: "1010", region: "Vienna" },
};

/**
 * Location labels the export gets wrong, keyed by `first.last`.
 * `Stanford, state New York` is a geocoder error: Stanford is in California.
 * `state Tennessee` has no city token at all.
 */
const LOCATION_OVERRIDES = {
  "Dennis.Ritchie": { city: "Summit" },
  "Donald.Knuth": { city: "Stanford", region: "California" },
  "Fei-Fei.Li": { city: "Stanford", region: "California" },
  "John.McCarthy": { city: "Stanford", region: "California" },
  "Meg.Whitman": { city: "Nashville", region: "Tennessee" },
  "Satoshi.Nakamoto": { city: "Thessaloniki" },
};

const STREET_NAMES = [
  "Market Street",
  "Cedar Avenue",
  "River Road",
  "Garden Lane",
  "Harbor Way",
  "Maple Court",
  "Bridge Street",
  "Station Road",
  "Park Avenue",
  "Willow Crescent",
];
const FIRST_STREET_NUMBER = 10;
const STREET_NUMBER_SPAN = 190;
const SYNTHETIC_PHONE_BASE = 15_559_990_000;

/** The four identities the committed `.vcf` samples were anonymized from. */
const LEGACY_VCARD_CONTACTS = [
  {
    address: "100 Market Street",
    birthday: "1992-04-18",
    city: "San Francisco",
    country: "United States",
    countryCode: "US",
    email: "elena.parker@example.test",
    firstName: "Elena",
    instagram: "elena.parker.sample",
    lastName: "Parker",
    middleName: null,
    organization: "Northwind Labs",
    phone: "+15550001001",
    postalCode: "94105",
    region: "California",
    title: "Product Manager",
  },
  {
    address: "240 Cedar Avenue",
    birthday: "1988-11-07",
    city: "Austin",
    country: "United States",
    countryCode: "US",
    email: "theo.martin@example.test",
    firstName: "Theo",
    instagram: "theo.martin.sample",
    lastName: "Martin",
    middleName: null,
    organization: "Atlas Foundry",
    phone: "+15550001002",
    postalCode: "78701",
    region: "Texas",
    title: "Software Engineer",
  },
  {
    address: "18 River Road",
    birthday: "1995-02-23",
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    email: "maya.chen@example.test",
    firstName: "Maya",
    instagram: "maya.chen.sample",
    lastName: "Chen",
    middleName: null,
    organization: "Cedar and Coast",
    phone: "+447700900101",
    postalCode: "N1 2AB",
    region: "England",
    title: "Operations Lead",
  },
  {
    address: "55 Garden Lane",
    birthday: "1990-08-12",
    city: "Bratislava",
    country: "Slovakia",
    countryCode: "SK",
    email: "zoe.bennett@example.test",
    firstName: "Zoe",
    instagram: "zoe.bennett.sample",
    lastName: "Bennett",
    middleName: null,
    organization: "Brightline Studio",
    phone: "+421900000104",
    postalCode: "81101",
    region: "Bratislava Region",
    title: "Designer",
  },
];

async function readExport(name) {
  const raw = await readFile(path.join(EXPORT_DIR, name), "utf8");
  return JSON.parse(raw).records;
}

/** `London, state England, GB` -> `{ city, region, countryCode }`. */
function parseLocation(label) {
  const parts = label
    .split(", ")
    .map((part) => part.trim())
    .filter(Boolean);
  const city = parts[0] ?? "";
  const countryCode = parts.at(-1) ?? "";
  const regionRaw = parts.length > 2 ? parts.slice(1, -1).join(", ") : "";
  return {
    city,
    countryCode,
    region: regionRaw.replace(REGION_PREFIX, ""),
  };
}

function slugName(firstName, lastName) {
  return `${firstName}.${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, ".");
}

function phoneFromIndex(index, used) {
  let candidate = `+${SYNTHETIC_PHONE_BASE + index}`;
  while (used.has(candidate)) {
    candidate = `+${Number(candidate.slice(1)) + 1}`;
  }
  used.add(candidate);
  return candidate;
}

function birthdayFromIndex(index) {
  const year = FIRST_SYNTHETIC_BIRTH_YEAR + (index % BIRTH_YEAR_SPAN);
  const month = ((index * 7) % BIRTH_MONTHS) + 1;
  const day = ((index * 11) % DAYS_PER_MONTH) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function streetFromIndex(index) {
  const number = FIRST_STREET_NUMBER + ((index * 17) % STREET_NUMBER_SPAN);
  return `${number} ${STREET_NAMES[index % STREET_NAMES.length]}`;
}

/**
 * Assemble one contact in a fixed field order, so the legacy vCard identities and the export
 * contacts read the same way in the file.
 */
function contactRecord(fields) {
  return {
    address: fields.address,
    birthday: fields.birthday ?? null,
    city: fields.city,
    country: fields.country,
    countryCode: fields.countryCode,
    email: fields.email ?? null,
    firstName: fields.firstName,
    hasAvatar: fields.hasAvatar === true,
    id: fields.id,
    instagram: fields.instagram ?? null,
    keepFrequencyDays: fields.keepFrequencyDays ?? null,
    language: fields.language ?? null,
    lastName: fields.lastName,
    linkedin: fields.linkedin ?? null,
    middleName: fields.middleName ?? null,
    notes: fields.notes ?? null,
    organization: fields.organization ?? null,
    phone: fields.phone ?? null,
    postalCode: fields.postalCode ?? null,
    region: fields.region ?? null,
    source: fields.source,
    title: fields.title ?? null,
    website: fields.website ?? null,
  };
}

/**
 * Headlines such as `Co-founder, Apple` name an organization after the comma.
 * A headline with no comma is a role only (`Mathematician`), so the record has no organization.
 */
function organizationFromHeadline(headline) {
  const commaIndex = headline.lastIndexOf(", ");
  if (commaIndex > 0) {
    return headline.slice(commaIndex + 2).trim();
  }
  return null;
}

function toContact(record, index, usedPhones) {
  const {
    city: rawCity,
    countryCode: rawCountryCode,
    region: rawRegion,
  } = parseLocation(record.location ?? "");
  const override = LOCATION_OVERRIDES[`${record.firstName}.${record.lastName}`] ?? {};
  const city = override.city ?? rawCity;
  const cityInfo = CITIES[city] ?? CITIES[rawCity] ?? CITIES.London;
  const countryCode = cityInfo.countryCode ?? rawCountryCode;
  const region = override.region ?? (cityInfo.region || rawRegion || null);
  const socials = record.socials ?? [];
  const handle = (platform) => socials.find((item) => item.platform === platform)?.handle ?? null;
  const email = record.emails?.[0]?.value ?? null;
  const phone =
    record.phones?.[0] !== undefined
      ? `${record.phones[0].prefix}${record.phones[0].value}`
      : phoneFromIndex(index, usedPhones);
  if (record.phones?.[0] !== undefined) {
    usedPhones.add(phone);
  }
  const birthday = record.importantDates?.[0]?.date ?? birthdayFromIndex(index);
  const instagramHandle =
    handle("instagram") ?? `${slugName(record.firstName, record.lastName)}.sample`;

  return contactRecord({
    address: streetFromIndex(index),
    birthday,
    city,
    country: cityInfo.country,
    countryCode,
    email,
    firstName: record.firstName,
    hasAvatar: record.hasAvatar,
    id: record.id,
    instagram: instagramHandle,
    keepFrequencyDays: record.keepFrequencyDays,
    language: record.language,
    lastName: record.lastName,
    linkedin: handle("linkedin"),
    middleName: record.middleName,
    notes: record.notes,
    organization: organizationFromHeadline(record.headline ?? ""),
    phone,
    postalCode: cityInfo.postalCode,
    region,
    source: "bondery-export",
    title: record.headline,
    website: handle("website"),
  });
}

/** Pairs the export stores twice so merge suggestions have a subject. */
function duplicateKey(record) {
  return `${record.firstName} ${record.lastName}`;
}

function markDuplicates(contacts) {
  const seen = new Map();
  for (const contact of contacts) {
    const key = duplicateKey(contact);
    const existing = seen.get(key);
    if (existing === undefined) {
      seen.set(key, contact);
      continue;
    }
    contact.duplicateOf = existing.id;
  }
}

function toGroup(record) {
  return {
    color: record.color,
    emoji: record.emoji,
    id: record.id,
    label: record.label,
    memberIds: (record.members ?? []).map((member) => member.personId),
  };
}

function toTag(record) {
  return {
    color: record.color,
    id: record.id,
    label: record.label,
    memberIds: (record.members ?? []).map((member) => member.personId),
  };
}

function toInteraction(record) {
  return {
    date: record.date,
    description: record.description,
    id: record.id,
    participantIds: record.participantIds ?? [],
    title: record.title,
    type: record.type,
  };
}

/** Interaction titles carry a per-record counter, `Coffee catch-up (7)`. */
function interactionTemplates(interactions) {
  const byTitle = new Map();
  for (const interaction of interactions) {
    const templateTitle = (interaction.title ?? "").replace(INTERACTION_COUNTER, "");
    if (!byTitle.has(templateTitle)) {
      byTitle.set(templateTitle, {
        description: interaction.description,
        title: templateTitle,
        type: interaction.type,
      });
    }
  }
  return [...byTitle.values()];
}

async function build() {
  const [people, groups, tags, interactions] = await Promise.all([
    readExport("people.json"),
    readExport("groups.json"),
    readExport("tags.json"),
    readExport("interactions.json"),
  ]);

  const usedPhones = new Set(LEGACY_VCARD_CONTACTS.map((contact) => contact.phone));
  const exportContacts = people.map((record, index) => toContact(record, index, usedPhones));
  markDuplicates(exportContacts);

  const legacyContacts = LEGACY_VCARD_CONTACTS.map((contact, index) =>
    contactRecord({
      ...contact,
      id: `legacy-vcard-${String(index + 1).padStart(4, "0")}`,
      source: "vcard",
    }),
  );

  return {
    $comment:
      "Generated by build-base-contact-values.mjs from bondery/export-files. Do not edit by hand. Street lines, missing postal codes, missing birthdays, missing phones, and Instagram handles are synthetic and stable per record index.",
    contacts: [...legacyContacts, ...exportContacts],
    groups: groups.map(toGroup),
    interactions: interactions.map(toInteraction),
    interactionTemplates: interactionTemplates(interactions),
    tags: tags.map(toTag),
    version: 2,
  };
}

/**
 * `--check` compares against the committed file and writes nothing.
 * `--output <path>` writes elsewhere, so a test can compare two builds without touching the
 * committed file.
 */
function parseArgs(argv) {
  const outputIndex = argv.indexOf("--output");
  return {
    check: argv.includes("--check"),
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : OUTPUT_PATH,
  };
}

/** Sorts object keys recursively, so the generated file matches the repository's JSON style. */
function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .toSorted((a, b) => a.localeCompare(b))
      .map((key) => [key, sortKeysDeep(value[key])]),
  );
}

async function main() {
  const { check, outputPath } = parseArgs(process.argv.slice(2));
  const payload = sortKeysDeep(await build());
  const serialized = `${JSON.stringify(payload, null, INDENT)}\n`;

  if (check) {
    const current = await readFile(outputPath, "utf8").catch(() => "");
    if (current !== serialized) {
      console.error(`${path.basename(outputPath)} is stale. Run: pnpm run sample-data:base`);
      process.exitCode = 1;
      return;
    }
    console.log(`${path.basename(outputPath)} is current`);
    return;
  }

  await writeFile(outputPath, serialized, "utf8");
  const duplicateCount = payload.contacts.filter((contact) => contact.duplicateOf).length;
  console.log(
    `Wrote ${outputPath}: ${payload.contacts.length} contacts (${duplicateCount} merge pairs), ${payload.groups.length} groups, ${payload.tags.length} tags, ${payload.interactions.length} interactions, ${payload.interactionTemplates.length} templates`,
  );
}

await main();
