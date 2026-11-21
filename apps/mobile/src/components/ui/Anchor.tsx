import { cn } from "cn";
import { type GestureResponderEvent, Linking } from "react-native";
import { Text, type TextProps } from "./Text";

export type AnchorProps = Omit<TextProps, "accessibilityRole"> & {
  href: string;
};

export function Anchor({ className, href, onPress, size = "xs", ...rest }: AnchorProps) {
  const handlePress = (event: GestureResponderEvent) => {
    onPress?.(event);
    void Linking.openURL(href);
  };

  return (
    <Text
      {...rest}
      accessibilityRole="link"
      c="brand"
      className={cn("underline", className)}
      onPress={handlePress}
      size={size}
    />
  );
}
