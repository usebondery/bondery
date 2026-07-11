import type { ColorSchemePreference } from "@bondery/schemas";

export type ResolvedColorScheme = "light" | "dark";

/** Resolves stored preference to the light/dark value Mantine renders. */
export function computeColorScheme(
  preference: ColorSchemePreference,
  prefersDark = false,
): ResolvedColorScheme {
  if (preference === "light") {
    return "light";
  }
  if (preference === "dark") {
    return "dark";
  }
  return prefersDark ? "dark" : "light";
}
