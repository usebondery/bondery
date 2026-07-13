"use client";

import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { useUserSession } from "@/components/shell/UserSessionProvider";
import { useOnboardingTranslations } from "@/lib/i18n/generated/hooks";

interface StepProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepProps) {
  const t = useOnboardingTranslations("Welcome");
  const { displayName } = useUserSession();

  const firstName = useMemo(() => {
    if (!displayName) {
      return null;
    }
    return displayName.split(" ")[0] || null;
  }, [displayName]);

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
        <Button onClick={onNext} size="md">
          {t("LetsGo")}
        </Button>
      </Stack>
    </Center>
  );
}
