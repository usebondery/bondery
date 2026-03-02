import React, { useState } from "react";
import { browser } from "wxt/browser";
import { Button, Stack, Text, Center, Card, ThemeIcon, Group } from "@mantine/core";
import { IconCheck, IconBrandChrome } from "@tabler/icons-react";
import { BonderyIcon } from "@bondery/branding";
import type { LoginResult } from "../utils/messages";

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
      <Center mih="100vh" bg="gray.0">
        <Card shadow="md" p="xl" radius="lg" maw={480} w="100%">
          <Stack gap="lg" align="center">
            <ThemeIcon size={64} radius="xl" color="green" variant="light">
              <IconCheck size={36} />
            </ThemeIcon>
            <Stack gap="xs" align="center">
              <Text size="xl" fw={700}>
                You're all set!
              </Text>
              <Text size="md" c="dimmed" ta="center">
                Your Bondery account is now connected. Visit any Instagram, LinkedIn, or Facebook
                profile to start saving contacts.
              </Text>
            </Stack>
            <Text size="sm" c="dimmed" ta="center">
              You can close this tab now.
            </Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  return (
    <Center mih="100vh" bg="gray.0">
      <Card shadow="md" p="xl" radius="lg" maw={480} w="100%">
        <Stack gap="lg" align="center">
          <BonderyIcon width={64} height={64} />

          <Stack gap="xs" align="center">
            <Text size="xl" fw={700}>
              Welcome to Bondery
            </Text>
            <Text size="md" c="dimmed" ta="center">
              Connect your Bondery account to save contacts directly from social media profiles.
            </Text>
          </Stack>

          <Button onClick={handleConnect} loading={loading} fullWidth size="lg">
            Connect your Bondery account
          </Button>

          {error && (
            <Text size="sm" c="red" ta="center">
              {error}
            </Text>
          )}

          <Text size="xs" c="dimmed" ta="center">
            You will be prompted to sign in to your Bondery account and authorize the extension.
          </Text>
        </Stack>
      </Card>
    </Center>
  );
}
