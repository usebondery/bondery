import type { Contact } from "@bondery/schemas";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONTACTS_PAGE_SIZE, DEBOUNCE_MS } from "../../../lib/config";
import { useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import {
  type MobilePreferencesState,
  useMobilePreferences,
} from "../../../lib/preferences/useMobilePreferences";
import {
  readContactsList,
  useGroups,
  useMyselfContact,
} from "../../../lib/sync/hooks/useSyncQuery";
import { useSync } from "../../../lib/sync/SyncProvider";
import { buildContactsFlatRows, type ContactSection } from "../contactsFlatList";
import { contactMatchesQuery, formatContactName, getContactInitial } from "../contactUtils";
import { useCreateContactSheet } from "../createContactSheetContext";
import { sortGroups } from "../groupSort";

export function useContactsScreenData() {
  const t = useMobileTranslations();
  const { refresh } = useLocalSearchParams<{ refresh?: string | string[] }>();
  const refreshKey = Array.isArray(refresh) ? refresh[0] : refresh;
  const { contactsListVersion } = useCreateContactSheet();
  const latestRequestRef = useRef(0);
  const shouldShowInitialLoaderRef = useRef(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMoreContacts, setHasMoreContacts] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebouncedValue(searchInput.trim(), DEBOUNCE_MS.search);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listHeaderHeight, setListHeaderHeight] = useState(0);
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
  const { revision: syncRevision } = useSync();
  const { data: syncedGroups, refresh: refreshGroups } = useGroups();

  const sortedGroups = useMemo(
    () => sortGroups(syncedGroups, groupSortOrder, groupLastOpenedAt),
    [syncedGroups, groupSortOrder, groupLastOpenedAt],
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
        const local = readContactsList({
          limit: CONTACTS_PAGE_SIZE,
          offset,
          query,
        });
        const fetchedContacts = local.contacts;
        const total = local.totalCount;
        const hasMore = offset + fetchedContacts.length < total;

        if (requestId !== latestRequestRef.current) {
          return;
        }

        setTotalCount(total);
        setHasMoreContacts(hasMore);

        if (append) {
          setContacts((current) => {
            const existingIds = new Set(current.map((contact) => contact.id));
            const uniqueNew = fetchedContacts.filter((contact) => !existingIds.has(contact.id));
            return [...current, ...uniqueNew];
          });
        } else {
          setContacts(fetchedContacts);
        }
      } catch (loadError) {
        if (requestId !== latestRequestRef.current) {
          return;
        }

        const errorMessage =
          loadError instanceof Error ? loadError.message : t("errors.unknown", { ns: "common" });
        setError(errorMessage);
      } finally {
        if (requestId === latestRequestRef.current) {
          setLoading(false);
          setIsSearching(false);
          setIsLoadingMore(false);
        }
      }
    },
    [t],
  );

  const reloadGroups = useCallback(async () => {
    refreshGroups();
  }, [refreshGroups]);

  useEffect(() => {
    void refreshKey;
    void contactsListVersion;
    shouldShowInitialLoaderRef.current = true;
  }, [refreshKey, contactsListVersion]);

  useEffect(() => {
    void syncRevision;
    void refreshKey;
    void contactsListVersion;
    void fetchContactsPage({
      offset: 0,
      query: debouncedQuery,
      showInitialLoader: shouldShowInitialLoaderRef.current,
    });
    shouldShowInitialLoaderRef.current = false;
  }, [debouncedQuery, fetchContactsPage, syncRevision, refreshKey, contactsListVersion]);

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

    return contactMatchesQuery(myselfContact, debouncedQuery) ? myselfContact : null;
  }, [myselfContact, debouncedQuery]);

  const myselfSectionTitle = t("Myself", { ns: "MobileContacts" });

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
        data: [...data].sort((left, right) =>
          formatContactName(left).localeCompare(formatContactName(right)),
        ),
        kind: "alphabet" as const,
        title,
      }));
  }, [contacts]);

  const sections = useMemo<ContactSection[]>(() => {
    if (debouncedQuery) {
      const searchData = filteredMyselfContact
        ? [
            filteredMyselfContact,
            ...contacts.filter((contact) => contact.id !== filteredMyselfContact.id),
          ]
        : contacts;

      return [
        {
          data: searchData,
          kind: "search",
          title: "",
        },
      ];
    }

    if (!filteredMyselfContact) {
      return alphabetSections;
    }

    return [
      {
        data: [filteredMyselfContact],
        kind: "myself",
        title: myselfSectionTitle,
      },
      ...alphabetSections,
    ];
  }, [alphabetSections, contacts, debouncedQuery, filteredMyselfContact, myselfSectionTitle]);

  const sectionLetters = useMemo(
    () => alphabetSections.map((section) => section.title),
    [alphabetSections],
  );

  const {
    rows: flatRows,
    stickyHeaderIndices,
    letterToIndex,
  } = useMemo(() => buildContactsFlatRows(sections), [sections]);

  const isSearchActive = debouncedQuery.length > 0;

  const reloadContacts = useCallback(async () => {
    await fetchContactsPage({ offset: 0, query: debouncedQuery });
  }, [debouncedQuery, fetchContactsPage]);

  const handleEndReached = useCallback(() => {
    if (!hasMoreContacts || isLoadingMore || isSearching || loading) {
      return;
    }

    void fetchContactsPage({
      append: true,
      offset: contacts.length,
      query: debouncedQuery,
    });
  }, [
    debouncedQuery,
    fetchContactsPage,
    hasMoreContacts,
    isLoadingMore,
    isSearching,
    contacts.length,
    loading,
  ]);

  const showFullScreenLoader = loading && contacts.length === 0;

  return {
    contacts,
    debouncedQuery,
    error,
    flatRows,
    handleEndReached,
    handleSearchChange,
    isCreateGroupOpen,
    isLoadingMore,
    isSearchActive,
    isSearching,
    letterToIndex,
    listHeaderHeight,
    listViewportHeight,
    myselfContactId,
    reloadContacts,
    reloadGroups,
    searchInput,
    sectionLetters,
    setCreateGroupOpen,
    setListHeaderHeight,
    setListViewportHeight,
    showFullScreenLoader,
    sortedGroups,
    stickyHeaderIndices,
    totalCount,
  };
}
