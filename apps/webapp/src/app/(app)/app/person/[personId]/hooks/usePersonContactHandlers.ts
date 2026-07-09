"use client";

import { extractUsername } from "@bondery/helpers";
import { combinePhoneNumber } from "@bondery/helpers/phone";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import type { Contact, EmailEntry, ImportantDate, PhoneEntry } from "@bondery/schemas";
import { notifications } from "@mantine/notifications";
import { type Dispatch, type SetStateAction, useCallback, useState } from "react";
import type {
  useCreateContactRelationshipMutation,
  useDeleteContactRelationshipMutation,
  usePutContactImportantDatesMutation,
  useUpdateContactMutation,
  useUpdateContactRelationshipMutation,
} from "@/lib/query/hooks/useContacts";
import { usePersonAddressSave } from "./usePersonAddressSave";
import { usePersonRelationshipHandlers } from "./usePersonRelationshipHandlers";

type UpdateContactMutation = ReturnType<typeof useUpdateContactMutation>;
type PutImportantDatesMutation = ReturnType<typeof usePutContactImportantDatesMutation>;
type CreateRelationshipMutation = ReturnType<typeof useCreateContactRelationshipMutation>;
type UpdateRelationshipMutation = ReturnType<typeof useUpdateContactRelationshipMutation>;
type DeleteRelationshipMutation = ReturnType<typeof useDeleteContactRelationshipMutation>;

interface UsePersonContactHandlersOptions {
  contact: Contact | null;
  createRelationshipMutation: CreateRelationshipMutation;
  deleteRelationshipMutation: DeleteRelationshipMutation;
  emails: EmailEntry[];
  importantDates: ImportantDate[];
  personId: string;
  phones: PhoneEntry[];
  putImportantDatesMutation: PutImportantDatesMutation;
  setContact: Dispatch<SetStateAction<Contact | null>>;
  setEditedValues: Dispatch<SetStateAction<Record<string, string>>>;
  signalPrefix: string;
  tAddress: (key: string) => string;
  tCommon: (key: string) => string;
  tContactInfo: (key: string) => string;
  tImportantDates: (key: string) => string;
  tInteractions: (key: string, values?: Record<string, string>) => string;
  tPersonPage: (key: string) => string;
  tRelationships: (key: string) => string;
  tVal: (key: string) => string;
  updateContactMutation: UpdateContactMutation;
  updateRelationshipMutation: UpdateRelationshipMutation;
  whatsappPrefix: string;
}

