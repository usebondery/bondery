import { BonderyIcon } from "@bondery/branding";
import { Button, Stack, Text } from "@mantine/core";

interface LoggedOutViewProps {
  error: string | null;
  loginLoading: boolean;
  onLogin: () => Promise<void>;
}

export function LoggedOutView({ loginLoading, error, onLogin }: LoggedOutViewProps) {
  return (
    <Stack align="center" gap="md" h={300} justify="center" p="md">
      <BonderyIcon height={48} width={48} />
      <Stack align="center" gap="xs">
        <Text fw={600} size="lg">
          Sign in to Bondery
        </Text>
        <Text c="dimmed" size="sm" ta="center">
          Connect your account to save contacts from social media.
        </Text>
      </Stack>
      <Button fullWidth loading={loginLoading} onClick={onLogin} size="md">
        Sign in
      </Button>
      {error && (
        <Text c="red" size="xs" ta="center">
          {error}
        </Text>
      )}
    </Stack>
  );
}
