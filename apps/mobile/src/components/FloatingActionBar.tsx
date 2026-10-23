import type { ReactNode } from "react";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import { FloatingPillRail } from "./chrome/FloatingPillRail";
import { ActionButton } from "./ui/ActionButton";

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
  const colors = useMobileThemeColors();

  return (
    <FloatingPillRail accessibilityLabel={accessibilityLabel} accessibilityRole="toolbar">
      {actions.map((action) => {
        const isDisabled = action.disabled || action.loading;
        const iconColor =
          action.tone === "danger"
            ? colors.dangerAccent
            : action.isActive
              ? colors.primary
              : colors.iconSecondary;

        return (
          <ActionButton
            accessibilityHint={action.accessibilityHint}
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{
              disabled: isDisabled,
              selected: action.isActive,
            }}
            backgroundColor={action.isActive ? colors.selectionBackground : undefined}
            disabled={isDisabled}
            indicatorColor={iconColor}
            key={action.id}
            loading={action.loading}
            onPress={action.onPress}
            size="md"
            variant="transparent"
          >
            {action.icon}
          </ActionButton>
        );
      })}
    </FloatingPillRail>
  );
}
