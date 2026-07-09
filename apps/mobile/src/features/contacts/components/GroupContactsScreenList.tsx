import type { Contact } from "@bondery/schemas";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { GestureDetector, type GestureType } from "react-native-gesture-handler";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import type { SwipeAction } from "../../../lib/preferences/useMobilePreferences";
import type { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import type { ContactsFlatRow } from "../contactsFlatList";
import { AlphabetScroller } from "./AlphabetScroller";
import { ContactListItem } from "./ContactListItem";
import { ContactsSectionHeader } from "./ContactsSectionHeader";
import { groupContactsScreenStyles as styles } from "./groupContactsScreenStyles";

interface GroupContactsScreenListProps {
  colors: ReturnType<typeof useMobileThemeColors>;
  debouncedQuery: string;
  dragSelectionGesture: GestureType;
  flashListRef: React.RefObject<FlashListRef<ContactsFlatRow> | null>;
  flatRows: ContactsFlatRow[];
  isDragging: boolean;
  isSearchActive: boolean;
  leftSwipeAction: SwipeAction;
  onExecuteAction: (contact: Contact, action: SwipeAction) => void;
  onLetterChange: (letter: string) => void;
  onOpenContact: (contactId: string) => void;
  onScroll: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
  rightSwipeAction: SwipeAction;
  rowTexts: { call: string; email: string; message: string };
  scrollBottomInset: number;
  sectionLetters: string[];
  selectionMode: boolean;
  setListViewportHeight: (height: number) => void;
  stickyHeaderIndices: number[];
}

export function GroupContactsScreenList({
  colors,
  debouncedQuery,
  dragSelectionGesture,
  flatRows,
  flashListRef,
  isDragging,
  isSearchActive,
  leftSwipeAction,
  onExecuteAction,
  onLetterChange,
  onOpenContact,
  onScroll,
  rightSwipeAction,
  rowTexts,
  scrollBottomInset,
  sectionLetters,
  selectionMode,
  setListViewportHeight,
  stickyHeaderIndices,
}: GroupContactsScreenListProps) {
  const t = useMobileTranslations();

  const renderFlatItem = useCallback(
    ({ item }: { item: ContactsFlatRow }) => {
      if (item.type === "section-header") {
        return <ContactsSectionHeader title={item.title} />;
      }

      return (
        <ContactListItem
          contact={item.contact}
          isMyselfRow={false}
          isSwipeEnabled={!selectionMode && item.sectionKind !== "search"}
          leftSwipeAction={leftSwipeAction}
          onExecuteAction={onExecuteAction}
          onOpenContact={onOpenContact}
          onOpenMyself={() => {}}
          rightSwipeAction={rightSwipeAction}
          texts={rowTexts}
        />
      );
    },
    [leftSwipeAction, onExecuteAction, onOpenContact, rightSwipeAction, rowTexts, selectionMode],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.centeredState}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {debouncedQuery
            ? t("NoMatchSearch", { ns: "MobileContacts" })
            : t("Empty", { ns: "MobileContacts" })}
        </Text>
      </View>
    ),
    [colors.textMuted, debouncedQuery, t],
  );

  const listExtraData = useMemo(
    () => ({
      leftSwipeAction,
      rightSwipeAction,
      selectionMode,
    }),
    [leftSwipeAction, rightSwipeAction, selectionMode],
  );

  return (
    <View style={styles.listContainer}>
      <GestureDetector gesture={dragSelectionGesture}>
        <View
          onLayout={(event) => {
            setListViewportHeight(event.nativeEvent.layout.height);
          }}
          style={styles.listGestureTarget}
        >
          <FlashList
            contentContainerStyle={{ paddingBottom: scrollBottomInset }}
            data={flatRows}
            extraData={listExtraData}
            getItemType={(item) => item.type}
            key={isSearchActive ? `search-${debouncedQuery}` : "browse"}
            keyExtractor={(item) => item.key}
            ListEmptyComponent={listEmpty}
            onScroll={onScroll}
            ref={flashListRef}
            renderItem={renderFlatItem}
            scrollEnabled={!isDragging}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={isSearchActive ? undefined : stickyHeaderIndices}
          />
        </View>
      </GestureDetector>

      {!isSearchActive ? (
        <AlphabetScroller letters={sectionLetters} onLetterChange={onLetterChange} />
      ) : null}
    </View>
  );
}