export function usePersonContactHandlers({
  contact,
  emails,
  importantDates,
  personId,
  phones,
  setContact,
  setEditedValues,
  signalPrefix,
  tAddress,
  tCommon,
  tContactInfo,
  tImportantDates,
  tInteractions,
  tPersonPage,
  tRelationships,
  tVal,
  whatsappPrefix,
  createRelationshipMutation,
  deleteRelationshipMutation,
  putImportantDatesMutation,
  updateContactMutation,
  updateRelationshipMutation,
}: UsePersonContactHandlersOptions) {
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savingLastInteraction, setSavingLastInteraction] = useState(false);

  const {
    handleAddRelationship,
    handleDeleteRelationship,
    handleUpdateRelationship,
    relationshipsSaving,
  } = usePersonRelationshipHandlers({
    createRelationshipMutation,
    deleteRelationshipMutation,
    tCommon,
    tRelationships,
    updateRelationshipMutation,
  });

  const handleContactFieldSave = useCallback(
    async (field: string, value: string) => {
      if (!contact || !personId) {
        return;
      }

      const originalValue = contact[field as keyof Contact] || "";
      if (value === originalValue) {
        return;
      }

      const shouldTrackGlobalLoading = field !== "language" && field !== "timezone";
      if (shouldTrackGlobalLoading) {
        setSavingField(field);
      }

      try {
        await updateContactMutation.mutateAsync({ [field]: value });

        setContact(
          (previous) =>
            ({
              ...previous,
              [field]: value,
            }) as Contact,
        );

        notifications.show(
          successNotificationTemplate({
            description:
              field === "timezone"
                ? tPersonPage("TimezoneUpdated")
                : tPersonPage("LanguageUpdated"),
            title: tInteractions("SuccessTitle"),
          }),
        );
      } catch (_error) {
        notifications.show(
          errorNotificationTemplate({
            description: `Failed to update ${field === "timezone" ? "timezone" : "language"}`,
            title: tInteractions("ErrorTitle"),
          }),
        );
      } finally {
        if (shouldTrackGlobalLoading) {
          setSavingField(null);
        }
      }
    },
    [contact, personId, setContact, tInteractions, tPersonPage, updateContactMutation],
  );

  const { handleSaveAddress } = usePersonAddressSave({
    contact,
    handleContactFieldSave,
    personId,
    setContact,
    setSavingField,
    tAddress,
    tCommon,
    updateContactMutation,
  });

  const handleSaveLastInteraction = useCallback(
    async (date: string | null) => {
      if (!contact || !personId) {
        return;
      }
      setSavingLastInteraction(true);
      try {
        await updateContactMutation.mutateAsync({ lastInteraction: date });
        setContact((prev) => ({ ...prev, lastInteraction: date }) as Contact);
        notifications.show(
          successNotificationTemplate({
            description: tInteractions("LastInteractionUpdated"),
            title: tInteractions("SuccessTitle"),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: tInteractions("LastInteractionUpdateFailed"),
            title: tInteractions("ErrorTitle"),
          }),
        );
      } finally {
        setSavingLastInteraction(false);
      }
    },
    [contact, personId, setContact, tInteractions, updateContactMutation],
  );

  const handleSaveKeepFrequency = useCallback(
    async (value: string | null) => {
      if (!contact || !personId) {
        return;
      }
      const keepFrequencyDays = value && value !== "none" ? parseInt(value, 10) : null;
      try {
        await updateContactMutation.mutateAsync({ keepFrequencyDays });
        setContact((prev) => ({ ...prev, keepFrequencyDays }) as Contact);
        notifications.show(
          successNotificationTemplate({
            description: tInteractions("KeepInTouchUpdatedDescription"),
            title: tInteractions("KeepInTouchUpdated"),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: tInteractions("KeepInTouchUpdateFailed"),
            title: tInteractions("ErrorTitle"),
          }),
        );
      }
    },
    [contact, personId, setContact, tInteractions, updateContactMutation],
  );

  const handleSavePhones = useCallback(
    async (phonesOverride?: PhoneEntry[]) => {
      if (!contact || !personId) {
        return;
      }

      const sourcePhones = phonesOverride ?? phones;
      const phonesToSave = sourcePhones
        .filter((phone) => phone.value && phone.value.trim() !== "")
        .map((phone) => ({
          ...phone,
          prefix: phone.prefix || "+1",
          value: phone.value.trim(),
        }));

      const currentPhones = Array.isArray(contact.phones) ? contact.phones : [];
      if (JSON.stringify(phonesToSave) === JSON.stringify(currentPhones)) {
        return;
      }

      try {
        await updateContactMutation.mutateAsync({ phones: phonesToSave });

        setContact({
          ...contact,
          phones: phonesToSave,
        });

        notifications.show(
          successNotificationTemplate({
            description: tContactInfo("PhonesUpdated"),
            title: tInteractions("SuccessTitle"),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: tContactInfo("PhonesUpdateError"),
            title: tInteractions("ErrorTitle"),
          }),
        );
      }
    },
    [contact, personId, phones, setContact, tContactInfo, tInteractions, updateContactMutation],
  );

  const handleSaveEmails = useCallback(
    async (emailsOverride?: EmailEntry[]) => {
      if (!contact || !personId) {
        return;
      }

      const sourceEmails = emailsOverride ?? emails;
      const emailsToSave = sourceEmails.filter((email) => email.value.trim() !== "");

      const currentEmails = Array.isArray(contact.emails) ? contact.emails : [];
      if (JSON.stringify(emailsToSave) === JSON.stringify(currentEmails)) {
        return;
      }

      try {
        await updateContactMutation.mutateAsync({ emails: emailsToSave });

        setContact({
          ...contact,
          emails: emailsToSave,
        });

        notifications.show(
          successNotificationTemplate({
            description: tContactInfo("EmailsUpdated"),
            title: tInteractions("SuccessTitle"),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: tContactInfo("EmailsUpdateError"),
            title: tInteractions("ErrorTitle"),
          }),
        );
      }
    },
    [contact, emails, personId, setContact, tContactInfo, tInteractions, updateContactMutation],
  );

  const handleSaveContactInfo = useCallback(
    async (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => {
      const tasks: Promise<void>[] = [];

      if (payload?.phones) {
        tasks.push(handleSavePhones(payload.phones));
      }

      if (payload?.emails) {
        tasks.push(handleSaveEmails(payload.emails));
      }

      if (!tasks.length) {
        tasks.push(handleSavePhones());
        tasks.push(handleSaveEmails());
      }

      await Promise.all(tasks);
    },
    [handleSaveEmails, handleSavePhones],
  );

  const handleSaveImportantDates = useCallback(
    async (datesOverride?: ImportantDate[]) => {
      if (!contact || !personId) {
        return;
      }

      const sourceDates = datesOverride ?? importantDates;
      const datesToSave = sourceDates
        .filter((entry) => entry.date)
        .map((entry) => ({
          date: entry.date,
          id: entry.id,
          note: entry.note,
          notifyDaysBefore: entry.notifyDaysBefore ?? null,
          type: entry.type,
        }));

      setSavingField("importantDates");

      try {
        await putImportantDatesMutation.mutateAsync(datesToSave);

        notifications.show(
          successNotificationTemplate({
            description: tImportantDates("UpdateSuccess"),
            title: tImportantDates("SuccessTitle"),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: tImportantDates("UpdateError"),
            title: tImportantDates("ErrorTitle"),
          }),
        );
      } finally {
        setSavingField(null);
      }
    },
    [contact, importantDates, personId, putImportantDatesMutation, tImportantDates],
  );

  const handleSocialSave = useCallback(
    async (field: string, value: string) => {
      if (!contact || !personId) {
        return;
      }

      let processedValue = value;
      if (["linkedin", "instagram", "facebook", "whatsapp"].includes(field)) {
        processedValue = extractUsername(field, value);
      }

      if (field === "whatsapp") {
        processedValue = combinePhoneNumber(whatsappPrefix, value);
      } else if (field === "signal") {
        processedValue = combinePhoneNumber(signalPrefix, value);
      }

      const originalValue = contact[field as keyof Contact] || "";
      if (processedValue === originalValue) {
        return;
      }

      if (field === "firstName" && (!processedValue || processedValue.trim() === "")) {
        notifications.show(
          errorNotificationTemplate({
            description: tVal("fields.firstName.required"),
            title: tVal("title"),
          }),
        );
        setEditedValues((prev) => ({
          ...prev,
          [field]: originalValue as string,
        }));
        return;
      }

      setSavingField(field);

      try {
        await updateContactMutation.mutateAsync({ [field]: processedValue });

        setContact({
          ...contact,
          [field]: processedValue,
          ...(field === "notes" ? { notesUpdatedAt: new Date().toISOString() } : {}),
        });

        const fieldDisplayName = field.charAt(0).toUpperCase() + field.slice(1);

        notifications.show(
          successNotificationTemplate({
            description: `${fieldDisplayName} updated successfully`,
            title: tInteractions("SuccessTitle"),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description:
              field === "timezone"
                ? tPersonPage("TimezoneUpdateFailed")
                : tPersonPage("LanguageUpdateFailed"),
            title: tInteractions("ErrorTitle"),
          }),
        );
      } finally {
        setSavingField(null);
      }
    },
    [
      contact,
      personId,
      setContact,
      setEditedValues,
      signalPrefix,
      tInteractions,
      tPersonPage,
      tVal,
      updateContactMutation,
      whatsappPrefix,
    ],
  );

  const handleContactFieldBlur = useCallback(
    (field: string, value: string) => {
      void handleContactFieldSave(field, value);
    },
    [handleContactFieldSave],
  );

  return {
    handleAddRelationship,
    handleContactFieldBlur,
    handleContactFieldSave,
    handleDeleteRelationship,
    handleSaveAddress,
    handleSaveContactInfo,
    handleSaveEmails,
    handleSaveImportantDates,
    handleSaveKeepFrequency,
    handleSaveLastInteraction,
    handleSavePhones,
    handleSocialSave,
    handleUpdateRelationship,
    relationshipsSaving,
    savingField,
    savingLastInteraction,
    setSavingField,
  };
}
