import { cn } from "cn";
import { type HeadingOrder, headingClassName } from "./headingClassName";
import { Text, type TextProps } from "./Text";

export type { HeadingOrder } from "./headingClassName";

export type HeadingProps = Omit<TextProps, "fw" | "size"> & {
  order: HeadingOrder;
};

export function Heading({ className, order, c = "default", ...rest }: HeadingProps) {
  return (
    <Text
      {...rest}
      accessibilityRole="header"
      c={c}
      className={cn(headingClassName(order), className)}
      size={null}
    />
  );
}
