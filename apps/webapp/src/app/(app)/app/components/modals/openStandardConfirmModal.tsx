"use client";

import { modals } from "@mantine/modals";
import type { ReactNode } from "react";
import { createModalId } from "@/lib/modals";
import { StandardConfirmModalBody } from "./StandardConfirmModalBody";

interface OpenStandardConfirmModalOptions {
  cancelLabel: string;
  centered?: boolean;
  confirmColor?: string;
  confirmLabel: string;
  confirmLeftSection?: ReactNode;
  message: ReactNode;
  onConfirm: () => Promise<void> | void;
  title: ReactNode;
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
    centered,
    children: (
      <StandardConfirmModalBody
        cancelLabel={cancelLabel}
        confirmColor={confirmColor}
        confirmLabel={confirmLabel}
        confirmLeftSection={confirmLeftSection}
        message={message}
        modalId={modalId}
        onConfirm={onConfirm}
      />
    ),
    modalId,
    title,
  });
}
