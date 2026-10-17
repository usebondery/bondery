import type { MobileThemeColors } from "../../theme/colors";

export type ActionButtonVariant = "filled" | "outline" | "transparent";

export type ActionButtonTone = "danger" | "neutral" | "primary";

export type ActionButtonColor = ActionButtonTone | (string & {});

export function isActionButtonTone(color: string): color is ActionButtonTone {
  return color === "danger" || color === "neutral" || color === "primary";
}

export function resolveActionButtonAccent(
  color: ActionButtonColor,
  colors: MobileThemeColors,
): string {
  if (color === "danger") {
    return colors.dangerAccent;
  }
  if (color === "neutral") {
    return colors.neutralAccent;
  }
  if (color === "primary") {
    return colors.primary;
  }

  return color;
}

export function resolveActionButtonFillPressedColor(
  color: ActionButtonColor,
  accent: string,
  colors: MobileThemeColors,
): string {
  if (isActionButtonTone(color) && color !== "primary") {
    return accent;
  }

  return colors.primaryPress;
}

export type ResolvedActionButtonShell = {
  backgroundColor: string;
  borderColor: string;
  borderStyle: "dashed" | "solid";
  borderWidth: number;
};

export function resolveActionButtonShell(params: {
  backgroundColorOverride?: string;
  color: ActionButtonColor;
  colors: MobileThemeColors;
  dashed?: boolean;
  pressed: boolean;
  variant: ActionButtonVariant;
}): ResolvedActionButtonShell {
  const { backgroundColorOverride, color, colors, dashed = false, pressed, variant } = params;
  const accent = resolveActionButtonAccent(color, colors);

  if (variant === "transparent") {
    return {
      backgroundColor: backgroundColorOverride ?? "transparent",
      borderColor: "transparent",
      borderStyle: "solid",
      borderWidth: 0,
    };
  }

  if (variant === "outline") {
    const useInputChrome = color === "neutral" && !dashed;
    return {
      backgroundColor: pressed
        ? colors.surfacePressed
        : useInputChrome
          ? colors.inputBackground
          : colors.surface,
      borderColor: dashed || useInputChrome ? colors.borderStrong : accent,
      borderStyle: dashed ? "dashed" : "solid",
      borderWidth: 1,
    };
  }

  const fillPressed = resolveActionButtonFillPressedColor(color, accent, colors);

  return {
    backgroundColor: backgroundColorOverride ?? (pressed ? fillPressed : accent),
    borderColor: "transparent",
    borderStyle: "solid",
    borderWidth: 0,
  };
}
