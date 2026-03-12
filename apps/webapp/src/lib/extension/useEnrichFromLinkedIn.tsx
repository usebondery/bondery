"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { Stack, Text } from "@mantine/core";
import { IconBrandLinkedin, IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { checkExtensionAuth } from "@/lib/extension/checkExtensionAuth";
import { CHROME_EXTENSION_URL } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";

const ENRICH_REQUEST_TYPE = "BONDERY_ENRICH_REQUEST";
const ENRICH_RESULT_TYPE = "BONDERY_ENRICH_RESULT";

/**
 * Hook that provides a function to trigger the "Enrich from LinkedIn" flow.
 *
 * The flow:
 * 1. Checks if the Bondery Chrome Extension is installed
 * 2. Opens a hidden LinkedIn tab via the extension
 * 3. The extension auto-scrapes the profile
 * 4. The API force-updates the contact with the scraped data
 * 5. Shows success/error notification
 *
 * @param options.onSuccess Optional callback invoked after a successful enrichment (e.g. to revalidate server caches).
 * @returns An object with `enrichFromLinkedIn(contactId, linkedinHandle)` function.
 */
export function useEnrichFromLinkedIn(options?: { onSuccess?: () => void | Promise<void> }) {
  const t = useTranslations("EnrichFromLinkedIn");
  const router = useRouter();
  const pendingRequestId = useRef<string | null>(null);

  // Store onSuccess in a ref to avoid stale closures without
  // re-creating the callback when the reference changes.
  const onSuccessRef = useRef(options?.onSuccess);
  onSuccessRef.current = options?.onSuccess;

  const enrichFromLinkedIn = useCallback(
    async (contactId: string, linkedinHandle: string | null | undefined) => {
      // Check if LinkedIn handle is set
      if (!linkedinHandle) {
        notifications.show(
          errorNotificationTemplate({
            title: t("ErrorTitle"),
            description: t("NoLinkedInHandle"),
          }),
        );
        return;
      }

      // Check if extension is installed and authenticated
      const authState = await checkExtensionAuth();
      if (authState === "not_installed") {
        const modalId = `enrich-ext-required-${Math.random().toString(36).slice(2)}`;
        modals.open({
          modalId,
          title: (
            <ModalTitle
              text={t("ExtensionRequiredTitle")}
              icon={<IconBrandLinkedin size={20} stroke={1.5} />}
            />
          ),
          size: "sm",
          centered: true,
          children: (
            <Stack gap="md">
              <Text size="sm">{t("ExtensionRequiredMessage")}</Text>
              <ModalFooter
                cancelLabel={t("Cancel")}
                onCancel={() => modals.close(modalId)}
                actionLabel={t("InstallExtension")}
                actionLeftSection={<IconDownload size={16} />}
                onAction={() => {
                  window.open(CHROME_EXTENSION_URL, "_blank");
                  modals.close(modalId);
                }}
              />
            </Stack>
          ),
        });
        return;
      }

      if (authState === "not_authenticated") {
        notifications.show(
          errorNotificationTemplate({
            title: t("NotAuthenticatedTitle"),
            description: t("NotAuthenticatedMessage"),
          }),
        );
        return;
      }

      // Generate a unique request ID
      const requestId = crypto.randomUUID();
      pendingRequestId.current = requestId;

      // Show loading notification
      const notificationId = `enrich-${requestId}`;
      notifications.show({
        id: notificationId,
        title: t("EnrichingTitle"),
        message: t("EnrichingDescription"),
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });

      // Set up listener for the result
      const resultPromise = new Promise<{ success: boolean; error?: string }>((resolve) => {
        const timeout = setTimeout(() => {
          cleanup();
          resolve({ success: false, error: "timeout" });
        }, 20_000); // 20s timeout

        const onMessage = (event: MessageEvent) => {
          if (event.source !== window) return;
          if (event.data?.type !== ENRICH_RESULT_TYPE) return;
          if (event.data?.payload?.requestId !== requestId) return;

          cleanup();
          resolve({
            success: event.data.payload.success,
            error: event.data.payload.error,
          });
        };

        const cleanup = () => {
          clearTimeout(timeout);
          window.removeEventListener("message", onMessage);
        };

        window.addEventListener("message", onMessage);
      });

      // Send the enrich request to the extension via postMessage
      window.postMessage(
        {
          type: ENRICH_REQUEST_TYPE,
          payload: {
            contactId,
            linkedinHandle,
            requestId,
          },
        },
        window.location.origin,
      );

      // Wait for the result
      const result = await resultPromise;
      pendingRequestId.current = null;

      // Update notification with result
      if (result.success) {
        notifications.update({
          id: notificationId,
          ...successNotificationTemplate({
            title: t("SuccessTitle"),
            description: t("SuccessDescription"),
          }),
          loading: false,
          autoClose: 4000,
          withCloseButton: true,
        });
        // Refresh the page to show updated data
        await onSuccessRef.current?.();
        router.refresh();
      } else {
        const isTimeout = result.error === "timeout";
        notifications.update({
          id: notificationId,
          ...errorNotificationTemplate({
            title: isTimeout ? t("ExtensionNotRespondingTitle") : t("ErrorTitle"),
            description: isTimeout
              ? t("ExtensionNotRespondingDescription")
              : result.error || t("ErrorDescription"),
          }),
          loading: false,
          autoClose: 6000,
          withCloseButton: true,
        });
      }
    },
    [t, router],
  );

  return { enrichFromLinkedIn };
}
