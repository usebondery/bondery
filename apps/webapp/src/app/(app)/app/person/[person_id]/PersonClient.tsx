"use client";

import { Group, Stack, Paper, Text, Card, Avatar, Button } from "@mantine/core";
import { Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX, IconUser, IconPlus, IconMapPin } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { extractUsername } from "@/lib/socialMediaHelpers";
import { parsePhoneNumber, combinePhoneNumber } from "@/lib/phoneHelpers";
import { formatContactName } from "@/lib/nameHelpers";
import type {
  Contact,
  ContactAddressEntry,
  ContactPreview,
  ContactRelationshipWithPeople,
  Group as GroupType,
  GroupWithCount,
  PhoneEntry,
  EmailEntry,
  Activity,
  RelationshipType,
  ImportantEvent,
  MergeConflictField,
} from "@bondery/types";
import { ContactActionMenu } from "./components/ContactActionMenu";
import { ContactIdentitySection } from "./components/ContactIdentitySection";
import { ContactPreferenceSection } from "./components/ContactPreferenceSection";
import { ContactRelationshipsSection } from "./components/ContactRelationshipsSection";
import { ContactNotesSection } from "./components/ContactNotesSection";
import { ContactAddressSection } from "./components/ContactAddressSection";
import { ContactImportantDatesSection } from "./components/ContactImportantDatesSection";
import { PersonTimelineSection } from "./components/PersonTimelineSection";
// import { ContactPGPSection } from "./components/ContactPGPSection";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { revalidateContacts, revalidateRelationships } from "../../actions";
import { openDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";
import { GroupCard } from "../../groups/components/GroupCard";
import { openAddPeopleToGroupSelectionModal } from "../../people/components/AddPeopleToGroupSelectionModal";
import { MERGE_CONFLICT_FIELDS, openMergeWithModal } from "../../people/components/MergeWithModal";

interface PersonClientProps {
  initialContact: Contact;
  initialConnectedContacts: Contact[];
  initialSelectableContacts: Contact[];
  initialRelationships: ContactRelationshipWithPeople[];
  initialImportantEvents: ImportantEvent[];
  initialGroups: GroupType[];
  initialPersonGroups: GroupType[];
  initialActivities: Activity[];
  personId: string;
}

export default function PersonClient({
  initialContact,
  initialConnectedContacts,
  initialSelectableContacts,
  initialRelationships,
  initialImportantEvents,
  initialGroups,
  initialPersonGroups,
  initialActivities = [],
  personId,
}: PersonClientProps) {
  const router = useRouter();
  const tRelationships = useTranslations("PersonRelationships");
  const tImportantDates = useTranslations("ContactImportantDates");
  const tMerge = useTranslations("MergeWithModal");
  const tAddress = useTranslations("ContactAddress");
  const mergeTexts = useMemo(
    () => ({
      errorTitle: tMerge("ErrorTitle"),
      successTitle: tMerge("SuccessTitle"),
      selectBothPeopleError: tMerge("SelectBothPeopleError"),
      differentPeopleError: tMerge("DifferentPeopleError"),
      mergingTitle: tMerge("MergingTitle"),
      mergingDescription: tMerge("MergingDescription"),
      mergeSuccess: tMerge("MergeSuccess"),
      mergeFailed: tMerge("MergeFailed"),
      mergeWithLabel: tMerge("MergeWithLabel"),
      selectLeftPerson: tMerge("SelectLeftPerson"),
      selectRightPerson: tMerge("SelectRightPerson"),
      searchPeople: tMerge("SearchPeople"),
      noPeopleFound: tMerge("NoPeopleFound"),
      cancel: tMerge("Cancel"),
      continue: tMerge("Continue"),
      back: tMerge("Back"),
      merge: tMerge("Merge"),
      noConflicts: tMerge("NoConflicts"),
      processing: tMerge("Processing"),
      steps: {
        pick: tMerge("Steps.Pick"),
        resolve: tMerge("Steps.Resolve"),
        process: tMerge("Steps.Process"),
      },
      fields: Object.fromEntries(
        MERGE_CONFLICT_FIELDS.map((field) => [field, tMerge(`Fields.${field}`)]),
      ) as Record<MergeConflictField, string>,
    }),
    [tMerge],
  );

  const [contact, setContact] = useState<Contact>(initialContact);
  const [personGroups, setPersonGroups] = useState<GroupType[]>(initialPersonGroups);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<{
    [key: string]: string;
  }>({});
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [whatsappPrefix, setWhatsappPrefix] = useState("+1");
  const [signalPrefix, setSignalPrefix] = useState("+1");
  const [importantEvents, setImportantEvents] = useState<ImportantEvent[]>(initialImportantEvents);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [groupsSaving, setGroupsSaving] = useState(false);
  const [relationships, setRelationships] =
    useState<ContactRelationshipWithPeople[]>(initialRelationships);
  const [relationshipsSaving, setRelationshipsSaving] = useState(false);

  // Sync relationships state when server data changes (after router.refresh())
  useEffect(() => {
    setRelationships(initialRelationships);
  }, [initialRelationships]);

  useEffect(() => {
    setPersonGroups(initialPersonGroups);
  }, [initialPersonGroups]);

  const selectablePeople: ContactPreview[] = initialSelectableContacts.map((person) => ({
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    avatar: person.avatar,
  }));
  const currentPersonPreview: ContactPreview = {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    avatar: contact.avatar,
  };

  // Initialize edited values when contact loads
  useEffect(() => {
    if (contact) {
      // Initialize phones array
      if (contact.phones && Array.isArray(contact.phones) && contact.phones.length > 0) {
        setPhones(contact.phones as PhoneEntry[]);
      } else {
        setPhones([]);
      }

      // Initialize emails array
      if (contact.emails && Array.isArray(contact.emails) && contact.emails.length > 0) {
        setEmails(contact.emails as EmailEntry[]);
      } else {
        setEmails([]);
      }

      // Parse whatsapp number
      const whatsappParsed = parsePhoneNumber(contact.whatsapp || "");
      if (whatsappParsed) {
        setWhatsappPrefix(whatsappParsed.dialCode);
        setEditedValues((prev) => ({
          ...prev,
          whatsapp: whatsappParsed.number,
        }));
      }

      // Parse signal number
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
        firstName: contact.firstName || "",
        middleName: contact.middleName || "",
        lastName: contact.lastName || "",
        title: contact.title || "",
        place: contact.place || "",
        notes: contact.notes || "",
        linkedin: contact.linkedin || "",
        instagram: contact.instagram || "",
        facebook: contact.facebook || "",
        website: contact.website || "",
        whatsapp: contact.whatsapp || "",
        signal: contact.signal || "",
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
    contact?.title,
    contact?.place,
    contact?.notes,
    contact?.linkedin,
    contact?.instagram,
    contact?.facebook,
    contact?.website,
  ]);

  // Initialize rich text editor
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false }), Link, Highlight, TextStyle, Color],
    content: contact?.notes || "",
    immediatelyRender: false,
    onBlur: ({ editor }) => {
      const activeElement = window.document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        activeElement.closest('[data-notes-editor-toolbar="true"]')
      ) {
        return;
      }

      const html = editor.getHTML();
      if (html !== contact?.notes) {
        handleSocialMediaSave("notes", html);
      }
    },
  });

  // Update editor content when contact changes
  useEffect(() => {
    if (editor && contact?.notes !== undefined) {
      editor.commands.setContent(contact.notes || "");
    }
  }, [contact?.notes, editor]);

  const handleContactFieldSave = async (field: string, value: string) => {
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
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) throw new Error("Failed to update");

      if (field !== "language" && field !== "timezone") {
        setContact(
          (previous) =>
            ({
              ...previous,
              [field]: value,
            }) as Contact,
        );
      }

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: `${field === "timezone" ? "Timezone" : "Language"} updated successfully`,
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: `Failed to update ${field === "timezone" ? "timezone" : "language"}`,
        }),
      );
    } finally {
      if (shouldTrackGlobalLoading) {
        setSavingField(null);
      }
    }
  };

  const handleSavePhones = async (phonesOverride?: PhoneEntry[]) => {
    if (!contact || !personId) return;

    // Filter out empty phones and ensure we have both prefix and value
    const sourcePhones = phonesOverride ?? phones;
    const phonesToSave = sourcePhones
      .filter((phone) => phone.value && phone.value.trim() !== "")
      .map((phone) => ({
        ...phone,
        prefix: phone.prefix || "+1",
        value: phone.value.trim(),
      }));

    // Check if changed
    const currentPhones = Array.isArray(contact.phones) ? contact.phones : [];
    if (JSON.stringify(phonesToSave) === JSON.stringify(currentPhones)) {
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: phonesToSave }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setContact({
        ...contact,
        phones: phonesToSave,
      });

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: "Phone numbers updated successfully",
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to update phone numbers",
        }),
      );
    }
  };

  const handleSaveEmails = async (emailsOverride?: EmailEntry[]) => {
    if (!contact || !personId) return;

    // Filter out empty emails
    const sourceEmails = emailsOverride ?? emails;
    const emailsToSave = sourceEmails.filter((email) => email.value.trim() !== "");

    // Check if changed
    const currentEmails = Array.isArray(contact.emails) ? contact.emails : [];
    if (JSON.stringify(emailsToSave) === JSON.stringify(currentEmails)) {
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: emailsToSave }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setContact({
        ...contact,
        emails: emailsToSave,
      });

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: "Email addresses updated successfully",
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to update email addresses",
        }),
      );
    }
  };

  const handleSaveContactInfo = async (payload?: {
    phones?: PhoneEntry[];
    emails?: EmailEntry[];
  }) => {
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
  };

  const handleSaveImportantEvents = async (eventsOverride?: ImportantEvent[]) => {
    if (!contact || !personId) return;

    const sourceEvents = eventsOverride ?? importantEvents;
    const eventsToSave = sourceEvents
      .filter((event) => event.eventDate)
      .map((event) => ({
        id: event.id,
        eventType: event.eventType,
        eventDate: event.eventDate,
        note: event.note,
        notifyDaysBefore: event.notifyDaysBefore ?? null,
      }));

    setSavingField("importantEvents");

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}/important-events`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: eventsToSave }),
      });

      if (!res.ok) throw new Error("Failed to update important events");

      const data = await res.json();
      const nextEvents = (data.events || []) as ImportantEvent[];

      setImportantEvents(nextEvents);

      notifications.show(
        successNotificationTemplate({
          title: tImportantDates("SuccessTitle"),
          description: tImportantDates("UpdateSuccess"),
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: tImportantDates("ErrorTitle"),
          description: tImportantDates("UpdateError"),
        }),
      );
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveAddress = async (payload: {
    addresses: Contact["addresses"];
    suggestedLocation: {
      place: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
  }) => {
    if (!contact || !personId) return;

    setSavingField("address");

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: payload.addresses }),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        const serverMessage =
          errorPayload && typeof errorPayload === "object"
            ? ((errorPayload as Record<string, unknown>).error as string) ||
              ((errorPayload as Record<string, unknown>).message as string)
            : null;
        throw new Error(serverMessage || "Failed to update address");
      }

      const addressEntries = Array.isArray(payload.addresses)
        ? payload.addresses.filter(
            (entry): entry is ContactAddressEntry =>
              typeof entry === "object" && entry !== null && !Array.isArray(entry),
          )
        : [];

      const preferredAddress =
        addressEntries.length > 0
          ? addressEntries.find((entry) => entry.type === "home") || addressEntries[0]
          : null;

      setContact((previous) => ({
        ...previous,
        addresses: payload.addresses,
        place: preferredAddress?.value ?? null,
        latitude: preferredAddress?.latitude ?? null,
        longitude: preferredAddress?.longitude ?? null,
        addressLine1: preferredAddress?.addressLine1 ?? null,
        addressLine2: preferredAddress?.addressLine2 ?? null,
        addressCity: preferredAddress?.addressCity ?? null,
        addressPostalCode: preferredAddress?.addressPostalCode ?? null,
        addressState: preferredAddress?.addressState ?? null,
        addressStateCode: preferredAddress?.addressStateCode ?? null,
        addressCountry: preferredAddress?.addressCountry ?? null,
        addressCountryCode: preferredAddress?.addressCountryCode ?? null,
        addressGranularity: preferredAddress?.addressGranularity ?? "address",
        addressFormatted: preferredAddress?.addressFormatted ?? null,
        addressGeocodeSource: preferredAddress?.addressGeocodeSource ?? null,
      }));

      notifications.show(
        successNotificationTemplate({
          title: tAddress("SaveSuccessTitle"),
          description: tAddress("SaveSuccessMessage"),
        }),
      );

      if (payload.suggestedLocation) {
        openStandardConfirmModal({
          title: (
            <ModalTitle
              text={tAddress("LocationUpdateModalTitle")}
              icon={<IconMapPin size={18} />}
            />
          ),
          message: <Text size="sm">{tAddress("LocationUpdateModalMessage")}</Text>,
          confirmLabel: tAddress("LocationUpdateConfirm"),
          cancelLabel: tAddress("LocationUpdateCancel"),
          onConfirm: async () => {
            setSavingField("address");

            try {
              const locationResponse = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  place: payload.suggestedLocation?.place,
                  latitude: payload.suggestedLocation?.latitude,
                  longitude: payload.suggestedLocation?.longitude,
                }),
              });

              if (!locationResponse.ok) {
                throw new Error("Failed to update location");
              }

              setContact((previous) => ({
                ...previous,
                place: payload.suggestedLocation?.place || previous.place,
                latitude: payload.suggestedLocation?.latitude ?? previous.latitude,
                longitude: payload.suggestedLocation?.longitude ?? previous.longitude,
              }));

              notifications.show(
                successNotificationTemplate({
                  title: tAddress("LocationUpdateSuccessTitle"),
                  description: tAddress("LocationUpdateSuccessMessage"),
                }),
              );
            } catch {
              notifications.show(
                errorNotificationTemplate({
                  title: tAddress("LocationUpdateErrorTitle"),
                  description: tAddress("LocationUpdateErrorMessage"),
                }),
              );
            } finally {
              setSavingField(null);
            }
          },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tAddress("SaveErrorMessage");
      notifications.show(
        errorNotificationTemplate({
          title: tAddress("SaveErrorTitle"),
          description: message,
        }),
      );
    } finally {
      setSavingField(null);
    }
  };

  const handleSocialMediaSave = async (field: string, value: string) => {
    if (!contact || !personId) return;

    // Extract username from URL if applicable
    let processedValue = value;
    if (["linkedin", "instagram", "facebook", "whatsapp"].includes(field)) {
      processedValue = extractUsername(field, value);
    }

    // Handle whatsapp and signal - combine with prefix
    if (field === "whatsapp") {
      processedValue = combinePhoneNumber(whatsappPrefix, value);
    } else if (field === "signal") {
      processedValue = combinePhoneNumber(signalPrefix, value);
    }

    // Check if value actually changed
    const originalValue = contact[field as keyof Contact] || "";
    if (processedValue === originalValue) {
      return;
    }

    // Validation
    if (field === "firstName" && (!processedValue || processedValue.trim() === "")) {
      notifications.show(
        errorNotificationTemplate({
          title: "Validation Error",
          description: "First name is required",
        }),
      );
      // Revert to original value
      setEditedValues((prev) => ({
        ...prev,
        [field]: originalValue as string,
      }));
      return;
    }

    setSavingField(field);

    try {
      // In a real app, you'd call your API here:
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: processedValue }),
      });

      if (!res.ok) throw new Error("Failed to update");

      // Update local state with username
      setContact({
        ...contact,
        [field]: processedValue,
      });

      const fieldDisplayName = field.charAt(0).toUpperCase() + field.slice(1);

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: `${fieldDisplayName} updated successfully`,
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: `Failed to update ${field}`,
        }),
      );
    } finally {
      setSavingField(null);
    }
  };

  const handleBlur = (field: string) => {
    const value = editedValues[field] || "";
    handleSocialMediaSave(field, value);
  };

  const handleContactFieldBlur = (field: string, value: string) => {
    handleContactFieldSave(field, value);
  };

  const openAddToGroupsModal = () => {
    openAddPeopleToGroupSelectionModal({
      personIds: [personId],
      onUpdated: async () => {
        try {
          const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}/groups`);
          if (!response.ok) {
            return;
          }

          const payload = (await response.json()) as { groups?: GroupType[] };
          setPersonGroups(payload.groups || []);
        } catch {
          // Keep existing state if groups refresh fails
        }
      },
    });
  };

  const handleAddRelationship = async (
    relationshipType: RelationshipType,
    relatedPersonId: string,
  ) => {
    setRelationshipsSaving(true);

    try {
      const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipType, relatedPersonId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || tRelationships("CreateError"));
      }

      await revalidateRelationships();
      router.refresh();

      notifications.show(
        successNotificationTemplate({
          title: tRelationships("SuccessTitle"),
          description: tRelationships("CreateSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: tRelationships("ErrorTitle"),
          description: error instanceof Error ? error.message : tRelationships("CreateError"),
        }),
      );
    } finally {
      setRelationshipsSaving(false);
    }
  };

  const handleDeleteRelationship = async (relationshipId: string) => {
    setRelationshipsSaving(true);

    try {
      const response = await fetch(
        `${API_ROUTES.CONTACTS}/${personId}/relationships/${relationshipId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || tRelationships("DeleteError"));
      }

      setRelationships((previous) =>
        previous.filter((relationship) => relationship.id !== relationshipId),
      );

      await revalidateRelationships();

      notifications.show(
        successNotificationTemplate({
          title: tRelationships("SuccessTitle"),
          description: tRelationships("DeleteSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: tRelationships("ErrorTitle"),
          description: error instanceof Error ? error.message : tRelationships("DeleteError"),
        }),
      );
    } finally {
      setRelationshipsSaving(false);
    }
  };

  const handleUpdateRelationship = async (
    relationshipId: string,
    relationshipType: RelationshipType,
    relatedPersonId: string,
  ) => {
    setRelationshipsSaving(true);

    try {
      const response = await fetch(
        `${API_ROUTES.CONTACTS}/${personId}/relationships/${relationshipId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationshipType, relatedPersonId }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || tRelationships("UpdateError"));
      }

      await revalidateRelationships();
      router.refresh();

      notifications.show(
        successNotificationTemplate({
          title: tRelationships("SuccessTitle"),
          description: tRelationships("UpdateSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: tRelationships("ErrorTitle"),
          description: error instanceof Error ? error.message : tRelationships("UpdateError"),
        }),
      );
    } finally {
      setRelationshipsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    // Parse full phone number if pasted (for WhatsApp and Signal only)
    if (field === "whatsapp" || field === "signal") {
      const parsed = parsePhoneNumber(value);
      if (parsed && value.includes("+")) {
        // User pasted a full number with prefix
        if (field === "whatsapp") {
          setWhatsappPrefix(parsed.dialCode);
          setEditedValues((prev) => ({
            ...prev,
            [field]: parsed.number,
          }));
        } else if (field === "signal") {
          setSignalPrefix(parsed.dialCode);
          setEditedValues((prev) => ({
            ...prev,
            [field]: parsed.number,
          }));
        }
        return;
      }
    }

    setEditedValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openDeleteModal = () =>
    openDeleteContactModal({
      contactId: personId,
      contactName: formatContactName(contact),
      onDeleted: async () => {
        await revalidateContacts();
        router.push(WEBAPP_ROUTES.PEOPLE);
      },
    });

  const openMergeWithModalForCurrentPerson = () => {
    const mergeContacts = [contact, ...initialSelectableContacts].reduce<Contact[]>((acc, item) => {
      if (!acc.some((existing) => existing.id === item.id)) {
        acc.push(item);
      }
      return acc;
    }, []);

    openMergeWithModal({
      contacts: mergeContacts,
      leftPersonId: contact.id,
      disableLeftPicker: true,
      titleText: tMerge("ModalTitle"),
      texts: mergeTexts,
    });
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          icon={IconUser}
          title="Person's details"
          backOnClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
              return;
            }
            router.push(WEBAPP_ROUTES.PEOPLE);
          }}
          action={
            <ContactActionMenu
              contact={contact}
              personId={personId}
              onDelete={openDeleteModal}
              onMergeWith={openMergeWithModalForCurrentPerson}
            />
          }
        />

        <Paper withBorder shadow="sm" radius="md" p="xl">
          <Stack gap="lg">
            <ContactIdentitySection
              contact={contact}
              personId={personId}
              phones={phones}
              emails={emails}
              savingField={savingField}
              onPhonesChange={setPhones}
              onEmailsChange={setEmails}
              onSaveContactInfo={handleSaveContactInfo}
            />

            <ContactNotesSection editor={editor} savingField={savingField} />

            <PersonTimelineSection
              activities={initialActivities}
              contact={contact}
              connectedContacts={initialConnectedContacts || []}
              selectableContacts={initialSelectableContacts || []}
            />

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Groups
              </Text>
              <Group gap="sm" align="flex-start" wrap="wrap">
                {personGroups.map((group) => (
                  <div
                    key={group.id}
                    style={{
                      flex: "1 1 18rem",
                      minWidth: "16rem",
                      maxWidth: "20rem",
                    }}
                  >
                    <GroupCard
                      group={{
                        ...(group as GroupWithCount),
                        contactCount: 1,
                        previewContacts: [currentPersonPreview],
                      }}
                      onClick={(groupId) => router.push(`/app/group/${groupId}`)}
                      onAddPeople={() => {}}
                      onEdit={() => {}}
                      onDuplicate={() => {}}
                      onDelete={() => {}}
                      interactive={true}
                      variant="small"
                      showMenu={false}
                      shadow="none"
                    />
                  </div>
                ))}

                <div
                  style={{
                    flex: "1 1 18rem",
                    minWidth: "16rem",
                    maxWidth: "20rem",
                  }}
                >
                  <Card
                    withBorder
                    shadow="none"
                    p="sm"
                    className={`h-full min-h-full ${groupsSaving ? undefined : "card-scale-effect"}`}
                    style={{
                      cursor: groupsSaving ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (!groupsSaving) {
                        openAddToGroupsModal();
                      }
                    }}
                  >
                    <Group gap="sm" align="center" wrap="nowrap">
                      <Avatar size="md" radius="xl">
                        <IconPlus size={16} />
                      </Avatar>
                      <Text size="md" fw={600}>
                        Edit groups
                      </Text>
                    </Group>
                  </Card>
                </div>
              </Group>
            </Stack>

            <ContactPreferenceSection
              contact={contact}
              savingField={savingField}
              handleBlur={handleContactFieldBlur}
            />

            <ContactAddressSection
              contact={contact}
              isSaving={savingField === "address"}
              onSave={handleSaveAddress}
            />

            <ContactImportantDatesSection
              events={importantEvents}
              personFirstName={contact.firstName}
              savingField={savingField}
              onEventsChange={setImportantEvents}
              onSave={handleSaveImportantEvents}
            />

            {/* TODO: PGP keys */}
            {/* <ContactPGPSection
              contact={contact}
              savingField={savingField}
              handleChange={handleChange}
              handleBlur={handleBlur}
            />

            <Divider /> */}

            <ContactRelationshipsSection
              currentPerson={currentPersonPreview}
              selectablePeople={selectablePeople}
              relationships={relationships}
              isSubmitting={relationshipsSaving}
              onAddRelationship={handleAddRelationship}
              onUpdateRelationship={handleUpdateRelationship}
              onDeleteRelationship={handleDeleteRelationship}
            />
          </Stack>
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
