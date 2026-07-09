"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { HelpButton, PersonChip } from "@bondery/mantine-next";
import { CardSection, Divider, Group, Text, TextInput } from "@mantine/core";
import { IconChevronRight, IconMail, IconUserCircle } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useMePersonQuery } from "@/lib/query/hooks/useMePerson";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";
import { ProviderIntegrations } from "./cards/ProviderIntegrations";
import { SettingsSection } from "./cards/SettingsSection";

export function ProfileCard() {
  const t = useWebTranslations("SettingsPage", "Profile");
  const { data: settingsResult } = useSettingsQuery();
  const { data: myselfPerson = null } = useMePersonQuery("small");

  const settings = settingsResult?.data ?? {};
  const email = typeof settings.email === "string" ? settings.email : "";
  const providers = Array.isArray(settings.providers) ? (settings.providers as string[]) : [];
  const userIdentities = Array.isArray(settings.identities)
    ? (settings.identities as Array<{
        id: string;
        user_id: string;
        identity_id: string;
        provider: string;
      }>)
    : [];

  return (
    <SettingsSection icon={<IconUserCircle size={20} stroke={1.5} />} title={t("Title")}>
      <CardSection inheritPadding py="md">
        <div>
          <Text fw={500} mb={4} size="sm">
            {t("YourProfileCard")}
          </Text>
          <Text c="dimmed" mb="xs" size="xs">
            {t("YourProfileCardDescription")}
          </Text>
        </div>
        <PersonChip
          href={WEBAPP_ROUTES.MYSELF}
          isClickable
          person={myselfPerson}
          rightSection={<IconChevronRight size={14} />}
          size="md"
        />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <TextInput
          label={
            <Group align="center" gap={4}>
              <Text fw={500} size="sm">
                {t("Email")}
              </Text>
              <HelpButton
                ariaLabel={t("EmailInfoAriaLabel")}
                label={t("EmailDisabledTooltip")}
                tooltipMaxWidth={360}
                variant="subtle"
              />
            </Group>
          }
          leftSection={<IconMail size={16} />}
          placeholder={t("EmailPlaceholder")}
          readOnly
          type="email"
          value={email}
        />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <ProviderIntegrations
          providers={providers}
          showExtensionProvider={false}
          showPWAProvider={false}
          userIdentities={userIdentities}
        />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <ProviderIntegrations
          description={t("BonderyApplicationsDescription")}
          providers={providers}
          showOAuthProviders={false}
          title={t("BonderyApplications")}
          userIdentities={userIdentities}
        />
      </CardSection>
    </SettingsSection>
  );
}
