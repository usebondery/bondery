"use client";

import type { Contact, MergeConflictChoice } from "@bondery/schemas";
import { Avatar, Group, Paper, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { getAvatarColorFromName } from "@/lib/contacts/avatarColor";

interface AvatarConflictPickerProps {
  choice: MergeConflictChoice;
  disabled?: boolean;
  label: string;
  leftContact: Contact;
  onChange: (side: MergeConflictChoice) => void;
  rightContact: Contact;
}

export function MergeAvatarConflictPicker({
  leftContact,
  rightContact,
  choice,
  disabled = false,
  label,
  onChange,
}: AvatarConflictPickerProps) {
  const sides: Array<{ side: MergeConflictChoice; contact: Contact }> = [
    { contact: leftContact, side: "left" },
    { contact: rightContact, side: "right" },
  ];

  return (
    <Stack gap="sm">
      <SimpleGrid cols={2} spacing="sm">
        {sides.map(({ side, contact }) => {
          const selected = choice === side;
          const avatarColor = getAvatarColorFromName(contact.firstName, contact.lastName);
          const fullName = `${contact.firstName} ${contact.lastName ?? ""}`.trim();
          return (
            <UnstyledButton
              aria-pressed={selected}
              disabled={disabled}
              h="100%"
              key={side}
              onClick={() => {
                if (!disabled) {
                  onChange(side);
                }
              }}
              style={{ textAlign: "left" }}
              w="100%"
            >
              <Paper
                h="100%"
                p="xs"
                radius="md"
                style={{
                  backgroundColor: selected
                    ? "var(--mantine-primary-color-light-hover)"
                    : undefined,
                  borderColor: selected ? "var(--mantine-primary-color-filled)" : undefined,
                  cursor: "pointer",
                }}
                withBorder
              >
                <Stack align="center" gap={6}>
                  <Group justify="space-between" w="100%" wrap="nowrap">
                    <Text fw={500} size="sm">
                      {label}
                    </Text>
                    {selected && <IconCheck size={14} />}
                  </Group>
                  <Avatar
                    color={avatarColor}
                    name={fullName}
                    radius="xl"
                    size={48}
                    src={contact.avatar ?? undefined}
                  />
                </Stack>
              </Paper>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
