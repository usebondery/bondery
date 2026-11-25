"use client";

import { PersonChip } from "@bondery/mantine-next/PersonChip/personChip";
import { Divider, Group, Paper, Stack, Text } from "@mantine/core";
import type { ReactElement } from "react";

/** How many contacts to show as chips. The rest are only counted. */
const PREVIEW_CHIP_COUNT = 10;

interface ImportPreviewCount {
  /** Draws this count first, at the largest size. Use it for the outcome the reader wants. */
  isPrimary?: boolean;
  /** What the number counts, such as "Total". */
  label: string;
  /** Number the reader cares about, such as the total or how many will be added. */
  value: number;
}

interface ImportPreviewPerson {
  avatar?: string | null;
  firstName: string;
  id: string;
  lastName?: string | null;
}

interface ImportPreviewBodyProps {
  counts: ImportPreviewCount[];
  /** Shown when `people` is empty. */
  emptyLabel: string;
  /** Contacts to show as chips. Only the first `PREVIEW_CHIP_COUNT` render. */
  people: ImportPreviewPerson[];
  /** Heading above the chips, such as "Contacts to add". */
  peopleLabel: string;
  /** Fills the gap when `people` has more entries than the chips show, such as "and 42 more". */
  remainderLabel?: string;
}

/** Primary counts first, then the given order. Never mutates the caller's array. */
function orderCounts(counts: ImportPreviewCount[]): ImportPreviewCount[] {
  return [...counts].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
}

/**
 * Read-only summary of a parsed import: the counts, then the first contacts as chips.
 *
 * There is nothing to choose here on purpose. The import takes every contact that can be added,
 * so the reader confirms one decision instead of curating a list.
 *
 * The counts follow the `StatsCard` hierarchy used elsewhere in the app: a small uppercase label
 * above a large value. The primary count leads, so the reader sees the outcome first.
 */
export function ImportPreviewBody({
  counts,
  emptyLabel,
  people,
  peopleLabel,
  remainderLabel,
}: ImportPreviewBodyProps): ReactElement {
  const preview = people.slice(0, PREVIEW_CHIP_COUNT);
  const ordered = orderCounts(counts);

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder>
        <Group gap={0} justify="center" wrap="nowrap">
          {ordered.map((count, index) => (
            <Group gap={0} key={count.label} wrap="nowrap">
              {index > 0 ? <Divider mx="lg" orientation="vertical" /> : null}
              <Stack align="center" gap={2} miw={96}>
                <Text c="dimmed" fw={700} size="xs" tt="uppercase">
                  {count.label}
                </Text>
                <Text
                  c={count.isPrimary ? "branding-primary" : undefined}
                  fw={700}
                  lh={1.1}
                  size={count.isPrimary ? "2rem" : "xl"}
                >
                  {count.value}
                </Text>
              </Stack>
            </Group>
          ))}
        </Group>
      </Paper>

      <Stack gap="sm">
        <Text fw={500} size="sm">
          {peopleLabel}
        </Text>

        {preview.length > 0 ? (
          <Group gap="xs">
            {preview.map((person) => (
              <PersonChip
                avatar={person.avatar}
                firstName={person.firstName}
                key={person.id}
                lastName={person.lastName}
                size="md"
              />
            ))}
            {remainderLabel ? (
              <Text c="dimmed" size="sm">
                {remainderLabel}
              </Text>
            ) : null}
          </Group>
        ) : (
          <Text c="dimmed" size="sm">
            {emptyLabel}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}

export type { ImportPreviewCount, ImportPreviewPerson };
