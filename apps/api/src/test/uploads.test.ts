import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import multipart from "@fastify/multipart";
import Fastify, { type FastifyInstance } from "fastify";
import { AVATAR_UPLOAD, UPLOAD_LIMITS } from "../lib/platform/config.js";
import { mapErrorToResponse } from "../lib/platform/errors/map-to-response.js";
import { readUploadedFile } from "../lib/platform/uploads.js";

const SMALL_CAP = 1024;

async function buildApp(): Promise<{ address: string; app: FastifyInstance }> {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => {
    const mapped = mapErrorToResponse(error as Parameters<typeof mapErrorToResponse>[0], request);
    reply.status(mapped.statusCode).send(mapped.body);
  });
  // Same global ceiling as build-app.ts.
  await app.register(multipart, { limits: { fileSize: UPLOAD_LIMITS.default } });

  app.post("/small", async (request) => {
    const file = await readUploadedFile(request, { maxBytes: SMALL_CAP });
    return { bytes: file?.buffer.length ?? null };
  });
  app.post("/image", async (request) => {
    const file = await readUploadedFile(request, {
      allowedMimeTypes: AVATAR_UPLOAD.allowedMimeTypes,
      maxBytes: UPLOAD_LIMITS.image,
    });
    return { bytes: file?.buffer.length ?? null };
  });
  // A route that forgot a per-call cap still gets the small global ceiling.
  app.post("/uncapped", async (request) => {
    const part = await request.file();
    return { bytes: part ? (await part.toBuffer()).length : null };
  });

  const address = await app.listen({ host: "127.0.0.1", port: 0 });
  return { address, app };
}

function upload(address: string, path: string, bytes: number, type: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes).fill(1)], { type }), "f.bin");
  return fetch(`${address}${path}`, { body: form, method: "POST" });
}

describe("multipart upload caps", { concurrency: false }, () => {
  let app: FastifyInstance;
  let address: string;

  before(async () => {
    ({ address, app } = await buildApp());
  });
  after(async () => {
    await app.close();
  });

  it("accepts a file at the cap", async () => {
    const response = await upload(address, "/small", SMALL_CAP, "application/octet-stream");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { bytes: SMALL_CAP });
  });

  it("rejects a file over the cap with 413 and the validation_error code", async () => {
    const response = await upload(address, "/small", SMALL_CAP * 4, "application/octet-stream");
    assert.equal(response.status, 413);
    const body = (await response.json()) as { error: { code: string; message: string } };
    assert.equal(body.error.code, "validation_error");
    assert.match(body.error.message, /File too large\. Maximum size is/);
  });

  it("rejects an image over 5 MB, the avatar limit, not at the old 100 MB ceiling", async () => {
    const response = await upload(address, "/image", UPLOAD_LIMITS.image + 1024, "image/png");
    assert.equal(response.status, 413);
    const body = (await response.json()) as { error: { code: string; message: string } };
    assert.equal(body.error.code, "validation_error");
    assert.match(body.error.message, /5MB/);
  });

  it("refuses a disallowed MIME type before reading the body", async () => {
    const response = await upload(address, "/image", 2048, "text/html");
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "validation_error");
  });

  it("returns null when the request has no file part", async () => {
    const form = new FormData();
    form.append("note", "no file here");
    const response = await fetch(`${app.listeningOrigin}/small`, { body: form, method: "POST" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { bytes: null });
  });

  it("caps a route that sets no per-call limit at the global default", async () => {
    const response = await upload(
      address,
      "/uncapped",
      UPLOAD_LIMITS.default + 1024,
      "application/octet-stream",
    );
    assert.equal(response.status, 413);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "validation_error");
  });
});
