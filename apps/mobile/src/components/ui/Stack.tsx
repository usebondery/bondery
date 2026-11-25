import { cn } from "cn";
import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import {
  FLEX_ALIGN_CLASS,
  FLEX_JUSTIFY_CLASS,
  type FlexAlign,
  type FlexJustify,
  gapClassName,
  type SpacingSize,
} from "./flexLayout";
import { wrapGrowChildren } from "./wrapGrowChildren";

export type StackProps = Omit<ViewProps, "children"> & {
  align?: FlexAlign;
  children?: ReactNode;
  className?: string;
  gap?: SpacingSize;
  grow?: boolean;
  justify?: FlexJustify;
};

export function Stack({
  align,
  children,
  className,
  gap = "md",
  grow = false,
  justify,
  ...rest
}: StackProps) {
  const content = grow ? wrapGrowChildren(children, "column") : children;

  return (
    <View
      className={cn(
        "flex-col",
        align === undefined ? undefined : FLEX_ALIGN_CLASS[align],
        justify === undefined ? undefined : FLEX_JUSTIFY_CLASS[justify],
        gapClassName(gap),
        className,
      )}
      {...rest}
    >
      {content}
    </View>
  );
}
