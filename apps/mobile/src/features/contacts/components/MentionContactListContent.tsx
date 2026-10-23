import type { Contact } from "@bondery/schemas";
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItemInfo,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Pressable } from "@/components/ui/Pressable";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { PersonAvatar } from "../../../components/PersonAvatar";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { formatContactName } from "../contactUtils";

const ROW_MIN_HEIGHT = 56;

interface MentionContactListContentProps {
  contacts: Contact[];
  loading: boolean;
  onSelect: (contact: Contact) => void;
}

function MentionContactRow({ contact, onPress }: { contact: Contact; onPress: () => void }) {
  const colors = useMobileThemeColors();
  const name = formatContactName(contact);

  return (
    <Pressable
      accessibilityHint="Inserts a link to this contact"
      accessibilityLabel={`Mention ${name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <PersonAvatar person={contact} size={MOBILE_LAYOUT.avatar.list} uri={contact.avatar} />
      <View style={styles.textCol}>
        <Text numberOfLines={1} style={[styles.name, { color: colors.textPrimary }]}>
          {name}
        </Text>
      </View>
    </Pressable>
  );
}

export function MentionContactListContent({
  contacts,
  loading,
  onSelect,
}: MentionContactListContentProps) {
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();

  function renderItem({ item }: ListRenderItemInfo<Contact>) {
    return <MentionContactRow contact={item} onPress={() => onSelect(item)} />;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (contacts.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No contacts yet</Text>
        <Text style={[styles.emptyCaption, { color: colors.textMuted }]}>
          Add people to mention them in notes.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={contacts}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            {t("feedback.noResults")}
          </Text>
        </View>
      }
      renderItem={renderItem}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
    minHeight: 88,
    paddingHorizontal: 16,
  },
  emptyCaption: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    textAlign: "center",
  },
  list: {
    maxHeight: 280,
  },
  name: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: ROW_MIN_HEIGHT,
    paddingHorizontal: 12,
  },
  textCol: {
    flex: 1,
    justifyContent: "center",
  },
});
