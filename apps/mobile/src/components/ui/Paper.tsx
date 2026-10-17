import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { joinClassNames } from "./joinClassNames";

export type PaperProps = Omit<ViewProps, "children"> & {
  children?: ReactNode;
  className?: string;
  radius?: number;
  withBorder?: boolean;
};

export function Paper({
  children,
  className,
  radius = 14,
  style,
  withBorder = false,
  ...rest
}: PaperProps) {
  const colors = useMobileThemeColors();

  return (
    <View
      className={joinClassNames("overflow-hidden", className)}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: withBorder ? colors.borderStrong : undefined,
          borderRadius: radius,
          borderWidth: withBorder ? 1 : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
