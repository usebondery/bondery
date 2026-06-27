import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { IconBug } from "@tabler/icons-react-native";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { LoadErrorRetryButton } from "./LoadErrorRetryButton";

interface LoadErrorCardProps {
  title: string;
  description: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
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
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>

      {onRetry ? <LoadErrorRetryButton onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
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
  description: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    lineHeight: 18,
  },
});

export const loadErrorTabRootInset = {
  paddingTop: MOBILE_LAYOUT.floatingTabBar.screenHeaderInset,
  paddingHorizontal: 20,
} as const;

export const loadErrorStackInset = {
  paddingHorizontal: 16,
  paddingTop: 8,
} as const;
