import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDictationRestartWindow,
  DICTATION_CONTINUATION_DELAY_MS,
  DICTATION_EMPTY_END_MS,
  DICTATION_FAULT_RESTART_CAP,
  DICTATION_RESTART_CAP,
  DICTATION_RESTART_WINDOW_MS,
  decideDictationRestart,
  planDictationRestart,
} from "./dictationRestartPolicy.js";

const START = 1_000_000;

describe("planDictationRestart", () => {
  it("restarts after silence with budget left", () => {
    const outcome = planDictationRestart(createDictationRestartWindow(START), "silence", START);
    assert.equal(outcome.restart, true);
    assert.equal(outcome.window.count, 1);
    assert.equal(outcome.window.startedAt, START);
  });

  it("counts every restart inside one window", () => {
    let window = createDictationRestartWindow(START);
    window = planDictationRestart(window, "silence", START).window;
    window = planDictationRestart(window, "silence", START + 1).window;
    assert.equal(window.count, 2);
    assert.equal(window.startedAt, START);
  });

  it("stops at the cap", () => {
    let window = createDictationRestartWindow(START);
    for (let index = 0; index < DICTATION_RESTART_CAP; index += 1) {
      const outcome = planDictationRestart(window, "silence", START + index);
      assert.equal(outcome.restart, true);
      window = outcome.window;
    }

    const capped = planDictationRestart(window, "silence", START + DICTATION_RESTART_CAP);
    assert.equal(capped.restart, false);
    assert.equal(capped.window.count, DICTATION_RESTART_CAP);
  });

  it("opens a fresh budget when the window expired", () => {
    let window = createDictationRestartWindow(START);
    for (let index = 0; index < DICTATION_RESTART_CAP; index += 1) {
      window = planDictationRestart(window, "silence", START).window;
    }
    const expiredAt = START + DICTATION_RESTART_WINDOW_MS;
    const outcome = planDictationRestart(window, "silence", expiredAt);
    assert.equal(outcome.restart, true);
    assert.equal(outcome.window.count, 1);
    assert.equal(outcome.window.startedAt, expiredAt);
  });

  it("does not restart a user stop", () => {
    const outcome = planDictationRestart(createDictationRestartWindow(START), "user", START);
    assert.equal(outcome.restart, false);
    assert.equal(outcome.window.count, 0);
  });

  it("does not restart a fatal error", () => {
    const outcome = planDictationRestart(createDictationRestartWindow(START), "error", START);
    assert.equal(outcome.restart, false);
  });

  it("does not restart an abort", () => {
    const outcome = planDictationRestart(createDictationRestartWindow(START), "aborted", START);
    assert.equal(outcome.restart, false);
  });

  it("restarts after a service drop with budget left", () => {
    // A Chromium recognizer depends on a remote service. A dropped session is
    // still good, so it restarts instead of failing under the user.
    const outcome = planDictationRestart(createDictationRestartWindow(START), "network", START);
    assert.equal(outcome.restart, true);
    assert.equal(outcome.window.count, 1);
  });

  it("stops a repeating service drop at the cap", () => {
    let window = createDictationRestartWindow(START);
    for (let index = 0; index < DICTATION_RESTART_CAP; index += 1) {
      window = planDictationRestart(window, "network", START + index).window;
    }
    const capped = planDictationRestart(window, "network", START + DICTATION_RESTART_CAP);
    assert.equal(capped.restart, false);
  });

  it("shares one budget between silence and a service drop", () => {
    let window = planDictationRestart(createDictationRestartWindow(START), "network", START).window;
    window = planDictationRestart(window, "silence", START + 1).window;
    assert.equal(window.count, 2);
  });

  it("honours a lower cap", () => {
    let window = createDictationRestartWindow(START);
    for (let index = 0; index < DICTATION_FAULT_RESTART_CAP; index += 1) {
      const outcome = planDictationRestart(window, "network", START, DICTATION_FAULT_RESTART_CAP);
      assert.equal(outcome.restart, true);
      window = outcome.window;
    }
    const capped = planDictationRestart(window, "network", START, DICTATION_FAULT_RESTART_CAP);
    assert.equal(capped.restart, false);
  });

  it("does not restart at the cap even after a long silence", () => {
    let window = createDictationRestartWindow(START);
    for (let index = 0; index < DICTATION_RESTART_CAP; index += 1) {
      window = planDictationRestart(window, "silence", START).window;
    }
    const justBeforeExpiry = START + DICTATION_RESTART_WINDOW_MS - 1;
    assert.equal(planDictationRestart(window, "silence", justBeforeExpiry).restart, false);
  });
});

describe("decideDictationRestart", () => {
  const base = {
    elapsedMs: 100,
    heardSpeech: false,
    now: START,
    reason: "silence" as const,
    window: createDictationRestartWindow(START),
  };

  it("continues after speech without spending the fault budget", () => {
    const decision = decideDictationRestart({ ...base, heardSpeech: true });
    assert.equal(decision.type, "restart");
    if (decision.type !== "restart") {
      return;
    }
    assert.equal(decision.delayMs, DICTATION_CONTINUATION_DELAY_MS);
    assert.equal(decision.window.count, 0);
  });

  it("continues after a long quiet stretch", () => {
    const decision = decideDictationRestart({ ...base, elapsedMs: DICTATION_EMPTY_END_MS });
    assert.equal(decision.type, "restart");
    if (decision.type !== "restart") {
      return;
    }
    assert.equal(decision.window.count, 0);
  });

  it("counts a capture that ends at once as a fault", () => {
    const decision = decideDictationRestart(base);
    assert.equal(decision.type, "restart");
    if (decision.type !== "restart") {
      return;
    }
    assert.equal(decision.window.count, 1);
    assert.equal(decision.delayMs, DICTATION_CONTINUATION_DELAY_MS);
  });

  it("backs off on each fault and then fails", () => {
    let window = createDictationRestartWindow(START);
    const delays: number[] = [];
    for (let index = 0; index < DICTATION_FAULT_RESTART_CAP; index += 1) {
      const decision = decideDictationRestart({ ...base, now: START + index, window });
      assert.equal(decision.type, "restart");
      if (decision.type !== "restart") {
        return;
      }
      delays.push(decision.delayMs);
      window = decision.window;
    }
    assert.deepEqual(delays, [200, 400, 800, 1600]);

    const failed = decideDictationRestart({ ...base, reason: "network", window });
    assert.equal(failed.type, "fail");
    if (failed.type !== "fail") {
      return;
    }
    assert.equal(failed.error, "network");
  });

  it("stops on a user end", () => {
    const decision = decideDictationRestart({ ...base, reason: "user" });
    assert.equal(decision.type, "stop");
  });
});
