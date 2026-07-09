import type { Contact } from "@bondery/schemas";
import type { FlashListRef } from "@shopify/flash-list";
import { IconSearch, IconUsersMinus } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { ContactsSelectionActionBar } from "../../components/ContactsSelectionActionBar";
import { useScrollBottomInset } from "../../components/chrome";
import type { FloatingActionBarAction } from "../../components/FloatingActionBar";
import { LoadErrorCard, loadErrorTabRootInset } from "../../components/load-state";
import { MobileTextInput } from "../../components/MobileTextInput";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import {
  type MobilePreferencesState,
  type SwipeAction,
  useMobilePreferences,
} from "../../lib/preferences/useMobilePreferences";
import { useGroups } from "../../lib/sync/hooks/useSyncQuery";
import { useAppToast } from "../../lib/toast/useAppToast";
import { floatingBarStyles } from "../../theme/floatingBarStyles";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactsAddToGroupsSheet } from "./components/ContactsAddToGroupsSheet";
import { ContactsSelectionBackHandler } from "./components/ContactsSelectionBackHandler";
import { ContactsSelectionDialogs } from "./components/ContactsSelectionDialogs";
import { GroupContactsDuplicateDialog } from "./components/GroupContactsDuplicateDialog";
import { GroupContactsRemoveFromGroupDialog } from "./components/GroupContactsRemoveFromGroupDialog";
import { GroupContactsScreenHeader } from "./components/GroupContactsScreenHeader";
import { GroupContactsScreenList } from "./components/GroupContactsScreenList";
import { GroupDeleteDialog } from "./components/GroupDeleteDialog";
import { GroupEditSheet } from "./components/GroupEditSheet";
import { groupContactsScreenStyles as styles } from "./components/groupContactsScreenStyles";
import { executeContactSwipeAction } from "./contactSwipeActions";
import type { ContactsFlatRow } from "./contactsFlatList";
import {
  useContactsEffectiveSelectedCount,
  useContactsSelection,
  useContactsSelectionMode,
} from "./contactsSelectionStore";
import { sortGroups } from "./groupSort";
import { useContactsDragSelection } from "./hooks/useContactsDragSelection";
import { useContactsSelectionListSync } from "./hooks/useContactsSelectionListSync";
import { useFlashListScrollToIndex } from "./hooks/useFlashListScrollToIndex";
import { useGroupContactsScreenData } from "./hooks/useGroupContactsScreenData";
import { useGroupScreenActions } from "./hooks/useGroupScreenActions";

interface GroupContactsScreenProps {
  emoji: string;
  groupId: string;
  label: string;
}

