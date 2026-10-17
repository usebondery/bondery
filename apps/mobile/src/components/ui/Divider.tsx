import { View, type ViewProps } from "react-native";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { joinClassNames } from "./joinClassNames";

export type DividerProps = ViewProps & {
  className?: string;
  inset?: boolean;
};

export function Divider({ className, inset = false, style, ...rest }: DividerProps) {
  const colors = useMobileThemeColors();

  return (
    <View
      className={joinClassNames("h-px", inset ? "ml-[52px]" : undefined, className)}
      style={[{ backgroundColor: colors.border }, style]}
      {...rest}
    />
  );
}
