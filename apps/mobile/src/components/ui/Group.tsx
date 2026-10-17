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
import { joinClassNames } from "./joinClassNames";
import { wrapGrowChildren } from "./wrapGrowChildren";

export type GroupProps = Omit<ViewProps, "children"> & {
  align?: FlexAlign;
  children?: ReactNode;
  className?: string;
  gap?: SpacingSize;
  grow?: boolean;
  justify?: FlexJustify;
  wrap?: boolean;
};

export function Group({
  align = "center",
  children,
  className,
  gap = "md",
  grow = false,
  justify,
  wrap = false,
  ...rest
}: GroupProps) {
  return (
    <View
      className={joinClassNames(
        "flex-row",
        FLEX_ALIGN_CLASS[align],
        justify === undefined ? undefined : FLEX_JUSTIFY_CLASS[justify],
        wrap ? "flex-wrap" : undefined,
        gapClassName(gap),
        className,
      )}
      {...rest}
    >
      {grow ? wrapGrowChildren(children, "row") : children}
    </View>
  );
}
