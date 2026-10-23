import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { joinClassNames } from "./joinClassNames";

export type TextSize = "xs" | "sm" | "md" | "lg" | "xl";
export type TextWeight = 400 | 500 | 600 | 700;
export type TextColor =
  | "brand"
  | "danger"
  | "default"
  | "muted"
  | "onPrimary"
  | "primary"
  | "secondary";
export type TextAlign = "left" | "center" | "right";

const SIZE_CLASS: Record<TextSize, string> = {
  lg: "text-[15px]",
  md: "text-[14px]",
  sm: "text-[13px]",
  xl: "text-[16px]",
  xs: "text-[12px]",
};

const WEIGHT_CLASS: Record<TextWeight, string> = {
  400: "font-normal",
  500: "font-medium",
  600: "font-semibold",
  700: "font-bold",
};

const ALIGN_CLASS: Record<TextAlign, string> = {
  center: "text-center",
  left: "text-left",
  right: "text-right",
};

export type TextProps = RNTextProps & {
  c?: TextColor;
  className?: string;
  fw?: TextWeight;
  /** Pass `null` to skip the default size class (Heading sets size in className). */
  size?: TextSize | null;
  ta?: TextAlign;
};

function colorForToken(c: TextColor, colors: ReturnType<typeof useMobileThemeColors>): string {
  switch (c) {
    case "brand":
      return colors.primary;
    case "danger":
      return colors.dangerText;
    case "default":
      return colors.textDefault;
    case "muted":
      return colors.textMuted;
    case "onPrimary":
      return colors.textOnPrimary;
    case "secondary":
      return colors.textSecondary;
    default:
      return colors.textPrimary;
  }
}

export function Text({ c = "primary", className, fw, size = "md", style, ta, ...rest }: TextProps) {
  const colors = useMobileThemeColors();
  const sizeClass = size === null ? undefined : SIZE_CLASS[size];

  return (
    <RNText
      {...rest}
      className={joinClassNames(
        sizeClass,
        fw === undefined ? undefined : WEIGHT_CLASS[fw],
        ta === undefined ? undefined : ALIGN_CLASS[ta],
        className,
      )}
      style={[{ color: colorForToken(c, colors) }, style]}
    />
  );
}
