import type { ReactNode } from "react";
import { View } from "react-native";
import { MOBILE_LAYOUT } from "../../theme/layout";

interface ToolbarHeaderProps {
  center?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}

/**
 * One row, three equal columns. The middle column’s center is the geometric
 * midpoint of the header, so a long Select all label cannot shift “N selected”.
 */
export function ToolbarHeader({ left, center, right }: ToolbarHeaderProps) {
  return (
    <View
      className="w-full flex-row items-stretch"
      style={{ height: MOBILE_LAYOUT.screenChrome.titleRowHeight }}
    >
      <View className="min-w-0 flex-1 items-start justify-center">{left}</View>
      <View className="min-w-0 flex-1 items-center justify-center" pointerEvents="none">
        {center}
      </View>
      <View className="min-w-0 flex-1 items-end justify-center">{right}</View>
    </View>
  );
}
