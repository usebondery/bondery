"use client";



import { useState } from "react";

import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";

import {

  Button,

  Card,

  Center,

  SimpleGrid,

  Stack,

  Text,

  ThemeIcon,

  Title,

} from "@mantine/core";

import {

  IconBrandLinkedin,

  IconBrandInstagram,

  IconCheck,

} from "@tabler/icons-react";

import type { ImportFollowupPlatform } from "@bondery/schemas";

import { openLinkedInImportModal } from "@/app/(app)/app/settings/components/openLinkedInImportModal";

import { openInstagramImportModal } from "@/app/(app)/app/settings/components/openInstagramImportModal";



interface StepProps {

  onComplete: () => void;

  onSkipImport: () => void;

  onAwaitingExportFromModal: (platform: ImportFollowupPlatform) => void | Promise<void>;

}



interface ImportStats {

  imported: number;

  updated: number;

  skipped: number;

}



export function StepImport({

  onComplete,

  onSkipImport,

  onAwaitingExportFromModal,

}: StepProps) {

  const t = useTranslations("Onboarding.Import");

  const linkedInT = useTranslations(

    "SettingsPage.DataManagement.LinkedInImport",

  );

  const instagramT = useTranslations(

    "SettingsPage.DataManagement.InstagramImport",

  );

  const [importResult, setImportResult] = useState<ImportStats | null>(null);



  const handleImportSuccess = (stats: ImportStats) => {

    setImportResult(stats);

  };



  const openLinkedIn = () => {

    openLinkedInImportModal({

      t: linkedInT,

      onSuccess: handleImportSuccess,

      showNavigationProgress: false,

      onAwaitingExport: () => onAwaitingExportFromModal("linkedin"),

    });

  };



  const openInstagram = () => {

    openInstagramImportModal({

      t: instagramT,

      onSuccess: handleImportSuccess,

      showNavigationProgress: false,

      onAwaitingExport: () => onAwaitingExportFromModal("instagram"),

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

          <Button size="md" onClick={onComplete}>

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

            <IconBrandLinkedin

              size={36}

              stroke={1.5}

              color="var(--mantine-color-blue-6)"

            />

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

            <IconBrandInstagram

              size={36}

              stroke={1.5}

              color="var(--mantine-color-pink-6)"

            />

            <Text fw={600} size="sm" ta="center">

              {t("Instagram")}

            </Text>

            <Text c="dimmed" size="xs" ta="center">

              {t("InstagramDescription")}

            </Text>

          </Stack>

        </Card>

      </SimpleGrid>



      <Button variant="subtle" color="gray" size="md" onClick={onSkipImport}>

        {t("SkipImport")}

      </Button>

    </Stack>

  );

}

