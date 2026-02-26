import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Contact } from "@bondery/types";
import type { ContactSortOrder } from "../../lib/api/client";
import { deleteContacts, fetchContacts } from "../../lib/api/client";
import {
  MobilePreferencesState,
  useMobilePreferences,
} from "../../lib/preferences/useMobilePreferences";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { AlphabetScroller } from "./components/AlphabetScroller";
import { ContactRow } from "./components/ContactRow";
import {
  contactMatchesQuery,
  formatContactName,
  getContactInitial,
  getPrimaryPhone,
} from "./contactUtils";

type ContactSection = {
  title: string;
  data: Contact[];
};

const SORT_OPTIONS: Array<{ value: ContactSortOrder; key: string }> = [
  { value: "nameAsc", key: "MobileApp.Contacts.SortNameAsc" },
  { value: "nameDesc", key: "MobileApp.Contacts.SortNameDesc" },
  { value: "surnameAsc", key: "MobileApp.Contacts.SortSurnameAsc" },
  { value: "surnameDesc", key: "MobileApp.Contacts.SortSurnameDesc" },
];

export function ContactsScreen() {
  const t = useMobileTranslations();
  const sectionListRef = useRef<SectionList<Contact, ContactSection>>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ContactSortOrder>("nameAsc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const leftSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.leftSwipeAction,
  );
  const rightSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.rightSwipeAction,
  );

  const loadContacts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchContacts({
        query,
        sort,
        limit: 500,
        offset: 0,
      });
      setContacts(response.contacts || []);
    } catch (loadError) {
      const errorMessage =
        loadError instanceof Error ? loadError.message : t("MobileApp.Common.UnknownError");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [sort]);

  const filteredContacts = useMemo(
    () => contacts.filter((contact) => contactMatchesQuery(contact, query)),
    [contacts, query],
  );

  const sections = useMemo<ContactSection[]>(() => {
    const grouped = new Map<string, Contact[]>();

    filteredContacts.forEach((contact) => {
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
        data: data.sort((left, right) =>
          formatContactName(left).localeCompare(formatContactName(right)),
        ),
      }));
  }, [filteredContacts]);

  const sectionLetters = useMemo(() => sections.map((section) => section.title), [sections]);

  const toggleContactSelection = (contactId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }

      return next;
    });
  };

  const selectionMode = selectedIds.size > 0;

  const executeAction = (contact: Contact, action: "call" | "message") => {
    const primaryPhone = getPrimaryPhone(contact);

    if (!primaryPhone) {
      Alert.alert(t("MobileApp.Common.ErrorTitle"), t("MobileApp.Contacts.MissingPhone"));
      return;
    }

    const scheme = action === "call" ? "tel" : "sms";
    const url = `${scheme}:${primaryPhone}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(t("MobileApp.Common.ErrorTitle"), t("MobileApp.Contacts.ActionFailed"));
    });
  };

  const deleteSelectedContacts = () => {
    if (!selectedIds.size) {
      return;
    }

    Alert.alert(t("MobileApp.Contacts.DeleteTitle"), t("MobileApp.Contacts.DeleteMessage"), [
      { text: t("MobileApp.Common.Cancel"), style: "cancel" },
      {
        text: t("MobileApp.Common.Delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteContacts(Array.from(selectedIds));
            setSelectedIds(new Set());
            await loadContacts();
          } catch {
            Alert.alert(t("MobileApp.Common.ErrorTitle"), t("MobileApp.Contacts.DeleteFailed"));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("MobileApp.Contacts.Title")}</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("MobileApp.Contacts.SearchPlaceholder")}
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((option) => {
            const active = option.value === sort;

            return (
              <Pressable
                key={option.value}
                onPress={() => setSort(option.value)}
                style={[styles.sortButton, active && styles.sortButtonActive]}
              >
                <Text style={[styles.sortButtonText, active && styles.sortButtonTextActive]}>
                  {t(option.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectionMode ? (
          <View style={styles.selectionActions}>
            <Text style={styles.selectionCount}>
              {t("MobileApp.Contacts.SelectedCount").replace("{count}", String(selectedIds.size))}
            </Text>
            <Pressable onPress={deleteSelectedContacts} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>{t("MobileApp.Common.Delete")}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadContacts}>
            <Text style={styles.retryText}>{t("MobileApp.Common.Retry")}</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.listContainer}>
          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item: Contact) => item.id}
            stickySectionHeadersEnabled
            showsVerticalScrollIndicator={false}
            renderSectionHeader={({ section }: { section: ContactSection }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }: { item: Contact }) => (
              <ContactRow
                contact={item}
                selected={selectedIds.has(item.id)}
                selectionMode={selectionMode}
                leftSwipeAction={leftSwipeAction}
                rightSwipeAction={rightSwipeAction}
                texts={{
                  call: t("MobileApp.Common.Call"),
                  message: t("MobileApp.Common.Message"),
                  quickActionsTitle: t("MobileApp.Contacts.QuickActions"),
                  select: t("MobileApp.Common.Select"),
                  deselect: t("MobileApp.Common.Deselect"),
                  cancel: t("MobileApp.Common.Cancel"),
                }}
                onToggleSelect={toggleContactSelection}
                onExecuteAction={executeAction}
              />
            )}
            ListEmptyComponent={
              <View style={styles.centeredState}>
                <Text style={styles.emptyText}>{t("MobileApp.Contacts.Empty")}</Text>
              </View>
            }
          />

          <AlphabetScroller
            letters={sectionLetters}
            onLetterChange={(letter) => {
              const targetIndex = sections.findIndex((section) => section.title === letter);

              if (targetIndex >= 0) {
                sectionListRef.current?.scrollToLocation({
                  sectionIndex: targetIndex,
                  itemIndex: 0,
                  animated: false,
                  viewOffset: 0,
                });
              }
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  searchInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  sortButtonActive: {
    backgroundColor: "#111827",
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  sortButtonTextActive: {
    color: "#ffffff",
  },
  selectionActions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectionCount: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "600",
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  deleteButtonText: {
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "700",
  },
  listContainer: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sectionHeaderText: {
    color: "#6b7280",
    fontWeight: "700",
    fontSize: 13,
  },
  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    color: "#991b1b",
    marginBottom: 14,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  emptyText: {
    color: "#6b7280",
  },
});
