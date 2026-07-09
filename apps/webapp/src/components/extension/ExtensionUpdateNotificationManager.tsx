"use client";

import { CHROME_EXTENSION_URL, isVersionBelow } from "@bondery/helpers";
import { Button, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPuzzle } from "@tabler/icons-react";
import { useEffect } from "react";
import { clientApiFetch } from "@/lib/api/client";
import { detectBonderyChromeExtension } from "@/lib/extension/detectBonderyChromeExtension";
import { statusNotificationsStore } from "@/lib/extension/statusNotificationsStore";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

const EXTENSION_UPDATE_ID = "extension-update";

/**
 * Detects the installed Chrome extension version on mount, compares it
 * against the minimum version returned by the API /status endpoint,
 * and shows a persistent red notification via `statusNotificationsStore`
 * when the extension is outdated.
 *
 * Mount once in the authenticated app layout.
 */
export function ExtensionUpdateNotificationManager() {
  const t = useWebTranslations("ExtensionVersionCheck");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const detection = await detectBonderyChromeExtension();
      if (cancelled || detection.state !== "installed" || !detection.version) {
        return;
      }

      try {
        const res = await clientApiFetch("/api/status");
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        const minVersion: string | undefined = data?.extension?.minVersion;
        if (!minVersion) {
          return;
        }

        if (cancelled) {
          return;
        }

        if (isVersionBelow(detection.version, minVersion)) {
          function openExtensionsPage() {
            const requestId = crypto.randomUUID();

            const promise = new Promise<boolean>((resolve) => {
              const timeoutId = window.setTimeout(() => {
                window.removeEventListener("message", onAck);
                resolve(false);
              }, 1500);

              function onAck(event: MessageEvent) {
                if (
                  event.source === window &&
                  event.data?.type === "BONDERY_OPEN_EXTENSIONS_PAGE_ACK" &&
                  event.data?.requestId === requestId
                ) {
                  clearTimeout(timeoutId);
                  window.removeEventListener("message", onAck);
                  resolve(true);
                }
              }

              window.addEventListener("message", onAck);
            });

            window.postMessage(
              { requestId, type: "BONDERY_OPEN_EXTENSIONS_PAGE" },
              window.location.origin,
            );

            promise.then((handled) => {
              if (!handled) {
                window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer");
              }
            });
          }

          notifications.show(
            {
              autoClose: false,
              color: "red",
              id: EXTENSION_UPDATE_ID,
              message: (
                <Stack gap={"xs"} mt={4}>
                  <Text c="dimmed" size="xs">
                    {t("WebappNotificationDescription")}
                  </Text>
                  <Button
                    color="red"
                    leftSection={<IconPuzzle size={12} />}
                    onClick={openExtensionsPage}
                    size="xs"
                  >
                    {t("UpdateButton")}
                  </Button>
                </Stack>
              ),
              radius: "md",
              title: t("WebappNotificationTitle"),
              withCloseButton: false,
            },
            statusNotificationsStore,
          );
        }
      } catch {
        // Network errors are non-fatal
      }
    }

    check();

    return () => {
      cancelled = true;
      notifications.hide(EXTENSION_UPDATE_ID, statusNotificationsStore);
    };
  }, [t]);

  return null;
}
