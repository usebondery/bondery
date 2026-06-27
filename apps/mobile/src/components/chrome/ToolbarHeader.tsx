import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { MOBILE_LAYOUT } from "../../theme/layout";

interface ToolbarHeaderProps {
  left?: ReactNode;
  center?: ReactNode;
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: MOBILE_LAYOUT.screenChrome.titleRowHeight,
    overflow: "hidden",
  },
  sideSlot: {
    minWidth: MOBILE_LAYOUT.screenChrome.toolbarSlotMinWidth,
    justifyContent: "center",
  },
  rightSlot: {
    alignItems: "flex-end",
  },
  centerSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
});
