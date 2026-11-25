#!/usr/bin/env node

/**
 * Compare the structure of a source export with the fixture made from it.
 *
 * Usage:
 *   node packages/tests/sample-data/verify-structure.mjs vcf <source.vcf> <fixture.vcf>
 *   node packages/tests/sample-data/verify-structure.mjs instagram <source.zip> <fixture.zip>
 *
 * Structure means the skeleton a parser sees: line count, line endings, property names and order,
 * parameter lists, the field count of structured values, the fold count, and a photo's payload
 * size. Values are expected to differ, so a structural check never compares them; the value checks
 * only prove that source personal data did not survive.
 *
 * Exit code 1 on a difference, so a fixture cannot silently lose a folded photo, a continuation
 * line, an address field, or the source's line ending.
 *
 * `--structure-only` skips the value checks. Re-anonymizing a fixture cannot prove value freshness,
 * because the input already holds substitute values.
 */
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Properties that identify the exporting application, not the person. */
const UNCHANGED_PROPERTIES = new Set(["BEGIN", "END", "PRODID", "VERSION"]);

const LINE_BREAK = /\r?\n/u;
const CRLF = "\r\n";
const QUOTED_PRINTABLE = /ENCODING=QUOTED-PRINTABLE/iu;
const QUOTED_PRINTABLE_ESCAPE = /[=](?<group1>[0-9A-Fa-f]{2})/gu;
const SORT_SEPARATOR = ",";
const PARAM_SEPARATOR = ";";

