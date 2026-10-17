import type { Href } from "expo-router";
import {
  armTransitionSafetyFallback,
  getNavigationGateSnapshot,
  recordNavigationKey,
} from "./navigationGateState";
import { serializeHref } from "./serializeHref";
import type { AppNavigateMode, AppNavigateOptions, NavigationDropReason } from "./types";

export const NAVIGATION_DEDUPE_MS = 300;

export type NavigationDecision = { allow: true } | { allow: false; reason: NavigationDropReason };

export function evaluateNavigationRequest(
  key: string,
  mode: AppNavigateMode,
  respectTransitionLock: boolean,
  now: number,
): NavigationDecision {
  const gate = getNavigationGateSnapshot();

  if (mode !== "replace" && respectTransitionLock && gate.isTransitioning) {
    return { allow: false, reason: "inFlight" };
  }

  if (
    mode !== "replace" &&
    respectTransitionLock &&
    gate.lastKey === key &&
    now - gate.lastAt < NAVIGATION_DEDUPE_MS
  ) {
    return { allow: false, reason: "duplicate" };
  }

  return { allow: true };
}

function logDrop(_reason: NavigationDropReason, _key: string): void {
  // Dev-only navigation drop logging is intentionally disabled for lint policy.
}

type AppRouter = {
  navigate: (href: Href) => void;
  push: (href: Href) => void;
  replace: (href: Href) => void;
};

function invokeRouter(
  router: AppRouter,
  href: AppNavigateOptions["href"],
  mode: AppNavigateMode,
): void {
  if (mode === "replace") {
    router.replace(href);
    return;
  }

  if (mode === "navigate") {
    router.navigate(href);
    return;
  }

  router.push(href);
}

/**
 * Runs a navigation request through the gate and invokes the Expo router when allowed.
 */
export function runAppNavigation(
  router: AppRouter,
  options: AppNavigateOptions,
  now = Date.now(),
): "executed" | NavigationDropReason {
  const mode = options.mode ?? "push";
  const respectTransitionLock =
    options.respectTransitionLock ?? (mode === "push" || mode === "navigate");
  const key = serializeHref(options.href);

  const decision = evaluateNavigationRequest(key, mode, respectTransitionLock, now);
  if (!decision.allow) {
    logDrop(decision.reason, key);
    return decision.reason;
  }

  if (mode !== "replace" && respectTransitionLock) {
    recordNavigationKey(key, now);
    armTransitionSafetyFallback();
  }

  invokeRouter(router, options.href, mode);
  return "executed";
}
