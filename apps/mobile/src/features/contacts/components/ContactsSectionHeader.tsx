import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MOBILE_TEXT_STYLES } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface ContactsSectionHeaderProps {
  title: string;
}

export const ContactsSectionHeader = memo(function ContactsSectionHeader({
  title,
}: ContactsSectionHeaderProps) {
  const colors = useMobileThemeColors();

  return (
    <View
      style={[
        styles.sectionHeader,
        {
          backgroundColor: colors.surfaceMuted,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text style={[MOBILE_TEXT_STYLES.listSectionHeader, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
});
