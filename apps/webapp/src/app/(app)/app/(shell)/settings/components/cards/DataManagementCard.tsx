"use client";

import { CardSection, Divider, Group, Text } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { BonderyExportSection } from "./BonderyExportSection";
import { BonderyImportSection } from "./BonderyImportSection";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { InstagramImportSection } from "./InstagramImportSection";
import { LinkedInImportSection } from "./LinkedInImportSection";
import { LogoutSection } from "./LogoutSection";
import { ProductAnalyticsSection } from "./ProductAnalyticsSection";
import { SettingsSection } from "./SettingsSection";
import { VCardImportSection } from "./VCardImportSection";

const SECTION_SCROLL_MARGIN = { scrollMarginTop: "var(--mantine-spacing-md)" };

export function DataManagementCard() {
  const t = useSettingsPageTranslations("DataManagement");

  return (
    <SettingsSection
      icon={<IconDatabase size={20} stroke={1.5} />}
      id="data-management"
      title={t("Title")}
    >
      <CardSection id="export" inheritPadding py="md" style={SECTION_SCROLL_MARGIN}>
        <Text fw={500} mb={4} size="sm">
          {t("Export.SectionTitle")}
        </Text>
        <Text c="dimmed" mb="md" size="xs">
          {t("Export.Description")}
        </Text>
        <Group align="flex-start" gap="md" wrap="wrap">
          <BonderyExportSection />
        </Group>
      </CardSection>

      <Divider />

      <CardSection id="import" inheritPadding py="md" style={SECTION_SCROLL_MARGIN}>
        <Text fw={500} mb={4} size="sm">
          {t("ImportSectionTitle")}
        </Text>
        <Text c="dimmed" mb="md" size="xs">
          {t("ImportContactsDescription")}
        </Text>
        <Group align="flex-start" gap="md" wrap="wrap">
          <LinkedInImportSection />
          <InstagramImportSection />
          <VCardImportSection />
          <BonderyImportSection />
        </Group>
      </CardSection>

      <Divider />

      <CardSection id="product-analytics" inheritPadding py="md" style={SECTION_SCROLL_MARGIN}>
        <ProductAnalyticsSection />
      </CardSection>

      <Divider />

      <CardSection id="logout" inheritPadding py="md" style={SECTION_SCROLL_MARGIN}>
        <LogoutSection />
      </CardSection>

      <Divider />

      <CardSection id="delete-account" inheritPadding py="md" style={SECTION_SCROLL_MARGIN}>
        <DeleteAccountSection />
      </CardSection>
    </SettingsSection>
  );
}
