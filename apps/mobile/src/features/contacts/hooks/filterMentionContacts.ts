import { formatContactName } from "@bondery/helpers/contact";
import type { Contact } from "@bondery/schemas";

export const MAX_MENTION_RESULTS = 8;

export function filterMentionContacts(contacts: Contact[], query: string): Contact[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return contacts.slice(0, MAX_MENTION_RESULTS);
  }

  return contacts
    .filter((contact) => formatContactName(contact).toLowerCase().includes(normalizedQuery))
    .slice(0, MAX_MENTION_RESULTS);
}
