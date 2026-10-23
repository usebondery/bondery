import type { ReactNode } from "react";
import { View } from "react-native";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { joinClassNames } from "./joinClassNames";
import {
  THEME_ICON_SHAPE_CLASS,
  THEME_ICON_SIZE_CLASS,
  type ThemeIconShape,
  type ThemeIconSize,
} from "./themeIconTokens";

type ThemeIconVariant = "custom" | "light";

export type ThemeIconProps = {
  children: ReactNode;
  className?: string;
  /** Custom fill (e.g. group color). Use with `variant="custom"`. */
  color?: string;
  shape?: ThemeIconShape;
  size?: ThemeIconSize;
  variant?: ThemeIconVariant;
};

export function ThemeIcon({
  children,
  className,
  color,
  shape = "rounded",
  size = "sm",
  variant = "light",
}: ThemeIconProps) {
  const colors = useMobileThemeColors();
  const backgroundColor =
    variant === "custom" && color ? color : variant === "light" ? colors.surfaceMuted : undefined;

  return (
    <View
      className={joinClassNames(
        "items-center justify-center",
        THEME_ICON_SIZE_CLASS[size],
        THEME_ICON_SHAPE_CLASS[shape],
        className,
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {children}
    </View>
  );
}
