"use client";

import { modals } from "@mantine/modals";
import { createModalId } from "@/lib/modals";
import { FeedbackModal } from "./FeedbackModal";
import { FeedbackModalTitle } from "./FeedbackModalTitle";

export function openFeedbackModal() {
  const modalId = createModalId("feedback");

  modals.open({
    children: <FeedbackModal modalId={modalId} />,
    modalId,
    size: "lg",
    title: <FeedbackModalTitle />,
  });
}
