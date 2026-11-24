import { cn } from "cn";
import { View, type ViewProps } from "react-native";

export type BoxProps = ViewProps & {
  className?: string;
};

export function Box({ className, ...rest }: BoxProps) {
  return <View className={cn(className)} {...rest} />;
}
