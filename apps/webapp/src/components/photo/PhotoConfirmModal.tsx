"use client";

import { ModalFooter } from "@bondery/mantine-next";
import { Group, Stack } from "@mantine/core";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import { UserAvatar } from "@/components/shell/UserAvatar";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import {
  type PhotoUploadVariant,
  usePhotoUploadTranslations,
} from "./hooks/usePhotoUploadTranslations";

interface PhotoConfirmModalProps {
  actionDisabled?: boolean;
  actionLoading?: boolean;
  backDisabled?: boolean;
  cancelDisabled?: boolean;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  preview: string;
  variant: PhotoUploadVariant;
}

export function PhotoConfirmModal({
  variant,
  preview,
  onBack,
  onCancel,
  onConfirm,
  actionLoading = false,
  actionDisabled = false,
  backDisabled = false,
  cancelDisabled = false,
}: PhotoConfirmModalProps) {
  const t = usePhotoUploadTranslations(variant);
  const tCommon = useCommonTranslations("actions");

  return (
    <Stack gap="md">
      <Group justify="center">
        <UserAvatar avatarUrl={preview} size={200} userName="Preview" />
      </Group>
      <ModalFooter
        actionDisabled={actionDisabled}
        actionLabel={t("ConfirmPhoto")}
        actionLeftSection={<IconCheck size={16} />}
        actionLoading={actionLoading}
        backDisabled={backDisabled}
        backLabel={tCommon("back")}
        backLeftSection={<IconArrowLeft size={16} />}
        cancelDisabled={cancelDisabled}
        cancelLabel={t("Cancel")}
        onAction={onConfirm}
        onBack={onBack}
        onCancel={onCancel}
      />
    </Stack>
  );
}
