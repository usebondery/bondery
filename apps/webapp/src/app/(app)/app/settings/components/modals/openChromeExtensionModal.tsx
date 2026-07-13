"use client";

import { modals } from "@mantine/modals";
import { createModalId } from "@/lib/modals";
import { ChromeExtensionModal } from "./ChromeExtensionModal";
import { ChromeExtensionModalTitle } from "./ChromeExtensionModalTitle";

export function openChromeExtensionModal() {
  const modalId = createModalId("chrome-extension");

  modals.open({
    children: <ChromeExtensionModal modalId={modalId} />,
    modalId,
    size: "md",
    title: <ChromeExtensionModalTitle />,
  });
}
