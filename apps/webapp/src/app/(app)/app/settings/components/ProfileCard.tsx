"use client";

import { Text, TextInput, Group, Divider, CardSection } from "@mantine/core";
import { IconMail, IconUserCircle, IconChevronRight } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { HelpButton, PersonChip } from "@bondery/mantine-next";import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { ProviderIntegrations } from "./ProviderIntegrations";
import { SettingsSection } from "./SettingsSection";

interface ProfileCardProps {
  email: string;
  providers: string[];
  userIdentities: Array<{
    id: string;
    user_id: string;
    identity_id: string;
    provider: string;
  }>;
  myselfPerson: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string | null;
    avatar: string | null;
  } | null;
}

export function ProfileCard({ email, providers, userIdentities, myselfPerson }: ProfileCardProps) {
  const t = useTranslations("SettingsPage.Profile");

  return (
    <SettingsSection icon={<IconUserCircle size={20} stroke={1.5} />} title={t("Title")}>
      <CardSection inheritPadding py="md">
        <div>
          <Text size="sm" fw={500} mb={4}>
            {t("YourProfileCard")}
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            {t("YourProfileCardDescription")}
          </Text>
        </div>
        <PersonChip
          person={myselfPerson}
          isClickable
          href={WEBAPP_ROUTES.MYSELF}
          rightSection={<IconChevronRight size={14} />}
          size="md"
        />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <TextInput
          label={
            <Group gap={4} align="center">
              <Text size="sm" fw={500}>
                {t("Email")}
              </Text>
              <HelpButton
                label={t("EmailDisabledTooltip")}
                ariaLabel={t("EmailInfoAriaLabel")}
                variant="subtle"
                tooltipMaxWidth={360}
              />            </Group>
          }
          placeholder={t("EmailPlaceholder")}
          type="email"
          value={email}
          leftSection={<IconMail size={16} />}
          disabled
          readOnly
        />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <ProviderIntegrations
          providers={providers}
          userIdentities={userIdentities}
          showExtensionProvider={false}
          showPWAProvider={false}
        />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <ProviderIntegrations
          providers={providers}
          userIdentities={userIdentities}
          showOAuthProviders={false}
          title={t("BonderyApplications")}
          description={t("BonderyApplicationsDescription")}
        />
      </CardSection>
    </SettingsSection>
  );
}
