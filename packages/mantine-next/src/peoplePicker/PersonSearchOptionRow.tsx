"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { Avatar, Group, Stack, Text } from "@mantine/core";
import { IconBriefcase, IconCompass } from "@tabler/icons-react";
import { getAvatarColorFromName } from "#utils/avatarColor.js";

/** Put this on Combobox.Option, Spotlight.Action, or a custom hit target wrapping the row. */
export const PERSON_SEARCH_OPTION_HIT_CLASS = "personSearchOptionHit";

export type PersonSearchOptionIdentity = {
  avatar?: string | null;
  firstName: string;
  headline?: string | null;
  lastName?: string | null;
  location?: string | null;
  middleName?: string | null;
};

export type PeoplePickerOptionPerson = PersonSearchOptionIdentity & { id: string };

/** Shared person row for Find person, people pickers, and notes @-mention options. */
export function PersonSearchOptionRow({ person }: { person: PersonSearchOptionIdentity }) {
  const name = formatContactName(person);

  return (
    <Group align="center" className="personSearchOptionRow" gap="sm" miw={0} w="100%" wrap="nowrap">
      <Avatar
        color={getAvatarColorFromName(person.firstName, person.lastName)}
        name={name}
        radius="xl"
        size={32}
        src={person.avatar || undefined}
      />
      <Stack gap={2} miw={0} style={{ flex: 1 }}>
        <Text fw={600} size="sm" truncate>
          {name}
        </Text>
        {person.headline ? (
          <Group className="personSearchOptionMeta" gap={4} miw={0} w="100%" wrap="nowrap">
            <IconBriefcase size={12} stroke={1.5} style={{ flexShrink: 0 }} />
            <Text c="inherit" miw={0} size="xs" style={{ flex: 1 }} truncate>
              {person.headline}
            </Text>
          </Group>
        ) : null}
        {person.location ? (
          <Group className="personSearchOptionMeta" gap={4} miw={0} w="100%" wrap="nowrap">
            <IconCompass size={12} stroke={1.5} style={{ flexShrink: 0 }} />
            <Text c="inherit" miw={0} size="xs" style={{ flex: 1 }} truncate>
              {person.location}
            </Text>
          </Group>
        ) : null}
      </Stack>
    </Group>
  );
}
