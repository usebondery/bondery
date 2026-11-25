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
const SCRIPT = path.join(HERE, "anonymize.mjs");
const INSTAGRAM_ZIP = path.join(HERE, "instagram", "instagram-export.zip");

const instagramPath = "connections/followers_and_following/";
const VCARD_BOUNDARY = /^BEGIN:VCARD$/mu;
const VCARD_END = /^END:VCARD$/mu;
const NULLISH_SUBSTITUTE = /undefined|null\r\n/u;

async function withTempDir(run) {
  const dir = await mkdtemp(path.join(tmpdir(), "bondery-anonymize-test-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

/**
 * Narrows a `JSON.parse` result to `unknown`, because Biome rejects returning `any`.
 * @param {unknown} value
 * @returns {unknown}
 */
function asUnknown(value) {
  return value;
}

async function anonymize(kind, input, output) {
  await execFileAsync(process.execPath, [SCRIPT, kind, "--input", input, "--output", output]);
}

/**
 * Reads one entry from a ZIP with `adm-zip`, which works on every platform. Shelling out does not:
 * `unzip` is absent on Windows and GNU tar cannot read a ZIP on Linux CI.
 * @returns {Promise<unknown>} Parsed JSON. Callers narrow it before use.
 */
async function readZipEntry(zipPath, name) {
  const { default: AdmZip } = await import("adm-zip");
  const entry = new AdmZip(zipPath).getEntry(name);
  assert.ok(entry, `${name} missing from ${zipPath}`);
  return asUnknown(JSON.parse(entry.getData().toString("utf8")));
}

describe("anonymize instagram", () => {
  it("gives each record one identity across title, href and label values", async () => {
    await withTempDir(async (dir) => {
      const output = path.join(dir, "instagram.zip");
      await anonymize("instagram", INSTAGRAM_ZIP, output);

      const following = (await readZipEntry(output, `${instagramPath}following.json`))
        .relationships_following;
      assert.ok(following.length > 0);
      for (const record of following) {
        const [data] = record.string_list_data;
        assert.equal(
          data.href.split("/").at(-1),
          record.title,
          `record ${record.title} disagrees with its href`,
        );
        assert.ok(Number.isInteger(data.timestamp), "timestamp must stay an integer");
      }

      const closeFriends = await readZipEntry(output, `${instagramPath}close_friends.json`);
      const labelled = closeFriends.map((record) =>
        Object.fromEntries(
          record.label_values.map((entry) => [entry.label.toLowerCase(), entry.value]),
        ),
      );
      // A real export leaves `URL` empty on some close-friend records, and the fixture keeps
      // that. A present URL must name the same account as `Username`.
      const mismatched = labelled
        .filter((labels) => labels.url !== "" && labels.url.split("/").at(-1) !== labels.username)
        .map((labels) => labels.username);
      assert.deepEqual(mismatched, [], "a close friend URL must match its username");

      const untrimmed = labelled.filter((labels) => labels.name !== labels.name.trim());
      assert.deepEqual(untrimmed, [], "a substituted name must not carry padding");

      const badTimestamps = closeFriends.filter((record) => !Number.isInteger(record.timestamp));
      assert.deepEqual(badTimestamps, [], "every close friend keeps an integer timestamp");
    });
  });

  it("replaces every handle with a name from the base contact table", async () => {
    await withTempDir(async (dir) => {
      const output = path.join(dir, "instagram.zip");
      await anonymize("instagram", INSTAGRAM_ZIP, output);
      const base = JSON.parse(await readFile(path.join(HERE, "base-contact-values.json"), "utf8"));
      const known = new Set(base.contacts.map((contact) => contact.instagram));
      const following = (await readZipEntry(output, `${instagramPath}following.json`))
        .relationships_following;
      for (const record of following) {
        assert.ok(known.has(record.title), `${record.title} is not in base-contact-values.json`);
      }
    });
  });

  it("is deterministic across runs", async () => {
    await withTempDir(async (dir) => {
      const first = path.join(dir, "first.zip");
      const second = path.join(dir, "second.zip");
      await anonymize("instagram", INSTAGRAM_ZIP, first);
      await anonymize("instagram", INSTAGRAM_ZIP, second);
      const read = async (zipPath) =>
        (await readZipEntry(zipPath, `${instagramPath}following.json`)).relationships_following;
      assert.deepEqual(await read(first), await read(second));
    });
  });
});

describe("anonymize vcf", () => {
  const INPUT = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:Real;Person;;;",
    "FN:Person Real",
    "ORG:RealCorp",
    "TITLE:Boss",
    "TEL;type=CELL:+15551234567",
    "EMAIL;type=INTERNET:real@real.corp",
    "ADR;type=HOME:;;1 Real Street;RealCity;RealState;12345;RealLand",
    "BDAY:1990-01-01",
    "CATEGORIES:Real Group",
    "NOTE:private note",
    "END:VCARD",
  ].join("\r\n");

  it("removes the source identity from every property the base table covers", async () => {
    await withTempDir(async (dir) => {
      const input = path.join(dir, "in.vcf");
      const output = path.join(dir, "out.vcf");
      await writeFile(input, `${INPUT}\r\n`, "utf8");
      await anonymize("vcf", input, output);

      const text = await readFile(output, "utf8");
      for (const leaked of [
        "Person",
        "RealCorp",
        "Boss",
        "15551234567",
        "real@real.corp",
        "RealCity",
        "RealState",
        "12345",
        "RealLand",
        "Real Group",
        "private note",
      ]) {
        assert.equal(text.includes(leaked), false, `${leaked} survived anonymization`);
      }
      assert.match(text, VCARD_BOUNDARY);
      assert.match(text, VCARD_END);
      assert.equal(text.includes("BEGIN:BEGIN"), false, "a property name must not be duplicated");
      assert.equal(text.includes("END:END"), false, "a property name must not be duplicated");
    });
  });

  it("drops a property the base table has no substitute for", async () => {
    await withTempDir(async (dir) => {
      const input = path.join(dir, "in.vcf");
      const output = path.join(dir, "out.vcf");
      await writeFile(
        input,
        `${INPUT.replace("BDAY:1990-01-01", "BDAY:1990-01-01\r\nX-NICKNAME:RealNick")}\r\n`,
        "utf8",
      );
      await anonymize("vcf", input, output);
      const text = await readFile(output, "utf8");
      assert.equal(text.includes("RealNick"), false);
      assert.equal(NULLISH_SUBSTITUTE.test(text), false, "a substitute printed as null");
    });
  });

  it("never writes a null or undefined substitute into the fixture", async () => {
    await withTempDir(async (dir) => {
      const input = path.join(dir, "in.vcf");
      const output = path.join(dir, "out.vcf");
      await writeFile(input, `${INPUT}\r\n`, "utf8");
      await anonymize("vcf", input, output);
      const text = await readFile(output, "utf8");
      assert.equal(text.includes(":null"), false);
      assert.equal(text.includes(":undefined"), false);
      assert.equal(text.includes(";undefined"), false);
    });
  });
});

describe("anonymize vcf line endings", () => {
  const INPUT = ["BEGIN:VCARD", "VERSION:3.0", "FN:Person Real", "END:VCARD"].join("\n");

  it("keeps an LF source on LF, including the trailing newline", async () => {
    await withTempDir(async (dir) => {
      const input = path.join(dir, "in.vcf");
      const output = path.join(dir, "out.vcf");
      const source = `${INPUT}\n`;
      await writeFile(input, source, "utf8");
      await anonymize("vcf", input, output);
      const text = await readFile(output, "utf8");
      assert.equal(text.includes("\r\n"), false);
      assert.equal(text.endsWith("\n"), true);
      assert.equal(text.split("\n").length, source.split("\n").length);
    });
  });
});
