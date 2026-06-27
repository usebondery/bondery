import type { ReactNode } from "react";
import { ActivityIndicator } from "react-native";
import { XStack } from "@tamagui/stacks";
import { Paragraph } from "@tamagui/text";
import { TAMAGUI_TRANSITION } from "../../../theme/animations";
import type { MobileThemeColors } from "../../../theme/colors";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

type ButtonTone = "primary" | "danger" | "neutral";
type ButtonVariant = "filled" | "outline";

interface SettingsActionButtonProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
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
      textColor: colors.textOnPrimary,
      spinnerColor: colors.textOnPrimary,
    };
  }

  return {
    backgroundColor: colors.surface,
    borderColor: tone === "neutral" ? colors.borderStrong : toneColor,
    textColor: tone === "neutral" ? colors.textSecondary : toneColor,
    spinnerColor: tone === "neutral" ? colors.textSecondary : toneColor,
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
      minHeight={MOBILE_LAYOUT.touchTarget}
      borderRadius={MOBILE_LAYOUT.borderRadius.control}
      borderWidth={1}
      borderColor={palette.borderColor}
      backgroundColor={palette.backgroundColor}
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal={14}
      paddingVertical={10}
      opacity={disabled ? 0.6 : 1}
      transition={TAMAGUI_TRANSITION.quick}
      pressStyle={{ opacity: 0.88, transition: TAMAGUI_TRANSITION.quick }}
      onPress={onPress}
      pointerEvents={disabled ? "none" : "auto"}
    >
      <Paragraph
        color={palette.textColor}
        fontSize={MOBILE_TYPOGRAPHY.fontSize.body}
        fontWeight={MOBILE_TYPOGRAPHY.fontWeight.semibold}
        flex={1}
        textAlign="left"
      >
        {label}
      </Paragraph>

      <XStack width={20} justifyContent="center" alignItems="center" marginLeft={10}>
        {loading ? <ActivityIndicator size="small" color={palette.spinnerColor} /> : icon}
      </XStack>
    </XStack>
  );
}
