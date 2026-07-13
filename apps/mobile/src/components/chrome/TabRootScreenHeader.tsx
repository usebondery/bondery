import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { MOBILE_LAYOUT } from "../../theme/layout";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { useScreenChromeInsets } from "./useScreenChromeInsets";

interface TabRootScreenHeaderProps {
  accessory?: ReactNode;
  titleRow: ReactNode;
}

/** Tab-root screen header with fixed title row height and optional accessory below. */
export function TabRootScreenHeader({ titleRow, accessory }: TabRootScreenHeaderProps) {
  const colors = useMobileThemeColors();
  const paddingTop = useScreenChromeInsets("tabRoot");

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.appBackground,
          paddingTop,
        },
      ]}
    >
      <View style={styles.titleRowSlot}>{titleRow}</View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  accessory: {
    marginTop: MOBILE_LAYOUT.screenChrome.accessoryTopMargin,
  },
  header: {
    paddingBottom: 8,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
  },
  titleRowSlot: {
    height: MOBILE_LAYOUT.screenChrome.titleRowHeight,
    justifyContent: "center",
    overflow: "hidden",
  },
});