function byCodePoint(a, b) {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

/** Decodes a vCard 2.1 quoted-printable value. */
function quotedPrintableDecode(text) {
  return text.replace(QUOTED_PRINTABLE_ESCAPE, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

/** The value of a logical property, unfolded the way the vCard parser unfolds it. */
function joinedValue(property) {
  return property.logical.slice(property.logical.indexOf(":") + 1);
}

/**
 * Joins physical lines into logical lines, the way the vCard parser unfolds them.
 * @returns {Array<{ foldedCount: number, logical: string }>}
 */
function isSpaceFolded(line) {
  return line.startsWith(" ") || line.startsWith("\t");
}

/** Applies one continuation line to the joined line it belongs to. */
function continueLine(joined, line) {
  if (isSpaceFolded(line)) {
    return `${joined}${line.slice(1)}`;
  }
  // A quoted-printable soft break: the trailing `=` is dropped as the parser drops it.
  return `${joined.slice(0, -1)}${line}`;
}

function joinFoldedLines(lines) {
  const out = [];
  let joined = null;

  for (const line of lines) {
    const continuesPrevious =
      joined !== null &&
      (isSpaceFolded(line) || (joined.endsWith("=") && QUOTED_PRINTABLE.test(joined)));

    if (continuesPrevious) {
      joined = continueLine(joined, line);
      const active = out.at(-1);
      if (active !== undefined) {
        active.logical = joined;
        active.foldedCount += 1;
      }
      continue;
    }

    joined = line;
    out.push({ foldedCount: 0, logical: line });
  }

  return out;
}

/**
 * Splits one logical line into its property name and value.
 * A line with no colon keeps its text as the name, so a malformed line still reports.
 * @returns {{ lhs: string, name: string, value: string }}
 */
function splitLogicalLine(logical) {
  const colon = logical.indexOf(":");
  if (colon < 0) {
    return { lhs: logical, name: "", value: "" };
  }
  return {
    lhs: logical.slice(0, colon),
    name: logical.slice(0, colon).split(PARAM_SEPARATOR, 1)[0].toUpperCase(),
    value: logical.slice(colon + 1),
  };
}

/**
 * Splits a vCard file into logical properties the way the parser does.
 *
 * Two fold conventions exist: a leading space continues a line (RFC 6350), and a preceding
 * quoted-printable soft break continues it (vCard 2.1). The soft break is tested on the joined
 * logical line, so a chain of three or more lines keeps matching.
 *
 * @returns {Array<{ lhs: string, name: string, value: string, logical: string, foldedCount: number }>}
 */
function logicalProperties(text) {
  return joinFoldedLines(text.split(LINE_BREAK)).map((entry) => {
    const { lhs, name, value } = splitLogicalLine(entry.logical);
    return { foldedCount: entry.foldedCount, lhs, logical: entry.logical, name, value };
  });
}

/** One skeleton entry per logical property: parameters, field count, and fold count. */
function vcardSkeleton(text) {
  return logicalProperties(text).map((property) => {
    if (property.name === "") {
      return `RAW(${property.lhs})`;
    }
    const value = QUOTED_PRINTABLE.test(property.lhs)
      ? quotedPrintableDecode(property.value)
      : property.value;
    const fields = value.split(PARAM_SEPARATOR).length;
    const fold = property.foldedCount > 0 ? `|fold=${property.foldedCount}` : "";
    return `${property.lhs}|fields=${fields}${fold}`;
  });
}

function fail(message) {
  console.error(`structure mismatch: ${message}`);
  process.exitCode = 1;
}

function compareList(label, source, fixture) {
  if (source.length !== fixture.length) {
    fail(`${label}: source has ${source.length} entries, fixture has ${fixture.length}`);
    return;
  }
  source.forEach((entry, index) => {
    if (entry !== fixture[index]) {
      fail(`${label} entry ${index}: source ${entry} -> fixture ${fixture[index]}`);
    }
  });
}

/** Checks that no source personal value survived into the fixture. */
function checkValuesNotCarriedOver(sourceText, fixtureText) {
  const sourceProperties = logicalProperties(sourceText).filter((item) => item.name !== "");
  const fixtureProperties = logicalProperties(fixtureText).filter((item) => item.name !== "");

  sourceProperties.forEach((property, index) => {
    if (UNCHANGED_PROPERTIES.has(property.name)) {
      return;
    }
    const counterpart = fixtureProperties[index];
    const fixtureValue = counterpart === undefined ? "" : joinedValue(counterpart);
    if (fixtureValue.includes("undefined") || fixtureValue.includes("null")) {
      fail(`${property.name}: substitute printed a nullish value`);
    }
    if (property.value.length > 24 && fixtureValue === property.value) {
      fail(`${property.name}: source value survived unchanged`);
    }
    // A photo is a base64 payload, so its byte size is part of the structure.
    if (property.name === "PHOTO" && fixtureValue.length !== property.value.length) {
      fail(`PHOTO: payload length ${property.value.length} -> ${fixtureValue.length}`);
    }
  });
}

function checkVcf(sourceText, fixtureText, { structureOnly = false } = {}) {
  const sourceLines = sourceText.split(LINE_BREAK);
  const fixtureLines = fixtureText.split(LINE_BREAK);
  if (sourceLines.length !== fixtureLines.length) {
    fail(`line count: source ${sourceLines.length}, fixture ${fixtureLines.length}`);
  }

  const sourceCrlf = sourceText.includes(CRLF);
  if (sourceCrlf !== fixtureText.includes(CRLF)) {
    fail(`line ending: source CRLF=${sourceCrlf}, fixture CRLF=${!sourceCrlf}`);
  }

  compareList("vcard properties", vcardSkeleton(sourceText), vcardSkeleton(fixtureText));

  if (!structureOnly) {
    checkValuesNotCarriedOver(sourceText, fixtureText);
  }
}

async function unzip(zipPath, dir) {
  // `adm-zip` resolves through this workspace package and reads ZIP on every platform. Shelling
  // out does not work: `unzip` is absent on Windows and GNU tar cannot read a ZIP on Linux.
  const { default: AdmZip } = await import("adm-zip");
  await mkdir(dir, { recursive: true });
  new AdmZip(zipPath).extractAllTo(dir, true);
}

/** Every JSON file in the archive, keyed by relative path. */
async function readArchiveJson(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  const read = await Promise.all(
    files.map(async (file) => {
      const full = path.join(file.parentPath, file.name);
      /** @type {unknown} */
      const payload = JSON.parse(await readFile(full, "utf8"));
      return { name: path.relative(dir, full), payload };
    }),
  );
  return new Map(read.map((entry) => [entry.name, entry.payload]));
}

/** The shape of a JSON value: object keys and array element keys. */
function jsonShape(value) {
  if (Array.isArray(value)) {
    const keys = new Set(
      value.flatMap((item) => (item && typeof item === "object" ? Object.keys(item) : [])),
    );
    return `array<${[...keys].toSorted(byCodePoint).join(SORT_SEPARATOR)}>`;
  }
  if (value && typeof value === "object") {
    return `object<${Object.keys(value).toSorted(byCodePoint).join(SORT_SEPARATOR)}>`;
  }
  return typeof value;
}

function checkInstagramShapes(source, fixture) {
  compareList(
    "archive file list",
    [...source.keys()].toSorted(byCodePoint),
    [...fixture.keys()].toSorted(byCodePoint),
  );

  for (const [name, payload] of source) {
    const sourceShape = jsonShape(payload);
    const fixtureShape = jsonShape(fixture.get(name));
    if (sourceShape !== fixtureShape) {
      fail(`${name}: shape ${sourceShape} -> ${fixtureShape}`);
    }
  }
}

async function checkInstagram(sourceZip, fixtureZip) {
  const workDir = await mkdtemp(path.join(tmpdir(), "bondery-structure-"));
  try {
    const sourceDir = path.join(workDir, "source");
    const fixtureDir = path.join(workDir, "fixture");
    await unzip(sourceZip, sourceDir);
    await unzip(fixtureZip, fixtureDir);
    checkInstagramShapes(await readArchiveJson(sourceDir), await readArchiveJson(fixtureDir));
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}

async function main() {
  const [kind, sourcePath, fixturePath, ...flags] = process.argv.slice(2);
  if (!kind || !sourcePath || !fixturePath) {
    console.error(
      "Usage: verify-structure.mjs <vcf|instagram> <source> <fixture> [--structure-only]",
    );
    process.exitCode = 2;
    return;
  }

  const structureOnly = flags.includes("--structure-only");
  if (kind === "vcf") {
    checkVcf(await readFile(sourcePath, "utf8"), await readFile(fixturePath, "utf8"), {
      structureOnly,
    });
  } else if (kind === "instagram") {
    await checkInstagram(sourcePath, fixturePath);
  } else {
    throw new Error(`Unknown kind: ${kind}`);
  }

  if (process.exitCode !== 1) {
    console.log(`structure preserved: ${path.basename(fixturePath)}`);
  }
}

// Run only as a CLI, so a test can import the helpers without side effects.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export { logicalProperties, QUOTED_PRINTABLE, quotedPrintableDecode };
