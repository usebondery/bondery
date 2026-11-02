import { getBrowserSpeechEngine } from "@/lib/speech/browserSpeechEngine";

export type SpeechErrorCode = "unsupported" | "not-allowed" | "synthesis-failed";

export interface SpeechHandlers {
  /** Fires on natural end, cancel, and error. */
  onEnd: () => void;
  onError: (code: SpeechErrorCode) => void;
}

/**
 * Speaks finished text. The engine never sees a token, so a cloud provider can
 * replace the browser adapter without a change in the text builder or the UI.
 */
export interface SpeechEngine {
  cancel(): void;
  isSupported(): boolean;
  pause(): void;
  resume(): void;
  /** Fires on natural end, cancel, and error. One listener, set once. */
  setHandlers(handlers: SpeechHandlers): void;
  /** Start from the beginning. Replaces any current speech. */
  speak(input: { lang: string; text: string }): void;
}

/**
 * Returns the active engine. This function is the whole provider swap point.
 *
 * A cloud adapter implements the same members and keeps its streaming and
 * offset logic inside its own module.
 */
export function getSpeechEngine(): SpeechEngine {
  return getBrowserSpeechEngine();
}
