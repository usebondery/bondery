import type { ReactNode } from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconArrowLeft } from "@tabler/icons-react-native";

import {
  MOBILE_HIT_SLOP,
  MOBILE_LAYOUT,
  MOBILE_TEXT_STYLES,
} from "../../theme/tokens";

import { useMobileThemeColors } from "../../theme/useMobileThemeColors";

type StackNavBarVariant = "elevated" | "flat";

interface StackNavBarProps {
  title?: string;

  /** Custom title row content sized to the fixed title slot (e.g. large title or selection toolbar). */

  titleRow?: ReactNode;

  onBack: () => void;

  right?: ReactNode;

  /** Rendered below the title row with the same spacing as tab-root screen headers. */

  accessory?: ReactNode;

  variant?: StackNavBarVariant;
}

/**

 * Stack push screen nav bar with back action, fixed-height title row, and optional accessory.

 * Uses tab-root top padding and title row height for parity with tab screens.

 */

export function StackNavBar({
  title,

  titleRow,

  onBack,

  right,

  accessory,

  variant = "flat",
}: StackNavBarProps) {
  const colors = useMobileThemeColors();

  const isElevated = variant === "elevated";

  const backgroundColor = isElevated
    ? colors.surfaceElevated
    : colors.appBackground;

  const titleContent =
    titleRow ??
    (title ? (
      <Text
        style={[
          styles.navTitle,
          MOBILE_TEXT_STYLES.navTitle,
          { color: colors.textPrimary },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    ) : null);

  return (
    <View
      style={[
        styles.header,

        {
          paddingTop: MOBILE_LAYOUT.screenChrome.tabRootTopPadding,

          backgroundColor,

          borderBottomColor: colors.border,

          borderBottomWidth: isElevated ? 1 : 0,
        },
      ]}
    >
      <View style={styles.navRow}>
        <Pressable
          onPress={onBack}
          hitSlop={MOBILE_HIT_SLOP.nav}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <IconArrowLeft size={22} stroke={colors.iconPrimary} />
        </Pressable>

        <View style={styles.titleRowSlot}>{titleContent}</View>

        {right ?? <View style={styles.rightSpacer} />}
      </View>

      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,

    paddingBottom: 8,
  },

  navRow: {
    flexDirection: "row",

    alignItems: "center",
  },

  backButton: {
    width: 28,

    alignItems: "flex-start",

    justifyContent: "center",

    paddingVertical: 2,
  },

  titleRowSlot: {
    flex: 1,

    height: MOBILE_LAYOUT.screenChrome.titleRowHeight,

    justifyContent: "center",

    overflow: "hidden",

    marginHorizontal: 4,
  },

  navTitle: {
    textAlign: "center",
  },

  rightSpacer: {
    width: 28,
  },

  accessory: {
    marginTop: MOBILE_LAYOUT.screenChrome.accessoryTopMargin,
  },
});
