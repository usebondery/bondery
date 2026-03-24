"use client";

import { Group, Paper, Stack, Text } from "@mantine/core";
import { IconApps, IconArrowRight, IconCircleCheck } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { CHROME_EXTENSION_URL } from "@bondery/helpers";
import { ModalFooter } from "@bondery/mantine-next";
import { ExtensionLinkedInAnimation } from "./ExtensionLinkedInAnimation";

interface ChromeExtensionModalTranslations {
  IntroTitle: string;
  IntroDescription1: string;
  IntroDescription2: string;
  IntroDescription3: string;
  InstallButton: string;
  Close: string;
}

interface ChromeExtensionModalProps {
  modalId: string;
  t: (key: keyof ChromeExtensionModalTranslations) => string;
}

export function ChromeExtensionModal({ modalId, t }: ChromeExtensionModalProps) {
  const closeModal = () => modals.close(modalId);

  return (
    <Stack gap="md">
      <Stack align="center" gap="md" pt="sm">
        <ExtensionLinkedInAnimation />
        <Text fw={600} size="lg" ta="center">
          {t("IntroTitle")}
        </Text>
      </Stack>

      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <IconCircleCheck
              size={18}
              style={{ flexShrink: 0, marginTop: 1, color: "var(--mantine-color-grape-6)" }}
            />
            <Text size="sm">{t("IntroDescription1")}</Text>
          </Group>
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <IconCircleCheck
              size={18}
              style={{ flexShrink: 0, marginTop: 1, color: "var(--mantine-color-grape-6)" }}
            />
            <Text size="sm">{t("IntroDescription2")}</Text>
          </Group>
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <IconCircleCheck
              size={18}
              style={{ flexShrink: 0, marginTop: 1, color: "var(--mantine-color-grape-6)" }}
            />
            <Text size="sm">{t("IntroDescription3")}</Text>
          </Group>
        </Stack>
      </Paper>

      <ModalFooter
        cancelLabel={t("Close")}
        onCancel={closeModal}
        actionLabel={t("InstallButton")}
        actionColor="grape"
        onAction={() => {
          window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer");
          closeModal();
        }}
        actionRightSection={<IconApps size={16} />}
      />
    </Stack>
  );
}
