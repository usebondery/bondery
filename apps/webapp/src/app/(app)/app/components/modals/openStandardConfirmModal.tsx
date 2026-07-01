"use client";

import { Stack } from "@mantine/core";
import { modals } from "@mantine/modals";
import { ModalFooter } from "@bondery/mantine-next";
import { useState, type ReactNode } from "react";
import { createModalId, useModalBlocking } from "@/lib/modals";

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
  const modalId = createModalId("confirm");

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
