import { classifyTransportFailure } from "../auth/session";

export type PullLoopFailureAction = "retry" | "sign_out" | "stop";

export function decidePullLoopFailure(error: unknown): PullLoopFailureAction {
  const kind = classifyTransportFailure(error);
  if (kind === "session_revoked") {
    return "sign_out";
  }

  if (kind === "network") {
    return "retry";
  }

  return "stop";
}

export function shouldEnterPullLoopAfterBootstrap(failure: PullLoopFailureAction | null): boolean {
  if (failure === null) {
    return true;
  }

  return failure === "retry";
}

export function shouldReconnectSyncWake(error: unknown): boolean {
  return classifyTransportFailure(error) === "network";
}

export function shouldRunBackgroundSync(localToken: string | null): boolean {
  return localToken !== null && localToken.length > 0;
}
