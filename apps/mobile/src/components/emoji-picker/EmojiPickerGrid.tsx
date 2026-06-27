import { FlashList, type FlashListRef } from "@shopify/flash-list";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LIST_SCROLL, UI_TIMING_MS } from "../../lib/config";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { EMOJI_PICKER_LAYOUT, getEmojiPickerCellSize } from "./constants";
import { EmojiPickerCell } from "./EmojiPickerCell";
import { buildEmojiFlatRows, findEmojiFlatIndex, type EmojiFlatRow } from "./emojiFlatList";
import type { EmojiPickerSection } from "./useEmojiPickerFilter";

export type EmojiPickerGridRef = {
  scrollToEmoji: (emoji: string) => void;
};

interface EmojiPickerGridProps {
  sections: EmojiPickerSection[];
  value: string;
  emptySearchLabel: string;
  getCategoryLabel: (categoryKey: string) => string;
  onSelect: (emoji: string) => void;
}

export const EmojiPickerGrid = forwardRef<EmojiPickerGridRef, EmojiPickerGridProps>(
  function EmojiPickerGrid(
    { sections, value, emptySearchLabel, getCategoryLabel, onSelect },
    ref,
  ) {
    const colors = useMobileThemeColors();
    const { width: windowWidth } = useWindowDimensions();
    const cellSize = getEmojiPickerCellSize(windowWidth);
    const listRef = useRef<FlashListRef<EmojiFlatRow>>(null);
    const pendingScrollIndexRef = useRef<number | null>(null);
    const scrollRetryCountRef = useRef(0);

    const flatRows = useMemo(() => buildEmojiFlatRows(sections), [sections]);

    const scrollToEmoji = useCallback(
      (emoji: string) => {
        const index = findEmojiFlatIndex(flatRows, emoji);
        if (index === null) {
          return;
        }

        pendingScrollIndexRef.current = index;
        scrollRetryCountRef.current = 0;

        const attemptScroll = () => {
          void listRef.current
            ?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.25,
              viewOffset: 8,
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
      },
      [flatRows],
    );

    useImperativeHandle(ref, () => ({ scrollToEmoji }), [scrollToEmoji]);

    const renderFlatItem = useCallback(
      ({ item }: { item: EmojiFlatRow }) => {
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
                key={emojiItem.emoji}
                item={emojiItem}
                cellSize={cellSize}
                isSelected={value === emojiItem.emoji}
                onPress={onSelect}
              />
            ))}
          </View>
        );
      },
      [cellSize, colors.textSecondary, getCategoryLabel, onSelect, value],
    );

    const listEmpty = useMemo(
      () => (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptySearchLabel}</Text>
        </View>
      ),
      [colors.textSecondary, emptySearchLabel],
    );

    return (
      <FlashList
        ref={listRef}
        style={styles.list}
        data={flatRows}
        extraData={value}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        renderItem={renderFlatItem}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={listEmpty}
      />
    );
  },
);

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: EMOJI_PICKER_LAYOUT.gridHorizontalPadding,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeader: {
    width: "100%",
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    textAlign: "center",
  },
});
