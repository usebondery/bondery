import { Badge, Group, Paper, type PaperProps, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";
import { PersonAvatar, SAMPLE_PEOPLE } from "./sample-people";

/*
 * Decorative product mocks for the feature tiles. They are built from Mantine
 * parts so they follow the theme in light and dark mode. `BentoCard` hides them
 * from assistive tech, so nothing in here may be focusable.
 */

const SURFACE_STYLE: CSSProperties = {
  backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
};

export function Surface({ children, ...paperProps }: PaperProps & { children: ReactNode }) {
  return (
    <Paper p="md" radius="md" shadow="sm" style={SURFACE_STYLE} withBorder {...paperProps}>
      {children}
    </Paper>
  );
}

const KEEP_IN_TOUCH = [
  { cadence: "Every month", color: "red", person: "margaret", status: "2 weeks overdue" },
  { cadence: "Every 3 months", color: "orange", person: "alan", status: "Due this week" },
  { cadence: "Every 2 weeks", color: "teal", person: "katherine", status: "On track" },
] as const;

/** Keep-in-touch cadences and the birthday reminder that rides along. */
export function KeepInTouchVisual() {
  return (
    <Surface className="@container w-full max-w-sm" p={0}>
      {KEEP_IN_TOUCH.map((row, index) => (
        <Group
          className={`@max-xs:flex-wrap! ${
            index > 0 ? "border-t border-[var(--mantine-color-default-border)]" : ""
          }`}
          gap={8}
          key={row.person}
          px="sm"
          py={10}
          wrap="nowrap"
        >
          <PersonAvatar person={row.person} size={34} />
          <div className="min-w-0 flex-1 @max-xs:basis-[calc(100%-42px)]">
            <Text fw={600} size="sm" truncate>
              {SAMPLE_PEOPLE[row.person].name}
            </Text>
            <Text c="dimmed" size="xs" truncate>
              {row.cadence}
            </Text>
          </div>
          <Badge
            className="shrink-0 @max-xs:ml-[42px]"
            color={row.color}
            size="sm"
            tt="none"
            variant="light"
          >
            {row.status}
          </Badge>
        </Group>
      ))}
    </Surface>
  );
}

const SYNCED = [
  { change: "New title", person: "grace", source: "LinkedIn" },
  { change: "New city", person: "margaret", source: "LinkedIn" },
  { change: "New photo", person: "ada", source: "Instagram" },
] as const;

/** Profiles that refresh from the sources they were saved from. */
export function SyncVisual() {
  return (
    <Surface className="w-full max-w-sm" p={0}>
      {SYNCED.map((row, index) => (
        <Group
          className={
            index > 0 ? "border-t border-[var(--mantine-color-default-border)]" : undefined
          }
          gap="sm"
          key={row.person}
          px="sm"
          py={10}
          wrap="nowrap"
        >
          <PersonAvatar person={row.person} size="md" />
          <div className="min-w-0 flex-1">
            <Text fw={600} size="sm" truncate>
              {SAMPLE_PEOPLE[row.person].name}
            </Text>
            <Text c="dimmed" size="xs" truncate>
              From {row.source}
            </Text>
          </div>
          <Badge
            className="shrink-0"
            color="teal"
            leftSection={<IconRefresh size={12} />}
            size="sm"
            tt="none"
            variant="light"
          >
            {row.change}
          </Badge>
        </Group>
      ))}
    </Surface>
  );
}
