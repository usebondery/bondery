/**
 * Seed a developer sample CRM via the Bondery API, then write a Bondery JSON
 * export ZIP that new accounts can import from Settings → Import.
 *
 * Usage:
 *   BONDERY_API_KEY=bondery_key_… node packages/tests/sample-data/bondery/seed-sample-export.mjs
 *
 * Defaults to the local API (https://127.0.0.1:26642, trusting the dev API CA).
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveDevApiUrl } from "./dev-api.mjs";

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function asUnknown(value) {
  return value;
}

const API_URL = resolveDevApiUrl();
const API_KEY = process.env.BONDERY_API_KEY;
const BONDERY_VERSION = "1.9.1";
const CONCURRENCY = 1;

if (!API_KEY) {
  console.error("BONDERY_API_KEY is required");
  process.exitCode = 1;
  throw new Error("BONDERY_API_KEY is required");
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(ROOT, "export-files");
const ZIP_PATH = path.join(ROOT, "bondery-sample-export.zip");

function slugName(firstName, lastName) {
  return `${firstName}.${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function emailFor(firstName, lastName, suffix = "") {
  return `${slugName(firstName, lastName)}${suffix}@example.com`;
}

function linkedinFor(firstName, lastName) {
  return `https://www.linkedin.com/in/${slugName(firstName, lastName).replaceAll(".", "-")}`;
}

/** 65 unique people + 5 near-duplicates = 70 contacts. */
const UNIQUE_CONTACTS = [
  {
    birthday: "1815-12-10",
    firstName: "Ada",
    headline: "Mathematician",
    instagram: "ada.lovelace",
    keepFrequencyDays: 30,
    language: "en",
    lastName: "Lovelace",
    location: "London, UK",
    notes: "Wrote the first algorithm intended for a machine.",
  },
  {
    birthday: "1912-06-23",
    firstName: "Alan",
    headline: "Computer scientist",
    keepFrequencyDays: 30,
    language: "en",
    lastName: "Turing",
    location: "Manchester, UK",
    notes: "Broke Enigma and defined the Turing machine.",
    phone: { prefix: "+44", value: "7700900123" },
  },
  {
    birthday: "1955-02-24",
    firstName: "Steve",
    headline: "Co-founder, Apple",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Jobs",
    location: "Palo Alto, USA",
    notes: "Product taste and the original Mac launch.",
  },
  {
    birthday: "1906-12-09",
    firstName: "Grace",
    headline: "Rear Admiral, US Navy",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Hopper",
    location: "Arlington, USA",
    notes: "COBOL pioneer. Ask about compilers over coffee.",
  },
  {
    birthday: "1936-08-17",
    firstName: "Margaret",
    headline: "Software engineer, Apollo",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Hamilton",
    location: "Cambridge, USA",
    notes: "Led the onboard flight software for Apollo 11.",
  },
  {
    firstName: "Bill",
    headline: "Co-founder, Microsoft",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Gates",
    location: "Medina, USA",
    notes: "Philanthropy follow-up after the climate briefing.",
  },
  {
    firstName: "Linus",
    headline: "Creator of Linux",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Torvalds",
    location: "Portland, USA",
    notes: "Kernel maintainer. Prefers email over calls.",
  },
  {
    firstName: "Tim",
    headline: "Inventor of the World Wide Web",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Berners-Lee",
    location: "Oxford, UK",
    notes: "Solid project and open web advocacy.",
  },
  {
    firstName: "Vint",
    headline: "Internet pioneer",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Cerf",
    location: "McLean, USA",
    notes: "TCP/IP co-designer. Google Chief Internet Evangelist.",
  },
  {
    firstName: "Radia",
    headline: "Network engineer",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Perlman",
    location: "Redmond, USA",
    notes: "Spanning Tree Protocol. Call her the mother of the internet.",
  },
  {
    firstName: "Barbara",
    headline: "Programming language researcher",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Liskov",
    location: "Cambridge, USA",
    notes: "Liskov substitution principle. MIT CSAIL.",
  },
  {
    firstName: "Frances",
    headline: "Compiler researcher",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Allen",
    location: "New York, USA",
    notes: "First woman to win the Turing Award.",
  },
  {
    birthday: "1918-08-26",
    firstName: "Katherine",
    headline: "Mathematician, NASA",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Johnson",
    location: "Hampton, USA",
    notes: "Orbital mechanics for Mercury and Apollo.",
  },
  {
    firstName: "Hedy",
    headline: "Inventor and actor",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Lamarr",
    location: "Vienna, Austria",
    notes: "Frequency-hopping work that led toward Wi-Fi.",
  },
  {
    firstName: "John",
    headline: "Mathematician",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "von Neumann",
    location: "Princeton, USA",
    notes: "Architecture, game theory, and computing.",
  },
  {
    firstName: "Claude",
    headline: "Information theorist",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Shannon",
    location: "Gaylord, USA",
    notes: "A Mathematical Theory of Communication.",
  },
  {
    firstName: "Dennis",
    headline: "Creator of C",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Ritchie",
    location: "Summit, USA",
    notes: "Unix and C with Ken Thompson.",
  },
  {
    firstName: "Ken",
    headline: "Unix co-creator",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Thompson",
    location: "Berkeley, USA",
    notes: "Go, Unix, and chess machines.",
  },
  {
    firstName: "Bjarne",
    headline: "Creator of C++",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Stroustrup",
    location: "New York, USA",
    notes: "Met after a language design talk.",
  },
  {
    firstName: "Guido",
    headline: "Creator of Python",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "van Rossum",
    location: "San Francisco, USA",
    notes: "BDFL emeritus. Prefers async catch-ups.",
  },
  {
    firstName: "Larry",
    headline: "Co-founder, Google",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Page",
    location: "Palo Alto, USA",
    notes: "PageRank origin story still comes up.",
  },
  {
    firstName: "Sergey",
    headline: "Co-founder, Google",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Brin",
    location: "Los Altos, USA",
    notes: "Moonshot conversations at X.",
  },
  {
    firstName: "Jeff",
    headline: "Founder, Amazon",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Bezos",
    location: "Seattle, USA",
    notes: "Customer obsession as an operating system.",
  },
  {
    firstName: "Satoshi",
    headline: "Bitcoin author",
    keepFrequencyDays: null,
    language: "en",
    lastName: "Nakamoto",
    location: "Unknown",
    notes: "Pseudonymous. Keep the sample notes fictional.",
  },
  {
    firstName: "Brendan",
    headline: "Creator of JavaScript",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Eich",
    location: "San Francisco, USA",
    notes: "Ten days in May 1995.",
  },
  {
    firstName: "Anders",
    headline: "Creator of TypeScript",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Hejlsberg",
    location: "Redmond, USA",
    notes: "Turbo Pascal, C#, TypeScript lineage.",
  },
  {
    firstName: "James",
    headline: "Creator of Java",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Gosling",
    location: "Calgary, Canada",
    notes: "Oak became Java. Friendly at Q&A.",
  },
  {
    firstName: "Yukihiro",
    headline: "Creator of Ruby",
    keepFrequencyDays: 90,
    language: "ja",
    lastName: "Matsumoto",
    location: "Matsue, Japan",
    notes: "Matz. Developer happiness as a design goal.",
  },
  {
    firstName: "Donald",
    headline: "Author of The Art of Computer Programming",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Knuth",
    location: "Stanford, USA",
    notes: "TeX, literate programming, and reward checks.",
  },
  {
    firstName: "Edsger",
    headline: "Computer scientist",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Dijkstra",
    location: "Nuenen, Netherlands",
    notes: "Goto considered harmful. Shortest paths.",
  },
  {
    firstName: "Tony",
    headline: "Computer scientist",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Hoare",
    location: "Cambridge, UK",
    notes: "Quicksort and CSP. Null as a billion-dollar mistake.",
  },
  {
    firstName: "John",
    headline: "Creator of Lisp",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "McCarthy",
    location: "Stanford, USA",
    notes: "Coined artificial intelligence.",
  },
  {
    firstName: "Marvin",
    headline: "AI researcher",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Minsky",
    location: "Boston, USA",
    notes: "MIT AI Lab. Society of Mind.",
  },
  {
    firstName: "Geoffrey",
    headline: "Deep learning researcher",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Hinton",
    location: "Toronto, Canada",
    notes: "Backprop, Boltzmann machines, Nobel-era work.",
  },
  {
    firstName: "Yann",
    headline: "Chief AI Scientist, Meta",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "LeCun",
    location: "New York, USA",
    notes: "CNNs and energy-based models.",
  },
  {
    firstName: "Fei-Fei",
    headline: "AI researcher",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Li",
    location: "Stanford, USA",
    notes: "ImageNet. Human-centered AI.",
  },
  {
    firstName: "Andrew",
    headline: "AI educator",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Ng",
    location: "Palo Alto, USA",
    notes: "Coursera and Landing AI. Great at teaching.",
  },
  {
    firstName: "Demis",
    headline: "CEO, Google DeepMind",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Hassabis",
    location: "London, UK",
    notes: "AlphaFold and the games-to-science path.",
  },
  {
    firstName: "Ilya",
    headline: "AI researcher",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Sutskever",
    location: "San Francisco, USA",
    notes: "Scaling, SSI, and research taste.",
  },
  {
    firstName: "Sheryl",
    headline: "Operator and author",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Sandberg",
    location: "Menlo Park, USA",
    notes: "Lean In. Ops-heavy conversations.",
  },
  {
    firstName: "Meg",
    headline: "Former CEO, eBay and HP",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Whitman",
    location: "Silicon Valley, USA",
    notes: "Marketplace scaling stories.",
  },
  {
    firstName: "Ginni",
    headline: "Former CEO, IBM",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Rometty",
    location: "New York, USA",
    notes: "Enterprise transformation notes.",
  },
  {
    firstName: "Padmasree",
    headline: "Technology executive",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Warrior",
    location: "Palo Alto, USA",
    notes: "Cisco / Motorola era networking.",
  },
  {
    firstName: "Reshma",
    headline: "Founder, Girls Who Code",
    keepFrequencyDays: 30,
    language: "en",
    lastName: "Saujani",
    location: "New York, USA",
    notes: "Invite to the next chapter event.",
  },
  {
    firstName: "Tracy",
    headline: "Engineer and advocate",
    keepFrequencyDays: 30,
    language: "en",
    lastName: "Chou",
    location: "San Francisco, USA",
    notes: "Diversity numbers in tech. Project Include.",
  },
  {
    firstName: "Limor",
    headline: "Founder, Adafruit",
    instagram: "adafruit",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Fried",
    location: "New York, USA",
    notes: "Open hardware. ladyada.",
  },
  {
    firstName: "Mitchell",
    headline: "Executive Chair, Mozilla",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Baker",
    location: "Mountain View, USA",
    notes: "Open source governance.",
  },
  {
    firstName: "Marissa",
    headline: "Former CEO, Yahoo",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Mayer",
    location: "Palo Alto, USA",
    notes: "Early Google PM. Design-minded.",
  },
  {
    firstName: "Susan",
    headline: "Former CEO, YouTube",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Wojcicki",
    location: "Los Altos, USA",
    notes: "Garage Google lore.",
  },
  {
    firstName: "Whitney",
    headline: "Founder, Bumble",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Wolfe Herd",
    location: "Austin, USA",
    notes: "Consumer social products.",
  },
  {
    firstName: "Jane",
    headline: "Product manager",
    keepFrequencyDays: 14,
    language: "en",
    lastName: "Doe",
    location: "Berlin, Germany",
    notes: "Dummy contact for search and empty-state tests.",
  },
  {
    firstName: "John",
    headline: "Account executive",
    keepFrequencyDays: 14,
    language: "en",
    lastName: "Smith",
    location: "Chicago, USA",
    notes: "Dummy contact. Generic name collision tests.",
  },
  {
    firstName: "Alex",
    headline: "Designer",
    keepFrequencyDays: 30,
    language: "es",
    lastName: "Rivera",
    location: "Mexico City, Mexico",
    notes: "Met at a design systems meetup.",
  },
  {
    firstName: "Sam",
    headline: "Founder",
    keepFrequencyDays: 30,
    language: "en",
    lastName: "Patel",
    location: "Bengaluru, India",
    notes: "Climate-tech intro from a demo day.",
  },
  {
    firstName: "Jordan",
    headline: "Recruiter",
    keepFrequencyDays: 21,
    language: "en",
    lastName: "Lee",
    location: "Toronto, Canada",
    notes: "Sends thoughtful candidate notes.",
  },
  {
    firstName: "Casey",
    headline: "Staff engineer",
    keepFrequencyDays: 30,
    language: "en",
    lastName: "Nguyen",
    location: "Ho Chi Minh City, Vietnam",
    notes: "Distributed systems. Great RFC reviews.",
  },
  {
    firstName: "Riley",
    headline: "Community lead",
    keepFrequencyDays: 21,
    language: "en",
    lastName: "Okonkwo",
    location: "Lagos, Nigeria",
    notes: "Runs a local founder circle.",
  },
  {
    firstName: "Morgan",
    headline: "Data scientist",
    keepFrequencyDays: 30,
    language: "zh",
    lastName: "Chen",
    location: "Taipei, Taiwan",
    notes: "Causal inference hobbyist.",
  },
  {
    firstName: "Avery",
    headline: "Venture associate",
    keepFrequencyDays: 30,
    language: "de",
    lastName: "Schmidt",
    location: "Munich, Germany",
    notes: "Seed-stage software. Asks crisp questions.",
  },
  {
    firstName: "Quinn",
    headline: "Researcher",
    keepFrequencyDays: 60,
    language: "ja",
    lastName: "Nakamura",
    location: "Kyoto, Japan",
    notes: "HCI lab. Visiting next spring.",
  },
  {
    firstName: "Taylor",
    headline: "Customer success",
    keepFrequencyDays: 14,
    language: "en",
    lastName: "Brooks",
    location: "Denver, USA",
    notes: "Dummy CS contact for keep-in-touch.",
  },
  {
    firstName: "Jamie",
    headline: "Photographer",
    keepFrequencyDays: 45,
    language: "es",
    lastName: "Ortega",
    location: "Barcelona, Spain",
    notes: "Shot the last offsite. Send the gallery.",
  },
  {
    firstName: "Robin",
    headline: "DevRel",
    keepFrequencyDays: 30,
    language: "en",
    lastName: "Singh",
    location: "London, UK",
    notes: "Conference circuit. Always has a sticker pack.",
  },
  {
    firstName: "Drew",
    headline: "Operations",
    keepFrequencyDays: 21,
    language: "ko",
    lastName: "Kim",
    location: "Seoul, South Korea",
    notes: "Dummy ops contact for timezone tests.",
  },
  {
    firstName: "Cameron",
    headline: "Actor",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Diaz",
    location: "Los Angeles, USA",
    notes: "Famous-name filler so search is not only tech history.",
  },
];

