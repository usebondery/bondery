"use client";

import {
  Container,
  Title,
  Group,
  Stack,
  Text,
  Avatar,
  Paper,
  Badge,
  Divider,
  ActionIcon,
  TextInput,
  Textarea,
  Loader,
  Select,
  Menu,
  MenuItem,
  Button,
  Flex,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { RichTextEditor, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { notifications } from "@mantine/notifications";
import {
  IconUser,
  IconMapPin,
  IconPhone,
  IconMail,
  IconBrandLinkedin,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconBrandFacebook,
  IconCalendar,
  IconCheck,
  IconX,
  IconBriefcase,
  IconNote,
  IconDotsVertical,
  IconTrash,
  IconAlertCircle,
  IconWorld,
  IconPhoto,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ContactsTable from "@/components/ContactsTable";
import NetworkGraph from "@/components/NetworkGraph";
import DateWithNotification from "@/components/DateWithNotification";
import { extractUsername, createSocialMediaUrl } from "@/lib/socialMediaHelpers";
import { INPUT_MAX_LENGTHS, LIMITS } from "@/lib/config";
import { countryCodes, parsePhoneNumber, combinePhoneNumber } from "@/lib/phoneHelpers";
import { formatContactName } from "@/lib/nameHelpers";
import type { Contact } from "@/lib/mockData";
import Image from "next/image";
import { ContactPhotoUploadButton } from "@/components/ContactPhotoUploadButton";

// Dynamic import for map component to avoid SSR issues
const MapComponent = dynamic(() => import("@/app/(app)/app/map/MapComponent"), {
  ssr: false,
});

interface PersonClientProps {
  initialContact: Contact;
  initialConnectedContacts: Contact[];
  personId: string;
}

export default function PersonClient({
  initialContact,
  initialConnectedContacts,
  personId,
}: PersonClientProps) {
  const router = useRouter();

  const [contact, setContact] = useState<Contact>(initialContact);
  const [connectedContacts, setConnectedContacts] = useState<Contact[]>(initialConnectedContacts);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<{
    [key: string]: string;
  }>({});
  const [phonePrefix, setPhonePrefix] = useState("+1");
  const [whatsappPrefix, setWhatsappPrefix] = useState("+1");
  const [signalPrefix, setSignalPrefix] = useState("+1");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [notifyBirthday, setNotifyBirthday] = useState(false);
  const [importantDates, setImportantDates] = useState<
    Array<{ date: Date | null; name: string; notify: boolean }>
  >([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Initialize edited values when contact loads
  useEffect(() => {
    if (contact) {
      // Parse phone number
      const phoneParsed = parsePhoneNumber(contact.phone || "");
      if (phoneParsed) {
        setPhonePrefix(phoneParsed.dialCode);
        setEditedValues((prev) => ({
          ...prev,
          phone: phoneParsed.number,
        }));
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
      if (contact.importantDates && contact.importantDates.length > 0) {
        setImportantDates(
          contact.importantDates.map((d) => ({
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
        email: contact.email || "",
        linkedin: contact.linkedin || "",
        instagram: contact.instagram || "",
        facebook: contact.facebook || "",
        website: contact.website || "",
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

  const handleSocialMediaSave = async (field: string, value: string) => {
    if (!contact || !personId) return;

    // Extract username from URL if applicable
    let processedValue = value;
    if (["linkedin", "instagram", "facebook", "whatsapp"].includes(field)) {
      processedValue = extractUsername(field, value);
    }

    // Handle phone and whatsapp - combine with prefix
    if (field === "phone") {
      processedValue = combinePhoneNumber(phonePrefix, value);
    } else if (field === "whatsapp") {
      processedValue = combinePhoneNumber(whatsappPrefix, value);
    } else if (field === "signal") {
      processedValue = combinePhoneNumber(signalPrefix, value);
    }

    // Check if value actually changed
    const originalValue = contact[field as keyof Contact] || "";
    if (processedValue === originalValue) {
      // Update display to show username even if not changed
      setEditedValues((prev) => ({
        ...prev,
        [field]: processedValue,
      }));
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
      const res = await fetch(`/api/contacts/${personId}`, {
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

      // Update edited values to show username
      setEditedValues((prev) => ({
        ...prev,
        [field]: processedValue,
      }));

      notifications.show({
        title: "Success",
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`,
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch {
      notifications.show({
        title: "Error",
        message: `Failed to update ${field}`,
        color: "red",
        icon: <IconX size={18} />,
      });

      // Revert to original value on error
      const revertValue = String(contact[field as keyof Contact] || "");
      setEditedValues((prev) => ({
        ...prev,
        [field]: revertValue,
      }));
    } finally {
      setSavingField(null);
    }
  };

  const handleBlur = (field: string) => {
    const value = editedValues[field] || "";
    handleSocialMediaSave(field, value);
  };

  const handleChange = (field: string, value: string) => {
    // Parse full phone number if pasted
    if (field === "phone" || field === "whatsapp" || field === "signal") {
      const parsed = parsePhoneNumber(value);
      if (parsed && value.includes("+")) {
        // User pasted a full number with prefix
        if (field === "phone") {
          setPhonePrefix(parsed.dialCode);
          setEditedValues((prev) => ({
            ...prev,
            [field]: parsed.number,
          }));
        } else if (field === "whatsapp") {
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
          const res = await fetch(`/api/contacts`, {
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

          // Redirect to relationships page
          setTimeout(() => {
            router.push("/app/relationships");
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
    <Container size="xl" style={{ position: "relative", minHeight: "100%" }}>
      <Stack gap="xl">
        <Group justify="space-between">
          <Group gap="sm">
            <IconUser size={32} stroke={1.5} />
            <Title order={1}>Person&apos;s details</Title>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="default" leftSection={<IconDotsVertical size={18} />}>
                Actions
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <MenuItem color="red" leftSection={<IconTrash size={16} />} onClick={openDeleteModal}>
                Delete Contact
              </MenuItem>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Paper withBorder shadow="sm" radius="md" p="xl">
          <Stack gap="lg">
            <Group align="flex-start">
              <ContactPhotoUploadButton
                avatarUrl={contact.avatar || null}
                contactName={formatContactName(contact)}
                contactId={personId}
              />

              <Stack gap="xs" style={{ flex: 1 }}>
                <Group gap="sm" align="flex-start">
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Group gap="xs" wrap="nowrap">
                      <TextInput
                        placeholder="First name"
                        value={editedValues.firstName || ""}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        onFocus={() => setFocusedField("firstName")}
                        onBlur={() => {
                          setFocusedField(null);
                          handleBlur("firstName");
                        }}
                        maxLength={INPUT_MAX_LENGTHS.firstName}
                        styles={{
                          root: { flex: 1 },
                          input: { fontSize: "1.5rem", fontWeight: 700 },
                        }}
                        rightSection={
                          savingField === "firstName" ? (
                            <Loader size="xs" />
                          ) : focusedField === "firstName" ? (
                            <Text size="10px" c="dimmed">
                              {editedValues.firstName?.length || 0}/{INPUT_MAX_LENGTHS.firstName}
                            </Text>
                          ) : null
                        }
                        disabled={savingField === "firstName"}
                      />
                      <TextInput
                        placeholder="Middle name"
                        value={editedValues.middleName || ""}
                        onChange={(e) => handleChange("middleName", e.target.value)}
                        onFocus={() => setFocusedField("middleName")}
                        onBlur={() => {
                          setFocusedField(null);
                          handleBlur("middleName");
                        }}
                        maxLength={INPUT_MAX_LENGTHS.middleName}
                        styles={{
                          root: { flex: 1 },
                          input: { fontSize: "1.5rem", fontWeight: 700 },
                        }}
                        rightSection={
                          savingField === "middleName" ? (
                            <Loader size="xs" />
                          ) : focusedField === "middleName" ? (
                            <Text size="10px" c="dimmed">
                              {editedValues.middleName?.length || 0}/{INPUT_MAX_LENGTHS.middleName}
                            </Text>
                          ) : null
                        }
                        disabled={savingField === "middleName"}
                      />
                      <TextInput
                        placeholder="Last name"
                        value={editedValues.lastName || ""}
                        onChange={(e) => handleChange("lastName", e.target.value)}
                        onFocus={() => setFocusedField("lastName")}
                        onBlur={() => {
                          setFocusedField(null);
                          handleBlur("lastName");
                        }}
                        maxLength={INPUT_MAX_LENGTHS.lastName}
                        styles={{
                          root: { flex: 1 },
                          input: { fontSize: "1.5rem", fontWeight: 700 },
                        }}
                        rightSection={
                          savingField === "lastName" ? (
                            <Loader size="xs" />
                          ) : focusedField === "lastName" ? (
                            <Text size="10px" c="dimmed">
                              {editedValues.lastName?.length || 0}/{INPUT_MAX_LENGTHS.lastName}
                            </Text>
                          ) : null
                        }
                        disabled={savingField === "lastName"}
                      />
                    </Group>
                  </Stack>
                  {contact.myself && (
                    <Badge color="violet" variant="light">
                      You
                    </Badge>
                  )}
                </Group>

                <TextInput
                  placeholder="Title"
                  value={editedValues.title || ""}
                  onChange={(e) => handleChange("title", e.target.value)}
                  onFocus={() => setFocusedField("title")}
                  onBlur={() => {
                    setFocusedField(null);
                    handleBlur("title");
                  }}
                  maxLength={INPUT_MAX_LENGTHS.title}
                  size="lg"
                  leftSection={<IconBriefcase size={18} />}
                  styles={{
                    input: { color: "var(--mantine-color-dimmed)" },
                  }}
                  style={{
                    width: "fit-content",
                    minWidth: 200,
                    maxWidth: "100%",
                  }}
                  rightSection={
                    savingField === "title" ? (
                      <Loader size="xs" />
                    ) : focusedField === "title" ? (
                      <Text size="10px" c="dimmed">
                        {editedValues.title?.length || 0}/{INPUT_MAX_LENGTHS.title}
                      </Text>
                    ) : null
                  }
                  disabled={savingField === "title"}
                />

                <TextInput
                  placeholder="Location"
                  value={editedValues.place || ""}
                  onChange={(e) => handleChange("place", e.target.value)}
                  onBlur={() => handleBlur("place")}
                  maxLength={INPUT_MAX_LENGTHS.place}
                  leftSection={<IconMapPin size={18} />}
                  style={{
                    width: "fit-content",
                    minWidth: 200,
                    maxWidth: "100%",
                  }}
                  rightSection={savingField === "place" ? <Loader size="xs" /> : null}
                  disabled={savingField === "place"}
                />
              </Stack>
            </Group>

            <Divider />

            <div>
              <Group gap="xs" mb="xs">
                <IconNote size={18} stroke={1.5} />
                <Text size="sm" fw={600}>
                  Short bio
                </Text>
              </Group>
              <Textarea
                placeholder="Add a short bio about the person, like what he loves, what you should tell him etc..."
                value={editedValues.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                onFocus={() => setFocusedField("description")}
                onBlur={() => {
                  setFocusedField(null);
                  handleBlur("description");
                }}
                maxLength={INPUT_MAX_LENGTHS.description}
                minRows={3}
                autosize
                rightSection={
                  savingField === "description" ? (
                    <Loader size="xs" />
                  ) : focusedField === "description" ? (
                    <Text size="10px" c="dimmed">
                      {editedValues.description?.length || 0}/{INPUT_MAX_LENGTHS.description}
                    </Text>
                  ) : null
                }
                disabled={savingField === "description"}
              />
            </div>

            <Divider />

            <div>
              <Group gap="xs" mb="xs" align="center">
                <Text size="sm" fw={600}>
                  Notes
                </Text>
                {savingField === "notes" && <Loader size="xs" />}
              </Group>
              <RichTextEditor editor={editor}>
                <RichTextEditor.Toolbar sticky stickyOffset={60}>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Underline />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.H1 />
                    <RichTextEditor.H2 />
                    <RichTextEditor.H3 />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Blockquote />
                    <RichTextEditor.Hr />
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Undo />
                    <RichTextEditor.Redo />
                  </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>

                <RichTextEditor.Content />
              </RichTextEditor>
            </div>

            <Divider />

            <div>
              <Text size="sm" fw={600} mb="md">
                Contact Information
              </Text>
              <Flex gap="md" direction={{ base: "column", sm: "row" }}>
                {/* Column 1: Phone, WhatsApp, Signal, Email */}
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Group gap="sm" align="center" wrap="nowrap">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      component="a"
                      href={contact.phone ? `tel:${contact.phone}` : undefined}
                      disabled={!contact.phone}
                    >
                      <IconPhone size={18} />
                    </ActionIcon>
                    <Select
                      value={phonePrefix}
                      onChange={(value) => setPhonePrefix(value || "+1")}
                      data={Array.from(
                        new Map(
                          countryCodes.map((country) => [
                            country.dialCode,
                            {
                              value: country.dialCode,
                              label: country.dialCode,
                            },
                          ]),
                        ).values(),
                      )}
                      renderOption={({ option }) => {
                        const country = countryCodes.find((c) => c.dialCode === option.value);
                        return (
                          <Group gap="xs">
                            <span className={`fi fi-${country?.flag || "us"}`} />
                            <span>{option.value}</span>
                          </Group>
                        );
                      }}
                      leftSection={
                        <span
                          className={`fi fi-${
                            countryCodes.find((c) => c.dialCode === phonePrefix)?.flag || "us"
                          }`}
                        />
                      }
                      searchable
                      style={{ width: 100 }}
                      size="sm"
                    />
                    <TextInput
                      placeholder="Phone number"
                      value={editedValues.phone || ""}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      onBlur={() => handleBlur("phone")}
                      style={{ flex: 1 }}
                      rightSection={savingField === "phone" ? <Loader size="xs" /> : null}
                      disabled={savingField === "phone"}
                    />
                  </Group>

                  <Group gap="sm" align="center" wrap="nowrap">
                    <ActionIcon
                      variant="light"
                      color="green"
                      component="a"
                      href={
                        contact.whatsapp
                          ? createSocialMediaUrl("whatsapp", contact.whatsapp)
                          : undefined
                      }
                      target="_blank"
                      disabled={!contact.whatsapp}
                    >
                      <IconBrandWhatsapp size={18} />
                    </ActionIcon>
                    <Select
                      value={whatsappPrefix}
                      onChange={(value) => setWhatsappPrefix(value || "+1")}
                      data={Array.from(
                        new Map(
                          countryCodes.map((country) => [
                            country.dialCode,
                            {
                              value: country.dialCode,
                              label: country.dialCode,
                            },
                          ]),
                        ).values(),
                      )}
                      renderOption={({ option }) => {
                        const country = countryCodes.find((c) => c.dialCode === option.value);
                        return (
                          <Group gap="xs">
                            <span className={`fi fi-${country?.flag || "us"}`} />
                            <span>{option.value}</span>
                          </Group>
                        );
                      }}
                      leftSection={
                        <span
                          className={`fi fi-${
                            countryCodes.find((c) => c.dialCode === whatsappPrefix)?.flag || "us"
                          }`}
                        />
                      }
                      searchable
                      style={{ width: 100 }}
                      size="sm"
                    />
                    <TextInput
                      placeholder="WhatsApp number or URL"
                      value={editedValues.whatsapp || ""}
                      onChange={(e) => handleChange("whatsapp", e.target.value)}
                      onBlur={() => handleBlur("whatsapp")}
                      style={{ flex: 1 }}
                      rightSection={savingField === "whatsapp" ? <Loader size="xs" /> : null}
                      disabled={savingField === "whatsapp"}
                    />
                  </Group>

                  <Group gap="sm" align="center" wrap="nowrap">
                    <ActionIcon
                      variant="light"
                      color="cyan"
                      component="a"
                      href={
                        contact.signal
                          ? `signal://signal.me/#p/${contact.signal.replace(/\D/g, "")}`
                          : undefined
                      }
                      disabled={!contact.signal}
                    >
                      <Image src="/icons/signal.svg" alt="Signal" width={18} height={18} />
                    </ActionIcon>
                    <Select
                      value={signalPrefix}
                      onChange={(value) => setSignalPrefix(value || "+1")}
                      data={Array.from(
                        new Map(
                          countryCodes.map((country) => [
                            country.dialCode,
                            {
                              value: country.dialCode,
                              label: country.dialCode,
                            },
                          ]),
                        ).values(),
                      )}
                      renderOption={({ option }) => {
                        const country = countryCodes.find((c) => c.dialCode === option.value);
                        return (
                          <Group gap="xs">
                            <span className={`fi fi-${country?.flag || "us"}`} />
                            <span>{option.value}</span>
                          </Group>
                        );
                      }}
                      leftSection={
                        <span
                          className={`fi fi-${
                            countryCodes.find((c) => c.dialCode === signalPrefix)?.flag || "us"
                          }`}
                        />
                      }
                      searchable
                      style={{ width: 100 }}
                      size="sm"
                    />
                    <TextInput
                      placeholder="Signal number"
                      value={editedValues.signal || ""}
                      onChange={(e) => handleChange("signal", e.target.value)}
                      onBlur={() => handleBlur("signal")}
                      style={{ flex: 1 }}
                      rightSection={savingField === "signal" ? <Loader size="xs" /> : null}
                      disabled={savingField === "signal"}
                    />
                  </Group>

                  <Group gap="sm" align="center">
                    <ActionIcon
                      variant="light"
                      color="red"
                      component="a"
                      href={contact.email ? `mailto:${contact.email}` : undefined}
                      disabled={!contact.email}
                    >
                      <IconMail size={18} />
                    </ActionIcon>
                    <TextInput
                      placeholder="Email address"
                      value={editedValues.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      style={{ flex: 1 }}
                      rightSection={savingField === "email" ? <Loader size="xs" /> : null}
                      disabled={savingField === "email"}
                    />
                  </Group>
                </Stack>

                {/* Column 2: LinkedIn, Website, Instagram, Facebook */}
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Group gap="sm" align="center">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      component="a"
                      href={
                        contact.linkedin
                          ? createSocialMediaUrl("linkedin", contact.linkedin)
                          : undefined
                      }
                      target="_blank"
                      disabled={!contact.linkedin}
                    >
                      <IconBrandLinkedin size={18} />
                    </ActionIcon>
                    <TextInput
                      placeholder="LinkedIn username or URL"
                      value={editedValues.linkedin || ""}
                      onChange={(e) => handleChange("linkedin", e.target.value)}
                      onBlur={() => handleBlur("linkedin")}
                      style={{ flex: 1 }}
                      rightSection={savingField === "linkedin" ? <Loader size="xs" /> : null}
                      disabled={savingField === "linkedin"}
                    />
                  </Group>

                  <Group gap="sm" align="center">
                    <ActionIcon
                      variant="light"
                      color="gray"
                      component="a"
                      href={contact.website || undefined}
                      target="_blank"
                      disabled={!contact.website}
                    >
                      <IconWorld size={18} />
                    </ActionIcon>
                    <TextInput
                      placeholder="Website URL"
                      value={editedValues.website || ""}
                      onChange={(e) => handleChange("website", e.target.value)}
                      onBlur={() => handleBlur("website")}
                      style={{ flex: 1 }}
                      rightSection={savingField === "website" ? <Loader size="xs" /> : null}
                      disabled={savingField === "website"}
                    />
                  </Group>

                  <Group gap="sm" align="center">
                    <ActionIcon
                      variant="light"
                      color="pink"
                      component="a"
                      href={
                        contact.instagram
                          ? createSocialMediaUrl("instagram", contact.instagram)
                          : undefined
                      }
                      target="_blank"
                      disabled={!contact.instagram}
                    >
                      <IconBrandInstagram size={18} />
                    </ActionIcon>
                    <TextInput
                      placeholder="Instagram username or URL"
                      value={editedValues.instagram || ""}
                      onChange={(e) => handleChange("instagram", e.target.value)}
                      onBlur={() => handleBlur("instagram")}
                      style={{ flex: 1 }}
                      rightSection={savingField === "instagram" ? <Loader size="xs" /> : null}
                      disabled={savingField === "instagram"}
                    />
                  </Group>

                  <Group gap="sm" align="center">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      component="a"
                      href={
                        contact.facebook
                          ? createSocialMediaUrl("facebook", contact.facebook)
                          : undefined
                      }
                      target="_blank"
                      disabled={!contact.facebook}
                    >
                      <IconBrandFacebook size={18} />
                    </ActionIcon>
                    <TextInput
                      placeholder="Facebook username or URL"
                      value={editedValues.facebook || ""}
                      onChange={(e) => handleChange("facebook", e.target.value)}
                      onBlur={() => handleBlur("facebook")}
                      style={{ flex: 1 }}
                      rightSection={savingField === "facebook" ? <Loader size="xs" /> : null}
                      disabled={savingField === "facebook"}
                    />
                  </Group>
                </Stack>
              </Flex>
            </div>

            <Divider />

            <DateWithNotification
              title="Birthday"
              dateLabel="Select birthday"
              dateValue={birthday}
              notifyValue={notifyBirthday}
              onDateChange={(date) => {
                setBirthday(date);

                // If birthday is cleared, set notifyBirthday to false
                if (!date && notifyBirthday) {
                  setNotifyBirthday(false);
                  // Also save the notification preference change
                  if (contact && personId) {
                    setSavingField("notifyBirthday");
                    setTimeout(() => {
                      setContact({
                        ...contact,
                        notifyBirthday: false,
                        birthdate: undefined,
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

                // Auto-save birthday if valid date
                if (contact && personId && date) {
                  setSavingField("birthday");
                  setTimeout(() => {
                    setContact({ ...contact, birthdate: date });
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
              onNotifyChange={(checked) => {
                setNotifyBirthday(checked);
                // Auto-save notification preference
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
              saving={savingField === "birthday" || savingField === "notifyBirthday"}
              focusedField={focusedField}
              onFocus={setFocusedField}
              onBlur={setFocusedField}
              fieldPrefix="birthday"
            />

            <Divider />

            <div>
              <Group justify="space-between" mb="md">
                <Text size="sm" fw={600}>
                  Important Dates
                </Text>
                {importantDates.length < LIMITS.maxImportantDates && (
                  <Button size="xs" variant="light" onClick={handleAddImportantDate}>
                    Add Date
                  </Button>
                )}
              </Group>
              {importantDates.length > 0 ? (
                <Stack gap="md">
                  {importantDates.map((importantDate, index) => (
                    <Group key={index} align="flex-start" gap="sm">
                      <div style={{ flex: 1 }}>
                        <DateWithNotification
                          title=""
                          dateLabel="Select date"
                          nameLabel="Event name"
                          dateValue={importantDate.date}
                          nameValue={importantDate.name}
                          notifyValue={importantDate.notify}
                          onDateChange={(date) => handleImportantDateChange(index, date)}
                          onNameChange={(name) => handleImportantDateNameChange(index, name)}
                          onNotifyChange={(notify) =>
                            handleImportantDateNotifyChange(index, notify)
                          }
                          showNameInput
                          saving={savingField === `importantDate-${index}`}
                          focusedField={focusedField}
                          onFocus={setFocusedField}
                          onBlur={setFocusedField}
                          fieldPrefix={`importantDate-${index}`}
                        />
                      </div>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => handleRemoveImportantDate(index)}
                        style={{ marginTop: 4 }}
                      >
                        <IconX size={18} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No important dates added yet.
                </Text>
              )}
            </div>

            <Divider />

            <div>
              <Group gap="xs" mb="xs">
                <IconCalendar size={18} stroke={1.5} />
                <Text size="sm" fw={600}>
                  Last Interaction
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {contact.lastInteraction.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </div>
          </Stack>
        </Paper>

        {contact.position && (
          <Paper withBorder shadow="sm" radius="md" p="md">
            <Stack gap="md">
              <Text size="sm" fw={600}>
                Location Map
              </Text>

              <div
                style={{
                  width: "100%",
                  height: "400px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <MapComponent
                  contacts={[contact, ...connectedContacts.filter((c) => c.position)]}
                  focusContactId={contact.id}
                />
              </div>
            </Stack>
          </Paper>
        )}

        {connectedContacts.length > 0 && (
          <>
            <Paper withBorder shadow="sm" radius="md" p="md">
              <Stack gap="md">
                <Text size="sm" fw={600}>
                  Network Visualization
                </Text>

                <NetworkGraph
                  contacts={[contact, ...connectedContacts]}
                  height={400}
                  centerNodeId={contact.id}
                />
              </Stack>
            </Paper>

            <Paper withBorder shadow="sm" radius="md" p="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Connections ({connectedContacts.length})
                  </Text>
                </Group>

                <ContactsTable
                  contacts={connectedContacts}
                  visibleColumns={["avatar", "name", "title", "place", "shortNote", "social"]}
                  showSelection={false}
                />
              </Stack>
            </Paper>
          </>
        )}
      </Stack>
    </Container>
  );
}
