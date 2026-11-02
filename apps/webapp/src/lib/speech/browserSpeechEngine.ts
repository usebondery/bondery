import type { SpeechEngine, SpeechErrorCode, SpeechHandlers } from "@/lib/speech/speechEngine";
import { splitSpeechText } from "@/lib/speech/speechText";

/** Safari can leave `paused` set after `resume()`. Re-speak after this delay. */
const RESUME_FALLBACK_DELAY_MS = 250;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.speechSynthesis ?? null;
}

/** Exact `lang` first, then a same-language prefix, otherwise keep `utterance.lang`. */
function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const wanted = lang.toLowerCase();
  const exact = voices.find((voice) => voice.lang.toLowerCase() === wanted);
  if (exact) {
    return exact;
  }

  const prefix = `${wanted}-`;
  return voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ?? null;
}

function toErrorCode(error: string): SpeechErrorCode {
  return error === "not-allowed" ? "not-allowed" : "synthesis-failed";
}

function createBrowserSpeechEngine(): SpeechEngine {
  let handlers: SpeechHandlers | null = null;
  let chunks: string[] = [];
  let chunkIndex = 0;
  let lang = "en";
  /**
   * Chrome stops speech when the utterance is garbage collected. Hold the live
   * utterance until its terminal event. That reference also tells the resume
   * fallback that a chunk is still playing.
   */
  let currentUtterance: SpeechSynthesisUtterance | null = null;
  /**
   * A cancel fires a late `onend` or `onerror` on the abandoned utterance. The
   * counter marks those callbacks as stale.
   */
  let generation = 0;
  let resumeTimer: ReturnType<typeof setTimeout> | null = null;

  function clearResumeTimer(): void {
    if (resumeTimer !== null) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  }

  function stopTracking(): void {
    chunks = [];
    chunkIndex = 0;
    currentUtterance = null;
    clearResumeTimer();
  }

  /**
   * True when the live utterance is still playing.
   *
   * `currentUtterance` holds the reference Chrome needs, so it doubles as the
   * "something is playing" flag for the resume fallback.
   */
  function hasLiveUtterance(): boolean {
    return currentUtterance !== null;
  }

  function speakChunk(): void {
    const synth = getSynth();
    if (!synth) {
      stopTracking();
      handlers?.onError("unsupported");
      return;
    }

    const text = chunks[chunkIndex];
    if (text === undefined) {
      stopTracking();
      handlers?.onEnd();
      return;
    }

    const utteranceGeneration = generation;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Read voices per chunk. `getVoices()` stays empty until `voiceschanged` in
    // some browsers, and `utterance.lang` is then the only voice hint.
    const voice = pickVoice(synth.getVoices(), lang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      if (utteranceGeneration !== generation) {
        return;
      }
      chunkIndex += 1;
      speakChunk();
    };

    utterance.onerror = (event) => {
      if (utteranceGeneration !== generation) {
        return;
      }
      stopTracking();
      handlers?.onError(toErrorCode(event.error));
    };

    currentUtterance = utterance;
    synth.speak(utterance);
  }

  return {
    cancel() {
      generation += 1;
      stopTracking();

      const synth = getSynth();
      if (synth && (synth.speaking || synth.pending || synth.paused)) {
        synth.cancel();
      }

      // The store has one terminal path. Cancel reports the same end event.
      handlers?.onEnd();
    },

    isSupported() {
      return getSynth() !== null && typeof SpeechSynthesisUtterance === "function";
    },

    pause() {
      clearResumeTimer();
      getSynth()?.pause();
    },

    resume() {
      const synth = getSynth();
      if (!synth) {
        return;
      }

      synth.resume();
      clearResumeTimer();

      // Safari can keep `paused` true after `resume()`. Re-speak the current
      // chunk, so the message does not hang on a silent pause.
      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        if (!synth.paused || !hasLiveUtterance()) {
          return;
        }
        generation += 1;
        synth.cancel();
        speakChunk();
      }, RESUME_FALLBACK_DELAY_MS);
    },

    setHandlers(next) {
      handlers = next;
    },

    speak(input) {
      const synth = getSynth();
      if (!synth) {
        handlers?.onError("unsupported");
        return;
      }

      generation += 1;
      stopTracking();
      lang = input.lang;
      chunks = splitSpeechText(input.text);

      synth.cancel();

      if (chunks.length === 0) {
        handlers?.onEnd();
        return;
      }

      speakChunk();
    },
  };
}

let engine: SpeechEngine | null = null;

/**
 * Returns the shared browser adapter.
 *
 * The singleton keeps the live utterance across a React remount. This module is
 * the only place that touches `window.speechSynthesis`.
 */
export function getBrowserSpeechEngine(): SpeechEngine {
  if (!engine) {
    engine = createBrowserSpeechEngine();
  }
  return engine;
}
