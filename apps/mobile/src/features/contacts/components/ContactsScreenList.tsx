import type { Contact, GroupWithCount } from "@bondery/schemas";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureDetector, type GestureType } from "react-native-gesture-handler";
import { useCommonTranslations, useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import type { SwipeAction } from "../../../lib/preferences/useMobilePreferences";
import type { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import type { ContactsFlatRow } from "../contactsFlatList";
import { AlphabetScroller } from "./AlphabetScroller";
import { ContactListItem } from "./ContactListItem";
import { ContactsGroupsHeader } from "./ContactsGroupsHeader";
import { ContactsSectionHeader } from "./ContactsSectionHeader";
import { contactsScreenStyles as styles } from "./contactsScreenStyles";

interface ContactsScreenListProps {
  colors: ReturnType<typeof useMobileThemeColors>;
  debouncedQuery: string;
  dragSelectionGesture: GestureType;
  flashListRef: React.RefObject<FlashListRef<ContactsFlatRow> | null>;
  flatRows: ContactsFlatRow[];
  handleEndReached: () => void;
  handleListScroll: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
  isDragging: boolean;
  isLoadingMore: boolean;
  isSearchActive: boolean;
  leftSwipeAction: SwipeAction;
  myselfContactId: string | undefined;
  onCreateGroupPress: () => void;
  onExecuteAction: (contact: Contact, action: SwipeAction) => void;
  onGroupPress: (group: GroupWithCount) => void;
  onLetterChange: (letter: string) => void;
  onOpenContact: (contactId: string) => void;
  onOpenMyself: () => void;
  rightSwipeAction: SwipeAction;
  rowTexts: { call: string; email: string; message: string };
  scrollBottomInset: number;
  sectionLetters: string[];
  selectionMode: boolean;
  setListHeaderHeight: (height: number) => void;
  setListViewportHeight: (height: number) => void;
  sortedGroups: GroupWithCount[];
  stickyHeaderIndices: number[];
}

export function ContactsScreenList({
  colors,
  debouncedQuery,
  dragSelectionGesture,
  flatRows,
  flashListRef,
  handleEndReached,
  handleListScroll,
  isDragging,
  isLoadingMore,
  isSearchActive,
  leftSwipeAction,
  myselfContactId,
  onCreateGroupPress,
  onExecuteAction,
  onGroupPress,
  onLetterChange,
  onOpenContact,
  onOpenMyself,
  rightSwipeAction,
  rowTexts,
  scrollBottomInset,
  sectionLetters,
  selectionMode,
  setListHeaderHeight,
  setListViewportHeight,
  sortedGroups,
  stickyHeaderIndices,
}: ContactsScreenListProps) {
  const tMobileContacts = useMobileContactsTranslations();
  const _t = useCommonTranslations();

  const renderFlatItem = useCallback(
    ({ item }: { item: ContactsFlatRow }) => {
      if (item.type === "section-header") {
        return <ContactsSectionHeader title={item.title} />;
      }

      return (
        <ContactListItem
          contact={item.contact}
          isMyselfRow={
            item.sectionKind === "myself" ||
            (item.sectionKind === "search" && item.contact.id === myselfContactId)
          }
          isSwipeEnabled={item.sectionKind !== "search"}
          leftSwipeAction={leftSwipeAction}
          onExecuteAction={onExecuteAction}
          onOpenContact={onOpenContact}
          onOpenMyself={onOpenMyself}
          rightSwipeAction={rightSwipeAction}
          texts={rowTexts}
        />
      );
    },
    [
      leftSwipeAction,
      myselfContactId,
      onExecuteAction,
      onOpenContact,
      onOpenMyself,
      rightSwipeAction,
      rowTexts,
    ],
  );

  const listHeader = useMemo(
    () => (
      <View
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          setListHeaderHeight(height);
        }}
      >
        <ContactsGroupsHeader
          groups={sortedGroups}
          isDisabled={selectionMode}
          onCreatePress={onCreateGroupPress}
          onGroupPress={onGroupPress}
          title={tMobileContacts("Groups")}
        />
      </View>
    ),
    [
      onCreateGroupPress,
      onGroupPress,
      selectionMode,
      setListHeaderHeight,
      sortedGroups,
      tMobileContacts,
    ],
  );

  const listFooter = useMemo(
    () =>
      isLoadingMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={colors.textPrimary} size="small" />
        </View>
      ) : null,
    [colors.textPrimary, isLoadingMore],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.centeredState}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {debouncedQuery ? tMobileContacts("NoMatchSearch") : tMobileContacts("Empty")}
        </Text>
      </View>
    ),
    [colors.textSecondary, debouncedQuery, tMobileContacts],
  );

  const listExtraData = useMemo(
    () => ({
      leftSwipeAction,
      rightSwipeAction,
    }),
    [leftSwipeAction, rightSwipeAction],
  );

  return (
    <View style={styles.listContainer}>
      <GestureDetector gesture={dragSelectionGesture}>
        <View
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            setListViewportHeight(height);
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
            ListFooterComponent={listFooter}
            ListHeaderComponent={isSearchActive ? null : listHeader}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            onScroll={handleListScroll}
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
