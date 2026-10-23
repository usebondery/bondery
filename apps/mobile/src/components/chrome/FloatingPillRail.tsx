import type { ReactNode } from "react";
import type { AccessibilityRole } from "react-native";
import { View } from "react-native";
import { MOBILE_LAYOUT } from "../../theme/layout";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { Group } from "../ui/Group";
import { FLOATING_PILL_SPACE } from "./floatingChromeTokens";

interface FloatingPillRailProps {
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  children: ReactNode;
}

/**
 * Shared floating pill that holds tab buttons or selection actions.
 * Surface lives on this View — Paper’s overflow-hidden would clip the shadow.
 */
export function FloatingPillRail({
  accessibilityLabel,
  accessibilityRole,
  children,
}: FloatingPillRailProps) {
  const colors = useMobileThemeColors();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      className="self-center"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.borderStrong,
        borderRadius: MOBILE_LAYOUT.borderRadius.pill,
        borderWidth: 1,
        elevation: 4,
        // Pixel gap/padding must stay 10 so pill height stays 64 for FlashList clearance.
        paddingHorizontal: FLOATING_PILL_SPACE,
        paddingVertical: FLOATING_PILL_SPACE,
        shadowColor: colors.shadow,
        shadowOffset: { height: 6, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      }}
    >
      <Group align="center" className="gap-[10px]" style={{ gap: FLOATING_PILL_SPACE }}>
        {children}
      </Group>
    </View>
  );
}
