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
import { extractUsername } from "@/lib/socialMediaHelpers";
import { LIMITS } from "@/lib/config";
import { parsePhoneNumber, combinePhoneNumber } from "@/lib/phoneHelpers";
import { formatContactName } from "@/lib/nameHelpers";
import type { Contact, Group as GroupType, PhoneEntry, EmailEntry } from "@bondery/types";
import type { ComboboxItem, MultiSelectValueProps } from "@mantine/core";
import { ContactActionMenu } from "./components/ContactActionMenu";
import { ContactIdentitySection } from "./components/ContactIdentitySection";
import { ContactBioSection } from "./components/ContactBioSection";
import { ContactPreferenceSection } from "./components/ContactPreferenceSection";
import { ContactNotesSection } from "./components/ContactNotesSection";
import { ContactInfoSection } from "./components/ContactInfoSection";
import { SocialMediaSection } from "./components/SocialMediaSection";
import { ContactImportantDatesSection } from "./components/ContactImportantDatesSection";
import { LastInteractionSection } from "./components/LastInteractionSection";
// import { ContactPGPSection } from "./components/ContactPGPSection";
import { API_ROUTES } from "@bondery/helpers";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";

const PersonMap = dynamic(() => import("./components/PersonMap").then((mod) => mod.PersonMap), {
  ssr: false,
  loading: () => <Skeleton height={360} radius="md" />,
});

interface PersonClientProps {
  initialContact: Contact;
  initialConnectedContacts: Contact[];
  initialGroups: GroupType[];
  initialPersonGroups: GroupType[];
  personId: string;
}