export function GroupContactsScreen({ groupId, label, emoji }: GroupContactsScreenProps) {
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("tabRoot");
  const flashListRef = useRef<FlashListRef<ContactsFlatRow>>(null);
  const selectionMode = useContactsSelectionMode();
  const effectiveSelectedCount = useContactsEffectiveSelectedCount();
  const setRemoveFromGroupConfirmOpen = useContactsSelection(
    (state) => state.setRemoveFromGroupConfirmOpen,
  );
  const isRemovingFromGroup = useContactsSelection((state) => state.isRemovingFromGroup);
  const isDeleting = useContactsSelection((state) => state.isDeleting);
  const isAddingToGroups = useContactsSelection((state) => state.isAddingToGroups);
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

  const screenData = useGroupContactsScreenData({ groupId });
  const groupActions = useGroupScreenActions({
    contacts: screenData.contacts,
    groupId,
    initialEmoji: emoji,
    initialLabel: label,
  });

  const sortedGroups = useMemo(
    () => sortGroups(syncedGroups, groupSortOrder, groupLastOpenedAt),
    [syncedGroups, groupSortOrder, groupLastOpenedAt],
  );

  useContactsSelectionListSync({
    contactIds: screenData.contacts.map((contact) => contact.id),
    totalCount: screenData.totalCount,
  });

  const {
    gesture: dragSelectionGesture,
    isDragging,
    onScroll,
  } = useContactsDragSelection({
    enabled: selectionMode && !screenData.isSearchActive,
    flashListRef,
    flatRows: screenData.flatRows,
    listHeaderHeight: 0,
    listViewportHeight: screenData.listViewportHeight,
    myselfContactId: undefined,
  });

  const scrollToFlatIndex = useFlashListScrollToIndex(flashListRef);

  const rowTexts = useMemo(
    () => ({
      call: t("actions.call", { ns: "common" }),
      email: t("actions.email", { ns: "common" }),
      message: t("actions.message", { ns: "common" }),
    }),
    [t],
  );

  const executeAction = useCallback(
    (contact: Contact, action: SwipeAction) => {
      executeContactSwipeAction(contact, action, showToast, {
        errorTitle: t("feedback.errorTitle", { ns: "common" }),
        missingEmail: t("MissingEmail", { ns: "MobileContacts" }),
        missingPhone: t("MissingPhone", { ns: "MobileContacts" }),
      });
    },
    [showToast, t],
  );

  const handleOpenContact = useCallback(
    (contactId: string) => {
      router.push({ params: { id: contactId }, pathname: "/contact/[id]" });
    },
    [router],
  );

  const reloadGroups = useCallback(async () => {
    refreshGroupsList();
  }, [refreshGroupsList]);

  const handleLetterChange = useCallback(
    (letter: string) => {
      const targetIndex = screenData.letterToIndex.get(letter);

      if (targetIndex !== undefined) {
        scrollToFlatIndex(targetIndex);
      }
    },
    [screenData.letterToIndex, scrollToFlatIndex],
  );

  const isSelectionBusy = isDeleting || isAddingToGroups || isRemovingFromGroup;

  const removeFromGroupAction = useMemo<FloatingActionBarAction>(
    () => ({
      accessibilityLabel: t("RemoveFromGroup", { ns: "MobileContacts" }),
      disabled: effectiveSelectedCount === 0 || isSelectionBusy,
      icon: <IconUsersMinus size={20} stroke={colors.iconSecondary} />,
      id: "remove-from-group",
      loading: isRemovingFromGroup,
      onPress: () => setRemoveFromGroupConfirmOpen(true),
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <ContactsSelectionBackHandler />
      <GroupContactsScreenHeader
        emoji={groupActions.localEmoji}
        isDuplicating={groupActions.isDuplicating}
        label={groupActions.localLabel}
        onBack={groupActions.handleBack}
        onDeleteGroup={() => groupActions.setIsDeleteDialogOpen(true)}
        onDuplicateGroup={() => groupActions.setIsDuplicateDialogOpen(true)}
        onEditGroup={groupActions.handleOpenEditGroup}
      />

      <View style={styles.searchRow}>
        <MobileTextInput
          autoCapitalize="none"
          autoCorrect={false}
          backgroundColor={colors.surfaceMuted}
          leadingIcon={<IconSearch size={16} stroke={colors.iconSecondary} />}
          onChangeText={screenData.handleSearchChange}
          placeholder={t("SearchPlaceholder", { ns: "MobileContacts" })}
          style={styles.searchInput}
          trailingAccessory={
            screenData.isSearching ? (
              <View style={styles.searchSpinner}>
                <ActivityIndicator color={colors.textMuted} size="small" />
              </View>
            ) : (
              <View style={styles.searchSpinner} />
            )
          }
          unfocusedBorderColor={colors.borderStrong}
          value={screenData.searchInput}
        />
      </View>

      {screenData.showFullScreenLoader ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.textPrimary} size="large" />
        </View>
      ) : null}

      {!screenData.showFullScreenLoader && screenData.error ? (
        <View style={loadErrorTabRootInset}>
          <LoadErrorCard
            description={screenData.error}
            onRetry={() => {
              void screenData.reloadMembers();
            }}
            title={t("LoadErrorTitle", { ns: "MobileSettings" })}
          />
        </View>
      ) : null}

      {!screenData.showFullScreenLoader && !screenData.error ? (
        <GroupContactsScreenList
          colors={colors}
          debouncedQuery={screenData.debouncedQuery}
          dragSelectionGesture={dragSelectionGesture}
          flashListRef={flashListRef}
          flatRows={screenData.flatRows}
          isDragging={isDragging}
          isSearchActive={screenData.isSearchActive}
          leftSwipeAction={leftSwipeAction}
          onExecuteAction={executeAction}
          onLetterChange={handleLetterChange}
          onOpenContact={handleOpenContact}
          onScroll={onScroll}
          rightSwipeAction={rightSwipeAction}
          rowTexts={rowTexts}
          scrollBottomInset={scrollBottomInset}
          sectionLetters={screenData.sectionLetters}
          selectionMode={selectionMode}
          setListViewportHeight={screenData.setListViewportHeight}
          stickyHeaderIndices={screenData.stickyHeaderIndices}
        />
      ) : null}

      {selectionMode ? (
        <View pointerEvents="box-none" style={floatingBarStyles.host}>
          <ContactsSelectionActionBar extraActions={[removeFromGroupAction]} />
        </View>
      ) : null}

      <ContactsSelectionDialogs
        debouncedQuery={screenData.debouncedQuery}
        loadedGroupMembers={screenData.contacts}
        onContactsReloaded={screenData.reloadMembers}
      />
      <ContactsAddToGroupsSheet
        debouncedQuery={screenData.debouncedQuery}
        groups={sortedGroups}
        loadedGroupMembers={screenData.contacts}
        onGroupsReloaded={reloadGroups}
      />
      <GroupContactsRemoveFromGroupDialog
        debouncedQuery={screenData.debouncedQuery}
        groupId={groupId}
        onMembersReloaded={screenData.reloadMembers}
      />

      <GroupEditSheet
        groupId={groupId}
        initialColor={groupActions.groupDetails?.color ?? ""}
        initialEmoji={groupActions.groupDetails?.emoji ?? groupActions.localEmoji}
        initialLabel={groupActions.groupDetails?.label ?? groupActions.localLabel}
        mode="edit"
        onDeleted={groupActions.handleBack}
        onOpenChange={groupActions.setIsEditSheetOpen}
        onSaved={groupActions.handleGroupSaved}
        open={groupActions.isEditSheetOpen}
      />

      <GroupDeleteDialog
        groupId={groupId}
        groupTitle={
          groupActions.localEmoji
            ? `${groupActions.localEmoji} ${groupActions.localLabel}`
            : groupActions.localLabel
        }
        onDeleted={groupActions.handleBack}
        onOpenChange={groupActions.setIsDeleteDialogOpen}
        open={groupActions.isDeleteDialogOpen}
      />

      <GroupContactsDuplicateDialog
        colors={colors}
        isDuplicating={groupActions.isDuplicating}
        onClose={() => groupActions.setIsDuplicateDialogOpen(false)}
        onConfirm={() => {
          void groupActions.handleConfirmDuplicateGroup();
        }}
        onOpenChange={groupActions.setIsDuplicateDialogOpen}
        open={groupActions.isDuplicateDialogOpen}
        title={groupActions.duplicateDialogTitle}
      />
    </View>
  );
}
