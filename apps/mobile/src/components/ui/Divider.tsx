import { cn } from "cn";
import { View, type ViewProps } from "react-native";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";

export type DividerProps = ViewProps & {
  className?: string;
  inset?: boolean;
};

export function Divider({ className, inset = false, style, ...rest }: DividerProps) {
  const colors = useMobileThemeColors();

  return (
    <View
      className={cn("h-px", inset && "ml-touch-lg", className)}
      style={[{ backgroundColor: colors.border }, style]}
      {...rest}
    />
  );
}
