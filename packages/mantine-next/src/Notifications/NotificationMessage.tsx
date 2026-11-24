import { Button, Stack, Text } from "@mantine/core";
import type { ReactElement } from "react";

/**
 * A single follow-up action offered inside a notification.
 *
 * Keep the label imperative and specific to the result, such as
 * "View merged contact". Do not use a generic "Open" or "Details".
 */
interface NotificationActionProps {
  label: string;
  onClick: () => void;
}

interface NotificationMessageProps {
  action?: NotificationActionProps;
  description: string;
}

/**
 * Notification body: the description, with the action below it when present.
 *
 * Returns the bare description string when there is no action, so a
 * notification without an action keeps the default Mantine body unchanged.
 */
function NotificationMessage({
  action,
  description,
}: NotificationMessageProps): ReactElement | string {
  if (!action) {
    return description;
  }

  return (
    <Stack align="flex-start" gap={6}>
      <Text size="sm">{description}</Text>
      <Button onClick={action.onClick} size="compact-sm" variant="light">
        {action.label}
      </Button>
    </Stack>
  );
}

export { NotificationMessage };
