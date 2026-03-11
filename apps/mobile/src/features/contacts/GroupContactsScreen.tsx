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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconArrowLeft, IconSearch } from "@tabler/icons-react-native";
import type { Contact } from "@bondery/types";
import { fetchGroupContacts } from "../../lib/api/client";
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

interface GroupContactsScreenProps {
  groupId: string;
  label: string;
  emoji: string;
}

type ContactSection = {
  title: string;
  data: Contact[];
};

export function GroupContactsScreen({ groupId, label, emoji }: GroupContactsScreenProps) {
  const t = useMobileTranslations();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sectionListRef = useRef<SectionList<Contact, ContactSection>>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const leftSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.leftSwipeAction,
  );
  const rightSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.rightSwipeAction,
  );

  const loadContacts = () => {
    setLoading(true);
    setError(null);
    fetchGroupContacts(groupId, { limit: 200, offset: 0 })
      .then((res) => setContacts(res.contacts || []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("MobileApp.Common.ErrorTitle")),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadContacts();
  }, [groupId]);

  const filteredContacts = useMemo(
    () => contacts.filter((c) => contactMatchesQuery(c, query)),
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

  const executeAction = (contact: Contact, action: "call" | "message") => {
    const primaryPhone = getPrimaryPhone(contact);

    if (!primaryPhone) {
      Alert.alert(t("MobileApp.Common.ErrorTitle"), t("MobileApp.Contacts.MissingPhone"));
      return;
    }

    const scheme = action === "call" ? "tel" : "sms";
    Linking.openURL(`${scheme}:${primaryPhone}`).catch(() => {
      Alert.alert(t("MobileApp.Common.ErrorTitle"), t("MobileApp.Contacts.ActionFailed"));
    });
  };

  const navBarStyle = { paddingTop: insets.top + 8, paddingBottom: 8 };
  const headerTitle = emoji ? `${emoji} ${label}` : label;

  return (
    <View style={styles.screen}>
      <View style={[styles.navBar, navBarStyle]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <IconArrowLeft size={22} stroke="#111827" />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={styles.navRight} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <IconSearch size={16} stroke="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("MobileApp.Contacts.SearchPlaceholder")}
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
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
                selected={false}
                selectionMode={false}
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
                onToggleSelect={() => {}}
                onExecuteAction={executeAction}
                onPress={(id) => router.push({ pathname: "/contact/[id]", params: { id } })}
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
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  backButton: {
    padding: 4,
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginHorizontal: 8,
  },
  navRight: {
    width: 30,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
  listContainer: {
    flex: 1,
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sectionHeader: {
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#111827",
  },
  retryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 15,
  },
});
