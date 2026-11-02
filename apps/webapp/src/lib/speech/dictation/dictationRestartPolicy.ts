import type { DictationEndReason } from "@/lib/speech/dictation/dictationEngine";

/**
 * Budget for silent restarts inside one window.
 *
 * Chrome ends a session after a pause. The hook restarts it, so the control
 * stays on. A broken recognizer restarts without pause, and this cap stops it.
 */
export const DICTATION_RESTART_CAP = 12;

export const DICTATION_RESTART_WINDOW_MS = 60_000;

export interface DictationRestartWindow {
  /** Restarts counted inside this window. */
  count: number;
  /** Window start, in epoch milliseconds. */
  startedAt: number;
}

export interface DictationRestartOutcome {
  restart: boolean;
  window: DictationRestartWindow;
}

export function createDictationRestartWindow(now: number): DictationRestartWindow {
  return { count: 0, startedAt: now };
}

/**
 * Decides whether a finished session may restart.
 *
 * Silence and a service drop both restart, while the budget lasts. A user stop,
 * a fatal error, and an abort all end the session. An expired window starts a
 * fresh budget, and the cap stops a loop.
 *
 * A Chromium recognizer sends audio to a remote service. That service can drop
 * a live session, which the recognizer reports as `network`. The session is
 * still good, so it restarts instead of failing under the user.
 */
export function planDictationRestart(
  window: DictationRestartWindow,
  reason: DictationEndReason | "network",
  now: number,
  cap: number = DICTATION_RESTART_CAP,
): DictationRestartOutcome {
  if (reason !== "silence" && reason !== "network") {
    return { restart: false, window };
  }

  if (now - window.startedAt >= DICTATION_RESTART_WINDOW_MS) {
    return { restart: true, window: { count: 1, startedAt: now } };
  }

  if (window.count >= cap) {
    return { restart: false, window };
  }

  return { restart: true, window: { count: window.count + 1, startedAt: window.startedAt } };
}

/**
 * Fault restarts after a capture that produced no text, or after a service drop.
 *
 * Four attempts cover one service blip. Further attempts mean a dead service,
 * and the microphone should stop.
 */
export const DICTATION_FAULT_RESTART_CAP = 4;

/** Pause before a healthy restart, so the browser can release the capture. */
export const DICTATION_CONTINUATION_DELAY_MS = 200;

/**
 * A quiet recognizer that lives at least this long is a pause, not a failure.
 * Chrome reports `no-speech` after several seconds of quiet.
 */
export const DICTATION_EMPTY_END_MS = 1_500;

/** Upper bound for the fault backoff. */
export const DICTATION_FAULT_DELAY_MAX_MS = 1_600;

export type DictationRestartKind = "continue" | "fault" | "stop";

export type DictationRestartDecision =
  | { delayMs: number; type: "restart"; window: DictationRestartWindow }
  | { error: "network" | "service-failed"; type: "fail"; window: DictationRestartWindow }
  | { type: "stop"; window: DictationRestartWindow };

/**
 * Classifies one ended capture.
 *
 * Speech, or a long quiet stretch, may continue. A capture that dies at once
 * is a fault. A user stop, a fatal error, and an abort all stop.
 */
export function classifyDictationRestart(input: {
  elapsedMs: number;
  heardSpeech: boolean;
  reason: DictationEndReason | "network";
}): DictationRestartKind {
  if (input.reason === "user" || input.reason === "error" || input.reason === "aborted") {
    return "stop";
  }
  if (input.reason === "network") {
    return "fault";
  }
  if (input.heardSpeech || input.elapsedMs >= DICTATION_EMPTY_END_MS) {
    return "continue";
  }
  return "fault";
}

/** Delay before the next `start()`. A fault waits longer on each repeat. */
export function dictationRestartDelayMs(kind: "continue" | "fault", faultCount: number): number {
  if (kind === "continue") {
    return DICTATION_CONTINUATION_DELAY_MS;
  }
  const exponent = Math.max(0, faultCount - 1);
  return Math.min(DICTATION_CONTINUATION_DELAY_MS * 2 ** exponent, DICTATION_FAULT_DELAY_MAX_MS);
}

/**
 * Decides the next step after `onend`.
 *
 * A continuation keeps the fault budget. A fault spends it. The budget is not
 * cleared when a capture starts. Only a transcript clears it.
 */
export function decideDictationRestart(input: {
  elapsedMs: number;
  heardSpeech: boolean;
  now: number;
  reason: DictationEndReason | "network";
  window: DictationRestartWindow;
}): DictationRestartDecision {
  const kind = classifyDictationRestart(input);
  if (kind === "stop") {
    return { type: "stop", window: input.window };
  }
  if (kind === "continue") {
    return {
      delayMs: dictationRestartDelayMs("continue", 0),
      type: "restart",
      window: input.window,
    };
  }

  const outcome = planDictationRestart(
    input.window,
    "network",
    input.now,
    DICTATION_FAULT_RESTART_CAP,
  );
  if (!outcome.restart) {
    return {
      error: input.reason === "network" ? "network" : "service-failed",
      type: "fail",
      window: outcome.window,
    };
  }
  return {
    delayMs: dictationRestartDelayMs("fault", outcome.window.count),
    type: "restart",
    window: outcome.window,
  };
}
