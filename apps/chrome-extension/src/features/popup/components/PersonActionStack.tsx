import { Button, Stack, Text } from "@mantine/core";
import { IconCalendarPlus, IconExternalLink, IconUserPlus } from "@tabler/icons-react";
import { PersonChip } from "./PersonChip";

interface PersonActionStackProps {
  avatar?: string | null;
  doesPersonExist: boolean;
  error?: string | null;
  firstName: string;
  isLoading?: boolean;
  lastName?: string | null;
  onAddInteraction?: () => void;
  onPersonClick?: () => void;
  onViewOrImport: () => void | Promise<void>;
  text: string;
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
  onAddInteraction,
}: PersonActionStackProps) {
  return (
    <Stack gap="md" style={{ flex: 1 }}>
      <Text c="dimmed" size="sm">
        {text}
      </Text>

      <PersonChip
        avatar={avatar}
        color={doesPersonExist ? "branding-primary" : "gray"}
        firstName={firstName}
        lastName={lastName}
        onClick={doesPersonExist ? onPersonClick : undefined}
      />

      <Stack gap="xs" mt="auto">
        <Button
          fullWidth
          leftSection={
            doesPersonExist ? <IconExternalLink size={16} /> : <IconUserPlus size={16} />
          }
          loading={isLoading}
          onClick={onViewOrImport}
          variant={"filled"}
        >
          {doesPersonExist ? "View in Bondery" : "Import to Bondery"}
        </Button>

        {doesPersonExist && onAddInteraction && (
          <Button
            fullWidth
            leftSection={<IconCalendarPlus size={16} />}
            onClick={onAddInteraction}
            variant="default"
          >
            Add interaction with this person
          </Button>
        )}
      </Stack>

      {error && (
        <Text c="red" size="xs" ta="center">
          {error}
        </Text>
      )}
    </Stack>
  );
}
