"use client";

import { PWA_APP_NAME } from "@bondery/helpers";
import { informationNotificationTemplate, ModalFooter } from "@bondery/mantine-next";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCircleCheck, IconDeviceDesktop } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { PwaInstallAnimation } from "../import/PwaInstallAnimation";

interface PwaInstallModalProps {
  install: () => Promise<boolean>;
  isChromiumDesktop: boolean;
  modalId: string;
}

export function PwaInstallModal({ modalId, isChromiumDesktop, install }: PwaInstallModalProps) {
  const t = useSettingsPageTranslations("Integration.PwaInstallModal");
  const closeModal = () => modals.close(modalId);

  const handleInstall = async () => {
    const prompted = await install();
    if (prompted) {
      closeModal();
      return;
    }

    notifications.show(
      informationNotificationTemplate({
        description: t("MenuInstallHint", { appName: PWA_APP_NAME }),
        title: t("MenuInstallHintTitle"),
      }),
    );
  };

  return (
    <Stack gap="md">
      <Stack align="center" gap="sm">
        <PwaInstallAnimation />
        <Text fw={600} size="lg" ta="center">
          {t("IntroTitle")}
        </Text>
      </Stack>

      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group align="flex-start" gap="sm" wrap="nowrap">
            <IconCircleCheck
              size={18}
              style={{ color: "var(--mantine-color-grape-6)", flexShrink: 0, marginTop: 1 }}
            />
            <Text size="sm">{t("IntroDescription1")}</Text>
          </Group>
          <Group align="flex-start" gap="sm" wrap="nowrap">
            <IconCircleCheck
              size={18}
              style={{ color: "var(--mantine-color-grape-6)", flexShrink: 0, marginTop: 1 }}
            />
            <Text size="sm">{t("IntroDescription2")}</Text>
          </Group>
          <Group align="flex-start" gap="sm" wrap="nowrap">
            <IconCircleCheck
              size={18}
              style={{ color: "var(--mantine-color-grape-6)", flexShrink: 0, marginTop: 1 }}
            />
            <Text size="sm">{t("IntroDescription3")}</Text>
          </Group>
        </Stack>
      </Paper>

      {isChromiumDesktop ? null : (
        <Text c="dimmed" size="sm" ta="center">
          {t("NotSupportedHint")}
        </Text>
      )}

      <ModalFooter
        actionColor="grape"
        actionLabel={isChromiumDesktop ? t("InstallButton") : undefined}
        actionRightSection={<IconDeviceDesktop size={16} />}
        cancelLabel={t("Close")}
        onAction={() => {
          void handleInstall();
        }}
        onCancel={closeModal}
      />
    </Stack>
  );
}
