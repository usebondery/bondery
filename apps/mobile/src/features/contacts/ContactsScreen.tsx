import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import { IconSearch } from "@tabler/icons-react-native";
import type { Contact, Group, GroupWithCount } from "@bondery/schemas";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MobileTextInput } from "../../components/MobileTextInput";
import {
  LoadErrorCard,
  loadErrorTabRootInset,
} from "../../components/load-state";
import {
  fetchContacts,
  fetchGroups,
  fetchMyselfContact,
} from "../../lib/api/client";
import {
  CONTACTS_PAGE_SIZE,
  DEBOUNCE_MS,
  LIST_SCROLL,
  UI_TIMING_MS,
} from "../../lib/config";
import { useDebouncedValue } from "../../lib/hooks/useDebouncedValue";
import { useContactsStore, useGroupsStore } from "../../lib/store";
import {
  MobilePreferencesState,
  SwipeAction,
  useMobilePreferences,
} from "../../lib/preferences/useMobilePreferences";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../lib/toast/useAppToast";
import { useFabSpeedDialScrollDismiss } from "../navigation/useFabSpeedDialScrollDismiss";
import { useCreateContactSheet } from "./createContactSheetContext";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { AlphabetScroller } from "./components/AlphabetScroller";
import { ContactListItem } from "./components/ContactListItem";
import { ContactsGroupsHeader } from "./components/ContactsGroupsHeader";
import { ContactsScreenHeader } from "./components/ContactsScreenHeader";
import { ContactsSectionHeader } from "./components/ContactsSectionHeader";
import { ContactsSelectionBackHandler } from "./components/ContactsSelectionBackHandler";
import { ContactsSelectionChromeRegistrar } from "./components/ContactsSelectionChromeRegistrar";
import { ContactsSelectionDialogs } from "./components/ContactsSelectionDialogs";
import { ContactsAddToGroupsSheet } from "./components/ContactsAddToGroupsSheet";
import { GroupEditSheet } from "./components/GroupEditSheet";
import { useContactsSelectionMode } from "./contactsSelectionStore";
import {
  contactMatchesQuery,
  formatContactName,
  getContactInitial,
} from "./contactUtils";
import { executeContactSwipeAction } from "./contactSwipeActions";
import {
  buildContactsFlatRows,
  type ContactSection,
  type ContactsFlatRow,
} from "./contactsFlatList";
import { sortGroups } from "./groupSort";
import { useContactsDragSelection } from "./hooks/useContactsDragSelection";
import { useContactsSelectionListSync } from "./hooks/useContactsSelectionListSync";
import { useNavigateToGroup } from "./hooks/useNavigateToGroup";

