"use client";

import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconCalendarPlus, IconCheck, IconClock, IconHeartHandshake } from "@tabler/icons-react";
import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";
import { notifications } from "@mantine/notifications";
import { useCallback, useMemo, useState } from "react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useCurrentLocale as useLocale } from "@/app/(app)/app/components/UserLocaleProvider";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  PersonChip,
  successNotificationTemplate,
  errorNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import { AnchorLink } from "@bondery/mantine-next";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { computeNextDueDate } from "./keepInTouchConfig";
import { KeepInTouchSelect } from "./KeepInTouchSelect";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { useKeepInTouchQuery } from "@/lib/query/hooks/useKeepInTouch";
import { usePatchContactMutation } from "@/lib/query/hooks/useContacts";

interface KeepInTouchContact extends Contact {
  /** Computed: days until next follow-up. Negative = overdue. */
  daysUntilDue: number;
}

function computeDaysUntilDue(contact: Contact): number {
  const frequencyDays = contact.keepFrequencyDays;
  if (!frequencyDays) return 0;

  const lastInteraction = contact.lastInteraction ? new Date(contact.lastInteraction) : null;

  if (!lastInteraction) return -Infinity;

  const nextDue = new Date(lastInteraction);
  nextDue.setDate(nextDue.getDate() + frequencyDays);

  const now = new Date();
  const diffMs = nextDue.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

interface KeepInTouchClientProps {
  endDate: string;
}

const WINDOW_OPTIONS = [
  { value: "7", labelKey: "WindowNext7" },
  { value: "30", labelKey: "WindowNext30" },
  { value: "90", labelKey: "WindowNext90" },
] as const;

function computeEndDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function endDateToWindowValue(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate + "T23:59:59");
  const diffDays = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "7";
  if (diffDays <= 30) return "30";
  return "90";
}

