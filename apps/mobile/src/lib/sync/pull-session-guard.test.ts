import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PullSessionGuard } from "./pull-session-guard.ts";

describe("PullSessionGuard", () => {
  it("rejects a response when the authenticated token changed", () => {
    const guard = new PullSessionGuard();
    const generation = guard.activate();

    assert.equal(guard.isCurrentSession(generation, "user-a-token", "user-b-token"), false);
    assert.equal(guard.isCurrentSession(generation, "user-a-token", null), false);
    assert.equal(guard.isCurrentSession(generation, "user-a-token", "user-a-token"), true);
  });

  it("invalidates the prior session before awaiting its pull", async () => {
    const guard = new PullSessionGuard();
    const generation = guard.activate();
    let finishPull: (() => void) | undefined;
    let materialized = false;
    const pullResponse = new Promise<void>((resolve) => {
      finishPull = resolve;
    });
    const pull = guard.runIfCurrent(generation, async () => {
      await pullResponse;
      if (guard.isCurrent(generation)) {
        materialized = true;
      }
    });
    assert.ok(pull);

    let teardownFinished = false;
    const teardown = guard.deactivateAndWait().then(() => {
      teardownFinished = true;
    });

    assert.equal(guard.isCurrent(generation), false);
    await Promise.resolve();
    assert.equal(teardownFinished, false);

    finishPull?.();
    await Promise.all([pull, teardown]);
    assert.equal(teardownFinished, true);
    assert.equal(materialized, false);
  });

  it("rejects queued prior-session work after a new session activates", async () => {
    const guard = new PullSessionGuard();
    const priorGeneration = guard.activate();
    let ran = false;

    queueMicrotask(() => {
      void guard.runIfCurrent(priorGeneration, async () => {
        ran = true;
      });
    });

    await guard.deactivateAndWait();
    const nextGeneration = guard.activate();
    await Promise.resolve();

    assert.notEqual(nextGeneration, priorGeneration);
    assert.equal(ran, false);
  });

  it("keeps teardown blocked until pull loop, in-flight pull, and push drain finish", async () => {
    const guard = new PullSessionGuard();
    const generation = guard.activate();
    const finishes: Array<() => void> = [];
    let cacheReplaced = false;
    let databaseWiped = false;

    for (const _operationName of ["pull loop", "in-flight pull", "push drain"]) {
      const operation = new Promise<void>((resolve) => {
        finishes.push(resolve);
      });
      guard.runIfCurrent(generation, async () => {
        await operation;
        if (guard.isCurrent(generation)) {
          assert.fail("prior-session operation remained current during teardown");
        }
      });
    }

    const teardown = guard.deactivateAndWait().then(() => {
      databaseWiped = true;
      cacheReplaced = true;
    });

    await Promise.resolve();
    assert.equal(databaseWiped, false);
    assert.equal(cacheReplaced, false);

    finishes[0]?.();
    finishes[1]?.();
    await Promise.resolve();
    assert.equal(databaseWiped, false);
    assert.equal(cacheReplaced, false);

    finishes[2]?.();
    await teardown;
    assert.equal(databaseWiped, true);
    assert.equal(cacheReplaced, true);
  });
});