const DUPLICATE_CONTACTS = [
  {
    duplicateEmailOf: "Ada Lovelace",
    emailOverride: "ada.lovelace@example.com",
    firstName: "Ada",
    headline: "Analyst, Analytical Engine",
    keepFrequencyDays: 30,
    language: "en",
    lastName: "Lovelace",
    location: "London, United Kingdom",
    notes: "Second Ada card from a CSV import. Same work email — should flag a merge.",
  },
  {
    duplicatePhoneOf: "Alan Turing",
    firstName: "Alan",
    headline: "Reader in mathematics",
    keepFrequencyDays: 30,
    language: "en",
    lastName: "Turing",
    location: "Manchester, United Kingdom",
    notes: "Second Alan card. Same mobile number — should flag a merge.",
    phone: { prefix: "+44", value: "7700900123" },
  },
  {
    emailSuffix: ".apple",
    firstName: "Steve",
    headline: "CEO, Apple",
    keepFrequencyDays: 90,
    language: "en",
    lastName: "Jobs",
    location: "Cupertino, USA",
    notes: "Second Steve card with the same full name and a different email.",
  },
  {
    emailOverride: "grace.hopper@example.com",
    firstName: "Grace",
    headline: "Computer scientist",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Hopper",
    location: "Arlington, Virginia, USA",
    middleName: "Murray",
    notes: "Second Grace card. Same name, extra middle name, overlapping email.",
  },
  {
    emailSuffix: ".hti",
    firstName: "Margaret",
    headline: "CEO, Hamilton Technologies",
    keepFrequencyDays: 60,
    language: "en",
    lastName: "Hamilton",
    location: "Cambridge, Massachusetts, USA",
    notes: "Second Margaret card with the same full name for the merge inbox.",
  },
];

