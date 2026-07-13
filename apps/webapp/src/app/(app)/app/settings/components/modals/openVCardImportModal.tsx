"use client";

import { modals } from "@mantine/modals";
import { createModalId } from "@/lib/modals";
import { VCardImportModal } from "./VCardImportModal";
import { VCardImportModalTitle } from "./VCardImportModalTitle";

interface OpenVCardImportModalOptions {
  showNavigationProgress?: boolean;
}

export function openVCardImportModal({
  showNavigationProgress = true,
}: OpenVCardImportModalOptions = {}) {
  const modalId = createModalId("vcard-import");

  modals.open({
    children: (
      <VCardImportModal modalId={modalId} showNavigationProgress={showNavigationProgress} />
    ),
    modalId,
    size: "lg",
    title: <VCardImportModalTitle />,
  });
}
