import { LogoIcon } from "@bondery/mantine-next";
import { Badge, Group, Paper, type PaperProps, Text } from "@mantine/core";
import { IconBriefcase, IconCake, IconMail, IconRefresh } from "@tabler/icons-react";
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

/*
 * Mirrors the real reminder digest email (`ReminderDigestEmail`): Bondery emails you before each
 * important date, with the same subject and line shapes. Keep-in-touch cadences are not emailed,
 * so this visual shows dates only.
 */
const REMINDERS = [
  { icon: IconCake, label: "Birthday in 3 days", person: "margaret" },
  { icon: IconBriefcase, label: "Work anniversary in 7 days", person: "alan" },
] as const;

/** An incoming Bondery reminder email, with a second message peeking behind it. */
export function ReminderEmailVisual() {
  return (
    <div className="relative w-full max-w-sm pt-3">
      <div
        className="absolute inset-x-5 top-0 h-10 rounded-md border border-[var(--mantine-color-default-border)]"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))",
        }}
      />
      <Surface className="relative" p={0}>
        <Group gap="sm" px="sm" py={10} wrap="nowrap">
          <LogoIcon size={32} />
          <div className="min-w-0 flex-1">
            <Group gap={6} justify="space-between" wrap="nowrap">
              <Text fw={700} size="sm" truncate>
                Bondery
              </Text>
              <Group gap={6} wrap="nowrap">
                <Text c="dimmed" size="xs">
                  8:00
                </Text>
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--mantine-primary-color-filled)" }}
                />
              </Group>
            </Group>
            <Group gap={4} wrap="nowrap">
              <IconMail className="shrink-0" size={14} stroke={1.75} />
              <Text fw={600} size="xs" truncate>
                2 reminders coming up
              </Text>
            </Group>
          </div>
        </Group>
        {REMINDERS.map((reminder) => (
          <Group
            className="border-t border-[var(--mantine-color-default-border)]"
            gap="sm"
            key={reminder.person}
            px="sm"
            py={10}
            wrap="nowrap"
          >
            <PersonAvatar person={reminder.person} size={32} />
            <div className="min-w-0 flex-1">
              <Text fw={600} size="sm" truncate>
                {SAMPLE_PEOPLE[reminder.person].name}
              </Text>
              <Group gap={4} wrap="nowrap">
                <reminder.icon
                  className="shrink-0"
                  color="var(--mantine-primary-color-filled)"
                  size={14}
                  stroke={1.75}
                />
                <Text c="dimmed" size="xs" truncate>
                  {reminder.label}
                </Text>
              </Group>
            </div>
          </Group>
        ))}
      </Surface>
    </div>
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
