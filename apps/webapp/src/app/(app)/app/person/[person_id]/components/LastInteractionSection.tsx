import { Group, Text } from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";
import type { Contact } from "@bondery/types";

interface LastInteractionSectionProps {
  contact: Contact;
}

export function LastInteractionSection({ contact }: LastInteractionSectionProps) {
  return (
    <div>
      <Group gap="xs" mb="xs">
        <IconCalendar size={18} stroke={1.5} />
        <Text size="sm" fw={600}>
          Last Interaction
        </Text>
      </Group>
      <Text size="sm" c="dimmed">
        {contact.lastInteraction
          ? new Date(contact.lastInteraction).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "No interaction recorded"}
      </Text>
    </div>
  );
}
