import type { DictationAvailability } from "@/lib/speech/dictation/dictationAvailability";
import type { DictationErrorCode } from "@/lib/speech/dictation/dictationEngine";
import type { DictationStatus } from "@/lib/speech/dictation/dictationHandlers";

/** Live selection of the field. */
interface DictationSelection {
  end: number;
  start: number;
}

interface UseDictationOptions {
  /** A running reply blocks dictation. */
  disabled: boolean;
  /** BCP 47 tag for the recognizer. */
  lang: string;
  /** Reads the field selection. Must not prompt and must not throw. */
  readSelection: () => DictationSelection | null;
  /** Changing this value ends the session. It combines the route and the new-chat counter. */
  resetKey: string;
  /** Puts the caret back after a write. */
  restoreCaret: (index: number) => void;
  setValue: (value: string) => void;
  value: string;
}

interface UseDictationResult {
  /** True while a session holds the microphone. */
  active: boolean;
  /** `null` until the browser check has run. */
  availability: DictationAvailability | null;
  /** Ends a live session and keeps the text. Called on submit and on a manual edit. */
  cancel: () => void;
  clearError: () => void;
  /** One error per failure. The button shows a toast, then calls `clearError`. */
  error: DictationErrorCode | null;
  /** The current guess. Empty when the recognizer holds none. */
  interimText: string;
  /** True until the speech route is known. The control shows a loader. */
  pending: boolean;
  status: DictationStatus;
  toggle: () => void;
}

export type { DictationAvailability } from "@/lib/speech/dictation/dictationAvailability";
export type { DictationStatus } from "@/lib/speech/dictation/dictationHandlers";
export type { DictationSelection, UseDictationOptions, UseDictationResult };
