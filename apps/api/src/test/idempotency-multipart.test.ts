import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  createApp,
  installMemoryStore,
  restoreQueryRaw,
  store,
} from "./idempotency-test-helpers.js";

describe("idempotency with multipart uploads", { concurrency: false }, () => {
  before(() => {
    installMemoryStore();
  });

  after(() => {
    restoreQueryRaw();
  });

  beforeEach(() => {
    store.clear();
  });

  it("lets a multipart upload larger than a stream buffer reach the handler", async () => {
    // Regression: hashing tee'd request.raw, which @fastify/multipart also reads. Nothing
    // drained the tee, so the raw stream paused at 16 KB and the upload hung forever.
    const { default: multipart } = await import("@fastify/multipart");
    const { app } = await createApp({
      configure: (instance) => {
        instance.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
        instance.after(() => {
          instance.post("/upload", async (request) => {
            let bytes = 0;
            for await (const part of request.parts()) {
              if (part.type === "file") {
                bytes += (await part.toBuffer()).length;
              }
            }
            return { bytes };
          });
        });
      },
    });

    // A real socket, not app.inject: the bug needs the body to arrive in many chunks.
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const file = new Uint8Array(1024 * 1024).fill(7);
    const form = new FormData();
    form.append("file", new Blob([file], { type: "application/zip" }), "a.zip");

    const abort = AbortSignal.timeout(5000);
    const httpResponse = await fetch(`${address}/upload`, {
      body: form,
      headers: { "idempotency-key": "key-multipart" },
      method: "POST",
      signal: abort,
    }).catch((error: unknown) => {
      throw new Error(`multipart upload hung or failed: ${String(error)}`);
    });
    const response = { body: await httpResponse.text(), statusCode: httpResponse.status };

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(JSON.parse(response.body).bytes, file.length);
    await app.close();
  });
});