const TAGS = [
  { color: "#6366f1", label: "Investors" },
  { color: "#0ea5e9", label: "Founders" },
  { color: "#14b8a6", label: "Mentors" },
  { color: "#f59e0b", label: "Alumni" },
  { color: "#ec4899", label: "Speakers" },
  { color: "#8b5cf6", label: "Press" },
  { color: "#f43f5e", label: "Design" },
  { color: "#22c55e", label: "Engineering" },
  { color: "#64748b", label: "Research" },
  { color: "#eab308", label: "Community" },
];

const GROUPS = [
  { color: "#6366f1", emoji: "⭐", label: "Inner Circle" },
  { color: "#0ea5e9", emoji: "💻", label: "Silicon Valley" },
  { color: "#f59e0b", emoji: "🎓", label: "Academia" },
  { color: "#ec4899", emoji: "🎤", label: "Conference friends" },
];

const INTERACTION_TEMPLATES = [
  {
    description: "Catch-up on what they are building next.",
    title: "Coffee catch-up",
    type: "Coffee",
  },
  { description: "First call after a warm intro.", title: "Intro call", type: "Call" },
  {
    description: "Walked through the roadmap and open questions.",
    title: "Product review",
    type: "Meeting",
  },
  {
    description: "Continued the hallway conversation over dinner.",
    title: "Dinner after the talk",
    type: "Meal",
  },
  {
    description: "Short conversation at a local meetup.",
    title: "Meetup hallway chat",
    type: "Networking event",
  },
  {
    description: "Sent notes and a few links from the last meeting.",
    title: "Follow-up email",
    type: "Email",
  },
  {
    description: "Confirmed timing for the next check-in.",
    title: "Quick ping",
    type: "Text/Messaging",
  },
  {
    description: "Ran into each other at an alumni night.",
    title: "Alumni mixer",
    type: "Party/Social",
  },
  {
    description: "Judged a round and debriefed with a teammate.",
    title: "Hackathon judging",
    type: "Competition/Hackathon",
  },
  {
    description: "Logged a reminder to send an introduction.",
    title: "Private note",
    type: "Note",
  },
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function api(method, pathname, body) {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${API_URL}${pathname}`, {
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${API_KEY}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      method,
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 2);
      await sleep(Math.max(retryAfter, 1) * 1000);
      continue;
    }

    const text = await response.text();
    /** @type {unknown} */
    let json = null;
    if (text) {
      try {
        json = /** @type {unknown} */ (JSON.parse(text));
      } catch {
        json = { raw: text };
      }
    }

    if (!response.ok) {
      if (response.status === 429 && attempt < maxAttempts) {
        await sleep(400 * attempt);
        continue;
      }
      const message = json?.error?.message ?? text ?? response.statusText;
      const error = new Error(`${method} ${pathname} failed (${response.status}): ${message}`);
      error.status = response.status;
      throw error;
    }

    return asUnknown(json);
  }

  throw new Error(`${method} ${pathname} failed after rate-limit retries`);
}

async function apiIgnoreSyncEmit(method, pathname, body) {
  try {
    return asUnknown(await api(method, pathname, body));
  } catch (error) {
    if (error.status !== 500) {
      throw error;
    }
    return null;
  }
}

async function mapPool(items, mapper) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()));
  return results;
}

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function buildScalarPatch(seed) {
  const patch = {
    firstName: seed.firstName,
    headline: seed.headline,
    keepFrequencyDays: seed.keepFrequencyDays,
    language: seed.language,
    lastName: seed.lastName,
    location: seed.location,
    notes: seed.notes,
  };
  if (seed.middleName) {
    patch.middleName = seed.middleName;
  }
  return patch;
}

function buildChannelPatch(seed) {
  const workEmail =
    seed.emailOverride ?? emailFor(seed.firstName, seed.lastName, seed.emailSuffix ?? "");
  const patch = {
    emails: [{ preferred: true, type: "work", value: workEmail }],
    website: `https://example.com/${slugName(seed.firstName, seed.lastName)}`,
  };
  if (seed.instagram) {
    patch.instagram = seed.instagram;
  }
  if (!seed.skipLinkedin) {
    patch.linkedin = linkedinFor(seed.firstName, seed.lastName);
  }
  if (seed.phone) {
    patch.phones = [
      { preferred: true, prefix: seed.phone.prefix, type: "work", value: seed.phone.value },
    ];
  } else if (seed.index !== null && seed.index !== undefined && seed.index % 3 === 0) {
    patch.phones = [
      {
        preferred: true,
        prefix: "+1",
        type: "home",
        value: String(5_550_100_000 + seed.index),
      },
    ];
  }
  return patch;
}

