"use client";

import { Center, Loader, Stack, Text } from "@mantine/core";
import { useEffect } from "react";
import { useOnboardingTranslations } from "@/lib/i18n/generated/hooks";

interface StepProps {
  onNext: () => void;
}

const AUTO_ADVANCE_MS = 3000;

export function StepLoading({ onNext }: StepProps) {
  const t = useOnboardingTranslations("Loading");

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
