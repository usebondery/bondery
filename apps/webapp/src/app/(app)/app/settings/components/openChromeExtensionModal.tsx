"use client";

import { modals } from "@mantine/modals";
import { IconPuzzle } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import { createModalId } from "@/lib/modals";
import { ChromeExtensionModal } from "./ChromeExtensionModal";

type ChromeExtensionModalTranslateKey =
  | "IntroTitle"
  | "IntroDescription1"
  | "IntroDescription2"
  | "IntroDescription3"
  | "InstallButton"
  | "Close";

interface OpenChromeExtensionModalOptions {
  title: string;
  t: (key: ChromeExtensionModalTranslateKey) => string;
}

export function openChromeExtensionModal({ title, t }: OpenChromeExtensionModalOptions) {
  const modalId = createModalId("chrome-extension");

  modals.open({
    modalId,
    title: <ModalTitle text={title} icon={<IconPuzzle size={20} stroke={1.5} />} />,
    size: "md",
    children: <ChromeExtensionModal modalId={modalId} t={t} />,
  });
}