function envelope(schemaType, records) {
  return {
    bonderyVersion: BONDERY_VERSION,
    records,
    schemaType,
  };
}

function pretty(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function channelType(type) {
  return type === "work" ? "work" : "home";
}

function toExportPerson(contact, seed) {
  const { createdAt, updatedAt } = contact;
  const emails = (contact.emails ?? []).map((email, sortOrder) => ({
    createdAt,
    id: randomUUID(),
    preferred: email.preferred === true,
    sortOrder,
    type: channelType(email.type),
    updatedAt,
    value: email.value,
  }));
  const phones = (contact.phones ?? []).map((phone, sortOrder) => ({
    createdAt,
    id: randomUUID(),
    preferred: phone.preferred === true,
    prefix: phone.prefix,
    sortOrder,
    type: channelType(phone.type),
    updatedAt,
    value: phone.value,
  }));
  const socials = [];
  for (const platform of ["linkedin", "instagram", "facebook", "website", "whatsapp", "signal"]) {
    const handle = contact[platform];
    if (typeof handle === "string" && handle.trim()) {
      socials.push({
        connectedAt: null,
        createdAt,
        handle: handle.trim(),
        id: randomUUID(),
        platform,
        updatedAt,
      });
    }
  }
  const importantDates = seed?.birthday
    ? [
        {
          createdAt,
          date: seed.birthday,
          id: randomUUID(),
          note: null,
          notifyDaysBefore: 7,
          notifyOn: null,
          type: "birthday",
          updatedAt,
        },
      ]
    : [];

  return {
    addresses: [],
    createdAt,
    emails,
    firstName: contact.firstName,
    hasAvatar: false,
    headline: contact.headline ?? null,
    id: contact.id,
    importantDates,
    keepFrequencyDays: contact.keepFrequencyDays ?? null,
    language: contact.language ?? null,
    lastInteraction: contact.lastInteraction ?? null,
    lastInteractionActivityId: contact.lastInteractionActivityId ?? null,
    lastName: contact.lastName ?? null,
    latitude: contact.latitude ?? null,
    linkedin: null,
    location: contact.location ?? null,
    longitude: contact.longitude ?? null,
    middleName: contact.middleName ?? null,
    notes: contact.notes ?? null,
    notesUpdatedAt: contact.notesUpdatedAt ?? null,
    phones,
    socials,
    timezone: contact.timezone ?? null,
    updatedAt,
  };
}

async function listAllContacts() {
  const contacts = [];
  let offset = 0;
  for (;;) {
    const page = await api("GET", `/contacts?limit=200&offset=${offset}`);
    contacts.push(...(page.contacts ?? []));
    if (!page.pagination?.hasMore) {
      return contacts;
    }
    offset += page.pagination.limit ?? 200;
  }
}

async function resetPreviousSampleContacts() {
  const existing = await listAllContacts();
  const seedNames = new Set(
    [...UNIQUE_CONTACTS, ...DUPLICATE_CONTACTS].map((seed) => `${seed.firstName} ${seed.lastName}`),
  );
  const toDelete = existing.filter((contact) => {
    if (contact.myself) {
      return false;
    }
    return seedNames.has(`${contact.firstName} ${contact.lastName ?? ""}`.trim());
  });
  for (const contact of toDelete) {
    await apiIgnoreSyncEmit("DELETE", `/contacts/${contact.id}`);
    await sleep(50);
  }
  if (toDelete.length > 0) {
    console.log(`Removed ${toDelete.length} leftover sample contacts`);
  }
}

async function main() {
  /** @typedef {(typeof UNIQUE_CONTACTS)[number] | (typeof DUPLICATE_CONTACTS)[number]} SampleContactBase */
  /** @typedef {SampleContactBase & { index: number, skipLinkedin: boolean }} SampleContactSeed */

  /** @type {SampleContactSeed[]} */
  const uniqueSeeds = [];
  for (const [index, seed] of UNIQUE_CONTACTS.entries()) {
    uniqueSeeds.push({
      ...seed,
      index,
      skipLinkedin: false,
    });
  }
  /** @type {SampleContactSeed[]} */
  const duplicateSeeds = [];
  for (const [index, seed] of DUPLICATE_CONTACTS.entries()) {
    duplicateSeeds.push({
      ...seed,
      index: uniqueSeeds.length + index,
      skipLinkedin: true,
    });
  }
  const allSeeds = [...uniqueSeeds, ...duplicateSeeds];
  if (allSeeds.length !== 70) {
    throw new Error(`Expected 70 contact seeds, got ${allSeeds.length}`);
  }

  console.log(`Seeding ${allSeeds.length} contacts on ${API_URL}`);
  await resetPreviousSampleContacts();

  const created = await mapPool(allSeeds, async (seed) => {
    const createdBody = await api("POST", "/contacts", {
      firstName: seed.firstName,
      lastName: seed.lastName,
      ...(seed.middleName ? { middleName: seed.middleName } : {}),
    });
    const { id } = createdBody.contact;
    await sleep(60);
    await apiIgnoreSyncEmit("PATCH", `/contacts/${id}`, buildScalarPatch(seed));
    await sleep(60);
    await apiIgnoreSyncEmit("PATCH", `/contacts/${id}`, buildChannelPatch(seed));
    const detail = await api("GET", `/contacts/${id}`);
    return { contact: detail.contact, id, seed };
  });

  const tags = [];
  for (const tag of TAGS) {
    const createdTag = await api("POST", "/tags", { label: tag.label });
    await apiIgnoreSyncEmit("PATCH", `/tags/${createdTag.tag.id}`, { color: tag.color });
    const latest = await api("GET", `/tags/${createdTag.tag.id}`);
    tags.push(latest.tag);
  }

  const groups = [];
  for (const group of GROUPS) {
    const createdGroup = await api("POST", "/groups", group);
    groups.push(createdGroup.group);
  }

  const ids = created.map((row) => row.id);
  const pick = (start, count) => ids.slice(start, start + count);

  const tagMembers = [
    pick(20, 8),
    pick(0, 12),
    pick(8, 10),
    pick(50, 10),
    pick(10, 12),
    pick(40, 6),
    pick(51, 8),
    pick(0, 18),
    pick(28, 12),
    pick(44, 16),
  ];
  await mapPool(tags, async (tag, index) => {
    const personIds = tagMembers[index];
    if (personIds.length > 0) {
      await apiIgnoreSyncEmit("POST", `/tags/${tag.id}/contacts`, { personIds });
    }
    return personIds;
  });

  const groupMembers = [pick(0, 12), pick(5, 20), pick(10, 16), pick(40, 18)];
  await mapPool(groups, async (group, index) => {
    const personIds = groupMembers[index];
    if (personIds.length > 0) {
      await apiIgnoreSyncEmit("POST", `/groups/${group.id}/contacts`, { personIds });
    }
    return personIds;
  });

  const interactions = [];
  for (let index = 0; index < 20; index += 1) {
    const template = INTERACTION_TEMPLATES[index % INTERACTION_TEMPLATES.length];
    const participantIds = [ids[index], ids[(index + 7) % ids.length]].filter(
      (id, inner, list) => list.indexOf(id) === inner,
    );
    const title = `${template.title} (${index + 1})`;
    let createdInteraction = await apiIgnoreSyncEmit("POST", "/interactions", {
      date: daysAgo(12 + index * 11),
      description: template.description,
      participantIds,
      title,
      type: template.type,
    });
    if (!createdInteraction?.interaction?.id) {
      const listed = await api("GET", "/interactions?limit=200");
      const match = (listed.interactions ?? []).find((item) => item.title === title);
      if (!match) {
        throw new Error(`Failed to create interaction ${index + 1}: ${title}`);
      }
      createdInteraction = { interaction: match };
    }
    interactions.push({
      created: createdInteraction.interaction,
      participantIds,
    });
  }

  const detailedPeople = await mapPool(created, async (row) => {
    const detail = await api("GET", `/contacts/${row.id}`);
    return detail.contact;
  });

  const exportedAt = new Date().toISOString();
  const seedById = new Map(created.map((row) => [row.id, row.seed]));
  const peopleRecords = detailedPeople.map((contact) =>
    toExportPerson(contact, seedById.get(contact.id)),
  );
  const groupRecords = groups.map((group, index) => ({
    color: group.color,
    createdAt: group.createdAt,
    emoji: group.emoji,
    id: group.id,
    label: group.label,
    members: groupMembers[index].map((personId) => ({
      createdAt: group.createdAt,
      id: randomUUID(),
      personId,
    })),
    updatedAt: group.updatedAt,
  }));
  const tagRecords = tags.map((tag, index) => ({
    color: tag.color,
    createdAt: tag.createdAt,
    id: tag.id,
    label: tag.label,
    members: tagMembers[index].map((personId) => ({
      createdAt: tag.createdAt,
      id: randomUUID(),
      personId,
    })),
    updatedAt: tag.updatedAt,
  }));
  const interactionRecords = interactions.map(({ created: interactionRecord, participantIds }) => ({
    createdAt: interactionRecord.createdAt,
    date: interactionRecord.date,
    description: interactionRecord.description ?? null,
    id: interactionRecord.id,
    participantIds,
    title: interactionRecord.title ?? null,
    type: interactionRecord.type,
    updatedAt: interactionRecord.updatedAt,
  }));

  const files = {
    "groups.json": envelope("Groups", groupRecords),
    "interactions.json": envelope("Interactions", interactionRecords),
    "manifest.json": {
      bonderyVersion: BONDERY_VERSION,
      counts: {
        groups: groupRecords.length,
        interactions: interactionRecords.length,
        people: peopleRecords.length,
        relationships: 0,
        tags: tagRecords.length,
      },
      exportedAt,
      files: [
        { count: 0, name: "myself.json", schemaType: "Myself" },
        { count: peopleRecords.length, name: "people.json", schemaType: "People" },
        { count: groupRecords.length, name: "groups.json", schemaType: "Groups" },
        { count: tagRecords.length, name: "tags.json", schemaType: "Tags" },
        { count: interactionRecords.length, name: "interactions.json", schemaType: "Interactions" },
        { count: 0, name: "relationships.json", schemaType: "Relationships" },
      ],
      format: "bondery-export",
      includedTypes: ["Myself", "People", "Groups", "Tags", "Interactions", "Relationships"],
      schemaType: "Manifest",
    },
    "myself.json": envelope("Myself", []),
    "people.json": envelope("People", peopleRecords),
    "relationships.json": envelope("Relationships", []),
    "tags.json": envelope("Tags", tagRecords),
  };

  await mkdir(OUT_DIR, { recursive: true });
  for (const [name, payload] of Object.entries(files)) {
    await writeFile(path.join(OUT_DIR, name), pretty(payload), "utf8");
  }

  console.log(`Wrote export JSON to ${OUT_DIR}`);
  console.log(`Created contacts: ${created.length}`);
  console.log(`Created tags: ${tags.map((tag) => tag.label).join(", ")}`);
  console.log(`Created groups: ${groups.map((group) => group.label).join(", ")}`);
  console.log(`Created interactions: ${interactions.length}`);
  console.log(
    "Duplicate merge pairs: Ada Lovelace, Alan Turing, Steve Jobs, Grace Hopper, Margaret Hamilton",
  );
  console.log(`ZIP_PATH=${ZIP_PATH}`);
  console.log(`OUT_DIR=${OUT_DIR}`);
}

await main();
