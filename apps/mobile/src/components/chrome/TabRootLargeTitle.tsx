import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { MOBILE_TEXT_STYLES } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";

interface TabRootLargeTitleProps {
  children: ReactNode;
}

/** Large tab-root screen title sized to fit the fixed title row slot. */
export function TabRootLargeTitle({ children }: TabRootLargeTitleProps) {
  const colors = useMobileThemeColors();

  return (
    <Text
      numberOfLines={1}
      style={[MOBILE_TEXT_STYLES.largeTitle, styles.title, { color: colors.textPrimary }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    alignSelf: "flex-start",
  },
});
