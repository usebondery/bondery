import { Text } from "@mantine/core";
import type { Contact } from "@bondery/types";

interface LastInteractionSectionProps {
  contact: Contact;
}

export function LastInteractionSection({ contact }: LastInteractionSectionProps) {
  return (
    <div>
      <Text size="sm" fw={600} mb="xs">
        Last Interaction
      </Text>
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
