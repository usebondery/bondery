import type {
  Contact,
  CreateContactInput,
  Group,
  ImportantDate,
  ReplaceImportantDatesInput,
  Tag,
  UpdateContactInput,
} from "@bondery/schemas";
import type { ContactsListParams } from "../resources/contacts";
import { generateUuid } from "../sync/ids";
import { submitSyncMutation } from "../sync/mutation-service";
import {
  getContact as getContactFromRepo,
  getMyselfContact as getMyselfContactFromRepo,
  getMyselfContactId as getMyselfContactIdFromRepo,
  listContactGroups,
  listContactImportantDates,
  listContacts as listContactsFromRepo,
  listContactTags,
} from "../sync/repositories/contacts";
import { normalizeSyncDatetime } from "../sync/sync-datetime";

function newId(): string {
  return generateUuid();
}

function optionalBaseUpdatedAt(value?: string | null) {
  const normalized = normalizeSyncDatetime(value);
  return normalized ? { baseUpdatedAt: normalized } : {};
}

export type { ContactsListParams };

export function listContacts(params: ContactsListParams): {
  contacts: Contact[];
  totalCount: number;
} {
  return listContactsFromRepo(params);
}

export function getContact(personId: string): Contact | null {
  return getContactFromRepo(personId);
}

export function getMyselfContact(): Contact | null {
  return getMyselfContactFromRepo();
}

export function getMyselfContactId(): string | null {
  return getMyselfContactIdFromRepo();
}

export function getContactGroups(personId: string): Group[] {
  return listContactGroups(personId);
}

export function getContactTags(personId: string): Tag[] {
  return listContactTags(personId);
}

export function getContactImportantDates(personId: string): ImportantDate[] {
  return listContactImportantDates(personId);
}

export function createContact(input: {
  firstName: string;
  middleName?: string;
  lastName?: string;
  linkedin?: string;
}): Contact {
  const id = newId();
  submitSyncMutation({
    payload: { ...input, id },
    type: "contact.create",
  });
  const contact = getContact(id);
  if (!contact) {
    throw new Error("Failed to create contact locally");
  }
  return contact;
}

export function updateContact(
  personId: string,
  input: UpdateContactInput,
  baseUpdatedAt?: string | null,
): Contact {
  submitSyncMutation({
    entityId: personId,
    payload: input,
    type: "contact.update",
    ...optionalBaseUpdatedAt(baseUpdatedAt),
  });
  const contact = getContact(personId);
  if (!contact) {
    throw new Error("Failed to update contact locally");
  }
  return contact;
}

export function deleteContact(personId: string, baseUpdatedAt?: string | null): void {
  submitSyncMutation({
    entityId: personId,
    payload: {},
    type: "contact.delete",
    ...optionalBaseUpdatedAt(baseUpdatedAt),
  });
}

export function deleteContacts(personIds: string[]): void {
  for (const personId of personIds) {
    const contact = getContact(personId);
    deleteContact(personId, contact?.updatedAt ?? undefined);
  }
}

export function putContactImportantDates(
  personId: string,
  dates: ReplaceImportantDatesInput,
): Contact {
  return updateContact(personId, { importantDates: dates });
}

export function addTagToContact(personId: string, tagId: string): void {
  submitSyncMutation({
    entityId: personId,
    payload: { tagId },
    type: "contact.addTag",
  });
}

export function removeTagFromContact(personId: string, tagId: string): void {
  submitSyncMutation({
    entityId: personId,
    payload: { tagId },
    type: "contact.removeTag",
  });
}

/** Convenience wrapper matching createContactSheet schema output. */
export function createContactFromFullName(
  parsed: CreateContactInput & {
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
  },
): Contact {
  return createContact({
    firstName: parsed.firstName,
    lastName: parsed.lastName ?? undefined,
    middleName: parsed.middleName ?? undefined,
  });
}

/** @deprecated Use named exports (`createContact`, `listContacts`, …). */
export const contactsDomain = {
  addTag: addTagToContact,
  create: createContact,
  createFromFullName: createContactFromFullName,
  delete: deleteContact,
  deleteMany: deleteContacts,
  get: getContact,
  getMyself: getMyselfContact,
  getMyselfId: getMyselfContactId,
  list: listContacts,
  listGroups: getContactGroups,
  listImportantDates: getContactImportantDates,
  listTags: getContactTags,
  removeTag: removeTagFromContact,
  replaceImportantDates: putContactImportantDates,
  update: updateContact,
};
