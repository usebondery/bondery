import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { Contact } from "@bondery/schemas";
import { normalizeMobileUrlForDevice } from "../../../lib/config";
import {
  formatContactName,
  getAvatarColorHex,
  getContactInitials,
} from "../../contacts/contactUtils";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { SettingsSectionCard } from "./SettingsSectionCard";

interface SettingsAccountProfileCardProps {
  contact: Contact | null;
  email: string | null;
  fallbackName?: string | null;
  fallbackAvatarUrl?: string | null;
}

function buildFallbackContact(name: string): Contact {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

  return {
    id: "account-profile-fallback",
    userId: "",
    firstName,
    middleName: null,
    lastName,
    headline: null,
    location: null,
    notes: null,
    avatar: null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    keepFrequencyDays: null,
    createdAt: "",
    phones: null,
    emails: null,
    linkedin: null,
    instagram: null,
    whatsapp: null,
    facebook: null,
    website: null,
    signal: null,
    myself: true,
    language: null,
    timezone: null,
    gisPoint: null,
    latitude: null,
    longitude: null,
  };
}

export function SettingsAccountProfileCard({
  contact,
  email,
  fallbackName,
  fallbackAvatarUrl,
}: SettingsAccountProfileCardProps) {
  const colors = useMobileThemeColors();
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);

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

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [avatarUri]);

  const shouldShowAvatarImage = !!avatarUri && !avatarImageFailed;

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
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={() => setAvatarImageFailed(true)}
            />
          ) : (
            <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
              {initials}
            </Text>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.cardTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  email: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
  },
});
