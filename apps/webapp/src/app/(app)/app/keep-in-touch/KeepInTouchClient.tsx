"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  AnchorLink,
  errorNotificationTemplate,
  PersonChip,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
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
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconCheck, IconClock, IconHeartHandshake } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentLocale as useLocale } from "@/components/shell/UserLocaleProvider";
import { useKeepInTouchTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { setOptimisticDocumentTitle } from "@/lib/metadata/navigationTitleStore";
import { optimisticPersonDocumentTitle } from "@/lib/metadata/optimisticTitles";
import { usePatchContactMutation } from "@/lib/query/hooks/useContacts";
import { useKeepInTouchQuery } from "@/lib/query/hooks/useKeepInTouch";
import { KeepInTouchSelect } from "./components/KeepInTouchSelect";
import { computeNextDueDate } from "./utils/keepInTouchConfig";

function computeDaysUntilDue(contact: Contact): number {
  const frequencyDays = contact.keepFrequencyDays;
  if (!frequencyDays) {
    return 0;
  }

  const lastInteraction = contact.lastInteraction ? new Date(contact.lastInteraction) : null;

  if (!lastInteraction) {
    return -Infinity;
  }

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
  { labelKey: "WindowNext7", value: "7" },
  { labelKey: "WindowNext30", value: "30" },
  { labelKey: "WindowNext90", value: "90" },
] as const;

function computeEndDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function endDateToWindowValue(endDate: string): string {
  const now = new Date();
  const end = new Date(`${endDate}T23:59:59`);
  const diffDays = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    return "7";
  }
  if (diffDays <= 30) {
    return "30";
  }
  return "90";
}

export function KeepInTouchClient({ endDate }: KeepInTouchClientProps) {
  const t = useKeepInTouchTranslations();
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
        if (!nextDue) {
          return true;
        }
        if (nextDue <= new Date()) {
          return true;
        }
        return nextDue <= new Date(`${endDate}T23:59:59`);
      })
      .map((c) => ({ ...c, daysUntilDue: computeDaysUntilDue(c) }))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [keepInTouchData?.contacts, endDate]);

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const markLoading = useCallback((id: string, loading: boolean) => {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (loading) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleMarkComplete = useCallback(
    async (contactId: string) => {
      if (loadingIds.has(contactId)) {
        return;
      }
      markLoading(contactId, true);

      try {
        await patchContact.mutateAsync({
          id: contactId,
          patch: { lastInteraction: new Date().toISOString() },
        });

        notifications.show(
          successNotificationTemplate({
            description: t("MarkCompleteSuccess"),
            title: t("MarkComplete"),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: t("MarkCompleteFailed"),
            title: t("MarkComplete"),
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
      if (loadingIds.has(contactId)) {
        return;
      }
      markLoading(contactId, true);
      const keepFrequencyDays = value && value !== "none" ? parseInt(value, 10) : null;

      try {
        await patchContact.mutateAsync({ id: contactId, patch: { keepFrequencyDays } });

        notifications.show(
          successNotificationTemplate({
            description: "",
            title: t("FrequencyUpdated"),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: "",
            title: t("FrequencyUpdateFailed"),
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
      data={WINDOW_OPTIONS.map((o) => ({ label: t(o.labelKey), value: o.value }))}
      onChange={handleWindowChange}
      size="xs"
      value={activeWindow}
    />
  );

  // Empty state
  if (contacts.length === 0) {
    return (
      <Stack gap="xl" p="md">
        <PageHeader
          helpDoc="concepts.reminders"
          helpLabel={t("Description")}
          icon={IconHeartHandshake}
          secondaryAction={windowPicker}
          title={t("Title")}
        />
        <Stack align="center" gap="md" py="xl">
          <IconClock color="var(--mantine-color-dimmed)" size={48} stroke={1.2} />
          <Title order={4}>{t("EmptyTitle")}</Title>
          <Text c="dimmed" maw={400} ta="center">
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
        helpDoc="concepts.reminders"
        helpLabel={t("Description")}
        icon={IconHeartHandshake}
        secondaryAction={windowPicker}
        title={t("Title")}
      />

      <Stack gap="xs">
        {contacts.map((contact) => {
          const isLoading = loadingIds.has(contact.id);
          const personName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
          const isOverdue = contact.daysUntilDue < 0 && Number.isFinite(contact.daysUntilDue);
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
            if (!contact.lastInteraction) {
              return null;
            }
            const d = contact.lastInteraction.includes("T")
              ? new Date(contact.lastInteraction)
              : new Date(`${contact.lastInteraction}T12:00:00`);
            if (!Number.isFinite(d.getTime())) {
              return null;
            }
            const today = new Date();
            const isToday =
              d.getFullYear() === today.getFullYear() &&
              d.getMonth() === today.getMonth() &&
              d.getDate() === today.getDate();
            return isToday ? "today" : formatter.relativeTime(d, today);
          })();

          return (
            <Paper key={contact.id} p="sm" radius="md" withBorder>
              <Group align="center" justify="space-between" wrap="nowrap">
                <Group align="center" gap="sm" wrap="nowrap">
                  <Tooltip disabled={!dateTooltip} label={dateTooltip}>
                    <Text
                      c={isOverdue ? "red" : "dimmed"}
                      className="min-w-24"
                      size="sm"
                      style={{ flexShrink: 0 }}
                      ta="right"
                    >
                      {nextDueDate ? t("DueDateLabel", { date: formatDate(nextDueDate) }) : "—"}
                    </Text>
                  </Tooltip>
                  <PersonChip
                    href={`${WEBAPP_ROUTES.PERSON}/${contact.id}`}
                    isClickable
                    onNavigate={() =>
                      setOptimisticDocumentTitle(optimisticPersonDocumentTitle(contact))
                    }
                    person={contact}
                    showHoverCard
                    size="md"
                  />
                  <Text c="dimmed" size="xs" style={{ flexShrink: 0 }}>
                    {relativeLastMet === "today"
                      ? t("LastMetToday")
                      : relativeLastMet
                        ? t("LastMetRelative", { time: relativeLastMet })
                        : t("LastMetNever")}
                  </Text>
                </Group>

                <Group align="center" gap="xs" wrap="nowrap">
                  <KeepInTouchSelect
                    ariaLabel={t("SelectFrequencyAriaLabel", { name: personName })}
                    compact
                    disabled={isLoading}
                    onChange={(val) => handleSaveKeepFrequency(contact.id, val)}
                    value={contact.keepFrequencyDays?.toString() ?? "none"}
                  />

                  <Menu position="bottom-end" trigger="click-hover" withArrow>
                    <Menu.Target>
                      <ActionIcon
                        aria-label={t("MarkAsDoneFor", { name: personName })}
                        color="green"
                        loading={isLoading}
                        variant="light"
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
