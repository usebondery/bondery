import { getRandomEmoji } from "@bondery/helpers/emoji";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { SearchActionSheet } from "../SearchActionSheet";
import { EmojiPickerGrid, type EmojiPickerGridRef } from "./EmojiPickerGrid";
import { useEmojiPickerFilter } from "./useEmojiPickerFilter";

interface EmojiPickerSheetProps {
  emptySearchLabel: string;
  getCategoryLabel: (categoryKey: string) => string;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
  open: boolean;
  searchPlaceholder: string;
  value: string;
}

export function EmojiPickerSheet({
  open,
  value,
  searchPlaceholder,
  emptySearchLabel,
  getCategoryLabel,
  onOpenChange,
  onSelect,
}: EmojiPickerSheetProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const [query, setQuery] = useState("");
  const gridRef = useRef<EmojiPickerGridRef>(null);
  const pendingScrollEmojiRef = useRef<string | null>(null);
  const { sections, debouncedQuery } = useEmojiPickerFilter(query);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        pendingScrollEmojiRef.current = null;
      }
    },
    [onOpenChange],
  );

  const handleGridSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      handleOpenChange(false);
    },
    [handleOpenChange, onSelect],
  );

  const queueScrollToPendingEmoji = useCallback(() => {
    const pendingEmoji = pendingScrollEmojiRef.current;
    if (!pendingEmoji) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        gridRef.current?.scrollToEmoji(pendingEmoji);
        pendingScrollEmojiRef.current = null;
      });
    });
  }, []);

  const handleRandomEmoji = useCallback(() => {
    const nextEmoji = getRandomEmoji();
    onSelect(nextEmoji);
    pendingScrollEmojiRef.current = nextEmoji;
    const hadActiveSearch = query !== "";
    setQuery("");

    if (!hadActiveSearch) {
      queueScrollToPendingEmoji();
    }
  }, [onSelect, query, queueScrollToPendingEmoji]);

  useEffect(() => {
    if (!open || debouncedQuery !== "" || !pendingScrollEmojiRef.current) {
      return;
    }

    queueScrollToPendingEmoji();
  }, [open, debouncedQuery, queueScrollToPendingEmoji]);

  const randomEmojiAction = (
    <Pressable
      accessibilityLabel={t("RandomAccessibilityLabel", { ns: "MobileEmojiPicker" })}
      accessibilityRole="button"
      onPress={handleRandomEmoji}
      style={({ pressed }) => [
        styles.randomButton,
        {
          backgroundColor: pressed ? colors.surfacePressed : colors.inputBackground,
          borderColor: colors.borderStrong,
        },
      ]}
    >
      <Text style={styles.randomButtonEmoji}>🎲</Text>
    </Pressable>
  );

  return (
    <SearchActionSheet
      elevated
      onOpenChange={handleOpenChange}
      onQueryChange={setQuery}
      open={open}
      query={query}
      searchPlaceholder={searchPlaceholder}
      searchRightAction={randomEmojiAction}
    >
      <EmojiPickerGrid
        emptySearchLabel={emptySearchLabel}
        getCategoryLabel={getCategoryLabel}
        onSelect={handleGridSelect}
        ref={gridRef}
        sections={sections}
        value={value}
      />
    </SearchActionSheet>
  );
}

const styles = StyleSheet.create({
  randomButton: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    height: MOBILE_LAYOUT.inputCompact,
    justifyContent: "center",
    width: MOBILE_LAYOUT.inputCompact,
  },
  randomButtonEmoji: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.cardTitle,
    lineHeight: MOBILE_TYPOGRAPHY.fontSize.cardTitle + 2,
    textAlign: "center",
  },
});
