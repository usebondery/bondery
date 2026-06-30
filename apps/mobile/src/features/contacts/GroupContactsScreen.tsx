import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import {
  IconCopy,
  IconSearch,
  IconUsersMinus,
} from "@tabler/icons-react-native";
import type { Contact, Group } from "@bondery/schemas";
import { ContactsSelectionActionBar } from "../../components/ContactsSelectionActionBar";
import { ActionSheetPopup } from "../../components/ActionSheetPopup";
import { MobileTextInput } from "../../components/MobileTextInput";
import {
  LoadErrorCard,
  loadErrorTabRootInset,
} from "../../components/load-state";
import { useScrollBottomInset } from "../../components/chrome";
import { GroupContactsScreenHeader } from "./components/GroupContactsScreenHeader";
import { GroupEditSheet } from "./components/GroupEditSheet";
import { GroupDeleteDialog } from "./components/GroupDeleteDialog";
import { groupsDomain } from "../../lib/domains/groups";
import { useGroups } from "../../lib/sync/hooks/useSyncQuery";
import { useSync } from "../../lib/sync/SyncProvider";
import {
  DEBOUNCE_MS,
  GROUP_CONTACTS_FETCH_LIMIT,
  LIST_SCROLL,
  UI_TIMING_MS,
} from "../../lib/config";
import { useDebouncedValue } from "../../lib/hooks/useDebouncedValue";
import {
  MobilePreferencesState,
  SwipeAction,
  useMobilePreferences,
} from "../../lib/preferences/useMobilePreferences";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../lib/toast/useAppToast";
import { floatingBarStyles } from "../../theme/floatingBarStyles";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { AlphabetScroller } from "./components/AlphabetScroller";
import { ContactListItem } from "./components/ContactListItem";
import { ContactsAddToGroupsSheet } from "./components/ContactsAddToGroupsSheet";
import { ContactsSectionHeader } from "./components/ContactsSectionHeader";
import { ContactsSelectionBackHandler } from "./components/ContactsSelectionBackHandler";
import { ContactsSelectionDialogs } from "./components/ContactsSelectionDialogs";
import { GroupContactsRemoveFromGroupDialog } from "./components/GroupContactsRemoveFromGroupDialog";
import {
  useContactsEffectiveSelectedCount,
  useContactsSelection,
  useContactsSelectionMode,
} from "./contactsSelectionStore";
import { formatContactName, getContactInitial } from "./contactUtils";
import { executeContactSwipeAction } from "./contactSwipeActions";
import {
  buildContactsFlatRows,
  type ContactSection,
  type ContactsFlatRow,
} from "./contactsFlatList";
import { sortGroups } from "./groupSort";
import { useContactsDragSelection } from "./hooks/useContactsDragSelection";
import { useContactsSelectionListSync } from "./hooks/useContactsSelectionListSync";
import type { FloatingActionBarAction } from "../../components/FloatingActionBar";

interface GroupContactsScreenProps {
  groupId: string;
  label: string;
  emoji: string;
}

