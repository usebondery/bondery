"use client";

import { modals } from "@mantine/modals";
import { createModalId } from "@/lib/modals";
import { PwaInstallModal } from "./PwaInstallModal";
import { PwaInstallModalTitle } from "./PwaInstallModalTitle";

interface OpenPwaInstallModalOptions {
  install: () => Promise<boolean>;
  isChromiumDesktop: boolean;
}

export function openPwaInstallModal({ isChromiumDesktop, install }: OpenPwaInstallModalOptions) {
  const modalId = createModalId("pwa-install");

  modals.open({
    children: (
      <PwaInstallModal install={install} isChromiumDesktop={isChromiumDesktop} modalId={modalId} />
    ),
    modalId,
    size: "md",
    title: <PwaInstallModalTitle />,
  });
}
