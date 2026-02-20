"use client";

import { Avatar, Group, Pill, Text } from "@mantine/core";
import { getAvatarColorFromName } from "@/lib/avatarColor";

type ParticipantAvatarPillPerson = {
  id: string;
  firstName: string;
  lastName?: string | null;
  avatar?: string | null;
};

interface ParticipantAvatarPillProps {
  person: ParticipantAvatarPillPerson;
  onRemove?: () => void;
}

export function ParticipantAvatarPill({ person, onRemove }: ParticipantAvatarPillProps) {
  return (
    <Pill
      withRemoveButton={Boolean(onRemove)}
      onRemove={onRemove}
      styles={{
        root: {
          minHeight: 34,
          display: "flex",
          alignItems: "center",
          paddingBlock: 4,
          paddingInline: 8,
        },
      }}
    >
      <Group gap={8} wrap="nowrap" align="center">
        <Avatar
          src={person.avatar || undefined}
          size={22}
          radius="xl"
          color={getAvatarColorFromName(person.firstName, person.lastName)}
          name={`${person.firstName}${person.lastName ? ` ${person.lastName}` : ""}`.trim()}
        />
        <Text size="sm" fw={500}>
          {person.firstName} {person.lastName || ""}
        </Text>
      </Group>
    </Pill>
  );
}