export function GroupContactsScreen({
  groupId,
  label,
  emoji,
}: GroupContactsScreenProps) {
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("tabRoot");
  const flashListRef = useRef<FlashListRef<ContactsFlatRow>>(null);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const scrollRetryCountRef = useRef(0);
  const latestRequestRef = useRef(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebouncedValue(
    searchInput.trim(),
    DEBOUNCE_MS.search,
  );
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listViewportHeight, setListViewportHeight] = useState(0);

  // Local label/emoji updated after a successful edit so the header reflects changes without navigation.
  const [localLabel, setLocalLabel] = useState(label);
  const [localEmoji, setLocalEmoji] = useState(emoji);

  // Lazy-loaded full group details (includes color). Fetched once on first edit/duplicate trigger.
  const [groupDetails, setGroupDetails] = useState<Group | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const selectionMode = useContactsSelectionMode();
  const effectiveSelectedCount = useContactsEffectiveSelectedCount();
  const setRemoveFromGroupConfirmOpen = useContactsSelection(
    (state) => state.setRemoveFromGroupConfirmOpen,
  );
  const isRemovingFromGroup = useContactsSelection(
    (state) => state.isRemovingFromGroup,
  );
  const isDeleting = useContactsSelection((state) => state.isDeleting);
  const isAddingToGroups = useContactsSelection(
    (state) => state.isAddingToGroups,
  );
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
  const { data: syncedGroups, refresh: refreshGroupsList } = useGroups();
  const { revision: syncRevision } = useSync();

  const recordGroupOpened = useMobilePreferences(
    (state: MobilePreferencesState) => state.recordGroupOpened,
  );

  const sortedGroups = useMemo(
    () => sortGroups(syncedGroups, groupSortOrder, groupLastOpenedAt),
    [syncedGroups, groupSortOrder, groupLastOpenedAt],
  );

  const rowTexts = useMemo(
    () => ({
      call: t("MobileApp.Common.Call"),
      message: t("MobileApp.Common.Message"),
      email: t("MobileApp.Common.Email"),
    }),
    [t],
  );

  const isSearchActive = debouncedQuery.length > 0;

  useEffect(() => {
    recordGroupOpened(groupId);
  }, [groupId, recordGroupOpened]);

  const fetchGroupContactsPage = useCallback(
    async ({
      query,
      showInitialLoader = false,
    }: {
      query: string;
      showInitialLoader?: boolean;
    }) => {
      const requestId = ++latestRequestRef.current;

      if (showInitialLoader) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }

      setError(null);

      try {
        const response = groupsDomain.listMembers({
          groupId,
          query,
          limit: GROUP_CONTACTS_FETCH_LIMIT,
          offset: 0,
        });

        if (requestId !== latestRequestRef.current) {
          return;
        }

        const fetchedContacts = response.contacts;
        setContacts(fetchedContacts);
        setTotalCount(response.totalCount);
      } catch (loadError) {
        if (requestId !== latestRequestRef.current) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : t("MobileApp.Common.ErrorTitle"),
        );
      } finally {
        if (requestId === latestRequestRef.current) {
          setLoading(false);
          setIsSearching(false);
        }
      }
    },
    [groupId, t],
  );

  const reloadGroups = useCallback(async () => {
    refreshGroupsList();
  }, [refreshGroupsList]);

  const reloadMembers = useCallback(async () => {
    await fetchGroupContactsPage({ query: debouncedQuery });
  }, [debouncedQuery, fetchGroupContactsPage]);

  useEffect(() => {
    void fetchGroupContactsPage({
      query: debouncedQuery,
      showInitialLoader: true,
    });
  }, [debouncedQuery, fetchGroupContactsPage, syncRevision]);

  useContactsSelectionListSync({
    contactIds: contacts.map((contact) => contact.id),
    totalCount,
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

  const sections = useMemo<ContactSection[]>(() => {
    if (isSearchActive) {
      return [
        {
          title: "",
          kind: "search",
          data: contacts,
        },
      ];
    }

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
  }, [contacts, isSearchActive]);

  const sectionLetters = useMemo(
    () =>
      sections
        .filter((section) => section.kind === "alphabet")
        .map((section) => section.title),
    [sections],
  );

  const {
    rows: flatRows,
    stickyHeaderIndices,
    letterToIndex,
  } = useMemo(() => buildContactsFlatRows(sections), [sections]);

  const {
    gesture: dragSelectionGesture,
    isDragging,
    onScroll,
  } = useContactsDragSelection({
    enabled: selectionMode && !isSearchActive,
    flatRows,
    myselfContactId: undefined,
    listHeaderHeight: 0,
    listViewportHeight,
    flashListRef,
  });

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

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const navigateToGroup = useCallback(
    (group: Group) => {
      router.navigate({
        pathname: "/group/[id]",
        params: {
          id: group.id,
          label: group.label,
          emoji: group.emoji || "",
        },
      });
    },
    [router],
  );

  /**
   * Lazily fetches full group details (includes color) the first time an action that
   * needs them is triggered. Returns the cached value if already loaded.
   */
  const ensureGroupDetails = useCallback((): Group => {
    if (groupDetails) return groupDetails;

    const group = groupsDomain.get(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    setGroupDetails(group);
    return group;
  }, [groupDetails, groupId]);

  const handleOpenEditGroup = useCallback(() => {
    try {
      ensureGroupDetails();
    } catch {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.Common.UnknownError"),
      });
      return;
    }
    setIsEditSheetOpen(true);
  }, [ensureGroupDetails, showToast, t]);

  const handleGroupSaved = useCallback((group: Group) => {
    setLocalLabel(group.label);
    setLocalEmoji(group.emoji ?? "");
    setGroupDetails(group);
  }, []);

  const handleConfirmDuplicateGroup = useCallback(async () => {
    if (isDuplicating) return;

    setIsDuplicating(true);

    try {
      const details = ensureGroupDetails();
      const newGroup = groupsDomain.create({
        label: `${details.label} (copy)`,
        emoji: details.emoji?.trim() || "📁",
        color: details.color ?? "",
      });

      if (contacts.length > 0) {
        groupsDomain.addMembers(
          newGroup.id,
          contacts.map((c) => c.id),
        );
      }

      setIsDuplicateDialogOpen(false);
      navigateToGroup(newGroup);
    } catch {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.Groups.DuplicateFailed"),
      });
    } finally {
      setIsDuplicating(false);
    }
  }, [
    contacts,
    ensureGroupDetails,
    isDuplicating,
    navigateToGroup,
    showToast,
    t,
  ]);

  const duplicateDialogTitle = t(
    "MobileApp.Groups.DuplicateDialogTitle",
  ).replace("{title}", localEmoji ? `${localEmoji} ${localLabel}` : localLabel);

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
          isMyselfRow={false}
          isSwipeEnabled={!selectionMode && item.sectionKind !== "search"}
          leftSwipeAction={leftSwipeAction}
          rightSwipeAction={rightSwipeAction}
          texts={rowTexts}
          onExecuteAction={executeAction}
          onOpenContact={handleOpenContact}
          onOpenMyself={() => {}}
        />
      );
    },
    [
      executeAction,
      handleOpenContact,
      leftSwipeAction,
      rightSwipeAction,
      rowTexts,
      selectionMode,
    ],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.centeredState}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {debouncedQuery
            ? t("MobileApp.Contacts.NoMatchSearch")
            : t("MobileApp.Contacts.Empty")}
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

  const handleLetterChange = useCallback(
    (letter: string) => {
      const targetIndex = letterToIndex.get(letter);

      if (targetIndex !== undefined) {
        scrollToFlatIndex(targetIndex);
      }
    },
    [letterToIndex, scrollToFlatIndex],
  );

  const isSelectionBusy = isDeleting || isAddingToGroups || isRemovingFromGroup;

  const removeFromGroupAction = useMemo<FloatingActionBarAction>(
    () => ({
      id: "remove-from-group",
      icon: <IconUsersMinus size={20} stroke={colors.iconSecondary} />,
      accessibilityLabel: t("MobileApp.Contacts.RemoveFromGroup"),
      onPress: () => setRemoveFromGroupConfirmOpen(true),
      disabled: effectiveSelectedCount === 0 || isSelectionBusy,
      loading: isRemovingFromGroup,
    }),
    [
      colors.iconSecondary,
      effectiveSelectedCount,
      isRemovingFromGroup,
      isSelectionBusy,
      setRemoveFromGroupConfirmOpen,
      t,
    ],
  );

  const showFullScreenLoader = loading && contacts.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <ContactsSelectionBackHandler />
      <GroupContactsScreenHeader
        label={localLabel}
        emoji={localEmoji}
        onBack={handleBack}
        onEditGroup={handleOpenEditGroup}
        onDuplicateGroup={() => setIsDuplicateDialogOpen(true)}
        onDeleteGroup={() => setIsDeleteDialogOpen(true)}
        isDuplicating={isDuplicating}
      />

      <View style={styles.searchRow}>
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
      </View>

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
              void reloadMembers();
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
                onScroll={onScroll}
                scrollEventThrottle={16}
                scrollEnabled={!isDragging}
                stickyHeaderIndices={
                  isSearchActive ? undefined : stickyHeaderIndices
                }
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={listEmpty}
                contentContainerStyle={{ paddingBottom: scrollBottomInset }}
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

      {selectionMode ? (
        <View pointerEvents="box-none" style={floatingBarStyles.host}>
          <ContactsSelectionActionBar extraActions={[removeFromGroupAction]} />
        </View>
      ) : null}

      <ContactsSelectionDialogs
        debouncedQuery={debouncedQuery}
        onContactsReloaded={reloadMembers}
        loadedGroupMembers={contacts}
      />
      <ContactsAddToGroupsSheet
        groups={sortedGroups}
        debouncedQuery={debouncedQuery}
        onGroupsReloaded={reloadGroups}
        loadedGroupMembers={contacts}
      />
      <GroupContactsRemoveFromGroupDialog
        groupId={groupId}
        debouncedQuery={debouncedQuery}
        onMembersReloaded={reloadMembers}
      />

      <GroupEditSheet
        mode="edit"
        open={isEditSheetOpen}
        groupId={groupId}
        initialLabel={groupDetails?.label ?? localLabel}
        initialEmoji={groupDetails?.emoji ?? localEmoji}
        initialColor={groupDetails?.color ?? ""}
        onOpenChange={setIsEditSheetOpen}
        onSaved={handleGroupSaved}
        onDeleted={handleBack}
      />

      <GroupDeleteDialog
        open={isDeleteDialogOpen}
        groupId={groupId}
        groupTitle={localEmoji ? `${localEmoji} ${localLabel}` : localLabel}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={handleBack}
      />

      <ActionSheetPopup
        open={isDuplicateDialogOpen}
        title={duplicateDialogTitle}
        isBusy={isDuplicating}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && isDuplicating) return;
          setIsDuplicateDialogOpen(nextOpen);
        }}
        onClose={() => {
          if (isDuplicating) return;
          setIsDuplicateDialogOpen(false);
        }}
        actions={[
          {
            label: t("MobileApp.Common.Cancel"),
            onPress: () => setIsDuplicateDialogOpen(false),
            disabled: isDuplicating,
            tone: "neutral",
            variant: "outline",
          },
          {
            label: t("MobileApp.Groups.DuplicateConfirm"),
            icon: <IconCopy size={16} stroke={colors.textOnPrimary} />,
            onPress: () => {
              void handleConfirmDuplicateGroup();
            },
            loading: isDuplicating,
            tone: "primary",
            variant: "filled",
          },
        ]}
      >
        <Text
          style={[styles.duplicateDialogBody, { color: colors.textSecondary }]}
        >
          {t("MobileApp.Groups.DuplicateDialogBody")}
        </Text>
      </ActionSheetPopup>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
  duplicateDialogBody: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
  },
});
