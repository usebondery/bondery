import type { EmojiData } from "@bondery/helpers/emoji";
import { Pressable, StyleSheet, Text } from "react-native";
import { colorWithAlpha } from "../../lib/color";
import { MOBILE_OPACITY } from "../../lib/config";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { EMOJI_PICKER_LAYOUT } from "./constants";

interface EmojiPickerCellProps {
  cellSize: number;
  isSelected: boolean;
  item: EmojiData;
  onPress: (emoji: string) => void;
}

export function EmojiPickerCell({ item, cellSize, isSelected, onPress }: EmojiPickerCellProps) {
  const colors = useMobileThemeColors();

  return (
    <Pressable
      accessibilityLabel={item.keywords[0] ?? item.emoji}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      hitSlop={EMOJI_PICKER_LAYOUT.cellHitSlop}
      onPress={() => onPress(item.emoji)}
      style={({ pressed }) => [
        styles.cell,
        {
          backgroundColor: pressed
            ? colors.surfacePressed
            : isSelected
              ? colorWithAlpha(colors.primary, MOBILE_OPACITY.selectedTint)
              : "transparent",
          borderColor: isSelected ? colors.primary : "transparent",
          height: cellSize,
          width: cellSize,
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
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: EMOJI_PICKER_LAYOUT.cellBorderWidth,
    justifyContent: "center",
  },
  emoji: {
    fontSize: EMOJI_PICKER_LAYOUT.gridEmojiFontSize,
    lineHeight: EMOJI_PICKER_LAYOUT.gridEmojiFontSize + 4,
    textAlign: "center",
  },
});
