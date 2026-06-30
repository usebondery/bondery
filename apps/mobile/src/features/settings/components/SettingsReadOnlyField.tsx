import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { IconRefresh } from "@tabler/icons-react-native";
import { MobileTextInput } from "../../../components/MobileTextInput";
import { MOBILE_HIT_SLOP } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface SettingsReadOnlyFieldProps {
  value: string;
  description?: string;
  statusDotColor?: string;
  loading?: boolean;
  onReload?: () => void;
  reloadAccessibilityLabel?: string;
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
          <ActivityIndicator size="small" color={colors.textMuted} />
        ) : (
          <Pressable
            onPress={onReload}
            hitSlop={MOBILE_HIT_SLOP.icon}
            accessibilityRole="button"
            accessibilityLabel={reloadAccessibilityLabel}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <IconRefresh size={18} stroke={colors.iconSecondary} />
          </Pressable>
        )}
      </View>
    ) : undefined;

  return (
    <MobileTextInput
      value={value}
      editable={false}
      showSoftInputOnFocus={false}
      showMaxLengthCounter={false}
      unfocusedBorderColor={colors.borderStrong}
      backgroundColor={colors.surfaceMuted}
      description={description}
      leadingIcon={
        statusDotColor ? <StatusDot color={statusDotColor} /> : undefined
      }
      trailingAccessory={trailingAccessory}
    />
  );
}

const styles = StyleSheet.create({
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trailingAccessory: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
