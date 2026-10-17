import type { TransportUnavailableKind } from "./transport-unavailable-error";

export function classifyFetchFailureKind(isOffline: boolean): TransportUnavailableKind {
  return isOffline ? "offline" : "unreachable";
}