export default function PersonClient({
  initialContact,
  initialConnectedContacts: _initialConnectedContacts,
  initialGroups,
  initialPersonGroups,
  personId,
}: PersonClientProps) {
  const router = useRouter();

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
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [notifyBirthday, setNotifyBirthday] = useState(false);
  const [importantDates, setImportantDates] = useState<
    Array<{ date: Date | null; name: string; notify: boolean }>
  >([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [groupsSaving, setGroupsSaving] = useState(false);

  const hasCoordinates = Number.isFinite(contact?.latitude) && Number.isFinite(contact?.longitude);

  const groupSelectData = allGroups.map((group) => ({
    value: group.id,
    label: group.label,
    color: group.color,
    emoji: group.emoji,
  }));

  const selectedGroupIds = personGroups.map((group) => group.id);

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

      // Set birthday
      if (contact.birthdate) {
        setBirthday(new Date(contact.birthdate));
      } else {
        setBirthday(null);
      }
      setNotifyBirthday(contact.notifyBirthday || false);

      // Set important dates
      if (
        contact.importantDates &&
        Array.isArray(contact.importantDates) &&
        contact.importantDates.length > 0
      ) {
        setImportantDates(
          contact.importantDates.map((d: any) => ({
            date: new Date(d.date),
            name: d.name,
            notify: d.notify,
          })),
        );
      } else {
        setImportantDates([]);
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

  const handleSavePhones = async () => {
    if (!contact || !personId) return;

    // Filter out empty phones and ensure we have both prefix and value
    const phonesToSave = phones
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

  const handleSaveEmails = async () => {
    if (!contact || !personId) return;

    // Filter out empty emails
    const emailsToSave = emails.filter((email) => email.value.trim() !== "");

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

  const handleSaveContactInfo = async () => {
    await handleSavePhones();
    await handleSaveEmails();
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
      // Update display to show username even if not changed
      if (field !== "pgpPublicKey") {
        setEditedValues((prev) => ({
          ...prev,
          [field]: processedValue,
        }));
      }
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

      // Update edited values to show username (except for PGP key)
      if (field !== "pgpPublicKey") {
        setEditedValues((prev) => ({
          ...prev,
          [field]: processedValue,
        }));
      }

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

      // Revert to original value on error
      const revertValue = String(contact[field as keyof Contact] || "");
      if (field !== "pgpPublicKey") {
        setEditedValues((prev) => ({
          ...prev,
          [field]: revertValue,
        }));
      }
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

  type GroupSelectItem = ComboboxItem & { color?: string | null; emoji?: string | null };

  const GroupValue = ({ value, onRemove }: MultiSelectValueProps) => {
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

  const handleAddImportantDate = () => {
    if (importantDates.length >= LIMITS.maxImportantDates) {
      notifications.show({
        title: "Limit reached",
        message: `You can only add up to ${LIMITS.maxImportantDates} important dates`,
        color: "orange",
      });
      return;
    }
    setImportantDates([...importantDates, { date: null, name: "", notify: false }]);
  };

  const handleRemoveImportantDate = (index: number) => {
    setImportantDates(importantDates.filter((_, i) => i !== index));
    // TODO: Save to API
  };

  const handleImportantDateChange = (index: number, date: Date | null) => {
    const newDates = [...importantDates];
    newDates[index] = { ...newDates[index], date };

    // If date is cleared, also clear notify
    if (!date) {
      newDates[index].notify = false;
    }

    setImportantDates(newDates);
    // TODO: Save to API
  };

  const handleImportantDateNameChange = (index: number, name: string) => {
    const newDates = [...importantDates];
    newDates[index] = { ...newDates[index], name };
    setImportantDates(newDates);
    // TODO: Save to API
  };

  const handleImportantDateNotifyChange = (index: number, notify: boolean) => {
    const newDates = [...importantDates];
    newDates[index] = { ...newDates[index], notify };
    setImportantDates(newDates);
    // TODO: Save to API
  };

  const openDeleteModal = () =>
    modals.openConfirmModal({
      title: (
        <Group gap="xs">
          <IconAlertCircle size={24} color="red" />
          <Text fw={600} size="lg" c={"red"}>
            Delete {formatContactName(contact)}?
          </Text>
        </Group>
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
          backHref={WEBAPP_ROUTES.PEOPLE}
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
              editedValues={editedValues}
              savingField={savingField}
              handleChange={handleChange}
              handleBlur={handleBlur}
              whatsappPrefix={whatsappPrefix}
              signalPrefix={signalPrefix}
              setWhatsappPrefix={setWhatsappPrefix}
              setSignalPrefix={setSignalPrefix}
            />

            <Divider />

            <ContactImportantDatesSection
              birthday={birthday}
              notifyBirthday={notifyBirthday}
              onBirthdayChange={(date) => {
                setBirthday(date);

                if (!date && notifyBirthday) {
                  setNotifyBirthday(false);
                  if (contact && personId) {
                    setSavingField("notifyBirthday");
                    setTimeout(() => {
                      setContact({
                        ...contact,
                        notifyBirthday: false,
                        birthdate: null,
                      });
                      notifications.show({
                        title: "Success",
                        message: "Birthday and notification cleared",
                        color: "green",
                        icon: <IconCheck size={18} />,
                      });
                      setSavingField(null);
                    }, 500);
                  }
                  return;
                }

                if (contact && personId && date) {
                  setSavingField("birthday");
                  setTimeout(() => {
                    setContact({ ...contact, birthdate: date.toISOString().split("T")[0] });
                    notifications.show({
                      title: "Success",
                      message: "Birthday updated successfully",
                      color: "green",
                      icon: <IconCheck size={18} />,
                    });
                    setSavingField(null);
                  }, 1000);
                }
              }}
              onNotifyBirthdayChange={(checked) => {
                setNotifyBirthday(checked);
                if (contact && personId) {
                  setSavingField("notifyBirthday");
                  setTimeout(() => {
                    setContact({ ...contact, notifyBirthday: checked });
                    notifications.show({
                      title: "Success",
                      message: "Notification preference updated",
                      color: "green",
                      icon: <IconCheck size={18} />,
                    });
                    setSavingField(null);
                  }, 500);
                }
              }}
              importantDates={importantDates}
              onAddImportantDate={handleAddImportantDate}
              onRemoveImportantDate={handleRemoveImportantDate}
              onImportantDateChange={handleImportantDateChange}
              onImportantDateNameChange={handleImportantDateNameChange}
              onImportantDateNotifyChange={handleImportantDateNotifyChange}
              savingField={savingField}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
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

            <LastInteractionSection contact={contact} />

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
