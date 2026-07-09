import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldSchedulePullOnWake } from "./pull-wake.js";

describe("shouldSchedulePullOnWake", () => {
  it("schedules when sequence is ahead", () => {
    assert.equal(
      shouldSchedulePullOnWake({
        lastServerSequence: 4,
        serverSequence: 5,
      }),
      true,
    );
  });

  it("skips stale or equal sequence", () => {
    assert.equal(
      shouldSchedulePullOnWake({
        lastServerSequence: 4,
        serverSequence: 4,
      }),
      false,
    );
  });

  it("skips self-echo from same device", () => {
    assert.equal(
      shouldSchedulePullOnWake({
        lastServerSequence: 5,
        myDeviceId: "device-a",
        serverSequence: 10,
        sourceDeviceId: "device-a",
      }),
      false,
    );
  });

  it("accepts wake from another device", () => {
    assert.equal(
      shouldSchedulePullOnWake({
        lastServerSequence: 5,
        myDeviceId: "device-b",
        serverSequence: 10,
        sourceDeviceId: "device-a",
      }),
      true,
    );
  });
});
