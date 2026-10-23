import { View, type ViewProps } from "react-native";
import { joinClassNames } from "./joinClassNames";

export type BoxProps = ViewProps & {
  className?: string;
};

export function Box({ className, ...rest }: BoxProps) {
  return <View className={joinClassNames(className)} {...rest} />;
}
