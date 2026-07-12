import type { Contact, Group } from "@bondery/schemas";
import type { FlashListRef } from "@shopify/flash-list";
import { IconSearch } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useScrollBottomInset } from "../../components/chrome";
import { LoadErrorCard, loadErrorTabRootInset } from "../../components/load-state";
import { MobileTextInput } from "../../components/MobileTextInput";
import {
  useCommonTranslations,
  useMobileContactsTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { preloadMobileNamespaces } from "../../lib/i18n/preloadMobileNamespaces";
import {
  type MobilePreferencesState,
  type SwipeAction,
  useMobilePreferences,
} from "../../lib/preferences/useMobilePreferences";
import { useAppToast } from "../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { useFabSpeedDialScrollDismiss } from "../navigation/useFabSpeedDialScrollDismiss";
import { ContactsAddToGroupsSheet } from "./components/ContactsAddToGroupsSheet";
import { ContactsScreenHeader } from "./components/ContactsScreenHeader";
import { ContactsScreenList } from "./components/ContactsScreenList";
import { ContactsSelectionBackHandler } from "./components/ContactsSelectionBackHandler";
import { ContactsSelectionChromeRegistrar } from "./components/ContactsSelectionChromeRegistrar";
import { ContactsSelectionDialogs } from "./components/ContactsSelectionDialogs";
import { contactsScreenStyles as styles } from "./components/contactsScreenStyles";
import { GroupEditSheet } from "./components/GroupEditSheet";
import { executeContactSwipeAction } from "./contactSwipeActions";
import type { ContactsFlatRow } from "./contactsFlatList";
import { useContactsSelectionMode } from "./contactsSelectionStore";
import { useContactsDragSelection } from "./hooks/useContactsDragSelection";
import { useContactsScreenData } from "./hooks/useContactsScreenData";
import { useContactsSelectionListSync } from "./hooks/useContactsSelectionListSync";
import { useFlashListScrollToIndex } from "./hooks/useFlashListScrollToIndex";
import { useNavigateToGroup } from "./hooks/useNavigateToGroup";

export function ContactsScreen() {
  const tMobileContacts = useMobileContactsTranslations();
  const tMobileSettings = useMobileSettingsTranslations();
  const t = useCommonTranslations();
  useEffect(() => {
    void preloadMobileNamespaces(["mobile.contactsTab"]);
  }, []);
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("tabRoot");
  const { showToast } = useAppToast();
  const router = useRouter();
  const navigateToGroup = useNavigateToGroup();
  const { onScroll: fabScrollDismiss } = useFabSpeedDialScrollDismiss();
  const flashListRef = useRef<FlashListRef<ContactsFlatRow>>(null);
  const selectionMode = useContactsSelectionMode();
  const leftSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.leftSwipeAction,
  );
  const rightSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.rightSwipeAction,
  );

  const screenData = useContactsScreenData();

  useContactsSelectionListSync({
    contactIds: screenData.contacts.map((contact) => contact.id),
    myselfContactId: screenData.myselfContactId,
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
    listHeaderHeight: screenData.isSearchActive ? 0 : screenData.listHeaderHeight,
    listViewportHeight: screenData.listViewportHeight,
    myselfContactId: screenData.myselfContactId,
  });

  const scrollToFlatIndex = useFlashListScrollToIndex(flashListRef);

  const rowTexts = useMemo(
    () => ({
      call: t("actions.call"),
      email: t("actions.email"),
      message: t("actions.message"),
    }),
    [t],
  );

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
        errorTitle: t("feedback.errorTitle"),
        missingEmail: tMobileContacts("MissingEmail"),
        missingPhone: tMobileContacts("MissingPhone"),
      });
    },
    [showToast, t, tMobileContacts],
  );

  const handleOpenContact = useCallback(
    (contactId: string) => {
      router.push({ params: { id: contactId }, pathname: "/contact/[id]" });
    },
    [router],
  );

  const handleOpenMyself = useCallback(() => {
    router.push("/myself");
  }, [router]);

  const handleGroupCreated = useCallback(
    (group: Group) => {
      navigateToGroup(group);
    },
    [navigateToGroup],
  );

  const handleLetterChange = useCallback(
    (letter: string) => {
      const targetIndex = screenData.letterToIndex.get(letter);

      if (targetIndex !== undefined) {
        scrollToFlatIndex(targetIndex);
      }
    },
    [screenData.letterToIndex, scrollToFlatIndex],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <ContactsSelectionChromeRegistrar />
      <ContactsSelectionBackHandler />
      <ContactsScreenHeader
        accessory={
          <MobileTextInput
            autoCapitalize="none"
            autoCorrect={false}
            backgroundColor={colors.surfaceMuted}
            leadingIcon={<IconSearch size={16} stroke={colors.iconSecondary} />}
            onChangeText={screenData.handleSearchChange}
            placeholder={tMobileContacts("SearchPlaceholder")}
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
        }
      />

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
              void screenData.reloadContacts();
            }}
            title={tMobileSettings("LoadErrorTitle")}
          />
        </View>
      ) : null}

      {!screenData.showFullScreenLoader && !screenData.error ? (
        <ContactsScreenList
          colors={colors}
          debouncedQuery={screenData.debouncedQuery}
          dragSelectionGesture={dragSelectionGesture}
          flashListRef={flashListRef}
          flatRows={screenData.flatRows}
          handleEndReached={screenData.handleEndReached}
          handleListScroll={handleListScroll}
          isDragging={isDragging}
          isLoadingMore={screenData.isLoadingMore}
          isSearchActive={screenData.isSearchActive}
          leftSwipeAction={leftSwipeAction}
          myselfContactId={screenData.myselfContactId}
          onCreateGroupPress={() => screenData.setCreateGroupOpen(true)}
          onExecuteAction={executeAction}
          onGroupPress={navigateToGroup}
          onLetterChange={handleLetterChange}
          onOpenContact={handleOpenContact}
          onOpenMyself={handleOpenMyself}
          rightSwipeAction={rightSwipeAction}
          rowTexts={rowTexts}
          scrollBottomInset={scrollBottomInset}
          sectionLetters={screenData.sectionLetters}
          selectionMode={selectionMode}
          setListHeaderHeight={screenData.setListHeaderHeight}
          setListViewportHeight={screenData.setListViewportHeight}
          sortedGroups={screenData.sortedGroups}
          stickyHeaderIndices={screenData.stickyHeaderIndices}
        />
      ) : null}

      <ContactsSelectionDialogs
        debouncedQuery={screenData.debouncedQuery}
        onContactsReloaded={screenData.reloadContacts}
      />
      <ContactsAddToGroupsSheet
        debouncedQuery={screenData.debouncedQuery}
        groups={screenData.sortedGroups}
        onGroupsReloaded={screenData.reloadGroups}
      />
      <GroupEditSheet
        mode="create"
        onCreated={handleGroupCreated}
        onOpenChange={screenData.setCreateGroupOpen}
        open={screenData.isCreateGroupOpen}
      />
    </View>
  );
}
