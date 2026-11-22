"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { HelpButton, PersonChip } from "@bondery/mantine-next";
import { CardSection, Divider, Group, Text, TextInput } from "@mantine/core";
import { IconChevronRight, IconMail, IconUserCircle } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useMePersonQuery } from "@/lib/query/hooks/useMePerson";
import { useOAuthProvidersQuery } from "@/lib/query/hooks/useOAuthProviders";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";
import { SETTINGS_PROFILE_SECTION_ID } from "../../settingsSectionIds";
import { PasskeysBlock } from "./PasskeysBlock";
import { ProviderIntegrations } from "./ProviderIntegrations";
import { SettingsSection } from "./SettingsSection";

export function ProfileCard() {
  const t = useSettingsPageTranslations("Profile");
  const { data: settingsResult } = useSettingsQuery();
  const { data: myselfPerson = null } = useMePersonQuery("small");
  const { data: oauthProviders = null } = useOAuthProvidersQuery();

  const settings = settingsResult?.data;
  if (!settings) {
    return null;
  }

  const email = settings.email ?? "";
  const providers = settings.providers ?? [];
  const userIdentities = settings.identities ?? [];

  return (
    <SettingsSection
      icon={<IconUserCircle size={20} stroke={1.5} />}
      id={SETTINGS_PROFILE_SECTION_ID}
      title={t("Title")}
    >
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
          disabled
          label={
            <Group align="center" gap={4}>
              <Text fw={500} size="sm">
                {t("Email")}
              </Text>
              <HelpButton
                ariaLabel={t("EmailInfoAriaLabel")}
                label={t("EmailDisabledTooltip")}
                variant="subtle"
              />
            </Group>
          }
          leftSection={<IconMail size={16} />}
          placeholder={t("EmailPlaceholder")}
          type="email"
          value={email}
        />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <ProviderIntegrations
          oauthProviders={oauthProviders}
          providers={providers}
          showExtensionProvider={false}
          showPWAProvider={false}
          userIdentities={userIdentities}
        />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <PasskeysBlock />
      </CardSection>
    </SettingsSection>
  );
}
