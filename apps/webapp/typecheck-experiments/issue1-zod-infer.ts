/**
 * Issue 1 — post-split: consumer types from plain interfaces via @bondery/schemas.
 */
import type { Contact, GroupWithCount } from "@bondery/schemas";

function pickContactName(contact: Contact): string {
  return `${contact.firstName} ${contact.lastName ?? ""}`.trim();
}

function pickGroupLabel(group: GroupWithCount): string {
  return `${group.emoji ?? ""} ${group.label}`.trim();
}

function mapContacts(contacts: Contact[]): string[] {
  return contacts.map((contact) => pickContactName(contact));
}

function mapGroups(groups: GroupWithCount[]): string[] {
  return groups.map((group) => pickGroupLabel(group));
}

function mergeContact(contact: Contact, patch: Partial<Contact>): Contact {
  return { ...contact, ...patch };
}

function mergeGroup(group: GroupWithCount, patch: Partial<GroupWithCount>): GroupWithCount {
  return { ...group, ...patch };
}

function _contactById(contacts: Contact[], id: string): Contact | undefined {
  return contacts.find((contact) => contact.id === id);
}

function _groupById(groups: GroupWithCount[], id: string): GroupWithCount | undefined {
  return groups.find((group) => group.id === id);
}

function sortContacts(contacts: Contact[]): Contact[] {
  return contacts.toSorted((a, b) => a.firstName.localeCompare(b.firstName));
}

function sortGroups(groups: GroupWithCount[]): GroupWithCount[] {
  return groups.toSorted((a, b) => a.label.localeCompare(b.label));
}

export function exerciseZodInferredTypes(
  contacts: Contact[],
  groups: GroupWithCount[],
): { contacts: Contact[]; groups: GroupWithCount[] } {
  const merged = contacts.map((contact) => mergeContact(contact, { headline: contact.headline }));
  const grouped = groups.map((group) =>
    mergeGroup(group, { contactCount: group.contactCount + 1 }),
  );
  return {
    contacts: sortContacts(
      mapContacts(merged).map((_name, index) => merged[index] ?? contacts[0]!),
    ),
    groups: sortGroups(mapGroups(grouped).map((_label, index) => grouped[index] ?? groups[0]!)),
  };
}
