"use client";

import { Button, Group, Stack } from "@mantine/core";
import { UserAvatar } from "@/components/UserAvatar";

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
      <Group justify="flex-end">
        <Button variant="default" onClick={onCancel}>
          {translations.Cancel}
        </Button>
        <Button onClick={onConfirm}>{translations.ConfirmPhoto}</Button>
      </Group>
    </Stack>
  );
}
