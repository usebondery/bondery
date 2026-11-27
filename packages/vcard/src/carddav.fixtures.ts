import { createHash } from "node:crypto";
import type { CardDavPersonInput, CardExtras } from "#carddav-projection.js";

const RANDOM_BYTES = 6;
const RANDOM_RANGE = 2 ** (8 * RANDOM_BYTES);

/** Seeded generator: hashes seed and counter. The same seed always gives the same sequence. */
function createRandom(seed: number): () => number {
  let counter = 0;
  return () => {
    counter += 1;
    const digest = createHash("sha256").update(`${seed}:${counter}`).digest();
    return digest.readUIntBE(0, RANDOM_BYTES) / RANDOM_RANGE;
  };
}

/** A person with the minimum a card needs. */
function makePerson(overrides: Partial<CardDavPersonInput> = {}): CardDavPersonInput {
  return {
    addresses: [],
    emails: [],
    firstName: "Jane",
    headline: null,
    id: "0192f0aa-0000-7000-8000-000000000001",
    importantDates: [],
    lastName: "Doe",
    middleName: null,
    phones: [],
    photoVersion: null,
    socials: [],
    ...overrides,
  };
}

const FIRST_NAMES = ["Jane", "Zoë", "Žofie", "李", "Anne-Marie", "O'Neil", "Søren", "Ünal"];
const LAST_NAMES = ["Doe", "Čermáková", "Smith, Jr; Esq", "van der Berg", "back\\nslash", "王"];
const HEADLINES = [
  null,
  "Engineer",
  "Engineer @ Acme",
  "Engineer @Acme",
  "@Acme",
  "Head of Growth, EMEA @ Ünïcode; Labs",
  "Founder (ex-Acme)",
];
const STREETS = ["Main St 1", "Náměstí Míru 12, flat 4", "x".repeat(90), "Back\\slash 7"];
const NOTES = [
  "Met at the conference",
  "Line one\\nLine two, with comma; and semicolon",
  "ž".repeat(60),
];
const PHONE_TYPES = ["mobile", "home", "work"] as const;
const DATE_TYPES = ["anniversary", "nameday", "graduation", "other", "birthday"] as const;

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)] as T;
}

function many<T>(random: () => number, max: number, make: (index: number) => T): T[] {
  return Array.from({ length: Math.floor(random() * (max + 1)) }, (_, index) => make(index));
}

function digits(random: () => number, length: number): string {
  return Array.from({ length }, () => Math.floor(random() * 10)).join("");
}

function isoDate(random: () => number): string {
  const year = random() < 0.3 ? 1904 : 1940 + Math.floor(random() * 80);
  const month = String(1 + Math.floor(random() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(random() * 28)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** A generated person. Handles are slugs, as the app stores them. */
function generatePerson(seed: number): CardDavPersonInput {
  const random = createRandom(seed);
  const hasMiddle = random() < 0.4;
  return {
    addresses: many(random, 2, (index) => ({
      city: random() < 0.8 ? "Praha" : null,
      country: random() < 0.5 ? "Česko" : null,
      label: index === 0 && random() < 0.4 ? "Chata, home" : null,
      line1: pick(random, STREETS),
      line2: random() < 0.3 ? "Apt 5" : null,
      postalCode: random() < 0.7 ? "11000" : null,
      state: random() < 0.3 ? "Hlavní město" : null,
      type: pick(random, ["home", "work", "other"] as const),
    })),
    emails: many(random, 3, (index) => ({
      preferred: index === 0,
      sortOrder: index,
      type: pick(random, ["home", "work", "personal"] as const),
      value: `user${digits(random, 4)}@example.com`,
    })),
    firstName: pick(random, FIRST_NAMES),
    headline: pick(random, HEADLINES),
    id: `0192f0aa-0000-7000-8000-${String(seed).padStart(12, "0")}`,
    importantDates: many(random, 4, () => ({
      date: isoDate(random),
      note: random() < 0.4 ? "Note: with colon, comma; semicolon" : null,
      type: pick(random, DATE_TYPES),
    })),
    lastName: random() < 0.9 ? pick(random, LAST_NAMES) : null,
    middleName: hasMiddle ? "Marie" : null,
    phones: many(random, 3, (index) => ({
      preferred: index === 0,
      prefix: "+420",
      sortOrder: index,
      type: pick(random, PHONE_TYPES),
      value: digits(random, 9),
    })),
    photoVersion: random() < 0.5 ? "2026-03-01T10:00:00.000Z" : null,
    socials: many(random, 5, () => {
      const platform = pick(random, [
        "linkedin",
        "instagram",
        "facebook",
        "website",
        "whatsapp",
        "signal",
      ] as const);
      const handle =
        platform === "website"
          ? `site${digits(random, 3)}.example.com`
          : platform === "whatsapp" || platform === "signal"
            ? `+420${digits(random, 9)}`
            : `jane.doe${digits(random, 3)}`;
      return { handle, platform };
    }),
  };
}

/** Generated extras: properties a device owns, with groups, parameters and escapes. */
function generateExtras(seed: number): CardExtras {
  const random = createRandom(seed + 7919);
  const properties: CardExtras["properties"] = [];
  if (random() < 0.7) {
    properties.push({ name: "NOTE", parameters: [], value: pick(random, NOTES) });
  }
  if (random() < 0.5) {
    properties.push({ name: "NICKNAME", parameters: [], value: "Janie,JD" });
  }
  if (random() < 0.4) {
    properties.push({ name: "CATEGORIES", parameters: [], value: "friends,work" });
  }
  if (random() < 0.4) {
    properties.push({
      group: "item1",
      name: "X-ABRELATEDNAMES",
      parameters: [{ name: "TYPE", values: ["pointer"] }],
      value: "Sam, the brother",
    });
    properties.push({
      group: "item1",
      name: "X-ABLABEL",
      parameters: [],
      value: "_$!<Brother>!$_",
    });
  }
  if (random() < 0.4) {
    properties.push({
      name: "X-PHONETIC-FIRST-NAME",
      parameters: [{ name: "X-NOTE", values: ["a;b"] }],
      value: "Džejn",
    });
  }
  if (random() < 0.3) {
    properties.push({
      name: "X-SOCIALPROFILE",
      parameters: [{ name: "TYPE", values: ["twitter"] }],
      value: "https://twitter.com/jane",
    });
  }
  return {
    namePrefix: random() < 0.4 ? "Dr." : "",
    nameSuffix: random() < 0.3 ? "Jr.\\, PhD" : "",
    properties,
  };
}

export { createRandom, generateExtras, generatePerson, makePerson };
