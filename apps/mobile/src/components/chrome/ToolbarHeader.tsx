import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { MOBILE_LAYOUT } from "../../theme/layout";

interface ToolbarHeaderProps {
  center?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}

/** Fixed-height three-slot toolbar row for selection and edit modes. */
export function ToolbarHeader({ left, center, right }: ToolbarHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.sideSlot}>{left}</View>
      <View style={styles.centerSlot}>{center}</View>
      <View style={[styles.sideSlot, styles.rightSlot]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  rightSlot: {
    alignItems: "flex-end",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    height: MOBILE_LAYOUT.screenChrome.titleRowHeight,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  sideSlot: {
    justifyContent: "center",
    minWidth: MOBILE_LAYOUT.screenChrome.toolbarSlotMinWidth,
  },
});
