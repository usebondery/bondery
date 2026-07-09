"use client";

import { modals } from "@mantine/modals";
import { createModalId } from "@/lib/modals";
import { LinkedInImportModal, type LinkedInImportStep } from "./modals/LinkedInImportModal";
import { LinkedInImportModalTitle } from "./modals/LinkedInImportModalTitle";

interface OpenLinkedInImportModalOptions {
  initialStep?: LinkedInImportStep;
  onAwaitingExport?: () => void | Promise<void>;
  onSuccess?: (stats: { imported: number; updated: number; skipped: number }) => void;
  showNavigationProgress?: boolean;
}

export function openLinkedInImportModal({
  onSuccess,
  showNavigationProgress = true,
  initialStep,
  onAwaitingExport,
}: OpenLinkedInImportModalOptions = {}) {
  const modalId = createModalId("linkedin-import");

  modals.open({
    children: (
      <LinkedInImportModal
        initialStep={initialStep}
        modalId={modalId}
        onAwaitingExport={onAwaitingExport}
        onSuccess={onSuccess}
        showNavigationProgress={showNavigationProgress}
      />
    ),
    modalId,
    size: "lg",
    title: <LinkedInImportModalTitle />,
  });
}
