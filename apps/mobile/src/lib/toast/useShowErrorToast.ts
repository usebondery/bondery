import { useCallback } from "react";
import { resolveDisplayedError } from "../api/resolveDisplayedError";
import { useCommonTranslations } from "../i18n/generated/hooks";
import { notifications } from "./notifications";

/**
 * Show a catalog error toast. Skip when the resolver returns `null` (401 / missing session).
 * Pass `headline` when the flow already has a feature title (share, create).
 */
export function useShowErrorToast() {
  const t = useCommonTranslations();

  return useCallback(
    (error: unknown, headline?: string) => {
      const message = resolveDisplayedError(error, t);
      if (!message) {
        return;
      }

      notifications.show({
        message,
        title: headline ?? t("feedback.errorTitle"),
        type: "error",
      });
    },
    [t],
  );
}
