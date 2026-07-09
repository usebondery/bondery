"use client";

import { ModalFooter } from "@bondery/mantine-next";
import { Stack } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { useModalDismiss } from "@/lib/modals";

export interface StandardConfirmModalBodyProps {
  cancelLabel: string;
  confirmColor?: string;
  confirmLabel: string;
  confirmLeftSection?: ReactNode;
  message: ReactNode;
  modalId: string;
  onConfirm: () => Promise<void> | void;
}

export function StandardConfirmModalBody({
  modalId,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmColor,
  confirmLeftSection,
}: StandardConfirmModalBodyProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { closeModal } = useModalDismiss(modalId, isSubmitting);

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      await onConfirm();
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolvedConfirmLeftSection =
    confirmLeftSection ?? (confirmColor === "red" ? <IconTrash size={16} /> : undefined);

  return (
    <Stack gap="md">
      {message}
      <ModalFooter
        actionColor={confirmColor}
        actionDisabled={isSubmitting}
        actionLabel={confirmLabel}
        actionLeftSection={resolvedConfirmLeftSection}
        actionLoading={isSubmitting}
        cancelDisabled={isSubmitting}
        cancelLabel={cancelLabel}
        onAction={() => {
          void handleConfirm();
        }}
        onCancel={closeModal}
      />
    </Stack>
  );
}
