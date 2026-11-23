import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "build-base-contact-values.mjs");
const BASE_PATH = path.join(HERE, "base-contact-values.json");

const E164_PHONE = /^\+\d{7,15}$/;
const SUBSTITUTE_EMAIL = /^[^@\s]+@[^@\s]+\.(test|com)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NON_BLANK = /\S/;
const ISO_COUNTRY_CODE = /^[A-Z]{2}$/;
const INSTAGRAM_HANDLE = /^[\w.]+$/;
const STALE_CHECK_FAILURE = /is stale/;
const TAMPERED_VERSION = /"version": 999/;
const IS_CURRENT = /is current/;

/**
 * Narrows a `JSON.parse` result to `unknown`, because Biome rejects returning `any`.
 * @param {unknown} value
 * @returns {unknown}
 */
function asUnknown(value) {
  return value;
}

async function withTempDir(run) {
  const dir = await mkdtemp(path.join(tmpdir(), "bondery-base-values-test-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

/**
 * @returns {Promise<{ contacts: Record<string, unknown>[], groups: Record<string, unknown>[], tags: Record<string, unknown>[], interactions: Record<string, unknown>[], interactionTemplates: unknown[] }>}
 *   The generated fixture table.
 */
async function readBase() {
  return asUnknown(JSON.parse(await readFile(BASE_PATH, "utf8")));
}

describe("base-contact-values.json identities", () => {
  it("keeps the four legacy vCard identities first", async () => {
    const base = await readBase();
    const legacy = base.contacts.filter((contact) => contact.source === "vcard");
    assert.deepEqual(
      legacy.map((contact) => `${contact.firstName} ${contact.lastName}`),
      ["Elena Parker", "Theo Martin", "Maya Chen", "Zoe Bennett"],
    );
    assert.deepEqual(
      base.contacts.slice(0, legacy.length).map((contact) => contact.id),
      legacy.map((contact) => contact.id),
    );
  });

  it("covers every person in the export, duplicates included", async () => {
    const base = await readBase();
    const exportRecords = JSON.parse(
      await readFile(path.join(HERE, "bondery", "export-files", "people.json"), "utf8"),
    ).records;
    assert.equal(base.contacts.length, exportRecords.length + 4);
    assert.deepEqual(
      base.contacts
        .filter((contact) => contact.source === "bondery-export")
        .map((contact) => contact.id),
      exportRecords.map((record) => record.id),
    );
  });

  it("marks the five merge pairs against their first record", async () => {
    const base = await readBase();
    const duplicates = base.contacts.filter((contact) => contact.duplicateOf !== undefined);
    assert.deepEqual(
      duplicates.map((contact) => `${contact.firstName} ${contact.lastName}`),
      ["Ada Lovelace", "Alan Turing", "Steve Jobs", "Grace Hopper", "Margaret Hamilton"],
    );
    const ids = new Set(base.contacts.map((contact) => contact.id));
    for (const duplicate of duplicates) {
      assert.ok(ids.has(duplicate.duplicateOf));
      assert.notEqual(duplicate.duplicateOf, duplicate.id);
    }
  });

  it("gives every contact the fields the anonymizers read", async () => {
    const base = await readBase();
    for (const contact of base.contacts) {
      assert.ok(contact.firstName, `${contact.id} has no firstName`);
      assert.match(contact.phone, E164_PHONE, `${contact.id} phone`);
      assert.match(contact.email, SUBSTITUTE_EMAIL, `${contact.id} email`);
      assert.match(contact.birthday, ISO_DATE, `${contact.id} birthday`);
      assert.match(contact.postalCode, NON_BLANK, `${contact.id} postalCode`);
      assert.match(contact.countryCode, ISO_COUNTRY_CODE, `${contact.id} countryCode`);
      assert.match(contact.instagram, INSTAGRAM_HANDLE, `${contact.id} instagram`);
    }
  });

  it("keeps emails and phones unique except where a merge pair shares them", async () => {
    const base = await readBase();
    const countBy = (key) =>
      base.contacts.reduce((counts, contact) => {
        counts.set(contact[key], (counts.get(contact[key]) ?? 0) + 1);
        return counts;
      }, new Map());

    // A shared email or phone is the merge signal, so a repeat must belong to a duplicate record.
    for (const [email, count] of countBy("email")) {
      if (count === 1) {
        continue;
      }
      const holders = base.contacts.filter((contact) => contact.email === email);
      assert.ok(
        holders.some((contact) => contact.duplicateOf !== undefined),
        `${email} repeats without a merge pair`,
      );
    }
    assert.equal(countBy("phone").get("+447700900123"), 2);
  });
});

describe("base-contact-values.json references", () => {
  it("points every group and tag member at a known contact", async () => {
    const base = await readBase();
    const ids = new Set(base.contacts.map((contact) => contact.id));
    for (const member of [...base.groups, ...base.tags].flatMap((item) => item.memberIds)) {
      assert.ok(ids.has(member), `${member} is not a contact`);
    }
    assert.ok(base.groups.length > 0);
    assert.ok(base.tags.length > 0);
  });

  it("points every interaction participant at a known contact", async () => {
    const base = await readBase();
    const ids = new Set(base.contacts.map((contact) => contact.id));
    for (const interaction of base.interactions) {
      assert.ok(interaction.participantIds.length >= 2, `${interaction.id} has one participant`);
      for (const participant of interaction.participantIds) {
        assert.ok(ids.has(participant), `${participant} is not a contact`);
      }
    }
    assert.ok(base.interactionTemplates.length > 0);
  });
});

describe("base-contact-values.json staleness guard", () => {
  it("reports the file as current", async () => {
    const { stdout } = await execFileAsync(process.execPath, [SCRIPT, "--check"]);
    assert.match(stdout, IS_CURRENT);
  });

  it("reports a stale file instead of rewriting it", async () => {
    await withTempDir(async (dir) => {
      // A writable copy keeps the shared committed file untouched while the check runs.
      const copy = path.join(dir, "base-contact-values.json");
      const original = await readFile(BASE_PATH, "utf8");
      const tampered = { ...JSON.parse(original), version: 999 };
      await writeFile(copy, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");

      await assert.rejects(
        () => execFileAsync(process.execPath, [SCRIPT, "--check", "--output", copy]),
        (error) => error.code === 1 && STALE_CHECK_FAILURE.test(error.stderr),
      );
      const after = await readFile(copy, "utf8");
      assert.match(after, TAMPERED_VERSION, "a check must not rewrite the file");
    });
  });
});
