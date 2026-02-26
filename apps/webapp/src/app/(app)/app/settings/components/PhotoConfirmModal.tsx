"use client";

import { Group, Stack } from "@mantine/core";
import { ModalFooter } from "@bondery/mantine-next";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import { UserAvatar } from "@/app/(app)/app/components/UserAvatar";

interface PhotoConfirmModalProps {
  preview: string;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  translations: {
    UpdateProfilePhoto: string;
    Back?: string;
    Cancel: string;
    ConfirmPhoto: string;
  };
}

export function PhotoConfirmModal({
  preview,
  onBack,
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
        backLabel={translations.Back || "Back"}
        onBack={onBack}
        backLeftSection={<IconArrowLeft size={16} />}
        cancelLabel={translations.Cancel}
        onCancel={onCancel}
        actionLabel={translations.ConfirmPhoto}
        onAction={onConfirm}
        actionLeftSection={<IconCheck size={16} />}
      />
    </Stack>
  );
}
