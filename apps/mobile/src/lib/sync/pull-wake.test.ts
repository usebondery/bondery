import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldSchedulePullOnWake } from "./pull-wake.js";

describe("shouldSchedulePullOnWake", () => {
  it("schedules when sequence is ahead", () => {
    assert.equal(
      shouldSchedulePullOnWake({
        serverSequence: 5,
        lastServerSequence: 4,
      }),
      true,
    );
  });

  it("skips stale or equal sequence", () => {
    assert.equal(
      shouldSchedulePullOnWake({
        serverSequence: 4,
        lastServerSequence: 4,
      }),
      false,
    );
  });

  it("skips self-echo from same device", () => {
    assert.equal(
      shouldSchedulePullOnWake({
        serverSequence: 10,
        lastServerSequence: 5,
        sourceDeviceId: "device-a",
        myDeviceId: "device-a",
      }),
      false,
    );
  });

  it("accepts wake from another device", () => {
    assert.equal(
      shouldSchedulePullOnWake({
        serverSequence: 10,
        lastServerSequence: 5,
        sourceDeviceId: "device-a",
        myDeviceId: "device-b",
      }),
      true,
    );
  });
});
