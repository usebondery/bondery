import { MOBILE_OPACITY } from "../../lib/config";
import { colorWithAlpha } from "../../lib/color";
import { Pressable, StyleSheet, Text } from "react-native";
import type { EmojiData } from "@bondery/helpers/emoji";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { EMOJI_PICKER_LAYOUT } from "./constants";

interface EmojiPickerCellProps {
  item: EmojiData;
  cellSize: number;
  isSelected: boolean;
  onPress: (emoji: string) => void;
}

export function EmojiPickerCell({ item, cellSize, isSelected, onPress }: EmojiPickerCellProps) {
  const colors = useMobileThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.keywords[0] ?? item.emoji}
      accessibilityState={{ selected: isSelected }}
      onPress={() => onPress(item.emoji)}
      hitSlop={EMOJI_PICKER_LAYOUT.cellHitSlop}
      style={({ pressed }) => [
        styles.cell,
        {
          width: cellSize,
          height: cellSize,
          backgroundColor: pressed
            ? colors.surfacePressed
            : isSelected
              ? colorWithAlpha(colors.primary, MOBILE_OPACITY.selectedTint)
              : "transparent",
          borderColor: isSelected ? colors.primary : "transparent",
        },
      ]}
    >
      <Text style={styles.emoji}>{item.emoji}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: EMOJI_PICKER_LAYOUT.cellBorderWidth,
  },
  emoji: {
    fontSize: EMOJI_PICKER_LAYOUT.gridEmojiFontSize,
    lineHeight: EMOJI_PICKER_LAYOUT.gridEmojiFontSize + 4,
    textAlign: "center",
  },
});
