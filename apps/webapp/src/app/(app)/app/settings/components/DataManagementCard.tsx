import { Text, Group, Divider, Card, CardSection } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { LogoutSection } from "./LogoutSection";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { LinkedInImportSection } from "./LinkedInImportSection";
import { InstagramImportSection } from "./InstagramImportSection";

export function DataManagementCard() {
  const t = useTranslations("SettingsPage.DataManagement");

  return (
    <Card withBorder shadow="sm">
      <CardSection withBorder inheritPadding py="md">
        <Group gap="xs">
          <IconDatabase size={20} stroke={1.5} />
          <Text size="lg" fw={600}>
            {t("Title")}
          </Text>
        </Group>
      </CardSection>

      <CardSection inheritPadding py="md">
        <LogoutSection />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <Text size="sm" fw={500} mb="sm">
          {t("LinkedInImport.SectionTitle")}
        </Text>
        <Group align="flex-start" gap="md" wrap="wrap">
          <LinkedInImportSection />
          <InstagramImportSection />
        </Group>
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <DeleteAccountSection />
      </CardSection>
    </Card>
  );
}
