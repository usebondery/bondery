import { Button, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconSettings } from "@tabler/icons-react";
import { PopupBrandHeader } from "../components/PopupBrandHeader";
import { UserCard } from "../components/UserCard";
import type { UserInfo } from "../types";

interface LoggedInViewProps {
  onOpenBondery: () => void;
  onOpenSettings: () => void;
  showUnsupportedSiteMessage: boolean;
  user: UserInfo | null;
}

export function LoggedInView({
  user,
  showUnsupportedSiteMessage,
  onOpenSettings,
  onOpenBondery,
}: LoggedInViewProps) {
  return (
    <Stack gap="md" h={300} p="md">
      <PopupBrandHeader
        actionIcon={<IconSettings size={18} />}
        actionTitle="Settings"
        onActionClick={onOpenSettings}
      />

      <Stack gap="md" style={{ flex: 1 }}>
        {user && (
          <UserCard
            avatarUrl={user.avatarUrl}
            name={user.name || user.email || "User"}
            subtitle={user.email || undefined}
          />
        )}

        {showUnsupportedSiteMessage && (
          <Text c="dimmed" size="sm">
            Visit someone on Instagram or LinkedIn to see more actions and capabilities of the
            extension.
          </Text>
        )}

        <Button
          fullWidth
          mt="auto"
          onClick={onOpenBondery}
          rightSection={<IconExternalLink size={16} />}
          variant="light"
        >
          Open Bondery
        </Button>
      </Stack>
    </Stack>
  );
}
