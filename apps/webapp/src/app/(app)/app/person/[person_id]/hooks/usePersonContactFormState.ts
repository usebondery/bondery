"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { parsePhoneNumber } from "@bondery/helpers/phone";
import type {
  Contact,
  ContactPreview,
  EmailEntry,
  ImportantDate,
  PhoneEntry,
} from "@bondery/schemas";
import { useEffect, useMemo, useState } from "react";
import type { MentionSuggestionItem } from "../components/notes/MentionList";

interface UsePersonContactFormStateOptions {
  fetchedContact: Contact | undefined;
  fetchedImportantDates: ImportantDate[] | undefined;
  personActivities: Array<{ id: string; type: string }>;
  personId: string;
  selectableContacts: Contact[];
}

export function usePersonContactFormState({
  fetchedContact,
  fetchedImportantDates,
  personActivities,
  personId,
  selectableContacts,
}: UsePersonContactFormStateOptions) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [whatsappPrefix, setWhatsappPrefix] = useState("+1");
  const [signalPrefix, setSignalPrefix] = useState("+1");
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (fetchedContact) {
      setContact(fetchedContact);
    }
  }, [fetchedContact]);

  useEffect(() => {
    if (fetchedImportantDates) {
      setImportantDates(fetchedImportantDates);
    }
  }, [fetchedImportantDates]);

  const resolvedContact = contact ?? fetchedContact;

  const selectablePeople: ContactPreview[] = selectableContacts
    .filter((person) => !person.myself)
    .map((person) => ({
      avatar: person.avatar,
      firstName: person.firstName,
      id: person.id,
      lastName: person.lastName,
    }));

  const currentPersonPreview: ContactPreview = {
    avatar: resolvedContact?.avatar ?? null,
    firstName: resolvedContact?.firstName ?? "",
    id: resolvedContact?.id ?? personId,
    lastName: resolvedContact?.lastName ?? null,
  };

  const mentionableContacts = useMemo<MentionSuggestionItem[]>(() => {
    if (!resolvedContact) {
      return [];
    }
    const seenIds = new Set<string>();

    return [resolvedContact, ...selectableContacts]
      .filter((person) => {
        if (!person?.id || seenIds.has(person.id)) {
          return false;
        }

        seenIds.add(person.id);
        return true;
      })
      .map((person) => {
        const label = formatContactName(person).trim();

        return {
          avatar: person.avatar ?? null,
          headline: person.headline ?? null,
          id: person.id,
          label: label.length > 0 ? label : person.id,
          location: person.location ?? null,
        };
      });
  }, [resolvedContact, selectableContacts]);

  const lastInteractionSource = useMemo<
    { type: "activity"; activityType: string } | { type: "manual" } | null
  >(() => {
    if (!contact?.lastInteraction) {
      return null;
    }
    if (contact.lastInteractionActivityId) {
      const linked = personActivities.find((a) => a.id === contact.lastInteractionActivityId);
      if (linked) {
        return { activityType: linked.type, type: "activity" };
      }
    }
    return { type: "manual" };
  }, [personActivities, contact?.lastInteraction, contact?.lastInteractionActivityId]);

  useEffect(() => {
    if (contact) {
      if (contact.phones && Array.isArray(contact.phones) && contact.phones.length > 0) {
        setPhones(contact.phones as PhoneEntry[]);
      } else {
        setPhones([]);
      }

      if (contact.emails && Array.isArray(contact.emails) && contact.emails.length > 0) {
        setEmails(contact.emails as EmailEntry[]);
      } else {
        setEmails([]);
      }

      const whatsappParsed = parsePhoneNumber(contact.whatsapp || "");
      if (whatsappParsed) {
        setWhatsappPrefix(whatsappParsed.dialCode);
        setEditedValues((prev) => ({
          ...prev,
          whatsapp: whatsappParsed.number,
        }));
      }

      const signalParsed = parsePhoneNumber(contact.signal || "");
      if (signalParsed) {
        setSignalPrefix(signalParsed.dialCode);
        setEditedValues((prev) => ({
          ...prev,
          signal: signalParsed.number,
        }));
      }

      setEditedValues((prev) => ({
        ...prev,
        facebook: contact.facebook || "",
        firstName: contact.firstName || "",
        headline: contact.headline || "",
        instagram: contact.instagram || "",
        lastName: contact.lastName || "",
        linkedin: contact.linkedin || "",
        location: contact.location || "",
        middleName: contact.middleName || "",
        notes: contact.notes || "",
        signal: contact.signal || "",
        website: contact.website || "",
        whatsapp: contact.whatsapp || "",
      }));
    }
  }, [
    contact?.id,
    contact?.phones,
    contact?.emails,
    contact?.whatsapp,
    contact?.signal,
    contact?.firstName,
    contact?.middleName,
    contact?.lastName,
    contact?.headline,
    contact?.location,
    contact?.notes,
    contact?.linkedin,
    contact?.instagram,
    contact?.facebook,
    contact?.website,
    contact,
  ]);

  return {
    contact,
    currentPersonPreview,
    editedValues,
    emails,
    importantDates,
    lastInteractionSource,
    mentionableContacts,
    phones,
    resolvedContact,
    selectablePeople,
    setContact,
    setEditedValues,
    setEmails,
    setImportantDates,
    setPhones,
    setSignalPrefix,
    setWhatsappPrefix,
    signalPrefix,
    whatsappPrefix,
  };
}
