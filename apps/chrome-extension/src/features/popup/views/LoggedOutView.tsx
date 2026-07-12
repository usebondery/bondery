import { BonderyIcon } from "@bondery/branding";
import { Button, Stack, Text } from "@mantine/core";
import { useExtensionPopupTranslations } from "../../../lib/i18n/generated/hooks";

interface LoggedOutViewProps {
  error: string | null;
  loginLoading: boolean;
  onLogin: () => Promise<void>;
}

export function LoggedOutView({ loginLoading, error, onLogin }: LoggedOutViewProps) {
  const t = useExtensionPopupTranslations("LoggedOut");

  return (
    <Stack align="center" gap="md" h={300} justify="center" p="md">
      <BonderyIcon height={48} width={48} />
      <Stack align="center" gap="xs">
        <Text fw={600} size="lg">
          {t("Title")}
        </Text>
        <Text c="dimmed" size="sm" ta="center">
          {t("Description")}
        </Text>
      </Stack>
      <Button fullWidth loading={loginLoading} onClick={onLogin} size="md">
        {t("SignIn")}
      </Button>
      {error && (
        <Text c="red" size="xs" ta="center">
          {error}
        </Text>
      )}
    </Stack>
  );
}
