"use client";

import { CardSection, Divider, Group, Text } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { InstagramImportSection } from "./InstagramImportSection";
import { LinkedInImportSection } from "./LinkedInImportSection";
import { LogoutSection } from "./LogoutSection";
import { SettingsSection } from "./SettingsSection";
import { VCardImportSection } from "./VCardImportSection";

export function DataManagementCard() {
  const t = useSettingsPageTranslations("DataManagement");

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
