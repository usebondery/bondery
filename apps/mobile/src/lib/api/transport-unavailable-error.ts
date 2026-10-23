import { classifyFetchFailureKind } from "./parseApiErrorBody";

export type TransportUnavailableKind = "offline" | "unreachable";

/**
 * Network failure before an HTTP status exists. The resolver maps `kind` to catalog copy.
 * Do not put a translated string on `message`.
 */
export class TransportUnavailableError extends Error {
  readonly kind: TransportUnavailableKind;

  constructor(kind: TransportUnavailableKind) {
    super(`transport_${kind}`);
    this.name = "TransportUnavailableError";
    this.kind = kind;
  }
}

export function isTransportUnavailableError(error: unknown): error is TransportUnavailableError {
  return error instanceof TransportUnavailableError;
}

export async function throwTransportUnavailableError(
  error: unknown,
  isOffline?: () => Promise<boolean>,
): Promise<never> {
  if (error instanceof Error && error.name === "AbortError") {
    throw error;
  }

  const resolveOffline = isOffline ?? (await import("../network/isDeviceOffline")).isDeviceOffline;
  throw new TransportUnavailableError(classifyFetchFailureKind(await resolveOffline()));
}
