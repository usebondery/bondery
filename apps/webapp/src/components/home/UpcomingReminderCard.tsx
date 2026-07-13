"use client";

import { PersonAvatar } from "@bondery/mantine-next";
import type { ImportantDateType, UpcomingReminder } from "@bondery/schemas";
import { Badge, Card, Divider, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconBell, IconCircleCheck } from "@tabler/icons-react";
import { useCurrentLocale as useLocale } from "@/components/shell/UserLocaleProvider";
import {
  useContactImportantDatesTranslations,
  useHomePageTranslations,
} from "@/lib/i18n/generated/hooks";
import { IMPORTANT_DATE_TYPE_OPTIONS } from "@/lib/platform/config";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface UpcomingReminderCardProps {
  onClick: () => void;
  reminder: UpcomingReminder;
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
  const t = useHomePageTranslations();
  const dateT = useContactImportantDatesTranslations();
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
      aria-label={`${dateTypeLabel}, ${personName || t("UnknownPerson")}, ${notificationAriaLabel}`}
      component="button"
      onClick={onClick}
      p={0}
      radius="md"
      shadow="none"
      style={{ cursor: "pointer", textAlign: "left", width: "100%" }}
      withBorder
    >
      {/* Main row: date | divider | avatar | date info | notification */}
      <Group align="stretch" gap={"0"} wrap="nowrap">
        {/* Date rail */}
        <Stack align="center" gap={0} justify="center" miw={60} px="md" py="xs">
          <Text c="var(--mantine-primary-color-filled)" fw={700} lh={1.3} size="xs">
            {dateMonth}
          </Text>
          <Text fw={700} fz={24} lh={1}>
            {dateDay}
          </Text>
        </Stack>

        <Divider my="xs" orientation="vertical" />

        {/* Avatar */}
        <Group align="center" px="md" style={{ flexShrink: 0 }} wrap="nowrap">
          <PersonAvatar person={reminder.person} size="md" />
        </Group>

        {/* Date content */}
        <Stack gap={2} justify="center" py="xs" style={{ flex: "1 1 0", minWidth: 0 }}>
          <Group align="center" gap="xs" wrap="nowrap">
            <Text aria-hidden fz={18} lh={1}>
              {dateEmoji}
            </Text>
            <Text fw={600} lh={1.3} size="md" truncate>
              {dateTypeLabel}
            </Text>
          </Group>

          {reminder.importantDate.note ? (
            <Text c="dimmed" lineClamp={1} size="sm">
              {reminder.importantDate.note}
            </Text>
          ) : null}
        </Stack>

        {/* Notification */}
        <Group
          align="center"
          px="md"
          py="xs"
          style={{ flexShrink: 0, marginLeft: "auto" }}
          wrap="nowrap"
        >
          <Tooltip label={notificationTooltip} position="left" withArrow>
            <Badge
              color={notificationColor}
              leftSection={
                isNotificationSent ? (
                  <IconCircleCheck aria-hidden size={14} />
                ) : (
                  <IconBell aria-hidden size={14} />
                )
              }
              radius="xl"
              size="md"
              variant="light"
            >
              {notificationLabel}
            </Badge>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
}
