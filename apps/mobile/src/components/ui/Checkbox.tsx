import { Checkbox as ExpoCheckbox } from "expo-checkbox";
import { MOBILE_LAYOUT } from "../../theme/layout";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { joinClassNames } from "./joinClassNames";

const CHECKBOX_SIZE = 22;

export type CheckboxProps = {
  accessibilityHint?: string;
  accessibilityLabel: string;
  checked: boolean;
  className?: string;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/** Minimum row height when a checkbox sits beside a label in a tappable row. */
export const CHECKBOX_ROW_MIN_HEIGHT = MOBILE_LAYOUT.touchTarget;

export function Checkbox({
  accessibilityHint,
  accessibilityLabel,
  checked,
  className,
  disabled = false,
  onCheckedChange,
}: CheckboxProps) {
  const colors = useMobileThemeColors();

  return (
    <ExpoCheckbox
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      className={joinClassNames("rounded-[6px]", className)}
      color={checked ? colors.primary : colors.borderStrong}
      disabled={disabled}
      onValueChange={onCheckedChange}
      style={{ height: CHECKBOX_SIZE, width: CHECKBOX_SIZE }}
      value={checked}
    />
  );
}
