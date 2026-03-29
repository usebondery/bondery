"use client";

import {
  ActionIcon,
  Text,
  TextInput,
  Group,
  Divider,
  Card,
  CardSection,
  Tooltip,
} from "@mantine/core";
import { IconHelpCircle, IconMail, IconUserCircle, IconChevronRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { PersonChip } from "@bondery/mantine-next";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { ProviderIntegrations } from "./ProviderIntegrations";

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
    <Card withBorder shadow="sm">
      <CardSection withBorder inheritPadding py="md">
        <Group gap="xs">
          <IconUserCircle size={20} stroke={1.5} />
          <Text size="lg" fw={600}>
            {t("Title")}
          </Text>
        </Group>
      </CardSection>

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
              <Tooltip label={t("EmailDisabledTooltip")} multiline maw={360}>
                <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Email information">
                  <IconHelpCircle size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
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
    </Card>
  );
}
