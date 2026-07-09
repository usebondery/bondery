import { XStack } from "@tamagui/stacks";
import { Paragraph } from "@tamagui/text";
import type { ReactNode } from "react";
import { ActivityIndicator } from "react-native";
import { TAMAGUI_TRANSITION } from "../../../theme/animations";
import type { MobileThemeColors } from "../../../theme/colors";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

type ButtonTone = "primary" | "danger" | "neutral";
type ButtonVariant = "filled" | "outline";

interface SettingsActionButtonProps {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone?: ButtonTone;
  variant?: ButtonVariant;
}

function getPalette(tone: ButtonTone, variant: ButtonVariant, colors: MobileThemeColors) {
  const toneColor =
    tone === "danger"
      ? colors.dangerAccent
      : tone === "neutral"
        ? colors.neutralAccent
        : colors.primary;

  if (variant === "filled") {
    return {
      backgroundColor: toneColor,
      borderColor: toneColor,
      spinnerColor: colors.textOnPrimary,
      textColor: colors.textOnPrimary,
    };
  }

  return {
    backgroundColor: colors.surface,
    borderColor: tone === "neutral" ? colors.borderStrong : toneColor,
    spinnerColor: tone === "neutral" ? colors.textSecondary : toneColor,
    textColor: tone === "neutral" ? colors.textSecondary : toneColor,
  };
}

/**
 * Reusable settings action button with left-aligned text and right-aligned icon.
 */
export function SettingsActionButton({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  tone = "primary",
  variant = "outline",
}: SettingsActionButtonProps) {
  const colors = useMobileThemeColors();
  const palette = getPalette(tone, variant, colors);

  return (
    <XStack
      alignItems="center"
      backgroundColor={palette.backgroundColor}
      borderColor={palette.borderColor}
      borderRadius={MOBILE_LAYOUT.borderRadius.control}
      borderWidth={1}
      justifyContent="space-between"
      minHeight={MOBILE_LAYOUT.touchTarget}
      onPress={onPress}
      opacity={disabled ? 0.6 : 1}
      paddingHorizontal={14}
      paddingVertical={10}
      pointerEvents={disabled ? "none" : "auto"}
      pressStyle={{ opacity: 0.88, transition: TAMAGUI_TRANSITION.quick }}
      transition={TAMAGUI_TRANSITION.quick}
    >
      <Paragraph
        color={palette.textColor}
        flex={1}
        fontSize={MOBILE_TYPOGRAPHY.fontSize.body}
        fontWeight={MOBILE_TYPOGRAPHY.fontWeight.semibold}
        textAlign="left"
      >
        {label}
      </Paragraph>

      <XStack alignItems="center" justifyContent="center" marginLeft={10} width={20}>
        {loading ? <ActivityIndicator color={palette.spinnerColor} size="small" /> : icon}
      </XStack>
    </XStack>
  );
}
