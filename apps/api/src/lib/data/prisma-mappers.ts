import type { Prisma } from "@bondery/db";

export const contactListSelect = {
  avatarUpdatedAt: true,
  createdAt: true,
  firstName: true,
  hasAvatar: true,
  headline: true,
  id: true,
  keepFrequencyDays: true,
  language: true,
  lastInteraction: true,
  lastInteractionActivityId: true,
  lastName: true,
  latitude: true,
  location: true,
  longitude: true,
  middleName: true,
  myself: true,
  notes: true,
  notesUpdatedAt: true,
  timezone: true,
  updatedAt: true,
  userId: true,
} satisfies Prisma.PeopleSelect;

export type ContactListRecord = Prisma.PeopleGetPayload<{ select: typeof contactListSelect }>;

export function mapContactListRecord(contact: ContactListRecord) {
  return {
    avatarUpdatedAt: contact.avatarUpdatedAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    firstName: contact.firstName,
    gisPoint: null,
    hasAvatar: contact.hasAvatar,
    headline: contact.headline,
    id: contact.id,
    keepFrequencyDays: contact.keepFrequencyDays,
    language: contact.language,
    lastInteraction: contact.lastInteraction?.toISOString() ?? null,
    lastInteractionActivityId: contact.lastInteractionActivityId,
    lastName: contact.lastName,
    latitude: contact.latitude,
    location: contact.location,
    longitude: contact.longitude,
    middleName: contact.middleName,
    myself: contact.myself,
    notes: contact.notes,
    notesUpdatedAt: contact.notesUpdatedAt?.toISOString() ?? null,
    timezone: contact.timezone,
    updatedAt: contact.updatedAt.toISOString(),
    userId: contact.userId,
  };
}

export const contactDetailSelect = {
  avatarUpdatedAt: true,
  createdAt: true,
  firstName: true,
  hasAvatar: true,
  headline: true,
  id: true,
  keepFrequencyDays: true,
  language: true,
  lastInteraction: true,
  lastInteractionActivityId: true,
  lastName: true,
  latitude: true,
  location: true,
  longitude: true,
  middleName: true,
  myself: true,
  notes: true,
  notesUpdatedAt: true,
  timezone: true,
  updatedAt: true,
  userId: true,
} satisfies Prisma.PeopleSelect;

export type ContactDetailRecord = Prisma.PeopleGetPayload<{ select: typeof contactDetailSelect }>;

export function mapContactDetailRecord(contact: ContactDetailRecord) {
  return mapContactListRecord(contact as ContactListRecord);
}

export const selectableContactSelect = {
  avatarUpdatedAt: true,
  firstName: true,
  hasAvatar: true,
  headline: true,
  id: true,
  lastName: true,
  location: true,
  middleName: true,
  myself: true,
  updatedAt: true,
} satisfies Prisma.PeopleSelect;

export type SelectableContactRecord = Prisma.PeopleGetPayload<{
  select: typeof selectableContactSelect;
}>;

export function mapSelectableContactRecord(contact: SelectableContactRecord) {
  return {
    avatarUpdatedAt: contact.avatarUpdatedAt?.toISOString() ?? null,
    firstName: contact.firstName,
    hasAvatar: contact.hasAvatar,
    headline: contact.headline,
    id: contact.id,
    lastName: contact.lastName,
    location: contact.location,
    middleName: contact.middleName,
    myself: contact.myself,
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export const tagSelect = {
  color: true,
  createdAt: true,
  id: true,
  label: true,
  updatedAt: true,
  userId: true,
} satisfies Prisma.TagSelect;

export function mapTagRecord(tag: Prisma.TagGetPayload<{ select: typeof tagSelect }>) {
  return {
    color: tag.color,
    createdAt: tag.createdAt.toISOString(),
    id: tag.id,
    label: tag.label,
    updatedAt: tag.updatedAt.toISOString(),
    userId: tag.userId,
  };
}

export const chatSessionSelect = {
  createdAt: true,
  id: true,
  title: true,
  updatedAt: true,
  userId: true,
} satisfies Prisma.ChatSessionSelect;

export function mapChatSessionRecord(
  session: Prisma.ChatSessionGetPayload<{ select: typeof chatSessionSelect }>,
) {
  return {
    createdAt: session.createdAt.toISOString(),
    id: session.id,
    title: session.title,
    updatedAt: session.updatedAt.toISOString(),
    userId: session.userId,
  };
}

export const chatMessageSelect = {
  content: true,
  createdAt: true,
  id: true,
  role: true,
  sessionId: true,
} satisfies Prisma.ChatMessageSelect;

export function mapChatMessageRecord(
  message: Prisma.ChatMessageGetPayload<{ select: typeof chatMessageSelect }>,
) {
  return {
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    id: message.id,
    role: message.role,
    sessionId: message.sessionId,
  };
}
