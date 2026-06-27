import type { ContactAddressType, ContactType } from "@bondery/schemas";

export type ContactChannelTypeOption = {
  value: ContactType;
  emoji: string;
};

export type ContactAddressTypeOption = {
  value: ContactAddressType;
  emoji: string;
};

export const CONTACT_CHANNEL_TYPE_OPTIONS: readonly ContactChannelTypeOption[] = [
  { value: "home", emoji: "🏠" },
  { value: "work", emoji: "💼" },
] as const;

export const CONTACT_ADDRESS_TYPE_OPTIONS: readonly ContactAddressTypeOption[] = [
  { value: "home", emoji: "🏠" },
  { value: "work", emoji: "💼" },
  { value: "other", emoji: "📍" },
] as const;

export function getContactChannelTypeEmoji(type: ContactType): string {
  return CONTACT_CHANNEL_TYPE_OPTIONS.find((option) => option.value === type)?.emoji ?? "🏠";
}

export function getContactAddressTypeEmoji(type: ContactAddressType): string {
  return CONTACT_ADDRESS_TYPE_OPTIONS.find((option) => option.value === type)?.emoji ?? "📍";
}
