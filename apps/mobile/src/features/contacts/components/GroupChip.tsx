import type { Group } from "@bondery/schemas";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "../../../components/ui/Text";
import { usePressSqueeze } from "../../../components/ui/usePressSqueeze";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

export type GroupChipGroup = Pick<Group, "id" | "label" | "emoji" | "color"> & {
  contactCount: number;
};

interface GroupChipProps {
  accessibilityLabel?: string;
  group: GroupChipGroup;
  isClickable?: boolean;
  onPress?: () => void;
}

const CHIP_CLASS = "flex-row items-center gap-1.5 rounded-full border px-3 py-2";

export function GroupChip({
  group,
  onPress,
  accessibilityLabel,
  isClickable = true,
}: GroupChipProps) {
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const label = accessibilityLabel ?? group.label;
  const chipPaint = {
    backgroundColor: colors.surfaceMuted,
    borderColor: group.color || colors.borderStrong,
  };
  const content = (
    <>
      {group.emoji ? <Text size="xl">{group.emoji}</Text> : null}
      <Text fw={600} size="md">
        {group.label}
      </Text>
      <View
        className="rounded-[10px] px-1.5 py-px"
        style={{ backgroundColor: colors.borderStrong }}
      >
        <Text c="secondary" className="text-[11px] font-bold" size={null}>
          {group.contactCount}
        </Text>
      </View>
    </>
  );

  if (!isClickable) {
    return (
      <View
        accessibilityLabel={label}
        accessibilityRole="text"
        className={CHIP_CLASS}
        style={chipPaint}
      >
        {content}
      </View>
    );
  }

  return (
    <Animated.View style={squeezeStyle}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        className={CHIP_CLASS}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={chipPaint}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}
