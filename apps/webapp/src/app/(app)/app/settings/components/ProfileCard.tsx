import { Text, TextInput, Group, Divider, Card, CardSection } from "@mantine/core";
import { IconMail, IconUserCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { PhotoUploadButton } from "./PhotoUploadButton";
import { NameFields } from "./NameFields";
import { LanguagePicker } from "./LanguagePicker";
import { TimezonePicker } from "./TimezonePicker";
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
          label={t("Email")}
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
        <LanguagePicker initialValue={initialLanguage} />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <TimezonePicker initialValue={initialTimezone} />
      </CardSection>

      <Divider />

      <CardSection inheritPadding py="md">
        <ProviderIntegrations providers={providers} userIdentities={userIdentities} />
      </CardSection>
    </Card>
  );
}
