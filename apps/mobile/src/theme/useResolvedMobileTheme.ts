import { useColorScheme } from "react-native";
import { useMobilePreferences } from "../lib/preferences/useMobilePreferences";

export type ResolvedMobileTheme = "light" | "dark";

/**
 * Resolves the effective mobile theme from app preference and system appearance.
 */
export function useResolvedMobileTheme(): ResolvedMobileTheme {
  const systemColorScheme = useColorScheme();
  const themePreference = useMobilePreferences((state) => state.themePreference);

  if (themePreference === "system") {
    return systemColorScheme === "dark" ? "dark" : "light";
  }

  return themePreference;
}
