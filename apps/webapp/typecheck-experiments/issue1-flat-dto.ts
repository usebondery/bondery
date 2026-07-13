/**
 * Issue 1 — variant: flat DTO interfaces (no Zod generic trees in the type graph).
 */
interface ContactDto {
  avatar: string | null;
  firstName: string;
  headline: string | null;
  id: string;
  lastName: string | null;
  userId: string;
}

interface GroupWithCountDto {
  color: string | null;
  contactCount: number;
  createdAt: string;
  emoji: string | null;
  id: string;
  label: string;
  updatedAt: string;
  userId: string;
}

function pickContactName(contact: ContactDto): string {
  return `${contact.firstName} ${contact.lastName ?? ""}`.trim();
}

function pickGroupLabel(group: GroupWithCountDto): string {
  return `${group.emoji ?? ""} ${group.label}`.trim();
}

function mapContacts(contacts: ContactDto[]): string[] {
  return contacts.map((contact) => pickContactName(contact));
}

function mapGroups(groups: GroupWithCountDto[]): string[] {
  return groups.map((group) => pickGroupLabel(group));
}

function mergeContact(contact: ContactDto, patch: Partial<ContactDto>): ContactDto {
  return { ...contact, ...patch };
}

function mergeGroup(
  group: GroupWithCountDto,
  patch: Partial<GroupWithCountDto>,
): GroupWithCountDto {
  return { ...group, ...patch };
}

function _contactById(contacts: ContactDto[], id: string): ContactDto | undefined {
  return contacts.find((contact) => contact.id === id);
}

function _groupById(groups: GroupWithCountDto[], id: string): GroupWithCountDto | undefined {
  return groups.find((group) => group.id === id);
}

function sortContacts(contacts: ContactDto[]): ContactDto[] {
  return contacts.toSorted((a, b) => a.firstName.localeCompare(b.firstName));
}

function sortGroups(groups: GroupWithCountDto[]): GroupWithCountDto[] {
  return groups.toSorted((a, b) => a.label.localeCompare(b.label));
}

export function exerciseFlatDtoTypes(
  contacts: ContactDto[],
  groups: GroupWithCountDto[],
): { contacts: ContactDto[]; groups: GroupWithCountDto[] } {
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
