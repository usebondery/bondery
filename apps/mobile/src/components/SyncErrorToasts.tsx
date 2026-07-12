import { useEffect } from "react";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { subscribeSyncErrors } from "../lib/sync/outbox/sync-worker";
import { useAppToast } from "../lib/toast/useAppToast";

/** Surfaces rejected push mutations as toasts. */
export function SyncErrorToasts() {
  const t = useCommonTranslations();
  const { showToast } = useAppToast();

  useEffect(() => {
    return subscribeSyncErrors((message) => {
      showToast({
        description: message,
        headline: t("feedback.errorTitle"),
        type: "error",
      });
    });
  }, [showToast, t]);

  return null;
}
