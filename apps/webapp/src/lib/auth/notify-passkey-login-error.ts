import { errorNotificationTemplate } from "@bondery/mantine-next";
import { notifications } from "@mantine/notifications";
import { captureEvent } from "@/lib/analytics/client";
import { classifyPasskeyCeremonyError } from "@/lib/auth/passkey-ceremony";

type PasskeyLoginT = (
  key:
    | "AuthenticationError"
    | "NoPasskeyFound"
    | "PasskeySignInFailed"
    | "PasskeyTimedOut"
    | "PasskeysUnavailable",
) => string;

/**
 * Maps a passkey sign-in error to a toast (never the raw server message) and
 * fires login analytics. OS-sheet cancel is silent.
 */
export function notifyPasskeyLoginError(error: unknown, t: PasskeyLoginT): void {
  const kind = classifyPasskeyCeremonyError(error);

  if (kind === "cancel") {
    captureEvent("auth:passkey_cancel");
    return;
  }

  captureEvent("auth:passkey_fail");

  const resolveDescription = () => {
    if (kind === "timeout") {
      return t("PasskeyTimedOut");
    }
    if (kind === "not_found") {
      return t("NoPasskeyFound");
    }
    if (kind === "unsupported") {
      return t("PasskeysUnavailable");
    }
    return t("PasskeySignInFailed");
  };
  const description = resolveDescription();

  notifications.show(
    errorNotificationTemplate({
      description,
      title: t("AuthenticationError"),
    }),
  );
}
