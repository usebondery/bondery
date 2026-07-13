import { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMobileNavigationTranslations } from "@/lib/i18n/generated/hooks";
import { Tappable } from "../../theme/Tappable";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import type { FabSpeedDialAction, FabSpeedDialMenuItemLayout } from "./fabSpeedDialTypes";

interface FabSpeedDialMenuItemProps {
  action: FabSpeedDialAction;
  isHighlighted: boolean;
  isLast: boolean;
  onLayoutMeasured: (layout: FabSpeedDialMenuItemLayout) => void;
  onPress: () => void;
}

export function FabSpeedDialMenuItem({
  action,
  isHighlighted,
  isLast,
  onPress,
  onLayoutMeasured,
}: FabSpeedDialMenuItemProps) {
  const colors = useMobileThemeColors();
  const tMobileNavigation = useMobileNavigationTranslations();
  const Icon = action.icon;
  const label = tMobileNavigation(action.labelKey);
  const containerRef = useRef<View>(null);

  const reportLayout = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      onLayoutMeasured({ height, id: action.id, width, x, y });
    });
  }, [action.id, onLayoutMeasured]);

  return (
    <View collapsable={false} onLayout={reportLayout} ref={containerRef}>
      <Tappable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        pressStyle={{ opacity: 0.9 }}
        style={[
          styles.row,
          {
            backgroundColor: isHighlighted ? colors.selectionBackground : "transparent",
            borderBottomColor: colors.border,
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          },
        ]}
        testID={action.testID}
        variant="default"
      >
        <Icon size={18} stroke={colors.primary} />
        <Text numberOfLines={1} style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
      </Tappable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    flexShrink: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.menuAction,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 14,
  },
});

export function estimateFabMenuContentHeight(actionCount: number): number {
  if (actionCount <= 0) {
    return 0;
  }

  const rowHeight = MOBILE_LAYOUT.touchTarget;
  const gaps = Math.max(actionCount - 1, 0) * MOBILE_LAYOUT.floatingTabBar.speedDialItemGap;
  const padding = MOBILE_LAYOUT.floatingTabBar.speedDialMenuPadding;

  return actionCount * rowHeight + gaps + padding;
}
