import { Badge, Group, Loader, Stack, TextInput } from "@mantine/core";
import { IconBriefcase, IconMapPin } from "@tabler/icons-react";
import type { Contact } from "@bondery/types";
import { ContactPhotoUploadButton } from "./ContactPhotoUploadButton";
import { INPUT_MAX_LENGTHS } from "@/lib/config";

interface ContactIdentitySectionProps {
  contact: Contact;
  personId: string;
  editedValues: Record<string, string>;
  savingField: string | null;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  handleChange: (field: string, value: string) => void;
  handleBlur: (field: string) => void;
}

export function ContactIdentitySection({
  contact,
  personId,
  editedValues,
  savingField,
  focusedField,
  setFocusedField,
  handleChange,
  handleBlur,
}: ContactIdentitySectionProps) {
  return (
    <Group align="flex-start">
      <ContactPhotoUploadButton
        avatarUrl={contact.avatar || null}
        contactName={`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact"}
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
                    <span style={{ fontSize: 10, color: "var(--mantine-color-dimmed)" }}>
                      {editedValues.firstName?.length || 0}/{INPUT_MAX_LENGTHS.firstName}
                    </span>
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
                    <span style={{ fontSize: 10, color: "var(--mantine-color-dimmed)" }}>
                      {editedValues.middleName?.length || 0}/{INPUT_MAX_LENGTHS.middleName}
                    </span>
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
                    <span style={{ fontSize: 10, color: "var(--mantine-color-dimmed)" }}>
                      {editedValues.lastName?.length || 0}/{INPUT_MAX_LENGTHS.lastName}
                    </span>
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
              <span style={{ fontSize: 10, color: "var(--mantine-color-dimmed)" }}>
                {editedValues.title?.length || 0}/{INPUT_MAX_LENGTHS.title}
              </span>
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
  );
}
