"use client";

import { Stack } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { ModalFooter } from "@bondery/mantine-next";
import { useState, type ReactNode } from "react";
import { useModalBlocking } from "@/lib/modals";

export interface StandardConfirmModalBodyProps {
  modalId: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => Promise<void> | void;
  confirmColor?: string;
  confirmLeftSection?: ReactNode;
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

  useModalBlocking(modalId, isSubmitting);

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      await onConfirm();
      modals.close(modalId);
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
        cancelLabel={cancelLabel}
        onCancel={() => modals.close(modalId)}
        cancelDisabled={isSubmitting}
        actionLabel={confirmLabel}
        actionColor={confirmColor}
        actionLeftSection={resolvedConfirmLeftSection}
        actionLoading={isSubmitting}
        actionDisabled={isSubmitting}
        onAction={() => {
          void handleConfirm();
        }}
      />
    </Stack>
  );
}
