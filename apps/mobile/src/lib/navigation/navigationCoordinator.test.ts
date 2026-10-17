import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateNavigationRequest,
  NAVIGATION_DEDUPE_MS,
  runAppNavigation,
} from "./navigationCoordinator.ts";
import {
  getNavigationGateSnapshot,
  recordNavigationKey,
  setNavigationTransitioning,
} from "./navigationGateState.ts";
import { serializeHref } from "./serializeHref.ts";

function resetGate(): void {
  setNavigationTransitioning(false);
  recordNavigationKey("", 0);
}

describe("serializeHref", () => {
  it("uses string hrefs as-is", () => {
    assert.equal(serializeHref("/settings/tags"), "/settings/tags");
  });

  it("serializes object hrefs with sorted params", () => {
    const a = serializeHref({
      params: { group_id: "g1" },
      pathname: "/contacts",
    });
    const b = serializeHref({
      params: { group_id: "g1" },
      pathname: "/contacts",
    });
    assert.equal(a, b);
    assert.match(a, /\/contacts/);
  });
});

describe("evaluateNavigationRequest", () => {
  it("drops push while transitioning", () => {
    resetGate();
    setNavigationTransitioning(true);

    const decision = evaluateNavigationRequest("/settings/tags", "push", true, Date.now());
    assert.equal(decision.allow, false);
    if (!decision.allow) {
      assert.equal(decision.reason, "inFlight");
    }
  });

  it("allows replace while transitioning", () => {
    resetGate();
    setNavigationTransitioning(true);

    const decision = evaluateNavigationRequest("/contacts", "replace", true, Date.now());
    assert.equal(decision.allow, true);
  });

  it("drops duplicate href within dedupe window", () => {
    resetGate();
    const now = Date.now();
    recordNavigationKey("/settings/tags", now);

    const decision = evaluateNavigationRequest(
      "/settings/tags",
      "push",
      true,
      now + NAVIGATION_DEDUPE_MS - 1,
    );
    assert.equal(decision.allow, false);
    if (!decision.allow) {
      assert.equal(decision.reason, "duplicate");
    }
  });
});

describe("runAppNavigation", () => {
  it("invokes push once and drops the second in-flight push", () => {
    resetGate();
    const calls: string[] = [];
    const router = {
      back: () => {},
      canGoBack: () => false,
      navigate: () => {
        calls.push("navigate");
      },
      push: (href: unknown) => {
        calls.push(`push:${String(href)}`);
      },
      replace: () => {
        calls.push("replace");
      },
    };

    const first = runAppNavigation(router, { href: "/settings/groups" });
    const second = runAppNavigation(router, { href: "/settings/tags" });

    assert.equal(first, "executed");
    assert.equal(second, "inFlight");
    assert.equal(calls.length, 1);
    assert.equal(calls[0], "push:/settings/groups");
  });

  it("allows replace while transitioning", () => {
    resetGate();
    setNavigationTransitioning(true);
    const calls: string[] = [];
    const router = {
      back: () => {},
      canGoBack: () => false,
      navigate: () => {},
      push: () => {
        calls.push("push");
      },
      replace: (href: unknown) => {
        calls.push(`replace:${String(href)}`);
      },
    };

    const result = runAppNavigation(router, { href: "/contacts", mode: "replace" });
    assert.equal(result, "executed");
    assert.deepEqual(calls, ["replace:/contacts"]);
  });
});

describe("getNavigationGateSnapshot", () => {
  it("records last key after runAppNavigation", () => {
    resetGate();
    const router = {
      back: () => {},
      canGoBack: () => false,
      navigate: () => {},
      push: () => {},
      replace: () => {},
    };

    runAppNavigation(router, { href: "/settings/account" });
    const gate = getNavigationGateSnapshot();
    assert.equal(gate.lastKey, "/settings/account");
    assert.equal(gate.isTransitioning, true);
  });
});
