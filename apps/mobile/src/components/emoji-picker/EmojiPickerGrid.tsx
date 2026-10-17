import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LIST_SCROLL, UI_TIMING_MS } from "../../lib/config";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { useSheetScrollable } from "../ui/Sheet";
import { EMOJI_PICKER_LAYOUT, getEmojiPickerCellSize } from "./constants";
import { EmojiPickerCell } from "./EmojiPickerCell";
import { buildEmojiFlatRows, type EmojiFlatRow, findEmojiFlatIndex } from "./emojiFlatList";
import type { EmojiPickerSection } from "./useEmojiPickerFilter";

export type EmojiPickerGridRef = {
  scrollToEmoji: (emoji: string) => void;
};

interface EmojiPickerGridProps {
  emptySearchLabel: string;
  getCategoryLabel: (categoryKey: string) => string;
  onSelect: (emoji: string) => void;
  sections: EmojiPickerSection[];
  value: string;
}

export const EmojiPickerGrid = forwardRef<EmojiPickerGridRef, EmojiPickerGridProps>(
  function EmojiPickerGrid({ sections, value, emptySearchLabel, getCategoryLabel, onSelect }, ref) {
    const colors = useMobileThemeColors();
    const { width: windowWidth } = useWindowDimensions();
    const cellSize = getEmojiPickerCellSize(windowWidth);
    const renderScrollComponent = useSheetScrollable();
    const listRef = useRef<FlashListRef<EmojiFlatRow>>(null);
    const pendingScrollIndexRef = useRef<number | null>(null);
    const scrollRetryCountRef = useRef(0);

    const flatRows = buildEmojiFlatRows(sections);

    function scrollToEmoji(emoji: string) {
      const index = findEmojiFlatIndex(flatRows, emoji);
      if (index === null) {
        return;
      }

      pendingScrollIndexRef.current = index;
      scrollRetryCountRef.current = 0;

      const attemptScroll = () => {
        void listRef.current
          ?.scrollToIndex({
            animated: true,
            index,
            viewOffset: 8,
            viewPosition: 0.25,
          })
          .catch(() => {
            if (
              pendingScrollIndexRef.current !== index ||
              scrollRetryCountRef.current >= LIST_SCROLL.maxRetries
            ) {
              return;
            }

            scrollRetryCountRef.current += 1;
            setTimeout(attemptScroll, UI_TIMING_MS.scrollRetryDelay);
          });
      };

      requestAnimationFrame(attemptScroll);
    }

    useImperativeHandle(ref, () => ({ scrollToEmoji }));

    function renderFlatItem({ item }: { item: EmojiFlatRow }) {
      if (item.type === "header") {
        return (
          <Text
            accessibilityRole="header"
            style={[styles.sectionHeader, { color: colors.textSecondary }]}
          >
            {getCategoryLabel(item.categoryKey)}
          </Text>
        );
      }

      return (
        <View style={[styles.row, { gap: EMOJI_PICKER_LAYOUT.gridGap }]}>
          {item.items.map((emojiItem) => (
            <EmojiPickerCell
              cellSize={cellSize}
              isSelected={value === emojiItem.emoji}
              item={emojiItem}
              key={emojiItem.emoji}
              onPress={onSelect}
            />
          ))}
        </View>
      );
    }

    const listEmpty = (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptySearchLabel}</Text>
      </View>
    );

    return (
      <FlashList
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.listContent}
        data={flatRows}
        extraData={value}
        getItemType={(item) => item.type}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.key}
        ListEmptyComponent={listEmpty}
        ref={listRef}
        renderItem={renderFlatItem}
        renderScrollComponent={renderScrollComponent}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    );
  },
);

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    paddingHorizontal: EMOJI_PICKER_LAYOUT.gridHorizontalPadding,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
  },
  sectionHeader: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
    paddingBottom: 4,
    paddingHorizontal: 4,
    paddingTop: 8,
    width: "100%",
  },
});
