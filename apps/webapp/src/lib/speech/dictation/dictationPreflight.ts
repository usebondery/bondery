/**
 * Preflight checks before a dictation session starts.
 *
 * A recognizer in a Chromium browser sends the audio to a remote service. When
 * that service is unreachable, the recognizer reports `network` after the
 * microphone permission was already granted. That message blames the user's
 * connection, and the user cannot act on it. These checks catch the two causes
 * the page can see, before the recognizer starts.
 */
import type { DictationErrorCode } from "@/lib/speech/dictation/dictationEngine";

/** Returns a failure code, or `null` when the session may start. */
export function checkDictationPreflight(input: {
  online: boolean;
  secure: boolean;
  supported: boolean;
}): DictationErrorCode | null {
  if (!input.supported) {
    return "unsupported";
  }
  if (!input.secure) {
    return "insecure";
  }
  if (!input.online) {
    return "offline";
  }
  return null;
}

/** Reads the browser state the preflight needs. Never prompts. */
export function readDictationPreflightState(): {
  online: boolean;
  secure: boolean;
  supported: boolean;
} {
  return {
    online: globalThis.navigator?.onLine !== false,
    secure: globalThis.window?.isSecureContext !== false,
    supported: typeof globalThis.window !== "undefined",
  };
}

/** True for a Chromium browser, where recognition depends on a remote service. */
export function isChromiumBrowser(): boolean {
  const userAgent = globalThis.navigator?.userAgent ?? "";
  // Edge and Opera carry "Chrome" in the token, so one test covers them.
  return userAgent.includes("Chrome") || userAgent.includes("Chromium");
}
