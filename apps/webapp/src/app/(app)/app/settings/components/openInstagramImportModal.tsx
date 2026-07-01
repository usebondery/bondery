"use client";

import { modals } from "@mantine/modals";
import { IconDownload } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import { createModalId } from "@/lib/modals";
import { InstagramImportModal } from "./InstagramImportModal";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

interface OpenInstagramImportModalOptions {
  t: TranslateFn;
  onSuccess?: (stats: { imported: number; updated: number; skipped: number }) => void;
  showNavigationProgress?: boolean;
}

export function openInstagramImportModal({
  t,
  onSuccess,
  showNavigationProgress = true,
}: OpenInstagramImportModalOptions) {
  const modalId = createModalId("instagram-import");

  modals.open({
    modalId,
    title: <ModalTitle text={t("ModalTitle")} icon={<IconDownload size={20} stroke={1.5} />} />,
    size: "lg",
    children: (
      <InstagramImportModal
        t={t}
        modalId={modalId}
        onSuccess={onSuccess}
        showNavigationProgress={showNavigationProgress}
      />
    ),
  });
}
