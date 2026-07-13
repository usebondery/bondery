import { IconCheck } from "@tabler/icons-react-native";
import { Tappable } from "../theme/Tappable";
import { MOBILE_LAYOUT } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

interface MobileCheckboxProps {
  accessibilityHint?: string;
  accessibilityLabel: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
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
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      alignItems="center"
      backgroundColor={checked ? colors.surfacePressed : colors.inputBackground}
      borderColor={colors.borderStrong}
      borderRadius={6}
      borderWidth={1}
      disabled={disabled}
      height={CHECKBOX_SIZE}
      justifyContent="center"
      onPress={() => onCheckedChange(!checked)}
      opacity={disabled ? 0.5 : 1}
      variant="subtle"
      width={CHECKBOX_SIZE}
    >
      {checked ? <IconCheck size={14} stroke={colors.textPrimary} /> : null}
    </Tappable>
  );
}

export const MOBILE_CHECKBOX_TOUCH_ROW_MIN_HEIGHT = MOBILE_LAYOUT.touchTarget;
