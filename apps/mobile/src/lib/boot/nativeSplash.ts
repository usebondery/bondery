import * as SplashScreen from "expo-splash-screen";
import { Platform } from "react-native";

function callSplashFn(fn: unknown): void {
  if (typeof fn !== "function") {
    return;
  }

  try {
    const result = (fn as () => unknown)();
    if (
      result != null &&
      typeof result === "object" &&
      "catch" in result &&
      typeof result.catch === "function"
    ) {
      result.catch(() => {});
    }
  } catch {
    // Native splash methods can be missing during Fast Refresh or a stale binary.
  }
}

/**
 * Keep the native splash until the root navigator has a first real frame.
 * Call this in module scope, without await — Expo hides the splash too early
 * if this runs inside a component.
 */
export function keepNativeSplashVisible(): void {
  callSplashFn(SplashScreen.preventAutoHideAsync);
  try {
    SplashScreen.setOptions({
      duration: 400,
      fade: Platform.OS === "ios",
    });
  } catch {
    // setOptions is unavailable in some Expo Go / stale-native combinations.
  }
}

/** Hide the native splash. Safe to call more than once. */
export function hideNativeSplash(): void {
  if (typeof SplashScreen.hide === "function") {
    callSplashFn(SplashScreen.hide);
    return;
  }

  callSplashFn(SplashScreen.hideAsync);
}
