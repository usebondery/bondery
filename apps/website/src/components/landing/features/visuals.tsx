import { WEBAPP_NAME } from "@bondery/helpers";
import { LogoIcon } from "@bondery/mantine-next";
import visuals from "@bondery/translations/locales/en/platform/website/WebsiteLandingVisuals.json" with {
  type: "json",
};
import { Group, Paper, type PaperProps, Text } from "@mantine/core";
import { IconBriefcase, IconCake, IconMail } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";
import { formatMessage } from "@/lib/i18n/message";
import { PersonAvatar, SAMPLE_PEOPLE } from "./sample-people";

/*
 * Decorative product mocks for the feature tiles. They are built from Mantine
 * parts so they follow the theme in light and dark mode. `BentoCard` hides them
 * from assistive tech, so nothing in here may be focusable.
 */

const SURFACE_STYLE: CSSProperties = {
  backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
};

function Surface({ children, style, ...paperProps }: PaperProps & { children: ReactNode }) {
  return (
    <Paper
      p="md"
      radius="md"
      shadow="sm"
      style={{ ...SURFACE_STYLE, ...style }}
      withBorder
      {...paperProps}
    >
      {children}
    </Paper>
  );
}

/*
 * Mirrors the real reminder digest email (`ReminderDigestEmail`): Bondery emails you before each
 * important date, with the same subject and line shapes. Keep-in-touch cadences are not emailed,
 * so this visual shows dates only.
 */
/** Time the demo digest arrives. It is a sample, so it is not translated. */
const DIGEST_TIME = "8:00";

const REMINDERS = [
  { icon: IconCake, label: visuals.Reminders.Birthday, person: "margaret" },
  { icon: IconBriefcase, label: visuals.Reminders.Anniversary, person: "alan" },
] as const;

/** An incoming Bondery reminder email, with a second message peeking behind it. */
function ReminderEmailVisual() {
  return (
    <div className="relative w-full max-w-sm pt-3">
      <div
        className="border-line absolute inset-x-5 top-0 h-10 rounded-md border"
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
                {WEBAPP_NAME}
              </Text>
              <Group gap={6} wrap="nowrap">
                <Text c="dimmed" size="xs">
                  {DIGEST_TIME}
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
                {formatMessage(visuals.Reminders.ComingUp, { count: REMINDERS.length })}
              </Text>
            </Group>
          </div>
        </Group>
        {REMINDERS.map((reminder) => (
          <div className="border-line border-t" key={reminder.person}>
            <Group gap="sm" px="sm" py={10} wrap="nowrap">
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
          </div>
        ))}
      </Surface>
    </div>
  );
}

export { ReminderEmailVisual, Surface };
