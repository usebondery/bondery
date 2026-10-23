import { IconPlus } from "@tabler/icons-react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { useMobileGroupsTranslations } from "@/lib/i18n/generated/hooks";
import { joinClassNames } from "../../../components/ui/joinClassNames";
import { Text } from "../../../components/ui/Text";
import { usePressSqueeze } from "../../../components/ui/usePressSqueeze";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface CreateGroupChipProps {
  disabled?: boolean;
  onPress: () => void;
}

export function CreateGroupChip({ onPress, disabled = false }: CreateGroupChipProps) {
  const tMobileGroups = useMobileGroupsTranslations();
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const label = tMobileGroups("CreateGroup");

  return (
    <Animated.View style={squeezeStyle}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        className={joinClassNames(
          "flex-row items-center gap-1.5 rounded-full border border-dashed px-3 py-2",
          disabled ? "opacity-50" : undefined,
        )}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (disabled) {
            return;
          }
          pressIn();
        }}
        onPressOut={pressOut}
        style={{
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.borderStrong,
        }}
      >
        <IconPlus size={16} stroke={colors.textMuted} />
        <Text fw={600} size="md">
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
