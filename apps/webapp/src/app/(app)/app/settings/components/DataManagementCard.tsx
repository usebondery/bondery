"use client";

import { Text, Group, Divider, CardSection } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { LogoutSection } from "./LogoutSection";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { LinkedInImportSection } from "./LinkedInImportSection";
import { InstagramImportSection } from "./InstagramImportSection";
import { VCardImportSection } from "./VCardImportSection";
import { SettingsSection } from "./SettingsSection";

export function DataManagementCard() {
  const t = useTranslations("SettingsPage.DataManagement");

  return (
    <SettingsSection
      id="data-management"
      icon={<IconDatabase size={20} stroke={1.5} />}
      title={t("Title")}
    >
      <CardSection inheritPadding py="md">
        <LogoutSection />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <Text size="sm" fw={500} mb={4}>
          {t("LinkedInImport.SectionTitle")}
        </Text>
        <Text size="xs" c="dimmed" mb="md">
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
