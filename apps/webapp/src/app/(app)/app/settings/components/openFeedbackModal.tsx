"use client";

import { modals } from "@mantine/modals";
import { IconMessageCircle } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import type { TFunction } from "i18next";
import { createModalId } from "@/lib/modals";
import { FeedbackModal } from "./FeedbackModal";

interface OpenFeedbackModalOptions {
  title: string;
  t: TFunction;
}

export function openFeedbackModal({ title, t }: OpenFeedbackModalOptions) {
  const modalId = createModalId("feedback");

  modals.open({
    modalId,
    title: <ModalTitle text={title} icon={<IconMessageCircle size={20} stroke={1.5} />} />,
    size: "lg",
    children: <FeedbackModal modalId={modalId} t={t} />,
  });
}
