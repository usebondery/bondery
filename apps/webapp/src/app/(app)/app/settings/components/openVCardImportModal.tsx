"use client";

import { modals } from "@mantine/modals";
import { IconDownload } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import { createModalId } from "@/lib/modals";
import { VCardImportModal } from "./VCardImportModal";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

interface OpenVCardImportModalOptions {
  t: TranslateFn;
  showNavigationProgress?: boolean;
}

export function openVCardImportModal({
  t,
  showNavigationProgress = true,
}: OpenVCardImportModalOptions) {
  const modalId = createModalId("vcard-import");

  modals.open({
    modalId,
    title: <ModalTitle text={t("ModalTitle")} icon={<IconDownload size={20} stroke={1.5} />} />,
    size: "lg",
    children: (
      <VCardImportModal t={t} modalId={modalId} showNavigationProgress={showNavigationProgress} />
    ),
  });
}
