import type { Contact } from "@bondery/schemas";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useCallback, useMemo } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { View } from "react-native";
import { GestureDetector, type GestureType } from "react-native-gesture-handler";
import { useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import { Stack } from "../../../components/ui/Stack";
import { Text } from "../../../components/ui/Text";
import type { SwipeAction } from "../../../lib/preferences/useMobilePreferences";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import type { ContactsFlatRow } from "../contactsFlatList";
import { ContactListItem } from "./ContactListItem";
import { ContactsSectionHeader } from "./ContactsSectionHeader";

interface ContactsScreenListProps {
  debouncedQuery: string;
  dragSelectionGesture: GestureType;
  flashListRef: React.RefObject<FlashListRef<ContactsFlatRow> | null>;
  flatRows: ContactsFlatRow[];
  handleListScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  isDragging: boolean;
  isGroupFilterActive: boolean;
  isSearchActive: boolean;
  leftSwipeAction: SwipeAction;
  myselfContactId: string | undefined;
  onExecuteAction: (contact: Contact, action: SwipeAction) => void;
  onOpenContact: (contactId: string) => void;
  onOpenMyself: () => void;
  rightSwipeAction: SwipeAction;
  rowTexts: { call: string; email: string; message: string };
  scrollBottomInset: number;
  setListViewportHeight: (height: number) => void;
  stickyHeaderIndices: number[];
}

export function ContactsScreenList({
  debouncedQuery,
  dragSelectionGesture,
  flatRows,
  flashListRef,
  handleListScroll,
  isDragging,
  isGroupFilterActive,
  isSearchActive,
  leftSwipeAction,
  myselfContactId,
  onExecuteAction,
  onOpenContact,
  onOpenMyself,
  rightSwipeAction,
  rowTexts,
  scrollBottomInset,
  setListViewportHeight,
  stickyHeaderIndices,
}: ContactsScreenListProps) {
  const tMobileContacts = useMobileContactsTranslations();

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

  const listEmpty = useMemo(() => {
    let message = tMobileContacts("Empty");
    if (debouncedQuery && isGroupFilterActive) {
      message = tMobileContacts("NoMatchSearchInGroup");
    } else if (debouncedQuery) {
      message = tMobileContacts("NoMatchSearch");
    } else if (isGroupFilterActive) {
      message = tMobileContacts("FilterEmptyGroup");
    }

    return (
      <Stack
        align="center"
        className="px-5"
        justify="center"
        style={{ paddingTop: MOBILE_LAYOUT.floatingTabBar.screenHeaderInset }}
      >
        <Text c="secondary">{message}</Text>
      </Stack>
    );
  }, [debouncedQuery, isGroupFilterActive, tMobileContacts]);

  const listExtraData = useMemo(
    () => ({
      leftSwipeAction,
      rightSwipeAction,
    }),
    [leftSwipeAction, rightSwipeAction],
  );

  const listKey = isSearchActive
    ? `search-${debouncedQuery}-${isGroupFilterActive ? "group" : "all"}`
    : isGroupFilterActive
      ? "browse-group"
      : "browse";

  return (
    <View className="flex-1" collapsable={false}>
      <GestureDetector gesture={dragSelectionGesture}>
        <View
          className="flex-1"
          collapsable={false}
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            setListViewportHeight(height);
          }}
        >
          <FlashList
            contentContainerStyle={{ paddingBottom: scrollBottomInset }}
            data={flatRows}
            extraData={listExtraData}
            getItemType={(item) => item.type}
            key={listKey}
            keyExtractor={(item) => item.key}
            ListEmptyComponent={listEmpty}
            onScroll={handleListScroll}
            ref={flashListRef}
            removeClippedSubviews={false}
            renderItem={renderFlatItem}
            scrollEnabled={!isDragging}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={isSearchActive ? undefined : stickyHeaderIndices}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
