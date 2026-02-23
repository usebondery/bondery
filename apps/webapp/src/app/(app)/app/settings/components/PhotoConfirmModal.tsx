"use client";

import { Group, Stack } from "@mantine/core";
import { ModalFooter } from "@bondery/mantine-next";
import { UserAvatar } from "@/app/(app)/app/components/UserAvatar";

interface PhotoConfirmModalProps {
  preview: string;
  onCancel: () => void;
  onConfirm: () => void;
  translations: {
    UpdateProfilePhoto: string;
    Cancel: string;
    ConfirmPhoto: string;
  };
}

export function PhotoConfirmModal({
  preview,
  onCancel,
  onConfirm,
  translations,
}: PhotoConfirmModalProps) {
  return (
    <Stack gap="md">
      <Group justify="center">
        <UserAvatar avatarUrl={preview} userName="Preview" size={200} />
      </Group>
      <ModalFooter
        cancelLabel={translations.Cancel}
        onCancel={onCancel}
        actionLabel={translations.ConfirmPhoto}
        onAction={onConfirm}
      />
    </Stack>
  );
}
