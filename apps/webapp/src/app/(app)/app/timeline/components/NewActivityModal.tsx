"use client";

import { Modal, Button, Select, Group, Stack, Textarea, MultiSelect, Text, ActionIcon, Avatar, ComboboxItem, MultiSelectProps } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX, IconMicrophone, IconPaperclip, IconSparkles, IconPlus } from "@tabler/icons-react";
import { useState, forwardRef } from "react";
import { useRouter } from "next/navigation";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, ActivityType } from "@bondery/types";

interface NewActivityModalProps {
  opened: boolean;
  onClose: () => void;
  contacts: Contact[];
}

const ACTIVITY_TYPES: ActivityType[] = [
  "Call",
  "Coffee",
  "Email",
  "Meal",
  "Meeting",
  "Networking",
  "Note",
  "Other",
  "Party/Social",
  "Text/Messaging",
  "Custom",
];

// Custom item component for MultiSelect
const SelectItem = forwardRef<HTMLDivElement, ComboboxItem & { avatar?: string | null; avatarColor?: string | null; initials?: string }>(
  ({ label, avatar, avatarColor, initials, ...others }, ref) => (
    <div ref={ref} {...others}>
      <Group gap="sm">
        <Avatar src={avatar} size="sm" radius="xl" color={avatarColor || "blue"}>
          {initials}
        </Avatar>
        <Text size="sm">{label}</Text>
      </Group>
    </div>
  )
);
SelectItem.displayName = "SelectItem";

export function NewActivityModal({ opened, onClose, contacts }: NewActivityModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      participantIds: [] as string[],
      date: new Date(),
      type: "Call" as string,
      description: "",
      location: "",
    },
    validate: {
      participantIds: (value) => (value.length > 0 ? null : "Please select at least one contact"),
      date: (value) => (value ? null : "Please select a date"),
      type: (value) => (value ? null : "Please select a type"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const date = values.date instanceof Date ? values.date : new Date(values.date);
      const res = await fetch(API_ROUTES.ACTIVITIES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          date: date.toISOString(),
        }),
      });

      if (!res.ok) {
        console.error("Failed to create activity:", res.statusText);
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to create activity");
      }

      notifications.show({
        title: "Success",
        message: "Activity created successfully",
        color: "green",
        icon: <IconCheck size={18} />,
      });

      onClose();
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create activity. Please try again.",
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const contactOptions = contacts.map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName || ""}`.trim(),
    avatar: c.avatar,
    avatarColor: c.avatarColor,
    initials: c.firstName[0],
  }));

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={<Text fw={600} size="lg">Who are you meeting?</Text>}
      size="lg"
      radius="md"
      padding="xl"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <MultiSelect
            placeholder="Add contacts..."
            data={contactOptions}
            searchable
            nothingFoundMessage="No contacts found"
            renderOption={(item: any) => <SelectItem {...item.option} />}
            {...form.getInputProps("participantIds")}
            size="md"
            variant="filled"
            maxDropdownHeight={200}
          />

          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={500}>Note</Text>
            </Group>
            <Textarea
              placeholder="What would you like to add? Press (r) to focus."
              minRows={6}
              {...form.getInputProps("description")}
              variant="filled"
            />
          </Stack>

          <Group justify="space-between" align="flex-end" mt="md">
            <Group>
              <DatePickerInput
                placeholder="Pick date"
                valueFormat="YYYY-MM-DD"
                {...form.getInputProps("date")}
                w={140}
              />
              <Select
                data={ACTIVITY_TYPES}
                placeholder="Type"
                {...form.getInputProps("type")}
                w={140}
                allowDeselect={false}
              />
            </Group>

            <Group>
              {/* <ActionIcon variant="subtle" color="gray" size="lg">
                <IconPaperclip size={20} />
              </ActionIcon> */}
            </Group>
          </Group>

          <Group justify="flex-end" mt="xl">
            <Button variant="subtle" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Activity
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
