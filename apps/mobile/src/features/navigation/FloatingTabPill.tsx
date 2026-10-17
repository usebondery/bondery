import type { ReactNode } from "react";
import type { AccessibilityRole, AccessibilityState } from "react-native";
import { ActionButton } from "../../components/ui/ActionButton";

interface FloatingTabPillProps {
  accessibilityHint?: string;
  accessibilityLabel: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  children: ReactNode;
  disabled?: boolean;
  indicatorColor?: string;
  isFocused: boolean;
  loading?: boolean;
  onLongPress?: () => void;
  onPress: () => void;
  testID?: string;
}

/**
 * Tab bubble: press switches tab or focuses in-page search when already selected.
 */
export function FloatingTabPill({
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole = "tab",
  accessibilityState,
  children,
  disabled = false,
  indicatorColor,
  isFocused,
  loading = false,
  onLongPress,
  onPress,
  testID,
}: FloatingTabPillProps) {
  return (
    <ActionButton
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      color="primary"
      disabled={disabled}
      indicatorColor={indicatorColor}
      loading={loading}
      onLongPress={onLongPress}
      onPress={onPress}
      size="md"
      testID={testID}
      variant={isFocused ? "filled" : "transparent"}
    >
      {children}
    </ActionButton>
  );
}
