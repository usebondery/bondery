import type { Contact } from "@bondery/schemas";
import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { normalizeMobileUrlForDevice } from "../../../lib/config";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  formatContactName,
  getAvatarColorHex,
  getContactInitials,
} from "../../contacts/contactUtils";
import { SettingsSectionCard } from "./SettingsSectionCard";

interface SettingsAccountProfileCardProps {
  contact: Contact | null;
  email: string | null;
  fallbackAvatarUrl?: string | null;
  fallbackName?: string | null;
}

function buildFallbackContact(name: string): Contact {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

  return {
    avatar: null,
    createdAt: "",
    emails: null,
    facebook: null,
    firstName,
    gisPoint: null,
    headline: null,
    id: "account-profile-fallback",
    instagram: null,
    keepFrequencyDays: null,
    language: null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    lastName,
    latitude: null,
    linkedin: null,
    location: null,
    longitude: null,
    middleName: null,
    myself: true,
    notes: null,
    phones: null,
    signal: null,
    timezone: null,
    updatedAt: "",
    userId: "",
    website: null,
    whatsapp: null,
  };
}

export function SettingsAccountProfileCard({
  contact,
  email,
  fallbackName,
  fallbackAvatarUrl,
}: SettingsAccountProfileCardProps) {
  const colors = useMobileThemeColors();

  const profileContact = useMemo(() => {
    if (contact) {
      return contact;
    }

    if (fallbackName?.trim()) {
      return buildFallbackContact(fallbackName);
    }

    return null;
  }, [contact, fallbackName]);

  const displayName = profileContact ? formatContactName(profileContact) : null;
  const avatarColor = profileContact ? getAvatarColorHex(profileContact) : colors.surfaceMuted;
  const initials = profileContact ? getContactInitials(profileContact) : "?";
  const avatarUri = contact?.avatar
    ? normalizeMobileUrlForDevice(contact.avatar)
    : fallbackAvatarUrl
      ? normalizeMobileUrlForDevice(fallbackAvatarUrl)
      : undefined;

  const shouldShowAvatarImage = !!avatarUri;

  return (
    <SettingsSectionCard>
      <View style={styles.row}>
        <View
          style={[
            styles.avatar,
            shouldShowAvatarImage
              ? { backgroundColor: colors.surfaceMuted }
              : { backgroundColor: avatarColor },
          ]}
        >
          {shouldShowAvatarImage ? (
            <Image resizeMode="cover" source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>{initials}</Text>
          )}
        </View>

        <View style={styles.textWrap}>
          {displayName ? (
            <Text numberOfLines={1} style={[styles.name, { color: colors.textPrimary }]}>
              {displayName}
            </Text>
          ) : null}
          {email ? (
            <Text numberOfLines={1} style={[styles.email, { color: colors.textSecondary }]}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>
    </SettingsSectionCard>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    width: 52,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  email: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
  },
  name: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.cardTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
});
