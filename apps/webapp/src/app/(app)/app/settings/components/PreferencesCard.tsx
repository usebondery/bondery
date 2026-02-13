import { Card, CardSection, Group, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ColorSchemePreference } from "@bondery/types";
import { ThemePicker } from "./ThemePicker";

interface PreferencesCardProps {
  initialColorScheme: ColorSchemePreference;
}

export function PreferencesCard({ initialColorScheme }: PreferencesCardProps) {
  const t = useTranslations("SettingsPage.Preferences");

  return (
    <Card withBorder shadow="sm">
      <CardSection withBorder inheritPadding py="md">
        <Group gap="xs">
          <IconAdjustmentsHorizontal size={20} stroke={1.5} />
          <Text size="lg" fw={600}>
            {t("Title")}
          </Text>
        </Group>
      </CardSection>

      <CardSection inheritPadding py="md">
        <ThemePicker initialValue={initialColorScheme} />
      </CardSection>
    </Card>
  );
}
