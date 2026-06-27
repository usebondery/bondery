import { IconCheck } from "@tabler/icons-react-native";
import { MOBILE_LAYOUT } from "../theme/tokens";
import { Tappable } from "../theme/Tappable";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

interface MobileCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

const CHECKBOX_SIZE = 22;

export function MobileCheckbox({
  checked,
  onCheckedChange,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: MobileCheckboxProps) {
  const colors = useMobileThemeColors();

  return (
    <Tappable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      width={CHECKBOX_SIZE}
      height={CHECKBOX_SIZE}
      borderRadius={6}
      borderWidth={1}
      borderColor={colors.borderStrong}
      backgroundColor={checked ? colors.surfacePressed : colors.inputBackground}
      alignItems="center"
      justifyContent="center"
      opacity={disabled ? 0.5 : 1}
      variant="subtle"
    >
      {checked ? <IconCheck size={14} stroke={colors.textPrimary} /> : null}
    </Tappable>
  );
}

export const MOBILE_CHECKBOX_TOUCH_ROW_MIN_HEIGHT = MOBILE_LAYOUT.touchTarget;
