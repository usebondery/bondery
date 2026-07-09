"use client";

import { CardSection, Divider, Group, Text } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { DeleteAccountSection } from "./cards/DeleteAccountSection";
import { InstagramImportSection } from "./cards/InstagramImportSection";
import { LinkedInImportSection } from "./cards/LinkedInImportSection";
import { LogoutSection } from "./cards/LogoutSection";
import { SettingsSection } from "./cards/SettingsSection";
import { VCardImportSection } from "./cards/VCardImportSection";

export function DataManagementCard() {
  const t = useWebTranslations("SettingsPage", "DataManagement");

  return (
    <SettingsSection
      icon={<IconDatabase size={20} stroke={1.5} />}
      id="data-management"
      title={t("Title")}
    >
      <CardSection inheritPadding py="md">
        <LogoutSection />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <Text fw={500} mb={4} size="sm">
          {t("LinkedInImport.SectionTitle")}
        </Text>
        <Text c="dimmed" mb="md" size="xs">
          {t("ImportContactsDescription")}
        </Text>
        <Group align="flex-start" gap="md" wrap="wrap">
          <LinkedInImportSection />
          <InstagramImportSection />
          <VCardImportSection />
        </Group>
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <DeleteAccountSection />
      </CardSection>
    </SettingsSection>
  );
}
