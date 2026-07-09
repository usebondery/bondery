import { useEffect } from "react";
import { useMobileTranslations } from "../lib/i18n/useMobileTranslations";
import { subscribeSyncErrors } from "../lib/sync/outbox/sync-worker";
import { useAppToast } from "../lib/toast/useAppToast";

/** Surfaces rejected push mutations as toasts. */
export function SyncErrorToasts() {
  const t = useMobileTranslations();
  const { showToast } = useAppToast();

  useEffect(() => {
    return subscribeSyncErrors((message) => {
      showToast({
        description: message,
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
    });
  }, [showToast, t]);

  return null;
}
