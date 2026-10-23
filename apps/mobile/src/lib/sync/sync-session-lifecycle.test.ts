import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideSyncSessionLifecycle } from "./sync-session-lifecycle.ts";

describe("decideSyncSessionLifecycle", () => {
  it("stays idle while the session is hydrating", () => {
    assert.equal(
      decideSyncSessionLifecycle({
        hasLocalToken: true,
        isAuthenticated: false,
        isSessionHydrating: true,
        nextUserId: null,
        previousUserId: "user-a",
      }),
      "idle",
    );
  });

  it("does not wipe on first paint with no prior user", () => {
    assert.equal(
      decideSyncSessionLifecycle({
        hasLocalToken: false,
        isAuthenticated: false,
        isSessionHydrating: false,
        nextUserId: null,
        previousUserId: null,
      }),
      "idle",
    );
  });

  it("wipes after a known user becomes anonymous", () => {
    assert.equal(
      decideSyncSessionLifecycle({
        hasLocalToken: false,
        isAuthenticated: false,
        isSessionHydrating: false,
        nextUserId: null,
        previousUserId: "user-a",
      }),
      "wipe_logout",
    );
  });

  it("starts when authenticated with a local token", () => {
    assert.equal(
      decideSyncSessionLifecycle({
        hasLocalToken: true,
        isAuthenticated: true,
        isSessionHydrating: false,
        nextUserId: "user-a",
        previousUserId: null,
      }),
      "start",
    );
  });

  it("does not start without a local token", () => {
    assert.equal(
      decideSyncSessionLifecycle({
        hasLocalToken: false,
        isAuthenticated: true,
        isSessionHydrating: false,
        nextUserId: "user-a",
        previousUserId: null,
      }),
      "idle",
    );
  });

  it("wipes then starts on a user switch", () => {
    assert.equal(
      decideSyncSessionLifecycle({
        hasLocalToken: true,
        isAuthenticated: true,
        isSessionHydrating: false,
        nextUserId: "user-b",
        previousUserId: "user-a",
      }),
      "wipe_user_switch",
    );
  });
});
