"use client";

import { Badge, Card, Divider, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconBell, IconCircleCheck } from "@tabler/icons-react";
import { IMPORTANT_DATE_TYPE_OPTIONS } from "@/lib/config";
import type { ImportantDateType, UpcomingReminder } from "@bondery/types";
import { useLocale, useTranslations } from "next-intl";
import { PersonAvatar } from "@bondery/mantine-next";

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
  const notifyOnDate = parseDateOnly(reminder.importantDate.notifyOn);
  if (notifyOnDate) {
    return notifyOnDate;
  }

  const parsedDate = parseDateOnly(reminder.importantDate.date);
  if (!parsedDate || reminder.importantDate.notifyDaysBefore === null) {
    return null;
  }

  const notificationDate = new Date(parsedDate);
  notificationDate.setUTCDate(
    notificationDate.getUTCDate() - reminder.importantDate.notifyDaysBefore,
  );
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

function getDateEmoji(type: ImportantDateType): string {
  return IMPORTANT_DATE_TYPE_OPTIONS.find((option) => option.value === type)?.emoji ?? "📌";
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
  const dateT = useTranslations("ContactImportantDates");
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const importantDate = parseDateOnly(reminder.importantDate.date) ?? getTodayUtc();
  const dateMonth = importantDate
    .toLocaleDateString(locale, { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const dateDay = importantDate.toLocaleDateString(locale, { day: "2-digit" });
  const dateTypeLabel = dateT(`Types.${reminder.importantDate.type}`);
  const dateEmoji = getDateEmoji(reminder.importantDate.type);
  const notificationInDays = getDaysUntilNotification(reminder);
  const isNotificationSent = reminder.notificationSent;
  const notificationColor = isNotificationSent
    ? "gray"
    : getNotificationBadgeColor(notificationInDays);
  const personName =
    `${reminder.person.firstName}${reminder.person.lastName ? ` ${reminder.person.lastName}` : ""}`.trim();
  const sentAtLabel = reminder.notificationSentAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: userTimeZone,
      }).format(new Date(reminder.notificationSentAt))
    : null;
  const notificationLabel = isNotificationSent
    ? t("NotificationSent")
    : notificationInDays === 0
      ? t("NotificationToday")
      : notificationInDays === 1
        ? t("NotificationTomorrow")
        : t("NotificationInDays", { count: notificationInDays });
  const notificationTooltip = isNotificationSent
    ? sentAtLabel
      ? t("NotificationTooltipSentAt", { sentAt: sentAtLabel })
      : t("NotificationSent")
    : notificationInDays === 0
      ? t("NotificationTooltipToday")
      : notificationInDays === 1
        ? t("NotificationTooltipTomorrow")
        : t("NotificationTooltipInDays", { count: notificationInDays });
  const notificationAriaLabel = isNotificationSent
    ? sentAtLabel
      ? t("NotificationTooltipSentAt", { sentAt: sentAtLabel })
      : t("NotificationSent")
    : notificationLabel;

  return (
    <Card
      withBorder
      shadow="none"
      radius="md"
      p={0}
      component="button"
      onClick={onClick}
      style={{ cursor: "pointer", width: "100%", textAlign: "left" }}
      aria-label={`${dateTypeLabel}, ${personName || t("UnknownPerson")}, ${notificationAriaLabel}`}
    >
      {/* Main row: date | divider | avatar | date info | notification */}
      <Group wrap="nowrap" gap={"0"} align="stretch">
        {/* Date rail */}
        <Stack gap={0} align="center" justify="center" px="md" py="xs" miw={60}>
          <Text fw={700} size="xs" c="var(--mantine-primary-color-filled)" lh={1.3}>
            {dateMonth}
          </Text>
          <Text fw={700} fz={24} lh={1}>
            {dateDay}
          </Text>
        </Stack>

        <Divider orientation="vertical" my="xs" />

        {/* Avatar */}
        <Group wrap="nowrap" align="center" px="md" style={{ flexShrink: 0 }}>
          <PersonAvatar person={reminder.person} size="md" />
        </Group>

        {/* Date content */}
        <Stack gap={2} justify="center" py="xs" style={{ flex: "1 1 0", minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap" align="center">
            <Text fz={18} lh={1} aria-hidden>
              {dateEmoji}
            </Text>
            <Text fw={600} size="md" lh={1.3} truncate>
              {dateTypeLabel}
            </Text>
          </Group>

          {reminder.importantDate.note ? (
            <Text size="sm" c="dimmed" lineClamp={1}>
              {reminder.importantDate.note}
            </Text>
          ) : null}
        </Stack>

        {/* Notification */}
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
              leftSection={
                isNotificationSent ? (
                  <IconCircleCheck size={14} aria-hidden />
                ) : (
                  <IconBell size={14} aria-hidden />
                )
              }
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
