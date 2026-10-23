import { type GestureResponderEvent, Linking } from "react-native";
import { joinClassNames } from "./joinClassNames";
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
      className={joinClassNames("underline", className)}
      onPress={handlePress}
      size={size}
    />
  );
}
