import type { Contact, Group } from "@bondery/schemas";
import type { FlashListRef } from "@shopify/flash-list";
import { IconSearch } from "@tabler/icons-react-native";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ActivityIndicator, View } from "react-native";
import { useScrollBottomInset } from "../../components/chrome";
import { LoadErrorCard, loadErrorTabRootInset } from "../../components/load-state";
import { Stack } from "../../components/ui/Stack";
import { TextInput } from "../../components/ui/TextInput";
import {
  useCommonTranslations,
  useMobileContactsTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import type { NativeTextInputRef } from "../../lib/native-host-refs";
import { useAppNavigation } from "../../lib/navigation/useAppNavigation";
import {
  type MobilePreferencesState,
  type SwipeAction,
  useMobilePreferences,
} from "../../lib/preferences/useMobilePreferences";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { useRegisterTabSearchFocus } from "../navigation/tabSearchFocusContext";
import { ContactsAddToGroupsSheet } from "./components/ContactsAddToGroupsSheet";
import { ContactsGroupFilterField } from "./components/ContactsGroupFilterField";
import { ContactsScreenHeader } from "./components/ContactsScreenHeader";
import { ContactsScreenList } from "./components/ContactsScreenList";
import { ContactsSelectionBackHandler } from "./components/ContactsSelectionBackHandler";
import { ContactsSelectionChromeRegistrar } from "./components/ContactsSelectionChromeRegistrar";
import { ContactsSelectionDialogs } from "./components/ContactsSelectionDialogs";
import { GroupEditSheet } from "./components/GroupEditSheet";
import { executeContactSwipeAction } from "./contactSwipeActions";
import type { ContactsFlatRow } from "./contactsFlatList";
import { useContactsSelectionMode } from "./contactsSelectionStore";
import { useContactsDragSelection } from "./hooks/useContactsDragSelection";
import { useContactsScreenData } from "./hooks/useContactsScreenData";
import { useContactsSelectionListSync } from "./hooks/useContactsSelectionListSync";

export function ContactsScreen() {
  const tMobileContacts = useMobileContactsTranslations();
  const tMobileSettings = useMobileSettingsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("tabRoot");
  const { openContact, openMyself } = useAppNavigation();
  const flashListRef = useRef<FlashListRef<ContactsFlatRow>>(null);
  const searchInputRef = useRef<NativeTextInputRef>(null);
  const selectionMode = useContactsSelectionMode();
  const leftSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.leftSwipeAction,
  );
  const rightSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.rightSwipeAction,
  );

  const screenData = useContactsScreenData();

  useRegisterTabSearchFocus(
    () => {
      searchInputRef.current?.focus();
    },
    {
      enabled:
        !screenData.showFullScreenLoader &&
        !screenData.error &&
        !selectionMode &&
        !screenData.isGroupPickerOpen,
    },
  );

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
    listHeaderHeight: 0,
    listViewportHeight: screenData.listViewportHeight,
    myselfContactId: screenData.myselfContactId,
  });

  const selectedGroupId = screenData.selectedGroupId;
  useEffect(() => {
    void selectedGroupId;
    flashListRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [selectedGroupId]);

  const rowTexts = useMemo(
    () => ({
      call: t("actions.call"),
      email: t("actions.email"),
      message: t("actions.message"),
    }),
    [t],
  );

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll(event);
    },
    [onScroll],
  );

  const executeAction = useCallback(
    (contact: Contact, action: SwipeAction) => {
      executeContactSwipeAction(contact, action, {
        errorTitle: t("feedback.errorTitle"),
        missingEmail: tMobileContacts("MissingEmail"),
        missingPhone: tMobileContacts("MissingPhone"),
      });
    },
    [t, tMobileContacts],
  );

  const handleOpenContact = useCallback(
    (contactId: string) => {
      openContact(contactId);
    },
    [openContact],
  );

  const handleOpenMyself = useCallback(() => {
    openMyself();
  }, [openMyself]);

  const handleGroupCreated = useCallback(
    (group: Group) => {
      screenData.selectGroup(group.id);
      screenData.reloadGroups();
    },
    [screenData],
  );

  const handleOpenCreateGroup = useCallback(() => {
    screenData.setCreateGroupOpen(true);
  }, [screenData]);

  const headerAccessory = useMemo(
    () => (
      <Stack gap="sm">
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          leftSection={<IconSearch size={16} stroke={colors.iconSecondary} />}
          onChangeText={screenData.handleSearchChange}
          placeholder={tMobileContacts("SearchPlaceholder")}
          ref={searchInputRef}
          rightSection={
            <View className="w-[22px] items-center justify-center">
              {screenData.isSearching ? (
                <ActivityIndicator color={colors.textMuted} size="small" />
              ) : null}
            </View>
          }
          value={screenData.searchInput}
          wrapperStyle={{
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.borderStrong,
          }}
        />
        <ContactsGroupFilterField
          groups={screenData.sortedGroups}
          isDisabled={selectionMode || screenData.showFullScreenLoader}
          onCreateGroupPress={handleOpenCreateGroup}
          onOpenChange={screenData.setGroupPickerOpen}
          selectedGroupId={screenData.selectedGroupId}
          selectGroup={screenData.selectGroup}
          showField={false}
        />
      </Stack>
    ),
    [
      colors.borderStrong,
      colors.iconSecondary,
      colors.surfaceMuted,
      colors.textMuted,
      handleOpenCreateGroup,
      screenData,
      selectionMode,
      tMobileContacts,
    ],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.appBackground }}>
      <ContactsSelectionChromeRegistrar />
      <ContactsSelectionBackHandler />
      <ContactsScreenHeader accessory={headerAccessory} />

      {screenData.showFullScreenLoader ? (
        <Stack
          align="center"
          className="px-5"
          justify="center"
          style={{ paddingTop: MOBILE_LAYOUT.floatingTabBar.screenHeaderInset }}
        >
          <ActivityIndicator color={colors.textPrimary} size="large" />
        </Stack>
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
          debouncedQuery={screenData.debouncedQuery}
          dragSelectionGesture={dragSelectionGesture}
          flashListRef={flashListRef}
          flatRows={screenData.flatRows}
          handleListScroll={handleListScroll}
          isDragging={isDragging}
          isGroupFilterActive={screenData.isGroupFilterActive}
          isSearchActive={screenData.isSearchActive}
          leftSwipeAction={leftSwipeAction}
          myselfContactId={screenData.myselfContactId}
          onExecuteAction={executeAction}
          onOpenContact={handleOpenContact}
          onOpenMyself={handleOpenMyself}
          rightSwipeAction={rightSwipeAction}
          rowTexts={rowTexts}
          scrollBottomInset={scrollBottomInset}
          setListViewportHeight={screenData.setListViewportHeight}
          stickyHeaderIndices={screenData.stickyHeaderIndices}
        />
      ) : null}

      <ContactsSelectionDialogs
        debouncedQuery={screenData.debouncedQuery}
        filterGroupId={screenData.selectedGroupId}
        onContactsReloaded={screenData.reloadContacts}
      />
      <ContactsAddToGroupsSheet
        debouncedQuery={screenData.debouncedQuery}
        filterGroupId={screenData.selectedGroupId}
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
