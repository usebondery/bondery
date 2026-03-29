"use client";

import { useEffect } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { IconPuzzle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { CHROME_EXTENSION_URL, isVersionBelow } from "@bondery/helpers";
import { detectBonderyChromeExtension } from "./detectBonderyChromeExtension";
import { statusNotificationsStore } from "@/lib/statusNotificationsStore";
import { API_URL } from "@/lib/config";

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
  const t = useTranslations("ExtensionVersionCheck");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const detection = await detectBonderyChromeExtension();
      if (cancelled || detection.state !== "installed" || !detection.version) return;

      try {
        const res = await fetch(`${API_URL}/status`);
        if (!res.ok) return;

        const data = await res.json();
        const minVersion: string | undefined = data?.extension?.minVersion;
        if (!minVersion) return;

        if (cancelled) return;

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
              { type: "BONDERY_OPEN_EXTENSIONS_PAGE", requestId },
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
              id: EXTENSION_UPDATE_ID,
              title: t("WebappNotificationTitle"),
              message: (
                <Stack gap={"xs"} mt={4}>
                  <Text size="xs" c="dimmed">
                    {t("WebappNotificationDescription")}
                  </Text>
                  <Button
                    size="xs"
                    color="red"
                    leftSection={<IconPuzzle size={12} />}
                    onClick={openExtensionsPage}
                  >
                    {t("UpdateButton")}
                  </Button>
                </Stack>
              ),
              autoClose: false,
              withCloseButton: false,
              radius: "md",
              color: "red",
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
