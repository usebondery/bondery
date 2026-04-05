"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  Center,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBrandLinkedin,
  IconBrandInstagram,
  IconDownload,
  IconCheck,
  IconArrowRight,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { ModalTitle } from "@bondery/mantine-next";
import { LinkedInImportModal } from "@/app/(app)/app/settings/components/LinkedInImportModal";
import { InstagramImportModal } from "@/app/(app)/app/settings/components/InstagramImportModal";

interface StepProps {
  onNext: () => void;
  onSkip: () => void;
}

interface ImportStats {
  imported: number;
  updated: number;
  skipped: number;
}

export function StepImport({ onNext, onSkip }: StepProps) {
  const t = useTranslations("Onboarding.Import");
  const linkedInT = useTranslations("SettingsPage.DataManagement.LinkedInImport");
  const instagramT = useTranslations("SettingsPage.DataManagement.InstagramImport");
  const [importResult, setImportResult] = useState<ImportStats | null>(null);

  const handleImportSuccess = (stats: ImportStats) => {
    setImportResult(stats);
  };

  const openLinkedIn = () => {
    const modalId = "onboarding-linkedin-import";
    modals.open({
      modalId,
      title: (
        <ModalTitle text={linkedInT("ModalTitle")} icon={<IconDownload size={20} stroke={1.5} />} />
      ),
      size: "lg",
      children: (
        <LinkedInImportModal t={linkedInT} modalId={modalId} onSuccess={handleImportSuccess} />
      ),
    });
  };

  const openInstagram = () => {
    const modalId = "onboarding-instagram-import";
    modals.open({
      modalId,
      title: (
        <ModalTitle
          text={instagramT("ModalTitle")}
          icon={<IconDownload size={20} stroke={1.5} />}
        />
      ),
      size: "lg",
      children: (
        <InstagramImportModal t={instagramT} modalId={modalId} onSuccess={handleImportSuccess} />
      ),
    });
  };

  if (importResult) {
    return (
      <Stack gap="lg">
        <Center>
          <ThemeIcon size={64} radius="xl" variant="light" color="teal">
            <IconCheck size={36} stroke={1.5} />
          </ThemeIcon>
        </Center>

        <Title order={3} ta="center">
          {t("SuccessTitle")}
        </Title>

        <Text c="dimmed" size="sm" ta="center">
          {t("SuccessDescription", {
            imported: importResult.imported,
            updated: importResult.updated,
            skipped: importResult.skipped,
          })}
        </Text>

        <Center>
          <Button size="md" onClick={onNext}>
            {t("Finish")}
          </Button>
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Title order={3} ta="center">
        {t("Title")}
      </Title>
      <Text c="dimmed" size="sm" ta="center">
        {t("Description")}
      </Text>

      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <Card
          withBorder
          radius="md"
          padding="lg"
          style={{ cursor: "pointer" }}
          onClick={openLinkedIn}
          className="button-scale-effect"
        >
          <Stack align="center" gap="sm">
            <IconBrandLinkedin size={36} stroke={1.5} color="var(--mantine-color-blue-6)" />
            <Text fw={600} size="sm" ta="center">
              {t("LinkedIn")}
            </Text>
            <Text c="dimmed" size="xs" ta="center">
              {t("LinkedInDescription")}
            </Text>
          </Stack>
        </Card>

        <Card
          withBorder
          radius="md"
          padding="lg"
          style={{ cursor: "pointer" }}
          onClick={openInstagram}
          className="button-scale-effect"
        >
          <Stack align="center" gap="sm">
            <IconBrandInstagram size={36} stroke={1.5} color="var(--mantine-color-pink-6)" />
            <Text fw={600} size="sm" ta="center">
              {t("Instagram")}
            </Text>
            <Text c="dimmed" size="xs" ta="center">
              {t("InstagramDescription")}
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>

      <Group gap="md" grow>
        <Button
          variant="subtle"
          color="gray"
          size="md"
          rightSection={<IconArrowRight size={16} />}
          onClick={onSkip}
        >
          {t("SkipForNow")}
        </Button>
      </Group>
    </Stack>
  );
}
