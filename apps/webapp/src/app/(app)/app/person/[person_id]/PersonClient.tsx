"use client";

import {
  Group,
  Stack,
  Paper,
  Divider,
  Text,
  Skeleton,
  MultiSelect,
  Badge,
  CloseButton,
  rem,
  Button,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX, IconAlertCircle, IconTrash, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { extractUsername } from "@/lib/socialMediaHelpers";
import { parsePhoneNumber, combinePhoneNumber } from "@/lib/phoneHelpers";
import { formatContactName } from "@/lib/nameHelpers";
import type {
  Contact,
  ContactPreview,
  ContactRelationshipWithPeople,
  Group as GroupType,
  PhoneEntry,
  EmailEntry,
  Activity,
  RelationshipType,
  ImportantEvent,
} from "@bondery/types";
import type { ComboboxItem, MultiSelectProps } from "@mantine/core";
import { ContactActionMenu } from "./components/ContactActionMenu";
import { ContactIdentitySection } from "./components/ContactIdentitySection";
import { ContactBioSection } from "./components/ContactBioSection";
import { ContactPreferenceSection } from "./components/ContactPreferenceSection";
import { ContactRelationshipsSection } from "./components/ContactRelationshipsSection";
import { ContactNotesSection } from "./components/ContactNotesSection";
import { ContactInfoSection } from "./components/ContactInfoSection";
import { SocialMediaSection } from "./components/SocialMediaSection";
import { ContactImportantDatesSection } from "./components/ContactImportantDatesSection";
import { LastInteractionSection } from "./components/LastInteractionSection";
import { PersonTimelineSection } from "./components/PersonTimelineSection";
// import { ContactPGPSection } from "./components/ContactPGPSection";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { ModalTitle } from "@bondery/mantine-next";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { revalidateContacts } from "../../actions";

const PersonMap = dynamic(() => import("./components/PersonMap").then((mod) => mod.PersonMap), {
  ssr: false,
  loading: () => <Skeleton height={360} radius="md" />,
});

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

  const [contact, setContact] = useState<Contact>(initialContact);
  const [allGroups] = useState<GroupType[]>(initialGroups);
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

  const hasCoordinates = Number.isFinite(contact?.latitude) && Number.isFinite(contact?.longitude);

  const groupSelectData = allGroups.map((group) => ({
    value: group.id,
    label: group.label,
    color: group.color,
    emoji: group.emoji,
  }));

  const selectedGroupIds = personGroups.map((group) => group.id);
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
        description: contact.description || "",
        notes: contact.notes || "",
        linkedin: contact.linkedin || "",
        instagram: contact.instagram || "",
        facebook: contact.facebook || "",
        website: contact.website || "",
        whatsapp: contact.whatsapp || "",
        signal: contact.signal || "",
      }));
    }
  }, [contact]);

  // Initialize rich text editor
  const editor = useEditor({
    extensions: [StarterKit, Link],
    content: contact?.notes || "",
    immediatelyRender: false,
    onBlur: ({ editor }) => {
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
    console.log(`[DEBUG] handleContactFieldSave called with field: ${field}, value: ${value}`);

    if (!contact || !personId) {
      console.log("[DEBUG] No contact or personId, returning early");
      return;
    }

    // Check if value actually changed
    const originalValue = contact[field as keyof Contact] || "";
    console.log(`[DEBUG] Original value: ${originalValue}, New value: ${value}`);

    if (value === originalValue) {
      console.log("[DEBUG] Values are the same, no update needed");
      return;
    }

    console.log("[DEBUG] Starting API call...");
    setSavingField(field);

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      console.log("[DEBUG] API call response:", res.status, res.statusText);

      if (!res.ok) throw new Error("Failed to update");

      // Update local state
      setContact({
        ...contact,
        [field]: value,
      } as Contact);

      console.log("[DEBUG] Showing success notification");
      notifications.show({
        title: "Success",
        message: `${field === "timezone" ? "Timezone" : "Language"} updated successfully`,
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch (error) {
      console.error("[DEBUG] API call failed:", error);
      notifications.show({
        title: "Error",
        message: `Failed to update ${field === "timezone" ? "timezone" : "language"}`,
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      console.log("[DEBUG] API call finished, clearing saving field");
      setSavingField(null);
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

    setSavingField("phones");

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

      notifications.show({
        title: "Success",
        message: "Phone numbers updated successfully",
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to update phone numbers",
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setSavingField(null);
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

    setSavingField("emails");

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

      notifications.show({
        title: "Success",
        message: "Email addresses updated successfully",
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to update email addresses",
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveContactInfo = async (payload?: {
    phones?: PhoneEntry[];
    emails?: EmailEntry[];
  }) => {
    await handleSavePhones(payload?.phones);
    await handleSaveEmails(payload?.emails);
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

      notifications.show({
        title: tImportantDates("SuccessTitle"),
        message: tImportantDates("UpdateSuccess"),
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch {
      notifications.show({
        title: tImportantDates("ErrorTitle"),
        message: tImportantDates("UpdateError"),
        color: "red",
        icon: <IconX size={18} />,
      });
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

    // For PGP key, use the value as-is (it's already processed)
    if (field === "pgpPublicKey") {
      processedValue = value;
    }

    // Check if value actually changed
    const originalValue = contact[field as keyof Contact] || "";
    if (processedValue === originalValue) {
      return;
    }

    // Validation
    if (field === "firstName" && (!processedValue || processedValue.trim() === "")) {
      notifications.show({
        title: "Validation Error",
        message: "First name is required",
        color: "red",
        icon: <IconX size={18} />,
      });
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

      const fieldDisplayName =
        field === "pgpPublicKey" ? "PGP key" : field.charAt(0).toUpperCase() + field.slice(1);

      notifications.show({
        title: "Success",
        message: `${fieldDisplayName} updated successfully`,
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch {
      notifications.show({
        title: "Error",
        message: `Failed to update ${field === "pgpPublicKey" ? "PGP key" : field}`,
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setSavingField(null);
    }
  };

  const handleBlur = (field: string) => {
    const value = editedValues[field] || "";
    handleSocialMediaSave(field, value);
  };

  const handleContactFieldChange = (field: string, value: string) => {
    console.log(`[DEBUG] handleContactFieldChange called with field: ${field}, value: ${value}`);
    // For contact fields like timezone and language, update immediately
    setContact({
      ...contact,
      [field]: value,
    } as Contact);
  };

  const handleContactFieldBlur = (field: string, value: string) => {
    console.log(`[DEBUG] handleContactFieldBlur called with field: ${field}, value: ${value}`);
    // Save to database on blur
    handleContactFieldSave(field, value);
  };

  const updateGroups = async (newGroupIds: string[]) => {
    const currentIds = new Set(selectedGroupIds);
    const nextIds = new Set(newGroupIds);

    const toAdd = Array.from(nextIds).filter((id) => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter((id) => !nextIds.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    setGroupsSaving(true);

    try {
      if (toAdd.length > 0) {
        await Promise.all(
          toAdd.map((groupId) =>
            fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ personIds: [personId] }),
            }),
          ),
        );
      }

      if (toRemove.length > 0) {
        await Promise.all(
          toRemove.map((groupId) =>
            fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ personIds: [personId] }),
            }),
          ),
        );
      }

      const updatedGroups = allGroups.filter((group) => nextIds.has(group.id));
      setPersonGroups(updatedGroups);

      notifications.show({
        title: "Groups updated",
        message: "Contact groups have been updated",
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch (error) {
      console.error("Failed to update groups", error);
      notifications.show({
        title: "Error",
        message: "Could not update groups. Please try again.",
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setGroupsSaving(false);
    }
  };

  const fetchRelationships = async () => {
    const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}/relationships`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch relationships");
    }

    const data = await response.json();
    setRelationships(data.relationships || []);
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

      await fetchRelationships();

      notifications.show({
        title: tRelationships("SuccessTitle"),
        message: tRelationships("CreateSuccess"),
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch (error) {
      notifications.show({
        title: tRelationships("ErrorTitle"),
        message: error instanceof Error ? error.message : tRelationships("CreateError"),
        color: "red",
        icon: <IconX size={18} />,
      });
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

      notifications.show({
        title: tRelationships("SuccessTitle"),
        message: tRelationships("DeleteSuccess"),
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch (error) {
      notifications.show({
        title: tRelationships("ErrorTitle"),
        message: error instanceof Error ? error.message : tRelationships("DeleteError"),
        color: "red",
        icon: <IconX size={18} />,
      });
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

      await fetchRelationships();

      notifications.show({
        title: tRelationships("SuccessTitle"),
        message: tRelationships("UpdateSuccess"),
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch (error) {
      notifications.show({
        title: tRelationships("ErrorTitle"),
        message: error instanceof Error ? error.message : tRelationships("UpdateError"),
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setRelationshipsSaving(false);
    }
  };

  type GroupSelectItem = ComboboxItem & { color?: string | null; emoji?: string | null };

  const GroupValue = ({ value, onRemove }: { value: string; onRemove?: () => void }) => {
    const group = allGroups.find((g) => g.id === value);
    if (!group) return null;

    return (
      <Badge
        color={group.color || "gray"}
        leftSection={
          group.emoji ? <span style={{ fontSize: rem(14) }}>{group.emoji}</span> : undefined
        }
        rightSection={
          onRemove ? (
            <CloseButton
              size="xs"
              onMouseDown={onRemove}
              aria-label={`Remove ${group.label}`}
              variant="subtle"
            />
          ) : undefined
        }
        variant="light"
        radius="sm"
      >
        {group.label}
      </Badge>
    );
  };

  const GroupOption = ({ option }: { option: GroupSelectItem }) => (
    <Group gap="xs">
      <Badge
        color={option.color || "gray"}
        leftSection={
          option.emoji ? <span style={{ fontSize: rem(14) }}>{option.emoji}</span> : undefined
        }
        variant="light"
        radius="sm"
      >
        {option.label}
      </Badge>
    </Group>
  );

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
    modals.openConfirmModal({
      title: (
        <ModalTitle
          text={`Delete ${formatContactName(contact)}?`}
          icon={<IconAlertCircle size={24} />}
          isDangerous={true}
        />
      ),
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{formatContactName(contact)}</strong>? This
          person&apos;s data, mentions, and related information will be deleted. And this action
          cannot be restored.
        </Text>
      ),
      labels: { confirm: "Yes, delete", cancel: "No, cancel" },
      confirmProps: { color: "red", leftSection: <IconTrash size={16} /> },
      onConfirm: async () => {
        if (!contact || !personId) return;

        // Show loading notification
        const loadingNotification = notifications.show({
          title: "Deleting contact...",
          message: "Please wait while we delete this contact",
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });

        try {
          // API call
          const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [personId] }),
          });

          if (!res.ok) throw new Error("Failed to delete contact");

          // Success - hide loading notification
          notifications.hide(loadingNotification);

          // Show success notification
          notifications.show({
            title: "Success",
            message: "Contact deleted successfully",
            color: "green",
            icon: <IconCheck size={18} />,
          });

          // Redirect to people page
          await revalidateContacts();
          setTimeout(() => {
            router.push(WEBAPP_ROUTES.PEOPLE);
          }, 500);
        } catch {
          // Error - hide loading notification
          notifications.hide(loadingNotification);

          // Show error notification
          notifications.show({
            title: "Error",
            message: "Failed to delete contact. Please try again.",
            color: "red",
            icon: <IconX size={18} />,
          });
        }
      },
    });

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
            <ContactActionMenu contact={contact} personId={personId} onDelete={openDeleteModal} />
          }
        />

        <Paper withBorder shadow="sm" radius="md" p="xl">
          <Stack gap="lg">
            <ContactIdentitySection
              contact={contact}
              personId={personId}
              editedValues={editedValues}
              savingField={savingField}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              handleChange={handleChange}
              handleBlur={handleBlur}
            />

            <MultiSelect
              label="Groups"
              placeholder="Select groups"
              data={groupSelectData}
              value={selectedGroupIds}
              onChange={updateGroups}
              searchable
              clearable
              disabled={groupsSaving}
              comboboxProps={{ shadow: "md" }}
              renderOption={({ option }) => <GroupOption option={option as GroupSelectItem} />}
            />

            <Divider />

            <ContactBioSection
              editedValues={editedValues}
              savingField={savingField}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              handleChange={handleChange}
              handleBlur={handleBlur}
            />

            <Divider />

            <ContactPreferenceSection
              contact={contact}
              savingField={savingField}
              handleChange={handleContactFieldChange}
              handleBlur={handleContactFieldBlur}
            />

            <Divider />

            <ContactNotesSection editor={editor} savingField={savingField} />

            <Divider />

            <ContactInfoSection
              phones={phones}
              emails={emails}
              savingField={savingField}
              onPhonesChange={setPhones}
              onEmailsChange={setEmails}
              onSave={handleSaveContactInfo}
            />

            <Divider />

            <SocialMediaSection
              contact={contact}
              savingField={savingField}
              onSaveField={handleSocialMediaSave}
              whatsappPrefix={whatsappPrefix}
              signalPrefix={signalPrefix}
              setWhatsappPrefix={setWhatsappPrefix}
              setSignalPrefix={setSignalPrefix}
            />

            <Divider />

            <ContactImportantDatesSection
              events={importantEvents}
              personFirstName={contact.firstName}
              savingField={savingField}
              onEventsChange={setImportantEvents}
              onSave={handleSaveImportantEvents}
            />

            <Divider />

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

            <Divider />

            <LastInteractionSection contact={contact} />

            <Divider />

            <PersonTimelineSection
              activities={initialActivities}
              contact={contact}
              connectedContacts={initialConnectedContacts || []}
            />

            {hasCoordinates && (
              <>
                <Divider />
                <PersonMap
                  latitude={contact.latitude as number}
                  longitude={contact.longitude as number}
                  name={formatContactName(contact)}
                  avatarUrl={contact.avatar}
                />
              </>
            )}
          </Stack>
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
