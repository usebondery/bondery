"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Stack,
  TextInput,
  Button,
  Group,
  Text,
  ColorInput,
  DEFAULT_THEME,
  Box,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUsersGroup } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import { EmojiPicker, getRandomEmoji } from "@/app/(app)/app/components/EmojiPicker";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { revalidateGroups } from "../../actions";

// Predefined color swatches
const COLOR_SWATCHES = [
  ...DEFAULT_THEME.colors.red.slice(5, 8),
  ...DEFAULT_THEME.colors.pink.slice(5, 8),
  ...DEFAULT_THEME.colors.grape.slice(5, 8),
  ...DEFAULT_THEME.colors.violet.slice(5, 8),
  ...DEFAULT_THEME.colors.indigo.slice(5, 8),
  ...DEFAULT_THEME.colors.blue.slice(5, 8),
  ...DEFAULT_THEME.colors.cyan.slice(5, 8),
  ...DEFAULT_THEME.colors.teal.slice(5, 8),
  ...DEFAULT_THEME.colors.green.slice(5, 8),
  ...DEFAULT_THEME.colors.lime.slice(5, 8),
  ...DEFAULT_THEME.colors.yellow.slice(5, 8),
  ...DEFAULT_THEME.colors.orange.slice(5, 8),
];

// Get a random color from swatches
function getRandomColor(): string {
  return COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)];
}

export function openAddGroupModal() {
  modals.open({
    title: <ModalTitle text="Add new group" icon={<IconUsersGroup size={24} />} />,
    trapFocus: true,
    size: "md",
    children: <AddGroupForm />,
  });
}

function AddGroupForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      label: "",
      emoji: getRandomEmoji(),
      color: getRandomColor(),
    },
    validate: {
      label: (value) =>
        value.trim().length === 0
          ? "Please add a label"
          : value.length > 100
            ? "Label must be 100 characters or less"
            : null,
      emoji: (value) => (value.trim().length === 0 ? "Please select an emoji" : null),
      color: (value) => (value.trim().length === 0 ? "Please select a color" : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      title: "Creating group...",
      message: "Please wait while we create the new group",
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const res = await fetch(API_ROUTES.GROUPS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: values.label.trim(),
          emoji: values.emoji.trim(),
          color: values.color.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create group");
      }

      notifications.hide(loadingNotification);

      notifications.show({
        title: "Success",
        message: "Group created successfully",
        color: "green",
      });

      modals.closeAll();
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create group",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Group align="flex-start" gap="md">
          <Box style={{ width: 80 }}>
            <EmojiPicker
              value={form.values.emoji}
              onChange={(emoji) => form.setFieldValue("emoji", emoji)}
              error={form.errors.emoji as string | undefined}
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <TextInput
              label="Label"
              placeholder="e.g., Family, Work, Friends"
              withAsterisk
              required
              data-autofocus
              {...form.getInputProps("label")}
            />
          </Box>
        </Group>

        <ColorInput
          label="Color"
          placeholder="Pick a color"
          withAsterisk
          format="hex"
          swatches={COLOR_SWATCHES}
          swatchesPerRow={9}
          closeOnColorSwatchClick
          {...form.getInputProps("color")}
        />

        <Group justify="flex-end" gap="sm" mt="md">
          <Button variant="default" onClick={() => modals.closeAll()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} leftSection={<IconUsersGroup size={16} />}>
            Create group
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
