import { MOBILE_GROUP_ID_PARAM, parseMobileGroupIdParam } from "@bondery/helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCommonTranslations, useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import { resolveDisplayedError } from "../../../lib/api/resolveDisplayedError";
import { DEBOUNCE_MS } from "../../../lib/config";
import { useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import {
  type MobilePreferencesState,
  useMobilePreferences,
} from "../../../lib/preferences/useMobilePreferences";
import { syncEffectState } from "../../../lib/react/syncEffectState";
import { useContactsList, useGroups, useMyselfContact } from "../../../lib/sync/hooks/useSyncQuery";
import { notifications } from "../../../lib/toast/notifications";
import { buildAlphabetContactSections } from "../contactAlphabetSections";
import { buildContactsFlatRows, type ContactSection } from "../contactsFlatList";
import { contactMatchesQuery } from "../contactUtils";
import { sortGroups } from "../groupSort";
import { resolveSelectedGroupStillExists } from "../resolveSelectedGroupStillExists";

export function useContactsScreenData() {
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupPickerOpen, setGroupPickerOpen] = useState(false);
  const groupId = selectedGroupId;
  const tMobileContacts = useMobileContactsTranslations();
  const t = useCommonTranslations();
  const { i18n } = useTranslation();
  const searchParams = useLocalSearchParams<{
    [MOBILE_GROUP_ID_PARAM]?: string | string[];
  }>();
  const groupIdParam = searchParams[MOBILE_GROUP_ID_PARAM];
  const urlGroupId = parseMobileGroupIdParam(groupIdParam);

  useEffect(() => {
    syncEffectState(() => {
      setSelectedGroupId(urlGroupId ?? null);
    });
  }, [urlGroupId]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebouncedValue(searchInput.trim(), DEBOUNCE_MS.search);
  const isSearching = searchInput.trim() !== debouncedQuery;
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const [isCreateGroupOpen, setCreateGroupOpen] = useState(false);
  const { data: myselfContact } = useMyselfContact();
  const myselfContactId = myselfContact?.id;
  const groupSortOrder = useMobilePreferences(
    (state: MobilePreferencesState) => state.groupSortOrder,
  );
  const groupLastOpenedAt = useMobilePreferences(
    (state: MobilePreferencesState) => state.groupLastOpenedAt,
  );
  const recordGroupOpened = useMobilePreferences(
    (state: MobilePreferencesState) => state.recordGroupOpened,
  );
  const { data: syncedGroups, refresh: refreshGroups } = useGroups();

  const {
    data: listResult,
    error: contactsError,
    isInitialSync,
    refresh: refreshContacts,
  } = useContactsList({
    excludeMyself: true,
    query: debouncedQuery,
    ...(groupId ? { groupId } : {}),
  });

  const contacts = listResult.contacts;
  const totalCount = listResult.totalCount;
  const error = contactsError ? resolveDisplayedError(contactsError, t) : null;

  const sortedGroups = sortGroups(syncedGroups, groupSortOrder, groupLastOpenedAt);

  const selectedGroup = sortedGroups.find((group) => group.id === selectedGroupId) ?? null;

  function selectGroup(nextGroupId: string | null) {
    setSelectedGroupId(nextGroupId);
    setGroupPickerOpen(false);
    if (nextGroupId) {
      recordGroupOpened(nextGroupId);
    }
    router.setParams({
      [MOBILE_GROUP_ID_PARAM]: nextGroupId ?? undefined,
    });
  }

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    if (resolveSelectedGroupStillExists(sortedGroups, selectedGroupId)) {
      return;
    }

    syncEffectState(() => {
      setSelectedGroupId(null);
      router.setParams({ [MOBILE_GROUP_ID_PARAM]: undefined });
      notifications.show({
        title: tMobileContacts("GroupFilterDeletedToast"),
        type: "neutral",
      });
    });
  }, [router, selectedGroupId, sortedGroups, tMobileContacts]);

  function reloadGroups() {
    refreshGroups();
  }

  const filteredMyselfContact =
    myselfContact && contactMatchesQuery(myselfContact, debouncedQuery) ? myselfContact : null;

  const myselfSectionTitle = tMobileContacts("Myself");
  const locale = i18n.language;

  const alphabetSections = buildAlphabetContactSections(contacts, locale);

  let sections: ContactSection[];
  if (debouncedQuery) {
    const searchData =
      !groupId && filteredMyselfContact
        ? [
            filteredMyselfContact,
            ...contacts.filter((contact) => contact.id !== filteredMyselfContact.id),
          ]
        : contacts;

    sections = [
      {
        data: searchData,
        kind: "search",
        title: "",
      },
    ];
  } else if (groupId || !filteredMyselfContact) {
    sections = alphabetSections;
  } else {
    sections = [
      {
        data: [filteredMyselfContact],
        kind: "myself",
        title: myselfSectionTitle,
      },
      ...alphabetSections,
    ];
  }

  const { rows: flatRows, stickyHeaderIndices } = buildContactsFlatRows(sections);

  const isSearchActive = debouncedQuery.length > 0;

  async function reloadContacts() {
    refreshContacts();
  }

  const showFullScreenLoader = isInitialSync && contacts.length === 0;

  return {
    contacts,
    debouncedQuery,
    error,
    flatRows,
    groupId,
    handleSearchChange: setSearchInput,
    isCreateGroupOpen,
    isGroupFilterActive: groupId !== null,
    isGroupPickerOpen,
    isSearchActive,
    isSearching,
    listViewportHeight,
    myselfContactId,
    reloadContacts,
    reloadGroups,
    searchInput,
    selectedGroup,
    selectedGroupId,
    selectGroup,
    setCreateGroupOpen,
    setGroupPickerOpen,
    setListViewportHeight,
    showFullScreenLoader,
    sortedGroups,
    stickyHeaderIndices,
    totalCount,
  };
}
