"use client";

import { modals } from "@mantine/modals";
import { createModalId } from "@/lib/modals";
import { InstagramImportModal, type InstagramImportStep } from "./InstagramImportModal";
import { InstagramImportModalTitle } from "./InstagramImportModalTitle";

interface OpenInstagramImportModalOptions {
  initialStep?: InstagramImportStep;
  onAwaitingExport?: () => void | Promise<void>;
  onSuccess?: (stats: { imported: number; updated: number; skipped: number }) => void;
  showNavigationProgress?: boolean;
}

export function openInstagramImportModal({
  onSuccess,
  showNavigationProgress = true,
  initialStep,
  onAwaitingExport,
}: OpenInstagramImportModalOptions = {}) {
  const modalId = createModalId("instagram-import");

  modals.open({
    children: (
      <InstagramImportModal
        initialStep={initialStep}
        modalId={modalId}
        onAwaitingExport={onAwaitingExport}
        onSuccess={onSuccess}
        showNavigationProgress={showNavigationProgress}
      />
    ),
    modalId,
    size: "lg",
    title: <InstagramImportModalTitle />,
  });
}
