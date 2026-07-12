import type { Contact } from "@bondery/schemas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { DEBOUNCE_MS, GROUP_CONTACTS_FETCH_LIMIT } from "../../../lib/config";
import { useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import {
  type MobilePreferencesState,
  useMobilePreferences,
} from "../../../lib/preferences/useMobilePreferences";
import { listGroupMembers } from "../../../lib/sync/hooks/useSyncQuery";
import { useSync } from "../../../lib/sync/SyncProvider";
import { buildContactsFlatRows, type ContactSection } from "../contactsFlatList";
import { formatContactName, getContactInitial } from "../contactUtils";

interface UseGroupContactsScreenDataOptions {
  groupId: string;
}

export function useGroupContactsScreenData({ groupId }: UseGroupContactsScreenDataOptions) {
  const t = useCommonTranslations();
  const latestRequestRef = useRef(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebouncedValue(searchInput.trim(), DEBOUNCE_MS.search);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const recordGroupOpened = useMobilePreferences(
    (state: MobilePreferencesState) => state.recordGroupOpened,
  );
  const { revision: syncRevision } = useSync();

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
        const response = listGroupMembers({
          groupId,
          limit: GROUP_CONTACTS_FETCH_LIMIT,
          offset: 0,
          query,
        });

        if (requestId !== latestRequestRef.current) {
          return;
        }

        setContacts(response.contacts);
        setTotalCount(response.totalCount);
      } catch (loadError) {
        if (requestId !== latestRequestRef.current) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : t("feedback.errorTitle"));
      } finally {
        if (requestId === latestRequestRef.current) {
          setLoading(false);
          setIsSearching(false);
        }
      }
    },
    [groupId, t],
  );

  const reloadMembers = useCallback(async () => {
    await fetchGroupContactsPage({ query: debouncedQuery });
  }, [debouncedQuery, fetchGroupContactsPage]);

  useEffect(() => {
    void syncRevision;
    void fetchGroupContactsPage({
      query: debouncedQuery,
      showInitialLoader: true,
    });
  }, [debouncedQuery, fetchGroupContactsPage, syncRevision]);

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
          data: contacts,
          kind: "search",
          title: "",
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
        data: [...data].sort((left, right) =>
          formatContactName(left).localeCompare(formatContactName(right)),
        ),
        kind: "alphabet" as const,
        title,
      }));
  }, [contacts, isSearchActive]);

  const sectionLetters = useMemo(
    () => sections.filter((section) => section.kind === "alphabet").map((section) => section.title),
    [sections],
  );

  const {
    rows: flatRows,
    stickyHeaderIndices,
    letterToIndex,
  } = useMemo(() => buildContactsFlatRows(sections), [sections]);

  const showFullScreenLoader = loading && contacts.length === 0;

  return {
    contacts,
    debouncedQuery,
    error,
    flatRows,
    handleSearchChange,
    isSearchActive,
    isSearching,
    letterToIndex,
    listViewportHeight,
    reloadMembers,
    searchInput,
    sectionLetters,
    setListViewportHeight,
    showFullScreenLoader,
    stickyHeaderIndices,
    totalCount,
  };
}
