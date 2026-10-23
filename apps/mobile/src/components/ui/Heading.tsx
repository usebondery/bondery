import { type HeadingOrder, headingClassName } from "./headingClassName";
import { joinClassNames } from "./joinClassNames";
import { Text, type TextProps } from "./Text";

export type { HeadingOrder };

export type HeadingProps = Omit<TextProps, "fw" | "size"> & {
  order: HeadingOrder;
};

export function Heading({ className, order, c = "default", ...rest }: HeadingProps) {
  return (
    <Text
      {...rest}
      accessibilityRole="header"
      c={c}
      className={joinClassNames(headingClassName(order), className)}
      size={null}
    />
  );
}
