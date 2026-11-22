import { BonderyIcon } from "@bondery/branding";
import { Button, Card, Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { browser } from "wxt/browser";
import { useExtensionPopupTranslations } from "../../lib/i18n/generated/hooks";
import type { LoginResult } from "../../lib/messaging/types";

/**
 * Welcome page shown on first install.
 * Prompts the user to connect their Bondery account.
 */
export default function WelcomeApp() {
  const t = useExtensionPopupTranslations("Welcome");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      const result: LoginResult = await browser.runtime.sendMessage({
        type: "LOGIN_REQUEST",
      });

      if (result.payload.success) {
        setSuccess(true);
      } else {
        setError(result.payload.error ?? "Connection failed");
      }
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Center bg="gray.0" mih="100vh">
        <Card maw={480} p="xl" radius="lg" shadow="md" w="100%">
          <Stack align="center" gap="lg">
            <ThemeIcon color="green" radius="xl" size={64} variant="light">
              <IconCheck size={36} />
            </ThemeIcon>
            <Stack align="center" gap="xs">
              <Text fw={700} size="xl">
                {t("SuccessTitle")}
              </Text>
              <Text c="dimmed" size="md" ta="center">
                {t("SuccessDescription")}
              </Text>
            </Stack>
            <Text c="dimmed" size="sm" ta="center">
              {t("SuccessClose")}
            </Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  return (
    <Center bg="gray.0" mih="100vh">
      <Card maw={480} p="xl" radius="lg" shadow="md" w="100%">
        <Stack align="center" gap="lg">
          <BonderyIcon height={64} width={64} />

          <Stack align="center" gap="xs">
            <Text fw={700} size="xl">
              {t("Title")}
            </Text>
            <Text c="dimmed" size="md" ta="center">
              {t("Description")}
            </Text>
          </Stack>

          <Button fullWidth loading={loading} onClick={handleConnect} size="lg">
            {t("ConnectButton")}
          </Button>

          {error ? (
            <Text c="red" size="sm" ta="center">
              {error}
            </Text>
          ) : null}

          <Text c="dimmed" size="xs" ta="center">
            {t("SignInHint")}
          </Text>
        </Stack>
      </Card>
    </Center>
  );
}
