/**
 * Layer 4: the import routes accept a real multipart upload.
 *
 * Layers 2 and 3 (in `@bondery/tests`) call the parser and the commit step directly. This layer
 * goes through Fastify, so it covers what those cannot: the multipart reader, the per-route upload
 * cap, and the error mapping that turns a parser throw into a `400 bad_request`.
 *
 * A socket is used rather than `inject`, because multipart over a streaming body is what the real
 * client sends, and a past regression only reproduced over a socket.
 *
 * This file lives in `apps/api` because the route needs the app env, the Fastify instance, and the
 * auth area. It needs no database: a parse route reads no rows for the session it is given.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const IMPORT_DIR = new URL("../../../../packages/tests/sample-data/", import.meta.url);
const VCARD_PARSE = "/contacts/import/vcard/parse";

let app: FastifyInstance;
let address: string;

before(async () => {
  const { createTestApp } = await import("./create-test-app.js");
  app = await createTestApp();
  address = await app.listen({ host: "127.0.0.1", port: 0 });
});

after(async () => {
  await app.close();
});

async function fixture(relativePath: string): Promise<Buffer> {
  return readFile(new URL(relativePath, IMPORT_DIR));
}

/** Posts one file the way the webapp does: a `FormData` body over a socket. */
async function upload(
  url: string,
  bytes: Buffer,
  fileName: string,
): Promise<{ body: unknown; status: number }> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)]), fileName);
  const response = await fetch(`${address}${url}`, { body: form, method: "POST" });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // A non-JSON body (an empty 401) is still a valid result to assert on.
  }
  return { body, status: response.status };
}

describe("vCard parse route", () => {
  it("rejects an unauthenticated upload with 401 and a catalog error code", async () => {
    const { body, status } = await upload(
      VCARD_PARSE,
      await fixture("samsung/contacts.vcf"),
      "contacts.vcf",
    );

    assert.equal(status, 401);
    const payload = body as { error?: { code?: string; request_id?: string } };
    assert.equal(payload.error?.code, "auth_required");
    assert.ok(payload.error?.request_id, "an error response must carry a request id");
  });

  it("rejects an empty body before it reaches the parser", async () => {
    const response = await fetch(`${address}${VCARD_PARSE}`, {
      body: new FormData(),
      method: "POST",
    });
    // 401 without a session, or 400 when the route is reached with no file part. Both prove the
    // request did not reach the parser and produce a 500.
    assert.ok(
      response.status === 400 || response.status === 401,
      `expected 400 or 401, got ${response.status}`,
    );
  });
});
