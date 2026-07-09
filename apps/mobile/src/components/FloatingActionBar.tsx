import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAMAGUI_TRANSITION } from "../theme/animations";
import { floatingBarStyles } from "../theme/floatingBarStyles";
import { Tappable } from "../theme/Tappable";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

export type FloatingActionBarAction = {
  id: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  tone?: "default" | "danger";
  isActive?: boolean;
};

interface FloatingActionBarProps {
  accessibilityLabel?: string;
  actions: FloatingActionBarAction[];
}

/**
 * Icon-only floating action bar for contextual batch actions (e.g. contact selection).
 */
export function FloatingActionBar({
  actions,
  accessibilityLabel = "Selection actions",
}: FloatingActionBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useMobileThemeColors();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="toolbar"
      pointerEvents="box-none"
      style={[floatingBarStyles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View
        style={[
          floatingBarStyles.actionRail,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {actions.map((action) => {
          const isDisabled = action.disabled || action.loading;
          const iconColor =
            action.tone === "danger"
              ? colors.dangerAccent
              : action.isActive
                ? colors.primary
                : colors.iconSecondary;

          return (
            <Tappable
              accessibilityHint={action.accessibilityHint}
              accessibilityLabel={action.accessibilityLabel}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isDisabled,
                selected: action.isActive,
              }}
              backgroundColor={action.isActive ? colors.selectionBackground : "transparent"}
              disabled={isDisabled}
              key={action.id}
              onPress={action.onPress}
              opacity={isDisabled ? 0.38 : 1}
              pressStyle={{ opacity: 0.9, transition: TAMAGUI_TRANSITION.quick }}
              style={floatingBarStyles.actionBubble}
              variant="subtle"
            >
              {action.loading ? <ActivityIndicator color={iconColor} size="small" /> : action.icon}
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}
