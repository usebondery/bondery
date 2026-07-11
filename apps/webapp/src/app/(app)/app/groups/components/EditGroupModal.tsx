"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  EmojiPicker,
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { updateGroupSchema } from "@bondery/schemas";
import { Box, ColorInput, DEFAULT_THEME, Group, Stack, TextInput } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconUsersGroup } from "@tabler/icons-react";
import { useState } from "react";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalDismiss } from "@/lib/modals";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { useUpdateGroupMutation } from "@/lib/query/hooks/useGroups";

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
  initialColor: string;
  initialEmoji: string;
  initialLabel: string;
}

function EditGroupModalTitle() {
  const t = useWebTranslations("GroupsPage");
  return <ModalTitle icon={<IconUsersGroup size={24} />} text={t("EditGroupModal.Title")} />;
}

export function openEditGroupModal(props: EditGroupModalProps) {
  const modalId = createModalId("edit-group");

  modals.open({
    children: <EditGroupForm {...props} modalId={modalId} />,
    modalId,
    size: "md",
    title: <EditGroupModalTitle />,
    trapFocus: true,
  });
}

function EditGroupForm({
  groupId,
  initialLabel,
  initialEmoji,
  initialColor,
  modalId,
}: EditGroupModalProps & { modalId: string }) {
  const tCommon = useCommonTranslations();
  const t = useWebTranslations("GroupsPage");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateGroupMutation = useUpdateGroupMutation(groupId);
  const isBlocking = isSubmitting;
  const { closeModal } = useModalDismiss(modalId, isBlocking);

  const form = useForm({
    initialValues: {
      color: initialColor,
      emoji: initialEmoji,
      label: initialLabel,
    },
    mode: "controlled",
    validate: schemaResolver(updateGroupSchema, { sync: true }),
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("EditGroupModal.LoadingDescription"),
        title: t("EditGroupModal.LoadingTitle"),
      }),
    });

    try {
      await updateGroupMutation.mutateAsync({
        color: values.color.trim(),
        emoji: values.emoji.trim(),
        label: values.label.trim(),
      });

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          description: t("EditGroupModal.SuccessDescription"),
          title: t("EditGroupModal.SuccessTitle"),
        }),
      );

      closeModal();
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("EditGroupModal.ErrorTitle"),
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
              disabled={isBlocking}
              error={form.errors.emoji as string | undefined}
              onChange={(emoji) => form.setFieldValue("emoji", emoji)}
              searchDebounceMs={DEBOUNCE_MS.localFilter}
              value={form.values.emoji}
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <TextInput
              data-autofocus
              disabled={isBlocking}
              label={t("EditGroupModal.LabelInput")}
              placeholder={t("EditGroupModal.LabelPlaceholder")}
              required
              withAsterisk
              {...form.getInputProps("label")}
            />
          </Box>
        </Group>

        <ColorInput
          closeOnColorSwatchClick
          disabled={isBlocking}
          format="hex"
          label={t("EditGroupModal.ColorInput")}
          placeholder={t("EditGroupModal.ColorPlaceholder")}
          swatches={COLOR_SWATCHES}
          swatchesPerRow={9}
          withAsterisk
          {...form.getInputProps("color")}
        />

        <ModalFooter
          actionDisabled={isSubmitting}
          actionLabel={t("EditGroupModal.SaveChanges")}
          actionLeftSection={<IconCheck size={16} />}
          actionLoading={isSubmitting}
          actionType="submit"
          cancelDisabled={isSubmitting}
          cancelLabel={t("EditGroupModal.Cancel")}
          onCancel={closeModal}
        />
      </Stack>
    </form>
  );
}
