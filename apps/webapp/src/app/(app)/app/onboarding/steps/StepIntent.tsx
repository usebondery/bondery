"use client";

import { useTranslations } from "next-intl";
import { SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconFriends, IconBriefcase, IconWorld } from "@tabler/icons-react";
import { useOnboardingContext } from "../OnboardingContext";
import type { OnboardingIntent } from "../OnboardingContext";
import { seedSampleData } from "@/lib/onboarding/seedSampleData";
import { API_URL } from "@/lib/config";

interface StepProps {
  onNext: () => void;
}

const INTENT_OPTIONS: {
  value: NonNullable<OnboardingIntent>;
  icon: typeof IconFriends;
  color: string;
}[] = [
  { value: "personal", icon: IconFriends, color: "var(--mantine-color-pink-6)" },
  { value: "professional", icon: IconBriefcase, color: "var(--mantine-color-blue-6)" },
  { value: "both", icon: IconWorld, color: "var(--mantine-color-violet-6)" },
];

export function StepIntent({ onNext }: StepProps) {
  const t = useTranslations("Onboarding.Intent");
  const { setIntent, setSeedPromise } = useOnboardingContext();

  const handleSelect = (value: NonNullable<OnboardingIntent>) => {
    setIntent(value);
    // Kick off seeding immediately; store the promise so completeOnboarding can await it.
    setSeedPromise(seedSampleData(value, API_URL));
    onNext();
  };

  return (
    <Stack gap="md">
      <Title order={3} ta="center">
        {t("Title")}
      </Title>
      <Text c="dimmed" size="sm" ta="center">
        {t("Description")}
      </Text>

      <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
        {INTENT_OPTIONS.map(({ value, icon: Icon, color }) => (
          <UnstyledButton
            key={value}
            onClick={() => handleSelect(value)}
            aria-label={t(value)}
            className="button-scale-effect"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
              padding: "var(--mantine-spacing-lg)",
              textAlign: "center",
            }}
          >
            <Stack gap="sm" align="center">
              <Icon size={40} stroke={1.5} color={color} />
              <Text fw={600} size="sm">
                {t(value)}
              </Text>
            </Stack>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
