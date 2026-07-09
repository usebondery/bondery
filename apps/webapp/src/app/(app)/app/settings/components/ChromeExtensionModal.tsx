"use client";

import { CHROME_EXTENSION_URL } from "@bondery/helpers";
import { ModalFooter } from "@bondery/mantine-next";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconApps, IconCircleCheck } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { ExtensionLinkedInAnimation } from "./ExtensionLinkedInAnimation";

interface ChromeExtensionModalProps {
  modalId: string;
}

export function ChromeExtensionModal({ modalId }: ChromeExtensionModalProps) {
  const t = useWebTranslations("SettingsPage", "Integration.ChromeExtensionModal");
  const closeModal = () => modals.close(modalId);

  return (
    <Stack gap="md">
      <Stack align="center" gap="md" pt="sm">
        <ExtensionLinkedInAnimation />
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

      <ModalFooter
        actionColor="grape"
        actionLabel={t("InstallButton")}
        actionRightSection={<IconApps size={16} />}
        cancelLabel={t("Close")}
        onAction={() => {
          window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer");
          closeModal();
        }}
        onCancel={closeModal}
      />
    </Stack>
  );
}
