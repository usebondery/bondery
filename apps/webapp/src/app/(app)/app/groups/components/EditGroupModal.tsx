"use client";

import { useState } from "react";
import {
  Stack,
  TextInput,
  Group,
  ColorInput,
  DEFAULT_THEME,
  Box,
} from "@mantine/core";
import { useForm, schemaResolver } from "@mantine/form";
import { updateGroupSchema } from "@bondery/schemas";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUsersGroup, IconCheck } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  EmojiPicker,
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { DEBOUNCE_MS } from "@/lib/config";
import { useUpdateGroupMutation } from "@/lib/query/hooks/useGroups";
import { createModalId, useModalBlocking } from "@/lib/modals";

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

interface EditGroupModalProps {
  groupId: string;
  initialLabel: string;
  initialEmoji: string;
  initialColor: string;
}

function EditGroupModalTitle() {
  const t = useTranslations("GroupsPage");
  return <ModalTitle text={t("EditGroupModal.Title")} icon={<IconUsersGroup size={24} />} />;
}

export function openEditGroupModal(props: EditGroupModalProps) {
  const modalId = createModalId("edit-group");

  modals.open({
    modalId,
    title: <EditGroupModalTitle />,
    trapFocus: true,
    size: "md",
    children: <EditGroupForm {...props} modalId={modalId} />,
  });
}

function EditGroupForm({
  groupId,
  initialLabel,
  initialEmoji,
  initialColor,
  modalId,
}: EditGroupModalProps & { modalId: string }) {
  const t = useTranslations("GroupsPage");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateGroupMutation = useUpdateGroupMutation(groupId);

  useModalBlocking(modalId, isSubmitting);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      label: initialLabel,
      emoji: initialEmoji,
      color: initialColor,
    },
    validate: schemaResolver(updateGroupSchema, { sync: true }),
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("EditGroupModal.LoadingTitle"),
        description: t("EditGroupModal.LoadingDescription"),
      }),
    });

    try {
      await updateGroupMutation.mutateAsync({
        label: values.label.trim(),
        emoji: values.emoji.trim(),
        color: values.color.trim(),
      });

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          title: t("EditGroupModal.SuccessTitle"),
          description: t("EditGroupModal.SuccessDescription"),
        }),
      );

      modals.close(modalId);
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          title: t("EditGroupModal.ErrorTitle"),
          description: error instanceof Error ? error.message : t("EditGroupModal.UpdateFailed"),
        }),
      );
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
              searchDebounceMs={DEBOUNCE_MS.localFilter}
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <TextInput
              label={t("EditGroupModal.LabelInput")}
              placeholder={t("EditGroupModal.LabelPlaceholder")}
              withAsterisk
              required
              data-autofocus
              {...form.getInputProps("label")}
            />
          </Box>
        </Group>

        <ColorInput
          label={t("EditGroupModal.ColorInput")}
          placeholder={t("EditGroupModal.ColorPlaceholder")}
          withAsterisk
          format="hex"
          swatches={COLOR_SWATCHES}
          swatchesPerRow={9}
          closeOnColorSwatchClick
          {...form.getInputProps("color")}
        />

        <ModalFooter
          cancelLabel={t("EditGroupModal.Cancel")}
          onCancel={() => modals.close(modalId)}
          cancelDisabled={isSubmitting}
          actionLabel={t("EditGroupModal.SaveChanges")}
          actionType="submit"
          actionLoading={isSubmitting}
          actionDisabled={isSubmitting}
          actionLeftSection={<IconCheck size={16} />}
        />
      </Stack>
    </form>
  );
}
