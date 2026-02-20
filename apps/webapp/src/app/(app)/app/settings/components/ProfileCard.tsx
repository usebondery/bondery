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
import { IconHelpCircle, IconMail, IconUserCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { PhotoUploadButton } from "./PhotoUploadButton";
import { NameFields } from "./NameFields";
import { LanguagePicker } from "@/components/shared/LanguagePicker";
import { TimezonePicker } from "@/components/shared/TimezonePicker";
import { ProviderIntegrations } from "./ProviderIntegrations";

interface ProfileCardProps {
  initialName?: string;
  initialMiddlename?: string;
  initialSurname?: string;
  initialTimezone?: string;
  initialLanguage?: string;
  email: string;
  avatarUrl: string | null;
  providers: string[];
  userIdentities: Array<{
    id: string;
    user_id: string;
    identity_id: string;
    provider: string;
  }>;
}

export function ProfileCard({
  initialName = "",
  initialMiddlename = "",
  initialSurname = "",
  initialTimezone = "UTC",
  initialLanguage = "en",
  email,
  avatarUrl,
  providers,
  userIdentities,
}: ProfileCardProps) {
  const t = useTranslations("SettingsPage.Profile");

  const userName = [initialName, initialMiddlename, initialSurname].filter(Boolean).join(" ");

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
        <Group align="flex-start">
          <PhotoUploadButton avatarUrl={avatarUrl} userName={userName} />
          <NameFields
            initialName={initialName}
            initialMiddlename={initialMiddlename}
            initialSurname={initialSurname}
          />
        </Group>
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
        {/* TODO: language and timezone support */}
        {/* <LanguagePicker initialValue={initialLanguage} /> */}
        {/* <TimezonePicker initialValue={initialTimezone} /> */}
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <ProviderIntegrations providers={providers} userIdentities={userIdentities} />
      </CardSection>
    </Card>
  );
}
