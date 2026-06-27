import { IconCheck } from "@tabler/icons-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { Tag } from "@bondery/schemas";
import { hexWithAlpha } from "../../../components/color-picker/colorUtils";
import { Tappable } from "../../../theme/Tappable";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

export type TagChipTag = Pick<Tag, "id" | "label" | "color">;

interface TagChipProps {
  tag: TagChipTag;
  onPress?: () => void;
  isSelected?: boolean;
  disabled?: boolean;
  isClickable?: boolean;
  accessibilityLabel?: string;
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
      <Text style={[styles.tagLabel, { color: tagColor }]} numberOfLines={1}>
        {tag.label}
      </Text>
      {isSelected ? <IconCheck size={14} color={colors.primary} /> : null}
    </>
  );

  if (!isInteractive) {
    return (
      <View accessibilityRole="text" accessibilityLabel={label} style={chipStyle}>
        {content}
      </View>
    );
  }

  return (
    <Tappable
      variant="subtle"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected, disabled }}
      onPress={onPress}
      style={chipStyle}
    >
      {content}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
