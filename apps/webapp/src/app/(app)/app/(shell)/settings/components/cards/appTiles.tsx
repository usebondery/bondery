"use client";

import { TileCard } from "@bondery/mantine-next";
import { Box, ThemeIcon } from "@mantine/core";
import { IconBrowser, IconDeviceDesktop, IconSparkles } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { detectBonderyChromeExtension } from "@/lib/extension/detectBonderyChromeExtension";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useMcpConsentsQuery } from "@/lib/query/hooks/useMcpConsents";
import { openChromeExtensionModal } from "../modals/openChromeExtensionModal";
import { openMcpModal } from "../modals/openMcpModal";
import { openPwaInstallModal } from "../modals/openPwaInstallModal";

/**
 * Browser extension tile.
 *
 * Once installed the surface turns success green and the button reports the state instead of
 * offering an action, because there is nothing left to do from here.
 */
export function BrowserExtensionTile() {
  const t = useSettingsPageTranslations("Integration");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    detectBonderyChromeExtension()
      .then((result) => {
        if (isMounted) {
          setIsInstalled(result.state === "installed");
        }
      })
      .catch(() => {
        // An undetectable extension keeps the tile in its install state.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <TileCard
      action={
        isInstalled
          ? {
              isDisabled: true,
              label: t("Installed"),
              tooltip: t("InstalledTooltip"),
              variant: "default",
            }
          : { label: t("InstallAction"), onClick: () => openChromeExtensionModal() }
      }
      icon={
        <ThemeIcon radius="md" size={32} variant="filled">
          <IconBrowser size={19} stroke={1.7} />
        </ThemeIcon>
      }
      title={t("BrowserExtension")}
      tone={isInstalled ? "success" : "default"}
    />
  );
}

/** Desktop app (PWA) tile. Same installed treatment as the extension tile. */
export function DesktopAppTile() {
  const t = useSettingsPageTranslations("Integration");
  const { isChromiumDesktop, isPWAInstalled, isInstalledFromBrowser, install } = usePWAInstall();
  const isInstalled = isPWAInstalled || isInstalledFromBrowser;

  return (
    <TileCard
      action={
        isInstalled
          ? {
              isDisabled: true,
              label: t("Installed"),
              tooltip: t("DesktopAppInstalledTooltip"),
              variant: "default",
            }
          : {
              label: t("InstallAction"),
              onClick: () => openPwaInstallModal({ install, isChromiumDesktop }),
            }
      }
      icon={
        <ThemeIcon radius="md" size={32} variant="filled">
          <IconDeviceDesktop size={19} stroke={1.7} />
        </ThemeIcon>
      }
      title={t("DesktopApp")}
      tone={isInstalled ? "success" : "default"}
    />
  );
}

/** MCP tile. Always actionable: it opens the client list and the connection details. */
export function McpTile({ apiBaseUrl }: { apiBaseUrl?: string }) {
  const t = useSettingsPageTranslations("Integration");
  const tAiAssistants = useSettingsPageTranslations("AiAssistants");
  const consents = useMcpConsentsQuery(true).data;
  const hasConsents = consents !== undefined && consents.length > 0;
  const [suppressTooltip, setSuppressTooltip] = useState(false);

  return (
    <Box
      onMouseLeave={() => {
        setSuppressTooltip(false);
      }}
    >
      <TileCard
        action={{
          label: t("ManageAction"),
          onClick: () => {
            if (apiBaseUrl) {
              setSuppressTooltip(true);
              openMcpModal({ apiBaseUrl });
            }
          },
        }}
        icon={
          <ThemeIcon radius="md" size={32} variant="filled">
            <IconSparkles size={19} stroke={1.7} />
          </ThemeIcon>
        }
        isDisabled={!apiBaseUrl}
        title={tAiAssistants("Title")}
        tone={hasConsents ? "success" : "default"}
        tooltip={suppressTooltip ? undefined : tAiAssistants("TileTooltip")}
      />
    </Box>
  );
}
