import type {
  Contact,
  CreateContactInput,
  ReplaceImportantDatesInput,
  UpdateContactInput,
} from "@bondery/schemas";
import { submitSyncMutation } from "../sync/mutation-service";
import { normalizeSyncDatetime } from "../sync/sync-datetime";
import { generateUuid } from "../sync/uuid";
import {
  getContact,
  getMyselfContact,
  getMyselfContactId,
  listContactGroups,
  listContactImportantDates,
  listContactTags,
  listContacts,
} from "../sync/repositories/contacts";

function newId(): string {
  return generateUuid();
}

function optionalBaseUpdatedAt(value?: string | null) {
  const normalized = normalizeSyncDatetime(value);
  return normalized ? { baseUpdatedAt: normalized } : {};
}

export const contactsDomain = {
  list: listContacts,
  get: getContact,
  getMyself: getMyselfContact,
  getMyselfId: getMyselfContactId,
  listGroups: listContactGroups,
  listTags: listContactTags,
  listImportantDates: listContactImportantDates,

  create(input: {
    firstName: string;
    middleName?: string;
    lastName?: string;
    linkedin?: string;
  }): Contact {
    const id = newId();
    submitSyncMutation({
      type: "contact.create",
      payload: { ...input, id },
    });
    const contact = getContact(id);
    if (!contact) {
      throw new Error("Failed to create contact locally");
    }
    return contact;
  },

  update(
    personId: string,
    input: UpdateContactInput,
    baseUpdatedAt?: string | null,
  ): Contact {
    submitSyncMutation({
      type: "contact.update",
      entityId: personId,
      payload: input,
      ...optionalBaseUpdatedAt(baseUpdatedAt),
    });
    const contact = getContact(personId);
    if (!contact) {
      throw new Error("Failed to update contact locally");
    }
    return contact;
  },

  delete(personId: string, baseUpdatedAt?: string | null): void {
    submitSyncMutation({
      type: "contact.delete",
      entityId: personId,
      payload: {},
      ...optionalBaseUpdatedAt(baseUpdatedAt),
    });
  },

  deleteMany(personIds: string[]): void {
    for (const personId of personIds) {
      const contact = getContact(personId);
      contactsDomain.delete(personId, contact?.updatedAt ?? undefined);
    }
  },

  replaceImportantDates(personId: string, dates: ReplaceImportantDatesInput): Contact {
    return contactsDomain.update(personId, { importantDates: dates });
  },

  addTag(personId: string, tagId: string): void {
    submitSyncMutation({
      type: "contact.addTag",
      entityId: personId,
      payload: { tagId },
    });
  },

  removeTag(personId: string, tagId: string): void {
    submitSyncMutation({
      type: "contact.removeTag",
      entityId: personId,
      payload: { tagId },
    });
  },

  /** Convenience wrapper matching createContactSheet schema output. */
  createFromFullName(parsed: CreateContactInput & {
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
  }): Contact {
    return contactsDomain.create({
      firstName: parsed.firstName,
      middleName: parsed.middleName ?? undefined,
      lastName: parsed.lastName ?? undefined,
    });
  },
};
