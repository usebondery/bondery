"use client";

import { modals } from "@mantine/modals";
import { createModalId } from "@/lib/modals";
import { FeedbackModal } from "./modals/FeedbackModal";
import { FeedbackModalTitle } from "./modals/FeedbackModalTitle";

export function openFeedbackModal() {
  const modalId = createModalId("feedback");

  modals.open({
    children: <FeedbackModal modalId={modalId} />,
    modalId,
    size: "lg",
    title: <FeedbackModalTitle />,
  });
}
