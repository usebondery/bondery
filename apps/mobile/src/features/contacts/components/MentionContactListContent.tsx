import type { Contact } from "@bondery/schemas";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { normalizeMobileUrlForDevice } from "../../../lib/config";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  formatContactName,
  getAvatarColorHex,
  getContactInitials,
} from "../contactUtils";

const AVATAR_SIZE = 34;
const ROW_MIN_HEIGHT = 56;

interface MentionContactListContentProps {
  contacts: Contact[];
  loading: boolean;
  onSelect: (contact: Contact) => void;
}

function MentionContactRow({
  contact,
  onPress,
}: {
  contact: Contact;
  onPress: () => void;
}) {
  const colors = useMobileThemeColors();
  const name = formatContactName(contact);
  const avatarColor = getAvatarColorHex(contact);
  const avatarUri = contact.avatar ? normalizeMobileUrlForDevice(contact.avatar) : undefined;
  const showAvatarImage = !!avatarUri;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.surfacePressed },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Mention ${name}`}
      accessibilityHint="Inserts a link to this contact"
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: avatarColor },
        ]}
      >
        {showAvatarImage ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={[styles.avatarInitials, { color: colors.textOnPrimary }]}>
            {getContactInitials(contact)}
          </Text>
        )}
      </View>
      <View style={styles.textCol}>
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
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
  const colors = useMobileThemeColors();
  const t = useMobileTranslations();

  function renderItem({ item }: ListRenderItemInfo<Contact>) {
    return (
      <MentionContactRow
        contact={item}
        onPress={() => onSelect(item)}
      />
    );
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
        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
          No contacts yet
        </Text>
        <Text style={[styles.emptyCaption, { color: colors.textMuted }]}>
          Add people to mention them in notes.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={contacts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      style={styles.list}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            {t("MobileApp.Common.NoResults")}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 280,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: ROW_MIN_HEIGHT,
    paddingHorizontal: 12,
    gap: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarInitials: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  textCol: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  centered: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 4,
  },
  emptyTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    textAlign: "center",
  },
  emptyCaption: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    textAlign: "center",
  },
});
