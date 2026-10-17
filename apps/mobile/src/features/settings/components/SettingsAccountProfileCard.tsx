import type { Contact } from "@bondery/schemas";
import { useMemo } from "react";
import { View } from "react-native";
import { PersonAvatar } from "../../../components/PersonAvatar";
import { Group } from "../../../components/ui/Group";
import { Paper } from "../../../components/ui/Paper";
import { Text } from "../../../components/ui/Text";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { formatContactName } from "../../contacts/contactUtils";

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
  const avatarUrl = contact?.avatar ?? fallbackAvatarUrl ?? null;
  const personId = contact?.id ?? "account-profile-fallback";

  return (
    <Paper withBorder>
      <Group className="px-4 py-4">
        <PersonAvatar
          initials={profileContact ? undefined : "?"}
          person={{
            firstName: profileContact?.firstName ?? null,
            id: personId,
            lastName: profileContact?.lastName ?? null,
          }}
          size={MOBILE_LAYOUT.avatar.profile}
          skipLocalFile={personId === "account-profile-fallback"}
          uri={avatarUrl}
        />

        <View className="min-w-0 flex-1 gap-0.5">
          {displayName ? (
            <Text fw={600} numberOfLines={1} size="xl">
              {displayName}
            </Text>
          ) : null}
          {email ? (
            <Text c="secondary" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
      </Group>
    </Paper>
  );
}
