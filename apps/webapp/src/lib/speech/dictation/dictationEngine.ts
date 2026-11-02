import { getBrowserDictationEngine } from "@/lib/speech/dictation/browserDictationEngine";

/**
 * Failure codes the UI can show.
 *
 * A cloud adapter maps `getUserMedia` errors onto the same codes, so a provider
 * swap changes no caller.
 */
export type DictationErrorCode =
  | "unsupported"
  | "insecure"
  | "offline"
  | "not-allowed"
  | "service-not-allowed"
  | "no-microphone"
  | "microphone-busy"
  | "network"
  | "no-service"
  | "language-not-supported"
  | "service-failed";

export interface DictationResult {
  /** Final text that will not change. Several results may be joined by a space. */
  final: string;
  /** The in-progress guess. Replaced by the next event. Empty when none. */
  interim: string;
}

/**
 * Why the engine stopped.
 *
 * `silence` is the only restartable reason. `user` is a clean stop. `error` is a
 * fatal failure that already reported its code. `aborted` was forced.
 */
export type DictationEndReason = "user" | "silence" | "error" | "aborted";

export interface DictationHandlers {
  /** `reason` separates a clean end (restartable) from a fatal one (not restartable). */
  onEnd: (reason: DictationEndReason) => void;
  onError: (code: DictationErrorCode) => void;
  onResult: (result: DictationResult) => void;
  onStart: () => void;
}

export interface DictationStartInput {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  /** When true, the recognizer must stay on the device. */
  processLocally: boolean;
}

/**
 * Turns speech into text. The UI never touches `SpeechRecognition`.
 *
 * A cloud adapter implements the same members, starts `onStart` after the
 * stream and the socket open, and calls `stop()` before a provider time limit.
 */
export interface DictationEngine {
  /** Drop at once. No trailing result may arrive after this call. */
  abort(): void;
  isSupported(): boolean;
  setHandlers(handlers: DictationHandlers): void;
  start(input: DictationStartInput): void;
  /** Finish gracefully. Let the trailing final result arrive. */
  stop(): void;
}

/** Returns the active engine. This function is the whole provider swap point. */
export function getDictationEngine(): DictationEngine {
  return getBrowserDictationEngine();
}