export function ContactsScreen() {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();
  const router = useRouter();
  const navigateToGroup = useNavigateToGroup();
  const { refresh } = useLocalSearchParams<{ refresh?: string | string[] }>();
  const refreshKey = Array.isArray(refresh) ? refresh[0] : refresh;
  const { contactsListVersion } = useCreateContactSheet();
  const { onScroll: fabScrollDismiss } = useFabSpeedDialScrollDismiss();
  const flashListRef = useRef<FlashListRef<ContactsFlatRow>>(null);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const scrollRetryCountRef = useRef(0);
  const latestRequestRef = useRef(0);
  const shouldShowInitialLoaderRef = useRef(true);
  const [listContactIds, setListContactIds] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebouncedValue(
    searchInput.trim(),
    DEBOUNCE_MS.search,
  );
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listHeaderHeight, setListHeaderHeight] = useState(0);
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const [isCreateGroupOpen, setCreateGroupOpen] = useState(false);
  const contactsById = useContactsStore((state) => state.byId);
  const myselfContactId = useContactsStore(
    (state) => state.myselfContactId ?? undefined,
  );
  const isListStale = useContactsStore((state) => state.isListStale);
  const clearListStale = useContactsStore((state) => state.clearListStale);
  const upsertContact = useContactsStore((state) => state.upsertContact);
  const upsertContacts = useContactsStore((state) => state.upsertContacts);
  const groupsById = useGroupsStore((state) => state.byId);
  const upsertGroup = useGroupsStore((state) => state.upsertGroup);
  const upsertGroups = useGroupsStore((state) => state.upsertGroups);
  const selectionMode = useContactsSelectionMode();
  const leftSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.leftSwipeAction,
  );
  const rightSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.rightSwipeAction,
  );
  const groupSortOrder = useMobilePreferences(
    (state: MobilePreferencesState) => state.groupSortOrder,
  );
  const groupLastOpenedAt = useMobilePreferences(
    (state: MobilePreferencesState) => state.groupLastOpenedAt,
  );

  const groups = useMemo(() => Object.values(groupsById), [groupsById]);
  const sortedGroups = useMemo(
    () => sortGroups(groups, groupSortOrder, groupLastOpenedAt),
    [groups, groupSortOrder, groupLastOpenedAt],
  );
  const contacts = useMemo(
    () =>
      listContactIds
        .map((contactId) => contactsById[contactId])
        .filter((contact): contact is Contact => Boolean(contact)),
    [contactsById, listContactIds],
  );
  const myselfContact = useMemo(
    () => (myselfContactId ? contactsById[myselfContactId] ?? null : null),
    [contactsById, myselfContactId],
  );

  const rowTexts = useMemo(
    () => ({
      call: t("MobileApp.Common.Call"),
      message: t("MobileApp.Common.Message"),
      email: t("MobileApp.Common.Email"),
    }),
    [t],
  );

  const fetchContactsPage = useCallback(
    async ({
      query,
      offset,
      append = false,
      showInitialLoader = false,
    }: {
      query: string;
      offset: number;
      append?: boolean;
      showInitialLoader?: boolean;
    }) => {
      const requestId = ++latestRequestRef.current;

      if (showInitialLoader) {
        setLoading(true);
      } else if (!append) {
        setIsSearching(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      try {
        const contactsResponse = await fetchContacts({
          query,
          sort: "nameAsc",
          limit: CONTACTS_PAGE_SIZE,
          offset,
        });

        if (requestId !== latestRequestRef.current) {
          return;
        }

        const fetchedContacts = contactsResponse.contacts || [];
        setTotalCount(
          Number.isFinite(contactsResponse.totalCount)
            ? contactsResponse.totalCount
            : fetchedContacts.length,
        );

        if (append) {
          upsertContacts(fetchedContacts);
          setListContactIds((current) => {
            const existingIds = new Set(current);
            const uniqueNewIds = fetchedContacts
              .map((contact) => contact.id)
              .filter((contactId) => !existingIds.has(contactId));
            return [...current, ...uniqueNewIds];
          });
        } else {
          upsertContacts(fetchedContacts);
          setListContactIds(fetchedContacts.map((contact) => contact.id));
        }
      } catch (loadError) {
        if (requestId !== latestRequestRef.current) {
          return;
        }

        const errorMessage =
          loadError instanceof Error
            ? loadError.message
            : t("MobileApp.Common.UnknownError");
        setError(errorMessage);
      } finally {
        if (requestId === latestRequestRef.current) {
          setLoading(false);
          setIsSearching(false);
          setIsLoadingMore(false);
        }
      }
    },
    [t, upsertContacts],
  );

  const loadMyselfContact = useCallback(async () => {
    try {
      const myselfResponse = await fetchMyselfContact();
      if (myselfResponse?.contact) {
        upsertContact(myselfResponse.contact);
      }
    } catch {
      // Keep existing value on transient failures.
    }
  }, [upsertContact]);

  const reloadGroups = useCallback(async () => {
    try {
      const groupsRes = await fetchGroups();
      upsertGroups(groupsRes.groups || []);
    } catch {
      // Keep existing groups on refresh failure.
    }
  }, [upsertGroups]);

  useEffect(() => {
    shouldShowInitialLoaderRef.current = true;
  }, [refreshKey, contactsListVersion]);

  useEffect(() => {
    void loadMyselfContact();
    void fetchContactsPage({
      query: debouncedQuery,
      offset: 0,
      showInitialLoader: shouldShowInitialLoaderRef.current,
    });
    shouldShowInitialLoaderRef.current = false;
  }, [
    refreshKey,
    contactsListVersion,
    debouncedQuery,
    fetchContactsPage,
    loadMyselfContact,
  ]);

  useEffect(() => {
    void reloadGroups();
  }, [reloadGroups]);

  useFocusEffect(
    useCallback(() => {
      if (!isListStale) {
        return;
      }

      clearListStale();
      void fetchContactsPage({
        query: debouncedQuery,
        offset: 0,
        showInitialLoader: false,
      });
    }, [clearListStale, debouncedQuery, fetchContactsPage, isListStale]),
  );

  useContactsSelectionListSync({
    contacts,
    totalCount,
    myselfContactId,
  });

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (value.trim() !== debouncedQuery) {
        setIsSearching(true);
      }
    },
    [debouncedQuery],
  );

  const filteredMyselfContact = useMemo(() => {
    if (!myselfContact) {
      return null;
    }

    return contactMatchesQuery(myselfContact, debouncedQuery)
      ? myselfContact
      : null;
  }, [myselfContact, debouncedQuery]);

  const myselfSectionTitle = t("MobileApp.Contacts.Myself");

  const alphabetSections = useMemo<ContactSection[]>(() => {
    const grouped = new Map<string, Contact[]>();

    contacts.forEach((contact) => {
      const initial = getContactInitial(contact);
      const letter = /^[A-Z]$/.test(initial) ? initial : "#";
      const bucket = grouped.get(letter) || [];
      bucket.push(contact);
      grouped.set(letter, bucket);
    });

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([title, data]) => ({
        title,
        kind: "alphabet" as const,
        data: [...data].sort((left, right) =>
          formatContactName(left).localeCompare(formatContactName(right)),
        ),
      }));
  }, [contacts]);

  const sections = useMemo<ContactSection[]>(() => {
    if (debouncedQuery) {
      const searchData = filteredMyselfContact
        ? [
            filteredMyselfContact,
            ...contacts.filter(
              (contact) => contact.id !== filteredMyselfContact.id,
            ),
          ]
        : contacts;

      return [
        {
          title: "",
          kind: "search",
          data: searchData,
        },
      ];
    }

    if (!filteredMyselfContact) {
      return alphabetSections;
    }

    return [
      {
        title: myselfSectionTitle,
        kind: "myself",
        data: [filteredMyselfContact],
      },
      ...alphabetSections,
    ];
  }, [
    alphabetSections,
    contacts,
    debouncedQuery,
    filteredMyselfContact,
    myselfSectionTitle,
  ]);

  const sectionLetters = useMemo(
    () => alphabetSections.map((section) => section.title),
    [alphabetSections],
  );

  const {
    rows: flatRows,
    stickyHeaderIndices,
    letterToIndex,
  } = useMemo(() => buildContactsFlatRows(sections), [sections]);

  const hasMoreContacts = listContactIds.length < totalCount;
  const isSearchActive = debouncedQuery.length > 0;

  const {
    gesture: dragSelectionGesture,
    isDragging,
    onScroll,
  } = useContactsDragSelection({
    // Match GroupContactsScreen: drag-to-select only after long-press enters selection
    // mode. Enabling it earlier steals the long press and updates selectedIds without
    // activating isSelectionSessionActive.
    enabled: selectionMode && !isSearchActive,
    flatRows,
    myselfContactId,
    listHeaderHeight: isSearchActive ? 0 : listHeaderHeight,
    listViewportHeight,
    flashListRef,
  });

  const handleListScroll = useCallback(
    (event: Parameters<NonNullable<typeof onScroll>>[0]) => {
      onScroll(event);
      fabScrollDismiss(event);
    },
    [fabScrollDismiss, onScroll],
  );

  const executeAction = useCallback(
    (contact: Contact, action: SwipeAction) => {
      executeContactSwipeAction(contact, action, showToast, {
        missingPhone: t("MobileApp.Contacts.MissingPhone"),
        missingEmail: t("MobileApp.Contacts.MissingEmail"),
        errorTitle: t("MobileApp.Common.ErrorTitle"),
      });
    },
    [showToast, t],
  );

  const handleOpenContact = useCallback(
    (contactId: string) => {
      router.push({ pathname: "/contact/[id]", params: { id: contactId } });
    },
    [router],
  );

  const handleOpenMyself = useCallback(() => {
    router.push("/myself");
  }, [router]);

  const handleGroupPress = useCallback(
    (group: GroupWithCount) => {
      navigateToGroup(group);
    },
    [navigateToGroup],
  );

  const handleGroupCreated = useCallback(
    (group: Group) => {
      upsertGroup(group);
      navigateToGroup(group);
    },
    [navigateToGroup, upsertGroup],
  );

  const reloadContacts = useCallback(async () => {
    await Promise.all([
      fetchContactsPage({ query: debouncedQuery, offset: 0 }),
      loadMyselfContact(),
    ]);
  }, [debouncedQuery, fetchContactsPage, loadMyselfContact]);

  const handleEndReached = useCallback(() => {
    if (!hasMoreContacts || isLoadingMore || isSearching || loading) {
      return;
    }

    void fetchContactsPage({
      query: debouncedQuery,
      offset: listContactIds.length,
      append: true,
    });
  }, [
    debouncedQuery,
    fetchContactsPage,
    hasMoreContacts,
    isLoadingMore,
    isSearching,
    listContactIds.length,
    loading,
  ]);

  const scrollToFlatIndex = useCallback((index: number) => {
    pendingScrollIndexRef.current = index;
    scrollRetryCountRef.current = 0;

    const attemptScroll = () => {
      void flashListRef.current
        ?.scrollToIndex({
          index,
          animated: false,
          viewOffset: 0,
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

    attemptScroll();
  }, []);

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
            (item.sectionKind === "search" &&
              item.contact.id === myselfContactId)
          }
          isSwipeEnabled={item.sectionKind !== "search"}
          leftSwipeAction={leftSwipeAction}
          rightSwipeAction={rightSwipeAction}
          texts={rowTexts}
          onExecuteAction={executeAction}
          onOpenContact={handleOpenContact}
          onOpenMyself={handleOpenMyself}
        />
      );
    },
    [
      executeAction,
      handleOpenContact,
      handleOpenMyself,
      leftSwipeAction,
      rightSwipeAction,
      rowTexts,
      myselfContactId,
    ],
  );

  const listHeader = useMemo(
    () => (
      <View
        onLayout={(event) => {
          setListHeaderHeight(event.nativeEvent.layout.height);
        }}
      >
        <ContactsGroupsHeader
          groups={sortedGroups}
          title={t("MobileApp.Contacts.Groups")}
          isDisabled={selectionMode}
          onGroupPress={handleGroupPress}
          onCreatePress={() => setCreateGroupOpen(true)}
        />
      </View>
    ),
    [handleGroupPress, selectionMode, sortedGroups, t],
  );

  const listFooter = useMemo(
    () =>
      isLoadingMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
        </View>
      ) : null,
    [colors.textPrimary, isLoadingMore],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.centeredState}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {debouncedQuery
            ? t("MobileApp.Contacts.NoMatchSearch")
            : t("MobileApp.Contacts.Empty")}
        </Text>
      </View>
    ),
    [colors.textSecondary, debouncedQuery, t],
  );

  const listExtraData = useMemo(
    () => ({
      leftSwipeAction,
      rightSwipeAction,
    }),
    [leftSwipeAction, rightSwipeAction],
  );

  const handleLetterChange = useCallback(
    (letter: string) => {
      const targetIndex = letterToIndex.get(letter);

      if (targetIndex !== undefined) {
        scrollToFlatIndex(targetIndex);
      }
    },
    [letterToIndex, scrollToFlatIndex],
  );

  const showFullScreenLoader = loading && contacts.length === 0;
  const listBottomInset = selectionMode
    ? MOBILE_LAYOUT.floatingTabBar.selectionBarInset +
      Math.max(insets.bottom, 8)
    : 24;

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <ContactsSelectionChromeRegistrar />
      <ContactsSelectionBackHandler />
      <ContactsScreenHeader
        accessory={
          <MobileTextInput
            value={searchInput}
            onChangeText={handleSearchChange}
            placeholder={t("MobileApp.Contacts.SearchPlaceholder")}
            autoCapitalize="none"
            autoCorrect={false}
            unfocusedBorderColor={colors.borderStrong}
            backgroundColor={colors.surfaceMuted}
            leadingIcon={<IconSearch size={16} stroke={colors.iconSecondary} />}
            style={styles.searchInput}
            trailingAccessory={
              isSearching ? (
                <View style={styles.searchSpinner}>
                  <ActivityIndicator size="small" color={colors.textMuted} />
                </View>
              ) : (
                <View style={styles.searchSpinner} />
              )
            }
          />
        }
      />

      {showFullScreenLoader ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : null}

      {!showFullScreenLoader && error ? (
        <View style={loadErrorTabRootInset}>
          <LoadErrorCard
            title={t("MobileApp.Settings.LoadErrorTitle")}
            description={error}
            onRetry={() => {
              void reloadContacts();
            }}
          />
        </View>
      ) : null}

      {!showFullScreenLoader && !error ? (
        <View style={styles.listContainer}>
          <GestureDetector gesture={dragSelectionGesture}>
            <View
              style={styles.listGestureTarget}
              onLayout={(event) => {
                setListViewportHeight(event.nativeEvent.layout.height);
              }}
            >
              <FlashList
                key={isSearchActive ? `search-${debouncedQuery}` : "browse"}
                ref={flashListRef}
                data={flatRows}
                extraData={listExtraData}
                keyExtractor={(item) => item.key}
                getItemType={(item) => item.type}
                renderItem={renderFlatItem}
                onScroll={handleListScroll}
                scrollEventThrottle={16}
                scrollEnabled={!isDragging}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.4}
                stickyHeaderIndices={
                  isSearchActive ? undefined : stickyHeaderIndices
                }
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={isSearchActive ? null : listHeader}
                ListEmptyComponent={listEmpty}
                ListFooterComponent={listFooter}
                contentContainerStyle={{ paddingBottom: listBottomInset }}
              />
            </View>
          </GestureDetector>

          {!isSearchActive ? (
            <AlphabetScroller
              letters={sectionLetters}
              onLetterChange={handleLetterChange}
            />
          ) : null}
        </View>
      ) : null}

      <ContactsSelectionDialogs
        debouncedQuery={debouncedQuery}
        onContactsReloaded={reloadContacts}
      />
      <ContactsAddToGroupsSheet
        groups={sortedGroups}
        debouncedQuery={debouncedQuery}
        onGroupsReloaded={reloadGroups}
      />
      <GroupEditSheet
        mode="create"
        open={isCreateGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onCreated={handleGroupCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchInput: {
    paddingVertical: 10,
  },
  searchSpinner: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    flex: 1,
  },
  listGestureTarget: {
    flex: 1,
  },
  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: MOBILE_LAYOUT.floatingTabBar.screenHeaderInset,
    paddingHorizontal: 20,
  },
  emptyText: {},
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
