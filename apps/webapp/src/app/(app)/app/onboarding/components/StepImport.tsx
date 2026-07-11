"use client";

import type { ImportFollowupPlatform } from "@bondery/schemas";
import { Button, Card, Center, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconBrandInstagram, IconBrandLinkedin, IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { openInstagramImportModal } from "@/app/(app)/app/settings/components/modals/openInstagramImportModal";

import { openLinkedInImportModal } from "@/app/(app)/app/settings/components/modals/openLinkedInImportModal";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

interface StepProps {
  onAwaitingExportFromModal: (platform: ImportFollowupPlatform) => void | Promise<void>;
  onComplete: () => void;

  onSkipImport: () => void;
}

interface ImportStats {
  imported: number;

  skipped: number;

  updated: number;
}

export function StepImport({
  onComplete,

  onSkipImport,

  onAwaitingExportFromModal,
}: StepProps) {
  const t = useWebTranslations("Onboarding", "Import");

  const [importResult, setImportResult] = useState<ImportStats | null>(null);

  const handleImportSuccess = (stats: ImportStats) => {
    setImportResult(stats);
  };

  const openLinkedIn = () => {
    openLinkedInImportModal({
      onAwaitingExport: () => onAwaitingExportFromModal("linkedin"),
      onSuccess: handleImportSuccess,
      showNavigationProgress: false,
    });
  };

  const openInstagram = () => {
    openInstagramImportModal({
      onAwaitingExport: () => onAwaitingExportFromModal("instagram"),
      onSuccess: handleImportSuccess,
      showNavigationProgress: false,
    });
  };

  if (importResult) {
    return (
      <Stack gap="lg">
        <Center>
          <ThemeIcon color="teal" radius="xl" size={64} variant="light">
            <IconCheck size={36} stroke={1.5} />
          </ThemeIcon>
        </Center>

        <Title order={3} ta="center">
          {t("SuccessTitle")}
        </Title>

        <Text c="dimmed" size="sm" ta="center">
          {t("SuccessDescription", {
            imported: importResult.imported,

            skipped: importResult.skipped,

            updated: importResult.updated,
          })}
        </Text>

        <Center>
          <Button onClick={onComplete} size="md">
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
          className="button-scale-effect"
          onClick={openLinkedIn}
          padding="lg"
          radius="md"
          style={{ cursor: "pointer" }}
          withBorder
        >
          <Stack align="center" gap="sm">
            <IconBrandLinkedin color="var(--mantine-color-blue-6)" size={36} stroke={1.5} />

            <Text fw={600} size="sm" ta="center">
              {t("LinkedIn")}
            </Text>

            <Text c="dimmed" size="xs" ta="center">
              {t("LinkedInDescription")}
            </Text>
          </Stack>
        </Card>

        <Card
          className="button-scale-effect"
          onClick={openInstagram}
          padding="lg"
          radius="md"
          style={{ cursor: "pointer" }}
          withBorder
        >
          <Stack align="center" gap="sm">
            <IconBrandInstagram color="var(--mantine-color-pink-6)" size={36} stroke={1.5} />

            <Text fw={600} size="sm" ta="center">
              {t("Instagram")}
            </Text>

            <Text c="dimmed" size="xs" ta="center">
              {t("InstagramDescription")}
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>

      <Button color="gray" onClick={onSkipImport} size="md" variant="subtle">
        {t("SkipImport")}
      </Button>
    </Stack>
  );
}
