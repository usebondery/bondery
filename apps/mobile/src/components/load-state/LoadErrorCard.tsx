import { IconBug } from "@tabler/icons-react-native";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { LoadErrorRetryButton } from "./LoadErrorRetryButton";

interface LoadErrorCardProps {
  description: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
}

export function LoadErrorCard({ title, description, onRetry, style }: LoadErrorCardProps) {
  const colors = useMobileThemeColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.borderStrong },
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        <IconBug size={20} stroke={colors.iconSecondary} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      </View>

      {onRetry ? <LoadErrorRetryButton onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  description: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    lineHeight: 18,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
  },
  textWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});

export const loadErrorTabRootInset = {
  paddingHorizontal: 20,
  paddingTop: MOBILE_LAYOUT.floatingTabBar.screenHeaderInset,
} as const;

export const loadErrorStackInset = {
  paddingHorizontal: 16,
  paddingTop: 8,
} as const;
