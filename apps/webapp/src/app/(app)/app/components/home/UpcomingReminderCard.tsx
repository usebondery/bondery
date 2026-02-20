"use client";

import { Badge, Card, Divider, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { IMPORTANT_EVENT_TYPE_OPTIONS } from "@/lib/config";
import type { ImportantEventType, UpcomingReminder } from "@bondery/types";
import { useLocale, useTranslations } from "next-intl";
import { PersonChip } from "@/app/(app)/app/components/shared/PersonChip";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface UpcomingReminderCardProps {
  reminder: UpcomingReminder;
  onClick: () => void;
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function getTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getReminderNotificationDate(reminder: UpcomingReminder): Date | null {
  const notifyOnDate = parseDateOnly(reminder.event.notifyOn);
  if (notifyOnDate) {
    return notifyOnDate;
  }

  const eventDate = parseDateOnly(reminder.event.eventDate);
  if (!eventDate || reminder.event.notifyDaysBefore === null) {
    return null;
  }

  const notificationDate = new Date(eventDate);
  notificationDate.setUTCDate(notificationDate.getUTCDate() - reminder.event.notifyDaysBefore);
  return notificationDate;
}

function getDaysUntilNotification(reminder: UpcomingReminder): number {
  const notificationDate = getReminderNotificationDate(reminder);
  if (!notificationDate) {
    return 0;
  }

  const diffMs = notificationDate.getTime() - getTodayUtc().getTime();
  return Math.max(0, Math.floor(diffMs / DAY_IN_MS));
}

/**
 * Returns urgency-based badge color for the notification timing.
 * - Today: red
 * - 1-2 days: orange
 * - 3-7 days: violet (brand)
 * - 8+ days: gray
 */
function getNotificationBadgeColor(daysUntilNotification: number): string {
  if (daysUntilNotification <= 0) {
    return "red";
  }

  if (daysUntilNotification <= 2) {
    return "orange";
  }

  if (daysUntilNotification <= 7) {
    return "violet";
  }

  return "gray";
}

function getEventEmoji(type: ImportantEventType): string {
  return IMPORTANT_EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.emoji ?? "📌";
}

/**
 * Compact timeline-row card for upcoming reminders on the Home page.
 *
 * Layout: Date rail | Divider | Content (title + note + person) | Notification badge
 * - Single divider only (between date and content).
 * - Badge sits at the right edge of the row, no walled-off section.
 * - Person shown as subtle inline avatar + text, not a competing badge.
 * - Urgency communicated through badge color alone.
 */
export function UpcomingReminderCard({ reminder, onClick }: UpcomingReminderCardProps) {
  const locale = useLocale();
  const t = useTranslations("HomePage");
  const eventT = useTranslations("ContactImportantDates");

  const eventDate = parseDateOnly(reminder.event.eventDate) ?? getTodayUtc();
  const eventMonth = eventDate
    .toLocaleDateString(locale, { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const eventDay = eventDate.toLocaleDateString(locale, { day: "2-digit" });
  const eventTypeLabel = eventT(`Types.${reminder.event.eventType}`);
  const eventEmoji = getEventEmoji(reminder.event.eventType);
  const notificationInDays = getDaysUntilNotification(reminder);
  const notificationColor = getNotificationBadgeColor(notificationInDays);
  const personName =
    `${reminder.person.firstName}${reminder.person.lastName ? ` ${reminder.person.lastName}` : ""}`.trim();
  const notificationLabel =
    notificationInDays === 0
      ? t("NotificationToday")
      : notificationInDays === 1
        ? t("NotificationTomorrow")
        : t("NotificationInDays", { count: notificationInDays });
  const notificationTooltip =
    notificationInDays === 0
      ? t("NotificationTooltipToday")
      : notificationInDays === 1
        ? t("NotificationTooltipTomorrow")
        : t("NotificationTooltipInDays", { count: notificationInDays });

  return (
    <Card
      withBorder
      radius="md"
      p={0}
      component="button"
      onClick={onClick}
      style={{ cursor: "pointer", width: "100%", textAlign: "left" }}
      aria-label={`${eventTypeLabel}, ${personName || t("UnknownPerson")}, ${notificationLabel}`}
    >
      {/* Main row: date | divider | event info | divider | person | notification */}
      <Group wrap="nowrap" gap={0} align="stretch">
        {/* Date rail */}
        <Stack gap={0} align="center" justify="center" px="md" py="xs" miw={60}>
          <Text fw={700} size="xs" c="var(--mantine-primary-color-filled)" lh={1.3}>
            {eventMonth}
          </Text>
          <Text fw={700} fz={24} lh={1}>
            {eventDay}
          </Text>
        </Stack>

        <Divider orientation="vertical" my="xs" />

        {/* Event content */}
        <Stack
          gap={2}
          justify="center"
          px="md"
          py="xs"
          style={{ flex: "0 1 auto" }}
          className="min-w-xs"
        >
          <Group gap="xs" wrap="nowrap" align="center">
            <Text fz={18} lh={1} aria-hidden>
              {eventEmoji}
            </Text>
            <Text fw={600} size="md" lh={1.3} truncate>
              {eventTypeLabel}
            </Text>
          </Group>

          {reminder.event.note ? (
            <Text size="sm" c="dimmed" lineClamp={1}>
              {reminder.event.note}
            </Text>
          ) : null}
        </Stack>

        <Divider orientation="vertical" my="xs" />

        {/* Person section (inline, right of event info) */}
        <Group wrap="nowrap" align="center" px="sm" py="xs" style={{ flexShrink: 0 }}>
          <PersonChip person={reminder.person} isClickable />
        </Group>

        {/* Notification badge with tooltip */}
        <Group
          wrap="nowrap"
          align="center"
          px="md"
          py="xs"
          style={{ flexShrink: 0, marginLeft: "auto" }}
        >
          <Tooltip label={notificationTooltip} position="left" withArrow>
            <Badge
              color={notificationColor}
              variant="light"
              radius="xl"
              size="md"
              leftSection={<IconBell size={14} aria-hidden />}
              styles={{
                label: {
                  textTransform: "none",
                  fontWeight: 500,
                },
              }}
            >
              {notificationLabel}
            </Badge>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
}
