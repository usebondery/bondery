import { IconRefresh } from "@tabler/icons-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { MobileTextInput } from "../../../components/MobileTextInput";
import { MOBILE_HIT_SLOP } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface SettingsReadOnlyFieldProps {
  description?: string;
  loading?: boolean;
  onReload?: () => void;
  reloadAccessibilityLabel?: string;
  statusDotColor?: string;
  value: string;
}

function StatusDot({ color }: { color: string }) {
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

export function SettingsReadOnlyField({
  value,
  description,
  statusDotColor,
  loading = false,
  onReload,
  reloadAccessibilityLabel,
}: SettingsReadOnlyFieldProps) {
  const colors = useMobileThemeColors();

  const trailingAccessory =
    onReload != null ? (
      <View style={styles.trailingAccessory}>
        {loading ? (
          <ActivityIndicator color={colors.textMuted} size="small" />
        ) : (
          <Pressable
            accessibilityLabel={reloadAccessibilityLabel}
            accessibilityRole="button"
            hitSlop={MOBILE_HIT_SLOP.icon}
            onPress={onReload}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <IconRefresh size={18} stroke={colors.iconSecondary} />
          </Pressable>
        )}
      </View>
    ) : undefined;

  return (
    <MobileTextInput
      backgroundColor={colors.surfaceMuted}
      description={description}
      editable={false}
      leadingIcon={statusDotColor ? <StatusDot color={statusDotColor} /> : undefined}
      showMaxLengthCounter={false}
      showSoftInputOnFocus={false}
      trailingAccessory={trailingAccessory}
      unfocusedBorderColor={colors.borderStrong}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  trailingAccessory: {
    alignItems: "center",
    justifyContent: "center",
    width: 22,
  },
});
