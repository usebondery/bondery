import { Group, Loader, Text, Textarea } from "@mantine/core";
import { IconNote } from "@tabler/icons-react";
import { INPUT_MAX_LENGTHS } from "@/lib/config";

interface ContactBioSectionProps {
  editedValues: Record<string, string>;
  savingField: string | null;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  handleChange: (field: string, value: string) => void;
  handleBlur: (field: string) => void;
}

export function ContactBioSection({
  editedValues,
  savingField,
  focusedField,
  setFocusedField,
  handleChange,
  handleBlur,
}: ContactBioSectionProps) {
  return (
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
  );
}
