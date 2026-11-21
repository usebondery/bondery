import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CWS_EXTENSION_ID,
  CWS_EXTENSION_PUBLIC_KEY,
  chromeExtensionIdFromPublicKey,
} from "./cws-public-key.js";

describe("cws extension public key", () => {
  it("hashes to the Chrome Web Store extension id", () => {
    assert.equal(chromeExtensionIdFromPublicKey(CWS_EXTENSION_PUBLIC_KEY), CWS_EXTENSION_ID);
  });
});
