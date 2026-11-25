import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  findMultipartCeilingViolations,
  findUnsanitizedNotesWriters,
  MAX_DEFAULT_UPLOAD_BYTES,
} from "./check-input-safety.mjs";

const api = (path) =>
  readFileSync(fileURLToPath(new URL(`../../apps/api/src/${path}`, import.meta.url)), "utf8");

const file = (text, path = "apps/api/src/domains/x.ts") => ({ path, text });

describe("findUnsanitizedNotesWriters", () => {
  it("flags a people write that sets notes without the sanitizer", () => {
    const text = "await db.people.update({ data: { notes: body.notes }, where: { id } });";
    assert.equal(findUnsanitizedNotesWriters([file(text)]).length, 1);
  });

  it("flags createMany and upsert too", () => {
    for (const method of ["createMany", "createManyAndReturn", "upsert", "updateMany"]) {
      const text = `await db.people.${method}({ data: { notes: row.notes } });`;
      assert.equal(findUnsanitizedNotesWriters([file(text)]).length, 1, method);
    }
  });

  it("flags raw SQL that sets the notes column", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the text is a fixture that must contain a literal ${...}.
    const text = "await db.$executeRaw`UPDATE people SET notes = ${value} WHERE id = ${id}`;";
    assert.equal(findUnsanitizedNotesWriters([file(text)]).length, 1);
  });

  it("accepts a write that calls the sanitizer", () => {
    const text =
      "const notes = sanitizeNotesHtml(body.notes); await db.people.update({ data: { notes } });";
    assert.deepEqual(findUnsanitizedNotesWriters([file(text)]), []);
  });

  it("ignores a select of notes and writes that never touch notes", () => {
    const select = "await db.people.findFirst({ select: { notes: true, id: true } });";
    const other = "await db.people.update({ data: { headline: 'x' } });";
    assert.deepEqual(findUnsanitizedNotesWriters([file(select), file(other)]), []);
  });

  it("holds for the real notes write paths", () => {
    for (const path of ["domains/contacts/apply-contact-patch.ts", "domains/me/import-apply.ts"]) {
      const text = api(path);
      assert.deepEqual(findUnsanitizedNotesWriters([file(text, path)]), [], path);
      // And it is the sanitizer call that satisfies the rule, not an accident of the text.
      const stripped = text.replaceAll("sanitizeNotesHtml", "identity");
      assert.equal(findUnsanitizedNotesWriters([file(stripped, path)]).length, 1, path);
    }
  });
});

describe("findMultipartCeilingViolations", () => {
  const goodBuildApp =
    "await fastify.register(multipart, { limits: { fileSize: UPLOAD_LIMITS.default } });";
  const goodConfig =
    "export const UPLOAD_LIMITS = { default: 5 * 1024 * 1024, image: 1 } as const;";

  it("accepts the shared default", () => {
    assert.deepEqual(findMultipartCeilingViolations(goodBuildApp, goodConfig), []);
  });

  it("reads a default written with named units", () => {
    const named =
      "const MIB = 1048576;\nconst DEFAULT_MIB = 5;\nexport const UPLOAD_LIMITS = { default: DEFAULT_MIB * MIB, image: 1 } as const;";
    assert.deepEqual(findMultipartCeilingViolations(goodBuildApp, named), []);
  });

  it("flags a named default above the ceiling", () => {
    const named =
      "const MIB = 1048576;\nconst BIG_MIB = 100;\nexport const UPLOAD_LIMITS = { default: BIG_MIB * MIB, image: 1 } as const;";
    assert.equal(findMultipartCeilingViolations(goodBuildApp, named).length, 1);
  });

  it("flags a default it cannot resolve", () => {
    const unknown = "export const UPLOAD_LIMITS = { default: MISSING * 1024, image: 1 } as const;";
    assert.equal(findMultipartCeilingViolations(goodBuildApp, unknown).length, 1);
  });

  it("flags a literal ceiling in the registration", () => {
    const literal =
      "await fastify.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });";
    assert.equal(findMultipartCeilingViolations(literal, goodConfig).length, 1);
  });

  it("flags a default above the allowed ceiling", () => {
    const big = "export const UPLOAD_LIMITS = { default: 100 * 1024 * 1024, image: 1 } as const;";
    const violations = findMultipartCeilingViolations(goodBuildApp, big);
    assert.equal(violations.length, 1);
    assert.match(violations[0], new RegExp(String(MAX_DEFAULT_UPLOAD_BYTES), "u"));
  });

  it("holds for the real build-app and config", () => {
    assert.deepEqual(
      findMultipartCeilingViolations(api("build-app.ts"), api("lib/platform/config.ts")),
      [],
    );
  });
});
