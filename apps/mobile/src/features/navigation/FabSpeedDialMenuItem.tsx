import { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { Tappable } from "../../theme/Tappable";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import type { FabSpeedDialAction, FabSpeedDialMenuItemLayout } from "./fabSpeedDialTypes";

interface FabSpeedDialMenuItemProps {
  action: FabSpeedDialAction;
  isHighlighted: boolean;
  isLast: boolean;
  onPress: () => void;
  onLayoutMeasured: (layout: FabSpeedDialMenuItemLayout) => void;
}

export function FabSpeedDialMenuItem({
  action,
  isHighlighted,
  isLast,
  onPress,
  onLayoutMeasured,
}: FabSpeedDialMenuItemProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const Icon = action.icon;
  const label = t(action.labelKey);
  const containerRef = useRef<View>(null);

  const reportLayout = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      onLayoutMeasured({ id: action.id, x, y, width, height });
    });
  }, [action.id, onLayoutMeasured]);

  return (
    <View ref={containerRef} collapsable={false} onLayout={reportLayout}>
      <Tappable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={action.testID}
        variant="default"
        style={[
          styles.row,
          {
            backgroundColor: isHighlighted ? colors.selectionBackground : "transparent",
            borderBottomColor: colors.border,
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          },
        ]}
        pressStyle={{ opacity: 0.9 }}
      >
        <Icon size={18} stroke={colors.primary} />
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
      </Tappable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MOBILE_LAYOUT.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  label: {
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.menuAction,
    flexShrink: 1,
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
