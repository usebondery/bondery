"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { API_URL } from "@/lib/config";

interface StepProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepProps) {
  const t = useTranslations("Onboarding.Welcome");
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchName() {
      try {
        const res = await fetch(`${API_URL}${API_ROUTES.ME_SETTINGS}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const name = data.data?.name ?? "";
        setFirstName(name.split(" ")[0] || null);
      } catch {
        // Silently fail — greeting will omit the name
      }
    }
    void fetchName();
  }, []);

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
