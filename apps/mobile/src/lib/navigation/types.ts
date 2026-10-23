import type { Href } from "expo-router";

export type AppNavigateMode = "push" | "navigate" | "replace";

export type AppNavigateOptions = {
  href: Href;
  mode?: AppNavigateMode;
  /** When false, skip transition lock (auth replace, etc.). Default true for push/navigate. */
  respectTransitionLock?: boolean;
};

export type NavigationDropReason = "inFlight" | "duplicate";
