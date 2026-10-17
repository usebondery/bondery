import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "@bondery/helpers/api";
import { TransportUnavailableError } from "../api/transport-unavailable-error.ts";
import { AuthRequiredError } from "../auth/session.ts";
import {
  decidePullLoopFailure,
  shouldEnterPullLoopAfterBootstrap,
  shouldReconnectSyncWake,
  shouldRunBackgroundSync,
} from "./pull-auth.ts";

function apiErrorWithStatus(status: number, code: string): ApiError {
  return new ApiError({
    code,
    developerMessage: `HTTP ${status}`,
    status,
  });
}

describe("decidePullLoopFailure", () => {
  it("does not retry a missing local token", () => {
    assert.equal(decidePullLoopFailure(new AuthRequiredError("missing_local_session")), "stop");
  });

  it("signs out once on HTTP 401", () => {
    assert.equal(decidePullLoopFailure(new AuthRequiredError("session_revoked")), "sign_out");
    assert.equal(decidePullLoopFailure(apiErrorWithStatus(401, "auth_required")), "sign_out");
  });

  it("does not resurrect an aborted pull", () => {
    const aborted = new Error("Aborted");
    aborted.name = "AbortError";
    assert.equal(decidePullLoopFailure(aborted), "stop");
  });

  it("keeps the session on 426 and retries network errors", () => {
    assert.equal(decidePullLoopFailure(apiErrorWithStatus(426, "sync_protocol_mismatch")), "stop");
    assert.equal(decidePullLoopFailure(apiErrorWithStatus(503, "service_unavailable")), "retry");
    assert.equal(decidePullLoopFailure(new TransportUnavailableError("offline")), "retry");
  });
});

describe("shouldEnterPullLoopAfterBootstrap", () => {
  it("skips the loop after a missing token or 401", () => {
    assert.equal(shouldEnterPullLoopAfterBootstrap("stop"), false);
    assert.equal(shouldEnterPullLoopAfterBootstrap("sign_out"), false);
    assert.equal(shouldEnterPullLoopAfterBootstrap("retry"), true);
    assert.equal(shouldEnterPullLoopAfterBootstrap(null), true);
  });
});

describe("shouldReconnectSyncWake", () => {
  it("reconnects on network errors only", () => {
    assert.equal(shouldReconnectSyncWake(new Error("ECONNRESET")), true);
    assert.equal(shouldReconnectSyncWake(new AuthRequiredError("missing_local_session")), false);
    assert.equal(shouldReconnectSyncWake(new AuthRequiredError("session_revoked")), false);
  });
});

describe("shouldRunBackgroundSync", () => {
  it("skips background work when the local token is empty", () => {
    assert.equal(shouldRunBackgroundSync(null), false);
    assert.equal(shouldRunBackgroundSync(""), false);
    assert.equal(shouldRunBackgroundSync("opaque-token"), true);
  });
});
