import type {
  BrowserSpeechRecognition,
  BrowserSpeechRecognitionConstructor,
  BrowserSpeechRecognitionErrorEvent,
  BrowserSpeechRecognitionEvent,
} from "@/lib/speech/dictation/browserDictationTypes";
import type {
  DictationEngine,
  DictationErrorCode,
  DictationHandlers,
  DictationStartInput,
} from "@/lib/speech/dictation/dictationEngine";

/** Only the first guess is used. A second alternative costs nothing to discard. */
const MAX_ALTERNATIVES = 1;

/**
 * Returns the recognizer constructor, or `null` in a browser without one.
 *
 * Chrome, Edge, and Safari ship the prefixed name. The standard name is the
 * forward-compatible one, so it wins when both exist.
 */
function getRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Maps a recognizer error onto a UI code.
 *
 * `no-speech` is not an error. A pause ends the session cleanly and the hook
 * restarts it, so the user keeps talking without a tap.
 */
function toErrorCode(error: string): DictationErrorCode | "aborted" | "silence" {
  switch (error) {
    case "aborted":
      return "aborted";
    case "no-speech":
      return "silence";
    case "not-allowed":
      return "not-allowed";
    case "service-not-allowed":
      return "service-not-allowed";
    case "audio-capture":
      return "no-microphone";
    case "network":
      return "network";
    case "language-not-supported":
      return "language-not-supported";
    default:
      return "service-failed";
  }
}

/** Joins final transcripts with one space. Empty pieces are dropped. */
function joinTranscripts(pieces: readonly string[]): string {
  return pieces
    .map((piece) => piece.trim())
    .filter((piece) => piece !== "")
    .join(" ");
}

function createBrowserDictationEngine(): DictationEngine {
  let handlers: DictationHandlers | null = null;
  let recognition: BrowserSpeechRecognition | null = null;
  /**
   * A late `onresult` or `onend` arrives after `abort()`. The counter marks
   * those callbacks as stale, so no dropped session writes text.
   */
  let generation = 0;
  /** Set by `stop()`. The next `onend` is a clean user stop, not a silence. */
  let finishing = false;
  /** Set by an `onerror` that forbids a restart. `onend` then reports `error`. */
  let fatalError = false;
  /**
   * True between `stop()` and its `onend`.
   *
   * Chrome reports `network` or `no-speech` for a session that the caller
   * already stopped, because the service call is torn down mid-flight. Those
   * reports belong to a deliberate stop, not to a failure the user must see.
   */
  let stopRequested = false;

  function detach(current: BrowserSpeechRecognition): void {
    current.onstart = null;
    current.onresult = null;
    current.onerror = null;
    current.onend = null;
  }

  /** Stops the live recognizer without emitting any event. */
  function dropCurrent(): void {
    const current = recognition;
    recognition = null;
    if (!current) {
      return;
    }
    detach(current);
    try {
      current.abort();
    } catch {
      // An abort on an already ended session throws. Nothing to clean up.
    }
  }

  function handleResult(event: BrowserSpeechRecognitionEvent, sessionGeneration: number): void {
    const finals: string[] = [];
    let interim = "";

    // Walk from `resultIndex`, because earlier results are already settled.
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result?.[0]?.transcript ?? "";
      if (result?.isFinal) {
        finals.push(transcript);
        continue;
      }
      interim = transcript;
    }

    if (sessionGeneration !== generation) {
      return;
    }

    const final = joinTranscripts(finals);
    if (final === "" && interim === "") {
      return;
    }

    handlers?.onResult({ final, interim });
  }

  function handleError(event: BrowserSpeechRecognitionErrorEvent, sessionGeneration: number): void {
    if (sessionGeneration !== generation) {
      return;
    }

    const code = toErrorCode(event.error);

    if (code === "aborted") {
      // An abort is already handled by `abort()`. Report nothing.
      return;
    }

    if (stopRequested) {
      // The caller asked to stop. A teardown report from the service is not a
      // failure the user can act on. `onend` finishes the session.
      return;
    }

    if (code === "silence" || code === "network") {
      // `onend` follows, after the browser releases the capture. A restart here
      // would abort that capture. The indicator then flashes on and off.
      if (code === "network") {
        handlers?.onError(code);
      }
      return;
    }

    // Chrome fires `onend` after a fatal `onerror`. Mark it, so `onend` reports
    // an error and the hook does not restart a broken session.
    fatalError = true;
    handlers?.onError(code);
  }

  function handleEnd(sessionGeneration: number): void {
    if (sessionGeneration !== generation) {
      return;
    }

    recognition = null;

    if (fatalError) {
      fatalError = false;
      finishing = false;
      stopRequested = false;
      handlers?.onEnd("error");
      return;
    }

    if (finishing || stopRequested) {
      finishing = false;
      stopRequested = false;
      handlers?.onEnd("user");
      return;
    }

    handlers?.onEnd("silence");
  }

  function startSession(input: DictationStartInput): void {
    const Constructor = getRecognitionConstructor();
    if (!Constructor) {
      handlers?.onError("unsupported");
      return;
    }

    const sessionGeneration = generation;
    const session = new Constructor();
    session.continuous = input.continuous;
    session.interimResults = input.interimResults;
    session.lang = input.lang;
    session.maxAlternatives = MAX_ALTERNATIVES;
    session.processLocally = input.processLocally;

    session.onstart = () => {
      if (sessionGeneration !== generation) {
        return;
      }
      handlers?.onStart();
    };
    session.onresult = (event) => handleResult(event, sessionGeneration);
    session.onerror = (event) => handleError(event, sessionGeneration);
    session.onend = () => handleEnd(sessionGeneration);

    recognition = session;

    try {
      session.start();
    } catch {
      // A second `start()` on one instance throws. That is a programming error,
      // not a user-visible failure, so report the generic service code.
      recognition = null;
      detach(session);
      handlers?.onError("service-failed");
    }
  }

  return {
    abort() {
      // Increment first. Any in-flight callback becomes stale at once.
      generation += 1;
      finishing = false;
      fatalError = false;
      stopRequested = false;
      dropCurrent();
    },

    isSupported() {
      return getRecognitionConstructor() !== null;
    },

    setHandlers(next) {
      handlers = next;
    },

    start(input) {
      // One live recognizer. A start replaces the previous session.
      generation += 1;
      finishing = false;
      fatalError = false;
      stopRequested = false;
      dropCurrent();
      startSession(input);
    },

    stop() {
      const current = recognition;
      if (!current) {
        return;
      }
      finishing = true;
      stopRequested = true;
      try {
        current.stop();
      } catch {
        // The session already ended. The `onend` path has run or will run.
        finishing = false;
        stopRequested = false;
      }
    },
  };
}

let engine: DictationEngine | null = null;

/**
 * Returns the shared browser adapter.
 *
 * `useDictation` owns the lifetime, so the singleton holds no session state
 * between mounts. This module is the only place that touches
 * `window.SpeechRecognition`.
 */
export function getBrowserDictationEngine(): DictationEngine {
  if (!engine) {
    engine = createBrowserDictationEngine();
  }
  return engine;
}
