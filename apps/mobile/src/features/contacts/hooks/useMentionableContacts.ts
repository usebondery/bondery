import type { Contact } from "@bondery/schemas";
import {
  getContact,
  readContactsList,
  useContact,
  useMyselfContact,
} from "../../../lib/sync/hooks/useSyncQuery";
import { formatContactName } from "../contactUtils";
import { filterMentionContacts, MAX_MENTION_RESULTS } from "./filterMentionContacts";

export { filterMentionContacts, MAX_MENTION_RESULTS };

function mergeContacts(primary: Contact | null, others: Contact[]): Contact[] {
  const byId = new Map<string, Contact>();

  if (primary) {
    byId.set(primary.id, primary);
  }

  for (const contact of others) {
    if (!byId.has(contact.id)) {
      byId.set(contact.id, contact);
    }
  }

  return Array.from(byId.values());
}

interface UseMentionableContactsOptions {
  contactId: string | null;
  isMyselfMode?: boolean;
  /** Avoids a duplicate subject fetch when the editor already loaded the contact. */
  subjectContact?: Contact | null;
}

export function useMentionableContacts({
  contactId,
  isMyselfMode = false,
  subjectContact = null,
}: UseMentionableContactsOptions) {
  const subjectId = !subjectContact && !isMyselfMode ? (contactId ?? undefined) : undefined;
  const { data: fetchedSubject, isInitialSync: isSubjectInitialSync } = useContact(subjectId);
  const { data: fetchedMyself, isInitialSync: isMyselfInitialSync } = useMyselfContact();
  const subject = isMyselfMode
    ? (fetchedMyself ?? subjectContact)
    : (subjectContact ?? fetchedSubject);
  const myself =
    !isMyselfMode && fetchedMyself?.id !== subject?.id ? (fetchedMyself ?? null) : null;
  const myselfContactId = isMyselfMode ? (subject?.id ?? null) : (fetchedMyself?.id ?? null);
  const loading =
    (subjectId !== undefined && !subject && isSubjectInitialSync) ||
    (!fetchedMyself && isMyselfInitialSync);

  function getContactName(id: string) {
    if (subject?.id === id) {
      return formatContactName(subject);
    }
    if (myself?.id === id) {
      return formatContactName(myself);
    }
    const contact = getContact(id);
    return contact ? formatContactName(contact) : undefined;
  }

  function filterContacts(query: string) {
    const listed = readContactsList({
      excludeMyself: true,
      limit: MAX_MENTION_RESULTS,
      query,
    }).contacts;
    const merged = mergeContacts(subject, [...(myself ? [myself] : []), ...listed]);
    return filterMentionContacts(merged, query);
  }

  return {
    filterContacts,
    getContactName,
    loading,
    myselfContactId,
  };
}
