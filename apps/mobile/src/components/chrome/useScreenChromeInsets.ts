import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MOBILE_LAYOUT } from "../../theme/layout";

export type ScreenChromeInsetVariant = "tabRoot" | "stack";

/** Single source for top padding on tab-root vs stack push screens. */
export function useScreenChromeInsets(variant: ScreenChromeInsetVariant): number {
  const insets = useSafeAreaInsets();

  if (variant === "tabRoot") {
    return MOBILE_LAYOUT.screenChrome.tabRootTopPadding;
  }

  return insets.top + MOBILE_LAYOUT.screenChrome.stackNavVerticalPadding;
}
