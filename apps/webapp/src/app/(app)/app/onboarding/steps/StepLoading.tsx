"use client";

import { useEffect } from "react";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

interface StepProps {
  onNext: () => void;
}

const AUTO_ADVANCE_MS = 3000;

export function StepLoading({ onNext }: StepProps) {
  const t = useTranslations("Onboarding.Loading");

  useEffect(() => {
    const timer = setTimeout(onNext, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [onNext]);

  return (
    <Center mih={260}>
      <Stack align="center" gap="md">
        <Loader size="lg" />
        <Text c="dimmed" size="sm">
          {t("Message")}
        </Text>
      </Stack>
    </Center>
  );
}
