import { useEffect } from "react";
import { subscribeSyncErrors } from "../lib/sync/outbox/sync-worker";
import { useShowErrorToast } from "../lib/toast/useShowErrorToast";

/** Surfaces rejected push mutations as toasts. */
export function SyncErrorToasts() {
  const showErrorToast = useShowErrorToast();

  useEffect(
    () =>
      subscribeSyncErrors((error) => {
        showErrorToast(error);
      }),
    [showErrorToast],
  );

  return null;
}
