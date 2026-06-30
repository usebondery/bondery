import { useFloatingChromeBottomInset } from "../../features/navigation/floatingChromeInsetsContext";
import { MOBILE_LAYOUT } from "../../theme/tokens";

export type ScrollChromeVariant = "tabRoot" | "stack";

/**
 * Bottom padding for scroll content so the last item can clear overlaid chrome.
 * Tab-root screens include measured floating chrome height; stack push screens do not.
 */
export function useScrollBottomInset(variant: ScrollChromeVariant): number {
  const comfortInset = MOBILE_LAYOUT.spacing.contentBottom;
  const floatingChromeInset = useFloatingChromeBottomInset();

  if (variant === "stack") {
    return comfortInset;
  }

  return comfortInset + floatingChromeInset;
}
