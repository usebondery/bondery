import type { Contact } from "@bondery/schemas";
import {
  ActivityIndicator,
  FlatList,
  Image,
  type ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { normalizeMobileUrlForDevice } from "../../../lib/config";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { formatContactName, getAvatarColorHex, getContactInitials } from "../contactUtils";

const AVATAR_SIZE = 34;
const ROW_MIN_HEIGHT = 56;

interface MentionContactListContentProps {
  contacts: Contact[];
  loading: boolean;
  onSelect: (contact: Contact) => void;
}

function MentionContactRow({ contact, onPress }: { contact: Contact; onPress: () => void }) {
  const colors = useMobileThemeColors();
  const name = formatContactName(contact);
  const avatarColor = getAvatarColorHex(contact);
  const avatarUri = contact.avatar ? normalizeMobileUrlForDevice(contact.avatar) : undefined;
  const showAvatarImage = !!avatarUri;

  return (
    <Pressable
      accessibilityHint="Inserts a link to this contact"
      accessibilityLabel={`Mention ${name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        {showAvatarImage ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <Text style={[styles.avatarInitials, { color: colors.textOnPrimary }]}>
            {getContactInitials(contact)}
          </Text>
        )}
      </View>
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
  avatar: {
    alignItems: "center",
    borderRadius: AVATAR_SIZE / 2,
    height: AVATAR_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    width: AVATAR_SIZE,
  },
  avatarImage: {
    height: AVATAR_SIZE,
    width: AVATAR_SIZE,
  },
  avatarInitials: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
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
