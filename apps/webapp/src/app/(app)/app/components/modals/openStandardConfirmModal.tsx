"use client";

import { modals } from "@mantine/modals";
import { type ReactNode } from "react";
import { createModalId } from "@/lib/modals";
import { StandardConfirmModalBody } from "./StandardConfirmModalBody";

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
