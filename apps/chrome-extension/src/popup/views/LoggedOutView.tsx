import React from "react";
import { Button, Stack, Text } from "@mantine/core";
import { BonderyIcon } from "@bondery/branding";

interface LoggedOutViewProps {
  loginLoading: boolean;
  error: string | null;
  onLogin: () => Promise<void>;
}

export function LoggedOutView({ loginLoading, error, onLogin }: LoggedOutViewProps) {
  return (
    <Stack p="md" gap="md" align="center" h={300} justify="center">
      <BonderyIcon width={48} height={48} />
      <Stack gap="xs" align="center">
        <Text size="lg" fw={600}>
          Sign in to Bondery
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          Connect your account to save contacts from social media.
        </Text>
      </Stack>
      <Button onClick={onLogin} loading={loginLoading} fullWidth size="md">
        Sign in
      </Button>
      {error && (
        <Text size="xs" c="red" ta="center">
          {error}
        </Text>
      )}
    </Stack>
  );
}
