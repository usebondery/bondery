"use client";

import type { ContactSelectable } from "@bondery/schemas";
import { useSyncExternalStore } from "react";

export interface ActivityFormDraft {
  date: string;
  description: string;
  participantIds: string[];
  title: string;
  type: string;
}

const EMPTY_CREATED_CONTACTS: ContactSelectable[] = [];
const createdContactsByParentModalId = new Map<string, ContactSelectable[]>();
const activityFormDraftByModalId = new Map<string, ActivityFormDraft>();
const lockedActivityDraftModalIds = new Set<string>();
const listeners = new Set<() => void>();

function emitCreatedContactsChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribeCreatedContacts(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/**
 * Stacked Mantine modals remount the parent overlay when the child closes.
 * Keep created contacts and the parent form draft outside React so the
 * log-interaction modal can rehydrate after remount.
 */
export function rememberCreatedContactForModal(
  parentModalId: string,
  contact: ContactSelectable,
): void {
  const current = createdContactsByParentModalId.get(parentModalId) ?? [];
  if (current.some((item) => item.id === contact.id)) {
    return;
  }

  createdContactsByParentModalId.set(parentModalId, [...current, contact]);
  emitCreatedContactsChange();
}

export function getCreatedContactsForModal(parentModalId: string): ContactSelectable[] {
  return createdContactsByParentModalId.get(parentModalId) ?? EMPTY_CREATED_CONTACTS;
}

function copyActivityFormDraft(draft: ActivityFormDraft): ActivityFormDraft {
  return {
    date: draft.date,
    description: draft.description,
    participantIds: [...draft.participantIds],
    title: draft.title,
    type: draft.type,
  };
}

function isActivityDraftBodyEmpty(draft: ActivityFormDraft): boolean {
  return draft.title === "" && draft.description === "";
}

export function lockActivityFormDraft(parentModalId: string): void {
  lockedActivityDraftModalIds.add(parentModalId);
}

export function unlockActivityFormDraft(parentModalId: string): void {
  lockedActivityDraftModalIds.delete(parentModalId);
}

export function saveActivityFormDraft(parentModalId: string, draft: ActivityFormDraft): void {
  if (lockedActivityDraftModalIds.has(parentModalId)) {
    return;
  }

  const existing = activityFormDraftByModalId.get(parentModalId);
  // Stacked-modal remount resets the form to empty initial values and fires
  // onValuesChange. Do not let that wipe a draft the user already typed.
  if (existing && !isActivityDraftBodyEmpty(existing) && isActivityDraftBodyEmpty(draft)) {
    activityFormDraftByModalId.set(parentModalId, {
      date: existing.date,
      description: existing.description,
      participantIds: Array.from(new Set([...existing.participantIds, ...draft.participantIds])),
      title: existing.title,
      type: existing.type,
    });
    return;
  }

  activityFormDraftByModalId.set(parentModalId, copyActivityFormDraft(draft));
}

export function getActivityFormDraft(parentModalId: string): ActivityFormDraft | undefined {
  return activityFormDraftByModalId.get(parentModalId);
}

export function forgetActivityModalState(parentModalId: string): void {
  createdContactsByParentModalId.delete(parentModalId);
  activityFormDraftByModalId.delete(parentModalId);
  lockedActivityDraftModalIds.delete(parentModalId);
  emitCreatedContactsChange();
}

export function useCreatedContactsForModal(parentModalId: string): ContactSelectable[] {
  const getSnapshot = () => getCreatedContactsForModal(parentModalId);

  return useSyncExternalStore(subscribeCreatedContacts, getSnapshot, getSnapshot);
}
