"use client";

import { Stack } from "@mantine/core";
import { modals } from "@mantine/modals";
import { ModalFooter } from "@bondery/mantine-next";
import { useEffect, useState, type ReactNode } from "react";

interface OpenStandardConfirmModalOptions {
  title: ReactNode;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => Promise<void> | void;
  confirmColor?: string;
  confirmLeftSection?: ReactNode;
  centered?: boolean;
}

interface StandardConfirmModalBodyProps {
  modalId: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => Promise<void> | void;
  confirmColor?: string;
  confirmLeftSection?: ReactNode;
}

function StandardConfirmModalBody({
  modalId,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmColor,
  confirmLeftSection,
}: StandardConfirmModalBodyProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    modals.updateModal({
      modalId,
      closeOnClickOutside: !isSubmitting,
      closeOnEscape: !isSubmitting,
      withCloseButton: !isSubmitting,
    });
  }, [isSubmitting, modalId]);

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      await onConfirm();
      modals.close(modalId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack gap="md">
      {message}
      <ModalFooter
        cancelLabel={cancelLabel}
        onCancel={() => modals.close(modalId)}
        cancelDisabled={isSubmitting}
        actionLabel={confirmLabel}
        actionColor={confirmColor}
        actionLeftSection={confirmLeftSection}
        actionLoading={isSubmitting}
        actionDisabled={isSubmitting}
        onAction={() => {
          void handleConfirm();
        }}
      />
    </Stack>
  );
}

export function openStandardConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmColor,
  confirmLeftSection,
  centered = true,
}: OpenStandardConfirmModalOptions): void {
  const modalId = `confirm-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    title,
    centered,
    closeOnClickOutside: false,
    closeOnEscape: false,
    children: (
      <StandardConfirmModalBody
        modalId={modalId}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirm}
        confirmColor={confirmColor}
        confirmLeftSection={confirmLeftSection}
      />
    ),
  });
}
