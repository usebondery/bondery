import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyFetchFailureKind } from "./parseApiErrorBody.ts";
import {
  TransportUnavailableError,
  throwTransportUnavailableError,
} from "./transport-unavailable-error.ts";

describe("classifyFetchFailureKind", () => {
  it("returns offline when the device has no network", () => {
    assert.equal(classifyFetchFailureKind(true), "offline");
  });

  it("returns unreachable when the device is online", () => {
    assert.equal(classifyFetchFailureKind(false), "unreachable");
  });
});

describe("throwTransportUnavailableError", () => {
  it("rethrows AbortError", async () => {
    const aborted = new Error("Aborted");
    aborted.name = "AbortError";

    await assert.rejects(
      () => throwTransportUnavailableError(aborted),
      (error: unknown) => {
        assert.equal(error, aborted);
        return true;
      },
    );
  });

  it("throws TransportUnavailableError instead of a translated Error", async () => {
    await assert.rejects(
      () => throwTransportUnavailableError(new TypeError("Failed to fetch"), async () => true),
      (error: unknown) => {
        assert.ok(error instanceof TransportUnavailableError);
        assert.equal(error.kind, "offline");
        assert.equal(error.message.includes("Check your"), false);
        return true;
      },
    );

    await assert.rejects(
      () => throwTransportUnavailableError(new TypeError("Failed to fetch"), async () => false),
      (error: unknown) => {
        assert.ok(error instanceof TransportUnavailableError);
        assert.equal(error.kind, "unreachable");
        return true;
      },
    );
  });
});
