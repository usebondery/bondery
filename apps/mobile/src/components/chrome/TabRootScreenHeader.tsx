import type { ReactNode } from "react";
import { View } from "react-native";
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
      className="pb-2"
      style={{
        backgroundColor: colors.appBackground,
        paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
        paddingTop,
      }}
    >
      <View
        className="w-full self-stretch justify-center overflow-hidden"
        style={{ height: MOBILE_LAYOUT.screenChrome.titleRowHeight }}
      >
        {titleRow}
      </View>
      {accessory ? (
        <View style={{ marginTop: MOBILE_LAYOUT.screenChrome.accessoryTopMargin }}>
          {accessory}
        </View>
      ) : null}
    </View>
  );
}
