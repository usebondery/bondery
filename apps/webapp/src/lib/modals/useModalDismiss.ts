"use client";

import { modals } from "@mantine/modals";
import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { useModalBlocking } from "./useModalBlocking";

/**
 * Combines dismiss-guarded close helpers with `useModalBlocking`.
 *
 * Call `closeModal` / `closeModalSync` instead of `modals.close(modalId)` so a
 * late `isBlocking` transition cannot resurrect the modal via `updateModal`.
 */
export function useModalDismiss(modalId: string | undefined, isBlocking: boolean) {
  const [isDismissed, setIsDismissed] = useState(false);
  useModalBlocking(modalId, isBlocking, isDismissed);

  const closeModal = useCallback(() => {
    if (!modalId) {
      return;
    }
    setIsDismissed(true);
    modals.close(modalId);
  }, [modalId]);

  const closeModalSync = useCallback(() => {
    if (!modalId) {
      return;
    }
    flushSync(() => {
      setIsDismissed(true);
      modals.close(modalId);
    });
  }, [modalId]);

  return { closeModal, closeModalSync };
}
