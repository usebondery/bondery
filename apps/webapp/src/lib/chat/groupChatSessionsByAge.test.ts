import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupChatSessionsByAge } from "./groupChatSessionsByAge.js";

const now = new Date("2026-09-29T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function session(id: string, daysAgo: number) {
  return {
    id,
    updatedAt: new Date(now.getTime() - daysAgo * DAY_MS).toISOString(),
  };
}

describe("groupChatSessionsByAge", () => {
  it("omits empty groups", () => {
    assert.deepEqual(groupChatSessionsByAge([], now), []);
  });

  it("places recent sessions in last30Days only", () => {
    const recent = [session("a", 0), session("b", 10), session("c", 29)];
    assert.deepEqual(groupChatSessionsByAge(recent, now), [{ id: "last30Days", sessions: recent }]);
  });

  it("places sessions older than 30 days in older only", () => {
    const old = [session("a", 31), session("b", 90)];
    assert.deepEqual(groupChatSessionsByAge(old, now), [{ id: "older", sessions: old }]);
  });

  it("treats a session updated exactly 30 days ago as last30Days", () => {
    const edge = [session("edge", 30)];
    assert.deepEqual(groupChatSessionsByAge(edge, now), [{ id: "last30Days", sessions: edge }]);
  });

  it("splits mixed sessions and keeps input order within groups", () => {
    const mixed = [session("new", 1), session("old", 40), session("also-new", 5)];
    assert.deepEqual(groupChatSessionsByAge(mixed, now), [
      { id: "last30Days", sessions: [mixed[0], mixed[2]] },
      { id: "older", sessions: [mixed[1]] },
    ]);
  });
});
