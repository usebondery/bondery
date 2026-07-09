import type { Tag } from "@bondery/schemas";
import { IconCheck } from "@tabler/icons-react-native";
import { StyleSheet, Text, View } from "react-native";
import { hexWithAlpha } from "../../../components/color-picker/colorUtils";
import { Tappable } from "../../../theme/Tappable";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
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

export function TagChip({
  tag,
  onPress,
  isSelected = false,
  disabled = false,
  isClickable = true,
  accessibilityLabel,
}: TagChipProps) {
  const colors = useMobileThemeColors();
  const tagColor = tag.color || colors.textMuted;
  const backgroundColor = tag.color ? hexWithAlpha(tagColor, 0.1) : colors.surfaceMuted;
  const borderColor = isSelected
    ? colors.primary
    : tag.color
      ? hexWithAlpha(tagColor, 0.4)
      : colors.borderStrong;
  const chipStyle = [
    styles.tagChip,
    {
      backgroundColor,
      borderColor,
      borderWidth: isSelected ? 2 : 1,
      opacity: disabled ? 0.5 : 1,
    },
  ];
  const label = accessibilityLabel ?? tag.label;
  const isInteractive = isClickable && Boolean(onPress) && !disabled;

  const content = (
    <>
      <Text numberOfLines={1} style={[styles.tagLabel, { color: tagColor }]}>
        {tag.label}
      </Text>
      {isSelected ? <IconCheck color={colors.primary} size={14} /> : null}
    </>
  );

  if (!isInteractive) {
    return (
      <View accessibilityLabel={label} accessibilityRole="text" style={chipStyle}>
        {content}
      </View>
    );
  }

  return (
    <Tappable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isSelected }}
      onPress={onPress}
      style={chipStyle}
      variant="subtle"
    >
      {content}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  tagChip: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
