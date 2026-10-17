import { Children, createElement, type ReactNode } from "react";
import { View } from "react-native";

const GROUP_GROW_CHILD_CLASS = "min-w-0 flex-1 items-center";
const STACK_GROW_CHILD_CLASS = "min-h-0 flex-1";

export function wrapGrowChildren(children: ReactNode, direction: "column" | "row"): ReactNode {
  const className = direction === "row" ? GROUP_GROW_CHILD_CLASS : STACK_GROW_CHILD_CLASS;

  return Children.map(children, (child) => {
    if (child == null || typeof child === "boolean") {
      return child;
    }

    return createElement(View, { className }, child);
  });
}
