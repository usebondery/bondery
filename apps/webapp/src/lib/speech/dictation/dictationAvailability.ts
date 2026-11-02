/**
 * Whether this browser can run dictation at all.
 *
 * `unsupported` means no recognizer constructor exists, so the control is
 * hidden. `insecure` means the origin is not HTTPS, so the control is disabled
 * with a reason.
 */
export type DictationAvailability = "available" | "insecure" | "unsupported";

export interface DictationAvailabilityInput {
  /** True when the origin is a secure context. */
  secure: boolean;
  /** True when the browser exposes a recognizer constructor. */
  supported: boolean;
}

/** Resolves availability. A missing recognizer wins over an insecure origin. */
export function resolveDictationAvailability({
  secure,
  supported,
}: DictationAvailabilityInput): DictationAvailability {
  if (!supported) {
    return "unsupported";
  }
  if (!secure) {
    return "insecure";
  }
  return "available";
}
