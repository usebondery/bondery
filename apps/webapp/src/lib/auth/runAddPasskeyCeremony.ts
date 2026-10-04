import { getAuthUserFacingError } from "@bondery/helpers/api";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import { notifications } from "@mantine/notifications";
import type { QueryClient } from "@tanstack/react-query";
import { captureEvent } from "@/lib/analytics/client";
import {
  type AaguidCatalog,
  loadVendoredAaguidCatalog,
  parseCreatedPasskey,
  resolveStoredPasskeyName,
} from "@/lib/auth/aaguid-catalog";
import type { WebappAuthClient } from "@/lib/auth/client";
import { classifyPasskeyCeremonyError } from "@/lib/auth/passkey-ceremony";
import { invalidatePasskeys } from "@/lib/query/invalidation";

export type RunAddPasskeyCeremonyResult = "ok" | "cancel" | "session_stale" | "fail";

export async function runAddPasskeyCeremony(input: {
  authClient: WebappAuthClient;
  catalog?: AaguidCatalog | null;
  createErrorDescription: string;
  createErrorTitle: string;
  fallbackName: string;
  nameTemplate: (values: { browser: string; os: string }) => string;
  queryClient: QueryClient;
  tCommon: Parameters<typeof getAuthUserFacingError>[1];
}): Promise<RunAddPasskeyCeremonyResult> {
  try {
    const { data, error: addError } = await input.authClient.passkey.addPasskey();
    if (addError) {
      const kind = classifyPasskeyCeremonyError(addError);
      if (kind === "cancel") {
        captureEvent("account_settings:passkey_cancel");
        return "cancel";
      }
      if (kind === "session_stale") {
        return "session_stale";
      }
      captureEvent("account_settings:passkey_fail");
      notifications.show(
        errorNotificationTemplate({
          description: getAuthUserFacingError(addError, input.tCommon),
          title: input.createErrorTitle,
        }),
      );
      return "fail";
    }

    const created = parseCreatedPasskey(data);
    if (!created) {
      notifications.show(
        errorNotificationTemplate({
          description: input.createErrorDescription,
          title: input.createErrorTitle,
        }),
      );
      captureEvent("account_settings:passkey_fail");
      return "fail";
    }

    let catalog: AaguidCatalog = input.catalog ?? {};
    if (!input.catalog) {
      try {
        catalog = await loadVendoredAaguidCatalog();
      } catch {
        catalog = {};
      }
    }

    const storedName = await resolveStoredPasskeyName({
      aaguid: created.aaguid,
      catalog,
      fallback: input.fallbackName,
      template: input.nameTemplate,
    });

    const { error: updateError } = await input.authClient.passkey.updatePasskey({
      id: created.id,
      name: storedName,
    });
    if (updateError) {
      notifications.show(
        errorNotificationTemplate({
          description: getAuthUserFacingError(updateError, input.tCommon),
          title: input.tCommon("feedback.errorTitle"),
        }),
      );
    }

    captureEvent("account_settings:passkey_add");
    await invalidatePasskeys(input.queryClient);
    return "ok";
  } catch (caught) {
    const kind = classifyPasskeyCeremonyError(caught);
    if (kind === "cancel") {
      captureEvent("account_settings:passkey_cancel");
      return "cancel";
    }
    if (kind === "session_stale") {
      return "session_stale";
    }
    captureEvent("account_settings:passkey_fail");
    notifications.show(
      errorNotificationTemplate({
        description: getAuthUserFacingError(caught, input.tCommon),
        title: input.createErrorTitle,
      }),
    );
    return "fail";
  }
}
