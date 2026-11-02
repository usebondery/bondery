/**
 * Local DOM declarations for the browser speech recognizer.
 *
 * `lib.dom` does not declare `SpeechRecognition`, and the prefix form
 * `webkitSpeechRecognition` exists in Chrome, Edge, and Safari only. Keep the
 * surface minimal and local, so no extra type package enters the tree.
 */

export interface BrowserSpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}

export interface BrowserSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: BrowserSpeechRecognitionAlternative;
}

export interface BrowserSpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: BrowserSpeechRecognitionResult;
}

export interface BrowserSpeechRecognitionEvent extends Event {
  /** First result that changed in this event. Everything before it is settled. */
  readonly resultIndex: number;
  readonly results: BrowserSpeechRecognitionResultList;
}

export interface BrowserSpeechRecognitionErrorEvent extends Event {
  /** One of the spec codes, such as `not-allowed`, `network`, or `no-speech`. */
  readonly error: string;
  readonly message: string;
}

export interface BrowserSpeechRecognition {
  abort(): void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: ((event: Event) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onstart: ((event: Event) => void) | null;
  /** When true, recognition stays on the device. Older browsers ignore it. */
  processLocally?: boolean;
  start(): void;
  stop(): void;
}

export interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}
