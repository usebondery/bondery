import { MOBILE_THEME_COLORS } from "./colors";
import { useResolvedMobileTheme } from "./useResolvedMobileTheme";

/**
 * Returns centralized semantic colors for the currently resolved mobile theme.
 */
export function useMobileThemeColors() {
  const resolvedTheme = useResolvedMobileTheme();
  return MOBILE_THEME_COLORS[resolvedTheme];
}
