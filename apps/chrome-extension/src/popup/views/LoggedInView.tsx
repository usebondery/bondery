import React from "react";
import { Button, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconSettings } from "@tabler/icons-react";
import { UserCard } from "../components/UserCard";
import { PopupBrandHeader } from "../components/PopupBrandHeader";
import type { UserInfo } from "../types";

interface LoggedInViewProps {
  user: UserInfo | null;
  showUnsupportedSiteMessage: boolean;
  onOpenSettings: () => void;
  onOpenBondery: () => void;
}

export function LoggedInView({
  user,
  showUnsupportedSiteMessage,
  onOpenSettings,
  onOpenBondery,
}: LoggedInViewProps) {
  return (
    <Stack p="md" gap="md" h={300}>
      <PopupBrandHeader
        actionIcon={<IconSettings size={18} />}
        onActionClick={onOpenSettings}
        actionTitle="Settings"
      />

      <Stack gap="md" style={{ flex: 1 }}>
        {user && (
          <UserCard
            name={user.name || user.email || "User"}
            subtitle={user.email || undefined}
            avatarUrl={user.avatarUrl}
          />
        )}

        {showUnsupportedSiteMessage && (
          <Text size="sm" c="dimmed">
            Visit someone on Instagram or LinkedIn to see more actions and capabilities of the
            extension.
          </Text>
        )}

        <Button
          onClick={onOpenBondery}
          fullWidth
          variant="light"
          rightSection={<IconExternalLink size={16} />}
          mt="auto"
        >
          Open Bondery
        </Button>
      </Stack>
    </Stack>
  );
}
