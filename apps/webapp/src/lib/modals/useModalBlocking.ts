"use client";

import { useEffect } from "react";
import { modals } from "@mantine/modals";
import { getModalDismissProps } from "./getModalDismissProps";

export function useModalBlocking(modalId: string | undefined, isBlocking: boolean) {
  useEffect(() => {
    if (!modalId) return;
    modals.updateModal({ modalId, ...getModalDismissProps(isBlocking) });
  }, [modalId, isBlocking]);
}
