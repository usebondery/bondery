"use client";

import { modals } from "@mantine/modals";
import { useEffect } from "react";
import { getModalDismissProps } from "./getModalDismissProps";

export function useModalBlocking(
  modalId: string | undefined,
  isBlocking: boolean,
  isDismissed = false,
) {
  useEffect(() => {
    if (!modalId || isDismissed) {
      return;
    }
    modals.updateModal({ modalId, ...getModalDismissProps(isBlocking) });
  }, [modalId, isBlocking, isDismissed]);
}
