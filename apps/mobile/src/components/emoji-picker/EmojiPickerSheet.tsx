import { getRandomEmoji } from "@bondery/helpers/emoji";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import {
  useCommonTranslations,
  useMobileEmojiPickerTranslations,
} from "@/lib/i18n/generated/hooks";
import { MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { ActionButtonShellPressable } from "../ui/ActionButtonShellPressable";
import { Sheet } from "../ui/Sheet";
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
  const tMobileEmojiPicker = useMobileEmojiPickerTranslations();
  const _t = useCommonTranslations();
  const [query, setQuery] = useState("");
  const gridRef = useRef<EmojiPickerGridRef>(null);
  const pendingScrollEmojiRef = useRef<string | null>(null);
  const { sections, debouncedQuery } = useEmojiPickerFilter(query);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    pendingScrollEmojiRef.current = null;
  }, [onOpenChange]);

  const handleGridSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      handleClose();
    },
    [handleClose, onSelect],
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
    <ActionButtonShellPressable
      accessibilityLabel={tMobileEmojiPicker("RandomAccessibilityLabel")}
      matchInputChrome
      onPress={handleRandomEmoji}
      variant="outline"
    >
      <Text style={styles.randomButtonEmoji}>🎲</Text>
    </ActionButtonShellPressable>
  );

  return (
    <Sheet
      onClose={handleClose}
      opened={open}
      search={{
        onQueryChange: setQuery,
        placeholder: searchPlaceholder,
        query,
        rightAction: randomEmojiAction,
      }}
      snapPoint="selectSearch"
      title={tMobileEmojiPicker("SheetTitle")}
    >
      <EmojiPickerGrid
        emptySearchLabel={emptySearchLabel}
        getCategoryLabel={getCategoryLabel}
        onSelect={handleGridSelect}
        ref={gridRef}
        sections={sections}
        value={value}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  randomButtonEmoji: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.cardTitle,
    lineHeight: MOBILE_TYPOGRAPHY.fontSize.cardTitle + 2,
    textAlign: "center",
  },
});
