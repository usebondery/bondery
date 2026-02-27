import React from "react";
import { Button, Stack, Text } from "@mantine/core";
import { IconCalendarPlus, IconExternalLink, IconUserPlus } from "@tabler/icons-react";
import { PersonChip } from "./PersonChip";

interface PersonActionStackProps {
  text: string;
  firstName: string;
  lastName?: string | null;
  avatar?: string | null;
  doesPersonExist: boolean;
  isLoading?: boolean;
  error?: string | null;
  onViewOrImport: () => void | Promise<void>;
  onPersonClick?: () => void;
  onAddEvent?: () => void;
}

export function PersonActionStack({
  text,
  firstName,
  lastName,
  avatar,
  doesPersonExist,
  isLoading = false,
  error,
  onViewOrImport,
  onPersonClick,
  onAddEvent,
}: PersonActionStackProps) {
  return (
    <Stack gap="md" style={{ flex: 1 }}>
      <Text size="sm" c="dimmed">
        {text}
      </Text>

      <PersonChip
        firstName={firstName}
        lastName={lastName}
        avatar={avatar}
        color={doesPersonExist ? "branding-primary" : "gray"}
        onClick={doesPersonExist ? onPersonClick : undefined}
      />

      <Stack gap="xs" mt="auto">
        <Button
          onClick={onViewOrImport}
          loading={isLoading}
          fullWidth
          variant={"filled"}
          leftSection={
            doesPersonExist ? <IconExternalLink size={16} /> : <IconUserPlus size={16} />
          }
        >
          {doesPersonExist ? "View in Bondery" : "Import to Bondery"}
        </Button>

        {doesPersonExist && onAddEvent && (
          <Button
            variant="default"
            onClick={onAddEvent}
            fullWidth
            leftSection={<IconCalendarPlus size={16} />}
          >
            Add event with this person
          </Button>
        )}
      </Stack>

      {error && (
        <Text size="xs" c="red" ta="center">
          {error}
        </Text>
      )}
    </Stack>
  );
}
