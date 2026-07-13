import { BonderyIcon } from "@bondery/branding";
import { Button, Card, Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { browser } from "wxt/browser";
import type { LoginResult } from "../../lib/messaging/types";

/**
 * Welcome page shown on first install.
 * Prompts the user to connect their Bondery account.
 */
export default function WelcomeApp() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
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
                You're all set!
              </Text>
              <Text c="dimmed" size="md" ta="center">
                Your Bondery account is now connected. Visit any Instagram or LinkedIn profile to
                start saving contacts.
              </Text>
            </Stack>
            <Text c="dimmed" size="sm" ta="center">
              You can close this tab now.
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
              Welcome to Bondery
            </Text>
            <Text c="dimmed" size="md" ta="center">
              Connect your Bondery account to save contacts directly from social media profiles.
            </Text>
          </Stack>

          <Button fullWidth loading={loading} onClick={handleConnect} size="lg">
            Connect your Bondery account
          </Button>

          {error && (
            <Text c="red" size="sm" ta="center">
              {error}
            </Text>
          )}

          <Text c="dimmed" size="xs" ta="center">
            You will be prompted to sign in to your Bondery account and authorize the extension.
          </Text>
        </Stack>
      </Card>
    </Center>
  );
}
