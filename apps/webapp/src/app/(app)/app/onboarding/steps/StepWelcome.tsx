"use client";

import { useMemo } from "react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";

interface StepProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepProps) {
  const t = useTranslations("Onboarding.Welcome");
  const { data: settingsData } = useSettingsQuery();

  const firstName = useMemo(() => {
    const name = settingsData?.data?.name;
    if (typeof name !== "string" || !name) return null;
    return name.split(" ")[0] || null;
  }, [settingsData?.data?.name]);

  const greeting = firstName != null ? t("TitleWithName", { name: firstName }) : t("TitleGeneric");

  return (
    <Center mih={260}>
      <Stack align="center" gap="lg" maw={400}>
        <Title order={2} ta="center">
          {greeting}
        </Title>
        <Text c="dimmed" size="sm" ta="center">
          {t("Subtitle")}
        </Text>
        <Button size="md" onClick={onNext}>
          {t("LetsGo")}
        </Button>
      </Stack>
    </Center>
  );
}