export function KeepInTouchClient({ endDate }: KeepInTouchClientProps) {
  const t = useTranslations("KeepInTouch");
  const locale = useLocale();
  const formatter = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const patchContact = usePatchContactMutation();
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(locale || "en-US", { dateStyle: "short" }).format(date);

  const activeWindow = endDateToWindowValue(endDate);

  const handleWindowChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("endDate", computeEndDate(parseInt(value, 10)));
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const { data: keepInTouchData } = useKeepInTouchQuery();

  const contacts = useMemo(() => {
    const all = keepInTouchData?.contacts ?? [];
    return all
      .filter((c) => {
        const nextDue = computeNextDueDate(c.lastInteraction, c.keepFrequencyDays);
        if (!nextDue) return true;
        if (nextDue <= new Date()) return true;
        return nextDue <= new Date(endDate + "T23:59:59");
      })
      .map((c) => ({ ...c, daysUntilDue: computeDaysUntilDue(c) }))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [keepInTouchData?.contacts, endDate]);

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const markLoading = useCallback((id: string, loading: boolean) => {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleMarkComplete = useCallback(
    async (contactId: string) => {
      if (loadingIds.has(contactId)) return;
      markLoading(contactId, true);

      try {
        const today = new Date().toISOString().split("T")[0];
        await patchContact.mutateAsync({ id: contactId, patch: { lastInteraction: today } });

        notifications.show(
          successNotificationTemplate({
            title: t("MarkComplete"),
            description: t("MarkCompleteSuccess"),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: t("MarkComplete"),
            description: t("MarkCompleteFailed"),
          }),
        );
      } finally {
        markLoading(contactId, false);
      }
    },
    [loadingIds, markLoading, t, patchContact],
  );

  const handleSaveKeepFrequency = useCallback(
    async (contactId: string, value: string | null) => {
      if (loadingIds.has(contactId)) return;
      markLoading(contactId, true);
      const keepFrequencyDays = value && value !== "none" ? parseInt(value, 10) : null;

      try {
        await patchContact.mutateAsync({ id: contactId, patch: { keepFrequencyDays } });

        notifications.show(
          successNotificationTemplate({
            title: t("FrequencyUpdated"),
            description: "",
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: t("FrequencyUpdateFailed"),
            description: "",
          }),
        );
      } finally {
        markLoading(contactId, false);
      }
    },
    [loadingIds, markLoading, t, patchContact],
  );

  const windowPicker = (
    <SegmentedControl
      value={activeWindow}
      onChange={handleWindowChange}
      size="xs"
      data={WINDOW_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
    />
  );

  // Empty state
  if (contacts.length === 0) {
    return (
      <Stack gap="xl" p="md">
        <PageHeader
          icon={IconHeartHandshake}
          title={t("Title")}
          helpDoc="concepts.reminders"
          helpLabel={t("Description")}
          secondaryAction={windowPicker}
        />
        <Stack align="center" gap="md" py="xl">
          <IconClock size={48} stroke={1.2} color="var(--mantine-color-dimmed)" />
          <Title order={4}>{t("EmptyTitle")}</Title>
          <Text c="dimmed" ta="center" maw={400}>
            {t("EmptyDescription")}
          </Text>
          <Button component={AnchorLink} href={WEBAPP_ROUTES.PEOPLE} variant="light">
            {t("GoToPeople")}
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack gap="xl" p="md">
      <PageHeader
        icon={IconHeartHandshake}
        title={t("Title")}
        helpDoc="concepts.reminders"
        helpLabel={t("Description")}
        secondaryAction={windowPicker}
      />

      <Stack gap="xs">
        {contacts.map((contact) => {
          const isLoading = loadingIds.has(contact.id);
          const personName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
          const isOverdue = contact.daysUntilDue < 0 && isFinite(contact.daysUntilDue);
          const nextDueDate = computeNextDueDate(
            contact.lastInteraction,
            contact.keepFrequencyDays,
          );
          const dateTooltip = !nextDueDate
            ? undefined
            : isOverdue
              ? t("OverdueBy", { days: Math.abs(contact.daysUntilDue) })
              : contact.daysUntilDue === 0
                ? t("DueToday")
                : t("DueIn", { days: contact.daysUntilDue });
          const relativeLastMet = (() => {
            if (!contact.lastInteraction) return null;
            const d = contact.lastInteraction.includes("T")
              ? new Date(contact.lastInteraction)
              : new Date(contact.lastInteraction + "T12:00:00");
            if (!isFinite(d.getTime())) return null;
            const today = new Date();
            const isToday =
              d.getFullYear() === today.getFullYear() &&
              d.getMonth() === today.getMonth() &&
              d.getDate() === today.getDate();
            return isToday ? "today" : formatter.relativeTime(d, today);
          })();

          return (
            <Paper key={contact.id} withBorder radius="md" p="sm">
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group align="center" gap="sm" wrap="nowrap">
                  <Tooltip label={dateTooltip} disabled={!dateTooltip}>
                    <Text
                      size="sm"
                      c={isOverdue ? "red" : "dimmed"}
                      className="min-w-24"
                      ta="right"
                      style={{ flexShrink: 0 }}
                    >
                      {nextDueDate ? t("DueDateLabel", { date: formatDate(nextDueDate) }) : "—"}
                    </Text>
                  </Tooltip>
                  <PersonChip
                    person={contact}
                    size="md"
                    isClickable
                    href={`${WEBAPP_ROUTES.PERSON}/${contact.id}`}
                    showHoverCard
                  />
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {relativeLastMet === "today"
                      ? t("LastMetToday")
                      : relativeLastMet
                        ? t("LastMetRelative", { time: relativeLastMet })
                        : t("LastMetNever")}
                  </Text>
                </Group>

                <Group gap="xs" align="center" wrap="nowrap">
                  <KeepInTouchSelect
                    compact
                    value={contact.keepFrequencyDays?.toString() ?? "none"}
                    onChange={(val) => handleSaveKeepFrequency(contact.id, val)}
                    disabled={isLoading}
                    ariaLabel={t("SelectFrequencyAriaLabel", { name: personName })}
                  />

                  <Menu position="bottom-end" withArrow trigger="click-hover">
                    <Menu.Target>
                      <ActionIcon
                        color="green"
                        variant="light"
                        loading={isLoading}
                        aria-label={`${t("MarkAsDone")} – ${personName}`}
                      >
                        <IconCheck size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconCheck size={14} />}
                        onClick={() => handleMarkComplete(contact.id)}
                      >
                        {t("MarkAsDone")}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCalendarPlus size={14} />}
                        onClick={() =>
                          openNewActivityModal({
                            contacts: keepInTouchData?.contacts ?? [],
                            initialParticipantIds: [contact.id],
                          })
                        }
                      >
                        {t("LogInteraction")}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}
