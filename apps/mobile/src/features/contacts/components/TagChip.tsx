import type { Tag } from "@bondery/schemas";
import { IconCheck } from "@tabler/icons-react-native";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { hexWithAlpha } from "../../../components/color-picker/colorUtils";
import { Text } from "../../../components/ui/Text";
import { usePressSqueeze } from "../../../components/ui/usePressSqueeze";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

export type TagChipTag = Pick<Tag, "id" | "label" | "color">;

interface TagChipProps {
  accessibilityLabel?: string;
  disabled?: boolean;
  isClickable?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  tag: TagChipTag;
}

const CHIP_CLASS = "flex-row items-center gap-1.5 rounded-full px-3 py-2";

export function TagChip({
  tag,
  onPress,
  isSelected = false,
  disabled = false,
  isClickable = true,
  accessibilityLabel,
}: TagChipProps) {
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const tagColor = tag.color || colors.textMuted;
  const chipPaint = {
    backgroundColor: tag.color ? hexWithAlpha(tagColor, 0.1) : colors.surfaceMuted,
    borderColor: isSelected
      ? colors.primary
      : tag.color
        ? hexWithAlpha(tagColor, 0.4)
        : colors.borderStrong,
    borderWidth: isSelected ? 2 : 1,
    opacity: disabled ? 0.5 : 1,
  };
  const label = accessibilityLabel ?? tag.label;
  const isInteractive = isClickable && Boolean(onPress) && !disabled;

  const content = (
    <>
      <Text fw={600} numberOfLines={1} size="md" style={{ color: tagColor }}>
        {tag.label}
      </Text>
      {isSelected ? <IconCheck color={colors.primary} size={14} /> : null}
    </>
  );

  if (!isInteractive) {
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
        accessibilityState={{ disabled, selected: isSelected }}
        className={CHIP_CLASS}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (disabled) {
            return;
          }
          pressIn();
        }}
        onPressOut={pressOut}
        style={chipPaint}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}
