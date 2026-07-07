"use client";

import { modals } from "@mantine/modals";
import { IconDownload } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import { createModalId } from "@/lib/modals";
import { LinkedInImportModal, type LinkedInImportStep } from "./LinkedInImportModal";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

interface OpenLinkedInImportModalOptions {
  t: TranslateFn;
  onSuccess?: (stats: { imported: number; updated: number; skipped: number }) => void;
  showNavigationProgress?: boolean;
  initialStep?: LinkedInImportStep;
  onAwaitingExport?: () => void | Promise<void>;
}

export function openLinkedInImportModal({
  t,
  onSuccess,
  showNavigationProgress = true,
  initialStep,
  onAwaitingExport,
}: OpenLinkedInImportModalOptions) {
  const modalId = createModalId("linkedin-import");

  modals.open({
    modalId,
    title: <ModalTitle text={t("ModalTitle")} icon={<IconDownload size={20} stroke={1.5} />} />,
    size: "lg",
    children: (
      <LinkedInImportModal
        t={t}
        modalId={modalId}
        onSuccess={onSuccess}
        showNavigationProgress={showNavigationProgress}
        initialStep={initialStep}
        onAwaitingExport={onAwaitingExport}
      />
    ),
  });
}
