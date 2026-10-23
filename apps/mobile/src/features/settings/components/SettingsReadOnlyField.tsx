import { IconRefresh } from "@tabler/icons-react-native";
import { ActivityIndicator, View } from "react-native";
import { ActionIcon } from "../../../components/ui/ActionIcon";
import { TextInput } from "../../../components/ui/TextInput";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface SettingsReadOnlyFieldProps {
  errorMessage?: string;
  label?: string;
  loading?: boolean;
  onReload?: () => void;
  reloadAccessibilityLabel?: string;
  statusDotColor?: string;
  statusMessage?: string;
  value: string;
}

function StatusDot({ color }: { color: string }) {
  return <View className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />;
}

export function SettingsReadOnlyField({
  value,
  errorMessage,
  label,
  statusDotColor,
  statusMessage,
  loading = false,
  onReload,
  reloadAccessibilityLabel,
}: SettingsReadOnlyFieldProps) {
  const colors = useMobileThemeColors();

  const rightSection =
    onReload != null ? (
      <View className="w-[22px] items-center justify-center">
        {loading ? (
          <ActivityIndicator color={colors.textMuted} size="small" />
        ) : (
          <ActionIcon
            accessibilityLabel={reloadAccessibilityLabel ?? ""}
            onPress={onReload}
            size="sm"
          >
            <IconRefresh size={18} stroke={colors.iconSecondary} />
          </ActionIcon>
        )}
      </View>
    ) : undefined;

  return (
    <TextInput
      editable={false}
      errorMessage={errorMessage}
      label={label}
      leftSection={statusDotColor ? <StatusDot color={statusDotColor} /> : undefined}
      rightSection={rightSection}
      showSoftInputOnFocus={false}
      statusMessage={statusMessage}
      value={value}
      wrapperStyle={{
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.borderStrong,
      }}
    />
  );
}
