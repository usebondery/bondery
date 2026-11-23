/**
 * Shared harness for the importer tests.
 *
 * The corpus under `sample-data/` is the input for every test here. This module loads it once and
 * exposes the substitute identities from `base-contact-values.json`, so an assertion names a
 * person instead of re-deriving one from the file.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * The sample corpus, owned by `@bondery/tests`.
 *
 * The corpus is data, not code, so it is read from its workspace directory. Importing it through
 * the package name would need an `exports` entry, and a test asserting on a fixture path is
 * clearer when the path is visible here.
 */
const SAMPLE_DATA_DIR = path.resolve(HERE, "../../../../../packages/tests/sample-data");

type BaseContact = {
  readonly id: string;
  readonly source: string;
  readonly firstName: string;
  readonly middleName: string | null;
  readonly lastName: string;
  readonly title: string | null;
  readonly organization: string | null;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly city: string;
  readonly region: string | null;
  readonly postalCode: string;
  readonly country: string;
  readonly countryCode: string;
  readonly birthday: string;
  readonly instagram: string;
  readonly linkedin: string | null;
  readonly website: string | null;
  readonly language: string | null;
  readonly keepFrequencyDays: number | null;
  readonly notes: string | null;
  readonly hasAvatar: boolean;
  readonly duplicateOf?: string;
};

type BaseValues = {
  readonly version: number;
  readonly contacts: readonly BaseContact[];
  readonly groups: ReadonlyArray<{ id: string; label: string; memberIds: readonly string[] }>;
  readonly tags: ReadonlyArray<{ id: string; label: string; memberIds: readonly string[] }>;
};

type UploadFile = { content: Buffer; fileName: string };

let baseValuesCache: BaseValues | null = null;

/** The substitute table the anonymizers write and the importers must read back. */
function loadBaseValues(): Promise<BaseValues> {
  if (baseValuesCache !== null) {
    return Promise.resolve(baseValuesCache);
  }
  return readFile(path.join(SAMPLE_DATA_DIR, "base-contact-values.json"), "utf8").then((text) => {
    baseValuesCache = JSON.parse(text) as BaseValues;
    return baseValuesCache;
  });
}

/** Reads one fixture file as an upload part, which is what a route receives. */
async function loadUpload(relativePath: string, fileName?: string): Promise<UploadFile> {
  const absolute = path.join(SAMPLE_DATA_DIR, relativePath);
  return {
    content: await readFile(absolute),
    fileName: fileName ?? path.basename(relativePath),
  };
}

/** Reads a fixture as text, for a parser that takes a string rather than a buffer. */
function loadFixtureText(relativePath: string): Promise<string> {
  return readFile(path.join(SAMPLE_DATA_DIR, relativePath), "utf8");
}

/** A contact from the base table, by full name. Throws when the corpus no longer names them. */
async function contactNamed(firstName: string, lastName: string): Promise<BaseContact> {
  const base = await loadBaseValues();
  const match = base.contacts.find(
    (contact) => contact.firstName === firstName && contact.lastName === lastName,
  );
  if (match === undefined) {
    throw new Error(`base-contact-values.json has no ${firstName} ${lastName}`);
  }
  return match;
}

/** The distinct phone numbers a parsed contact carries, in `${prefix}${value}` form. */
function phoneNumbersOf(contact: {
  phones: ReadonlyArray<{ prefix: string | null; value: string }>;
}): string[] {
  return contact.phones.map((phone) => `${phone.prefix ?? ""}${phone.value}`);
}

/** The distinct email values a parsed contact carries. */
function emailValuesOf(contact: { emails: ReadonlyArray<{ value: string }> }): string[] {
  return contact.emails.map((email) => email.value);
}

export type { BaseContact, BaseValues, UploadFile };

export {
  contactNamed,
  emailValuesOf,
  loadBaseValues,
  loadFixtureText,
  loadUpload,
  phoneNumbersOf,
  SAMPLE_DATA_DIR,
};
