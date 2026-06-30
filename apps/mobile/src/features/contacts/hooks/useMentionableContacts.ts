import type { Contact } from "@bondery/schemas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contactsDomain } from "../../../lib/domains/contacts";
import { CONTACTS_PAGE_SIZE } from "../../../lib/config";
import { useSync } from "../../../lib/sync/SyncProvider";
import { formatContactName } from "../contactUtils";

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

function fetchContactsPage(offset: number): Contact[] {
  const response = contactsDomain.list({
    query: "",
    limit: CONTACTS_PAGE_SIZE,
    offset,
  });

  return response.contacts;
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [myselfContactId, setMyselfContactId] = useState<string | null>(null);
  const backgroundLoadStartedRef = useRef(false);
  const { revision } = useSync();

  useEffect(() => {
    let cancelled = false;
    backgroundLoadStartedRef.current = false;

    function loadRemainingPages(startOffset: number) {
      let offset = startOffset;

      while (!cancelled) {
        const page = fetchContactsPage(offset);
        if (page.length === 0) {
          break;
        }

        setContacts((current) => mergeContacts(null, [...current, ...page]));

        if (page.length < CONTACTS_PAGE_SIZE) {
          break;
        }

        offset += CONTACTS_PAGE_SIZE;
      }
    }

    function load() {
      setLoading(true);

      try {
        const fetchedSubject =
          !subjectContact && Boolean(contactId) && !isMyselfMode
            ? contactsDomain.get(contactId as string)
            : null;
        const fetchedMyself = contactsDomain.getMyself();
        const firstPage = fetchContactsPage(0);

        if (cancelled) {
          return;
        }

        const resolvedSubject = isMyselfMode
          ? fetchedMyself ?? subjectContact
          : subjectContact ?? fetchedSubject ?? null;

        const myselfContact =
          !isMyselfMode && fetchedMyself?.id !== resolvedSubject?.id
            ? fetchedMyself ?? null
            : null;

        setMyselfContactId(
          isMyselfMode
            ? resolvedSubject?.id ?? null
            : fetchedMyself?.id ?? null,
        );

        const merged = mergeContacts(resolvedSubject, [
          ...(myselfContact ? [myselfContact] : []),
          ...firstPage,
        ]);

        setContacts(merged);
        setLoading(false);

        if (!backgroundLoadStartedRef.current && firstPage.length === CONTACTS_PAGE_SIZE) {
          backgroundLoadStartedRef.current = true;
          loadRemainingPages(CONTACTS_PAGE_SIZE);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [contactId, isMyselfMode, revision, subjectContact]);

  const contactNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const contact of contacts) {
      map.set(contact.id, formatContactName(contact));
    }
    return map;
  }, [contacts]);

  const getContactName = useCallback(
    (id: string) => contactNameById.get(id),
    [contactNameById],
  );

  const filterContacts = useCallback(
    (query: string) => filterMentionContacts(contacts, query),
    [contacts],
  );

  return {
    contacts,
    loading,
    myselfContactId,
    contactNameById,
    getContactName,
    filterContacts,
  };
}
