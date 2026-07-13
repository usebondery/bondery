"use client";

import { SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconBriefcase, IconFriends, IconWorld } from "@tabler/icons-react";
import { useOnboardingTranslations } from "@/lib/i18n/generated/hooks";
import type { OnboardingIntent } from "../hooks/OnboardingContext";
import { useOnboardingContext } from "../hooks/OnboardingContext";

interface StepProps {
  onNext: () => void;
}

const INTENT_OPTIONS: {
  value: NonNullable<OnboardingIntent>;
  icon: typeof IconFriends;
  color: string;
}[] = [
  { color: "var(--mantine-color-pink-6)", icon: IconFriends, value: "personal" },
  { color: "var(--mantine-color-blue-6)", icon: IconBriefcase, value: "professional" },
  { color: "var(--mantine-color-violet-6)", icon: IconWorld, value: "both" },
];

export function StepIntent({ onNext }: StepProps) {
  const t = useOnboardingTranslations("Intent");
  const { setIntent } = useOnboardingContext();

  const handleSelect = (value: NonNullable<OnboardingIntent>) => {
    setIntent(value);
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
            aria-label={t(value)}
            className="button-scale-effect"
            key={value}
            onClick={() => handleSelect(value)}
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
              padding: "var(--mantine-spacing-lg)",
              textAlign: "center",
            }}
          >
            <Stack align="center" gap="sm">
              <Icon color={color} size={40} stroke={1.5} />
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
