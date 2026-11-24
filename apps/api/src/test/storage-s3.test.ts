import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { S3Storage } from "../lib/storage/s3.js";

describe("s3Storage", () => {
  it("builds path-style public URLs per logical bucket", () => {
    const storage = new S3Storage({
      accessKeyId: "test",
      endpoint: "http://127.0.0.1:8333",
      publicBaseUrl: "https://storage.example.com",
      region: "eu-central-1",
      secretAccessKey: "test",
    });

    const url = storage.getPublicUrl("avatars", "user-id/contact-id.jpg");
    assert.equal(url, "https://storage.example.com/avatars/user-id/contact-id.jpg");
  });
});
