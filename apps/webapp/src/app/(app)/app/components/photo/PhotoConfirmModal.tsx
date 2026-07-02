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
  actionLoading?: boolean;
  actionDisabled?: boolean;
  backDisabled?: boolean;
  cancelDisabled?: boolean;
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
  actionLoading = false,
  actionDisabled = false,
  backDisabled = false,
  cancelDisabled = false,
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
        backDisabled={backDisabled}
        cancelLabel={translations.Cancel}
        onCancel={onCancel}
        cancelDisabled={cancelDisabled}
        actionLabel={translations.ConfirmPhoto}
        onAction={onConfirm}
        actionLeftSection={<IconCheck size={16} />}
        actionLoading={actionLoading}
        actionDisabled={actionDisabled}
      />
    </Stack>
  );
}
