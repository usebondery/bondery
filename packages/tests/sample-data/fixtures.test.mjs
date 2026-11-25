import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { logicalProperties, QUOTED_PRINTABLE, quotedPrintableDecode } from "./verify-structure.mjs";

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERIFY = path.join(HERE, "verify-structure.mjs");
const ANONYMIZE = path.join(HERE, "anonymize.mjs");

/** A UID this script generates: a zero UUID, optionally behind the exporter prefix. */
const SYNTHETIC_UID = /^UID:(?:urn:uuid:|[\w.-]+-)0{8}-0000-4000-8000-\d{12}$/u;
const STRUCTURE_PRESERVED = /structure preserved/u;
const LINE_BREAK = /\r?\n/u;

/** Property names whose value must never read as a programming-language null. */
const PERSONAL_PROPERTIES = new Set([
  "ADR",
  "BDAY",
  "EMAIL",
  "FN",
  "N",
  "ORG",
  "TEL",
  "TITLE",
  "X-SAMSUNGADR",
]);

/**
 * Checks one logical property against the base table.
 * @returns {string[]} One message per violation.
 */
function propertyViolations(property, { knownEmails, knownOrganizations }) {
  const name = property.name.split(".").at(-1);
  const value = QUOTED_PRINTABLE.test(property.lhs)
    ? quotedPrintableDecode(property.value)
    : property.value;
  const violations = [];

  if (name === "EMAIL" && value !== "" && !knownEmails.has(value)) {
    violations.push(`unknown email ${value}`);
  }
  if (
    name === "ORG" &&
    value !== "" &&
    value !== ";" &&
    !knownOrganizations.has(value.split(";")[0])
  ) {
    violations.push(`unknown organization ${value}`);
  }
  if (PERSONAL_PROPERTIES.has(name)) {
    if (value.includes("null")) {
      violations.push(`nullish ${name}`);
    }
    if (value.includes("undefined")) {
      violations.push(`undefined ${name}`);
    }
  }
  return violations;
}

/** Every committed fixture, with the source kind the verifier needs. */
const FIXTURES = [
  { kind: "vcf", name: "google", path: path.join(HERE, "google", "contacts.vcf") },
  { kind: "vcf", name: "iphone", path: path.join(HERE, "iphone", "iphone.vcf") },
  { kind: "vcf", name: "proton", path: path.join(HERE, "proton", "contacts.vcf") },
  { kind: "vcf", name: "samsung", path: path.join(HERE, "samsung", "contacts.vcf") },
  {
    kind: "instagram",
    name: "instagram",
    path: path.join(HERE, "instagram", "instagram-export.zip"),
  },
];

async function withTempDir(run) {
  const dir = await mkdtemp(path.join(tmpdir(), "bondery-fixture-shape-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

describe("committed fixtures keep the export structure", () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.name} is stable under re-anonymization`, async () => {
      await withTempDir(async (dir) => {
        const output = path.join(dir, path.basename(fixture.path));
        await execFileAsync(process.execPath, [
          ANONYMIZE,
          fixture.kind,
          "--input",
          fixture.path,
          "--output",
          output,
        ]);
        // Re-anonymizing a fixture must produce the same structure, because the fixture is both
        // the input and the expectation. This catches a fold, field-count, or line-ending drift.
        const { stdout } = await execFileAsync(process.execPath, [
          VERIFY,
          fixture.kind,
          fixture.path,
          output,
          "--structure-only",
        ]);
        assert.match(stdout, STRUCTURE_PRESERVED);
      });
    });
  }
});

describe("committed fixtures carry no source personal data", () => {
  // Read the base table once, not once per fixture.
  const basePromise = readFile(path.join(HERE, "base-contact-values.json"), "utf8").then(
    JSON.parse,
  );
  const vcfFixtures = FIXTURES.filter((item) => item.kind === "vcf");

  for (const fixture of vcfFixtures) {
    it(`${fixture.name} uses only base-contact-values identities`, async () => {
      const text = await readFile(fixture.path, "utf8");
      const base = await basePromise;
      const known = {
        knownEmails: new Set(base.contacts.map((contact) => contact.email)),
        knownOrganizations: new Set(
          base.contacts.map((contact) => contact.organization).filter(Boolean),
        ),
      };

      const violations = logicalProperties(text).flatMap((property) =>
        propertyViolations(property, known),
      );

      assert.deepEqual(violations, [], `${fixture.name} carries source data`);
    });

    it(`${fixture.name} has synthetic UIDs`, async () => {
      const text = await readFile(fixture.path, "utf8");
      const violations = text
        .split(LINE_BREAK)
        .filter((line) => line.startsWith("UID:") && !SYNTHETIC_UID.test(line));
      assert.deepEqual(violations, [], `${fixture.name} keeps a source identifier`);
    });
  }
});
