import { useEffect } from "react";
import { subscribeSyncErrors } from "../lib/sync/outbox/sync-worker";
import { useMobileTranslations } from "../lib/i18n/useMobileTranslations";
import { useAppToast } from "../lib/toast/useAppToast";

/** Surfaces rejected push mutations as toasts. */
export function SyncErrorToasts() {
  const t = useMobileTranslations();
  const { showToast } = useAppToast();

  useEffect(() => {
    return subscribeSyncErrors((message) => {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: message,
      });
    });
  }, [showToast, t]);

  return null;
}
