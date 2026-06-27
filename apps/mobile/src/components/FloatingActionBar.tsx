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
  actions: FloatingActionBarAction[];
  accessibilityLabel?: string;
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
      pointerEvents="box-none"
      style={[floatingBarStyles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}
      accessibilityRole="toolbar"
      accessibilityLabel={accessibilityLabel}
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
              key={action.id}
              variant="subtle"
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              accessibilityHint={action.accessibilityHint}
              accessibilityState={{
                disabled: isDisabled,
                selected: action.isActive,
              }}
              disabled={isDisabled}
              opacity={isDisabled ? 0.38 : 1}
              style={floatingBarStyles.actionBubble}
              backgroundColor={
                action.isActive ? colors.selectionBackground : "transparent"
              }
              pressStyle={{ opacity: 0.9, transition: TAMAGUI_TRANSITION.quick }}
              onPress={action.onPress}
            >
              {action.loading ? (
                <ActivityIndicator size="small" color={iconColor} />
              ) : (
                action.icon
              )}
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}
