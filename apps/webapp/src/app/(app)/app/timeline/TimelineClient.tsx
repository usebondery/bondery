"use client";

import { Button, Group, Paper, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconCalendarPlus, IconCopy, IconTable, IconTimelineEventText } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "@mantine/hooks";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { openNewActivityModal } from "./components/NewActivityModal";
import type { Contact, Activity } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { WEBSITE_URL } from "@/lib/config";
import { PageHeader } from "../components/PageHeader";
import { useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import { revalidateInteractions } from "../actions";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import {
  EventsTableV2,
  createDefaultEventColumns,
  type EventColumnConfig,
  type EventSortOrder,
} from "../components/timeline/EventsTableV2";
import { openStandardConfirmModal } from "../components/modals/openStandardConfirmModal";
import { TimelineEventsList } from "../components/timeline/TimelineEventsList";

interface TimelineClientProps {
  initialContacts: Contact[];
  initialActivities: Activity[];
}

export function TimelineClient({ initialContacts, initialActivities }: TimelineClientProps) {
  const router = useRouter();
  const t = useTranslations("TimelinePage");
  const tHeader = useTranslations("PageHeader");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState("");
  // Debounced: SearchInput owns its own input state; this only fires the
  // expensive client-side filter in EventsTableV2 after the user pauses.
  const handleSearchChange = useDebouncedCallback(setSearchValue, 300);
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [sortOrder, setSortOrder] = useState<EventSortOrder>("dateDesc");
  const [columns, setColumns] = useState<EventColumnConfig[]>(() =>
    createDefaultEventColumns({
      date: t("TableColumnDate"),
      type: t("TableColumnType"),
      title: t("TableColumnTitle"),
      participants: t("TableColumnParticipants"),
      notes: t("TableColumnNotes"),
    }),
  );

  const contactsById = useMemo(
    () => new Map(initialContacts.map((contact) => [contact.id, contact])),
    [initialContacts],
  );

  const resolveParticipants = useCallback(
    (activity: Activity): Contact[] => {
      return (activity.participants || [])
        .map((participant: any) => {
          const participantId = typeof participant === "string" ? participant : participant.id;
          const knownContact = contactsById.get(participantId);

          if (knownContact) {
            return knownContact;
          }

          if (!participantId || typeof participant === "string") {
            return null;
          }

          return {
            id: participantId,
            firstName: participant.firstName || participant.first_name || "Unknown",
            middleName: participant.middleName || participant.middle_name || null,
            lastName: participant.lastName || participant.last_name || null,
            avatar: participant.avatar || null,
          } as Contact;
        })
        .filter((participant): participant is Contact => Boolean(participant));
    },
    [contactsById],
  );

  const handleActivityClick = (activity: Activity) => {
    openNewActivityModal({
      contacts: initialContacts,
      activity,
      titleText: t("WhoAreYouMeeting"),
      t,
    });
  };

  const handleDelete = (activity: Activity) => {
    openStandardConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteConfirmTitle")}
          icon={<IconTrash size={20} />}
          isDangerous={true}
        />
      ),
      message: <Text size="sm">{t("DeleteConfirmMessage")}</Text>,
      confirmLabel: t("DeleteAction"),
      cancelLabel: t("Cancel"),
      confirmColor: "red",
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_ROUTES.INTERACTIONS}/${activity.id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete event");
          }

          notifications.show(
            successNotificationTemplate({
              title: "Success",
              description: t("ActivityDeleted"),
            }),
          );

          await revalidateInteractions();
          router.refresh();
        } catch {
          notifications.show(
            errorNotificationTemplate({
              title: "Error",
              description: t("DeleteFailed"),
            }),
          );
        }
      },
    });
  };

  const handleDuplicate = async (activity: Activity) => {
    const participantIds = (activity.participants || [])
      .map((participant: any) => (typeof participant === "string" ? participant : participant.id))
      .filter((id): id is string => Boolean(id));

    try {
      const response = await fetch(API_ROUTES.INTERACTIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activity.title || "",
          type: activity.type,
          description: activity.description || "",
          date: activity.date,
          participantIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate event");
      }

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: t("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
        }),
      );

      await revalidateInteractions();
      router.refresh();
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: t("DuplicateFailed"),
        }),
      );
    }
  };

  const handleDeleteSelected = (activities: Activity[]) => {
    if (activities.length === 0) {
      return;
    }

    openStandardConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteSelectedConfirmTitle", { count: activities.length })}
          icon={<IconTrash size={20} />}
          isDangerous={true}
        />
      ),
      message: (
        <Text size="sm">{t("DeleteSelectedConfirmMessage", { count: activities.length })}</Text>
      ),
      confirmLabel: t("DeleteAction"),
      cancelLabel: t("Cancel"),
      confirmColor: "red",
      onConfirm: async () => {
        const loadingNotificationId = notifications.show({
          ...loadingNotificationTemplate({
            title: t("DeletingSelectedTitle"),
            description: t("DeletingSelectedDescription", { count: activities.length }),
          }),
        });

        try {
          await Promise.all(
            activities.map(async (activity) => {
              const response = await fetch(`${API_ROUTES.INTERACTIONS}/${activity.id}`, {
                method: "DELETE",
              });

              if (!response.ok) {
                throw new Error("Failed to delete event");
              }
            }),
          );

          notifications.update({
            ...successNotificationTemplate({
              title: t("SuccessTitle"),
              description: t("ActivitiesDeleted", { count: activities.length }),
            }),
            id: loadingNotificationId,
          });

          setSelectedIds(new Set());
          await revalidateInteractions();
          router.refresh();
        } catch {
          notifications.update({
            ...errorNotificationTemplate({
              title: t("ErrorTitle"),
              description: t("DeleteFailed"),
            }),
            id: loadingNotificationId,
          });
        }
      },
    });
  };

  const sortedTimelineActivities = useMemo(
    () =>
      [...initialActivities].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [initialActivities],
  );

  return (
    <PageWrapper>
      <Stack gap="lg">
        <PageHeader
          title={t("PageTitle")}
          icon={IconTimelineEventText}
          description={t("HeaderDescription")}
          helpHref={`${WEBSITE_URL}/docs/core-concepts/interactions`}
          helpLabel={tHeader("LearnMoreAbout", { concept: tHeader("Concepts.Timeline") })}
          secondaryAction={
            <SegmentedControl
              value={viewMode}
              onChange={(value) => setViewMode(value as "timeline" | "table")}
              data={[
                {
                  value: "timeline",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconTimelineEventText size={14} />
                      <span>{t("TimelineView")}</span>
                    </Group>
                  ),
                },
                {
                  value: "table",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconTable size={14} />
                      <span>{t("TableView")}</span>
                    </Group>
                  ),
                },
              ]}
            />
          }
          primaryAction={
            <Button
              size="md"
              leftSection={<IconCalendarPlus size={16} />}
              onClick={() => {
                openNewActivityModal({
                  contacts: initialContacts,
                  titleText: t("WhoAreYouMeeting"),
                  t,
                });
              }}
            >
              {t("AddActivity")}
            </Button>
          }
        />

        {viewMode === "timeline" ? (
          <TimelineEventsList
            activities={sortedTimelineActivities}
            resolveParticipants={resolveParticipants}
            editLabel={t("EditAction")}
            duplicateLabel={t("DuplicateAction")}
            deleteLabel={t("DeleteAction")}
            onOpen={handleActivityClick}
            onEdit={handleActivityClick}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        ) : (
          <Paper withBorder shadow="sm" radius="md" p="md">
            <EventsTableV2
              activities={initialActivities}
              resolveParticipants={resolveParticipants}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              columns={columns}
              onColumnsChange={setColumns}
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              labels={{
                searchPlaceholder: t("SearchPlaceholder"),
                noEventsFound: t("NoActivitiesFound"),
                sortButton: t("SortButton"),
                visibleColumnsButton: t("VisibleColumnsButton"),
                visibleColumnsSection: t("VisibleColumnsSection"),
                hiddenColumnsSection: t("HiddenColumnsSection"),
                noVisibleColumns: t("NoVisibleColumns"),
                noHiddenColumns: t("NoHiddenColumns"),
                sortDateNewest: t("SortDateNewest"),
                sortDateOldest: t("SortDateOldest"),
                sortParticipantsMost: t("SortParticipantsMost"),
                sortParticipantsLeast: t("SortParticipantsLeast"),
                editLabel: t("EditAction"),
                duplicateLabel: t("DuplicateAction"),
                deleteLabel: t("DeleteAction"),
                deleteSelectedAction: t("DeleteSelectedAction"),
                actionsAriaLabel: t("TableColumnActions"),
                selectedCountTemplate: t.raw("SelectedCountTemplate") as string,
                totalCountTemplate: t.raw("TotalCountTemplate") as string,
                columns: {
                  date: t("TableColumnDate"),
                  title: t("TableColumnTitle"),
                  participants: t("TableColumnParticipants"),
                  type: t("TableColumnType"),
                  notes: t("TableColumnNotes"),
                },
              }}
              onEdit={handleActivityClick}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onDeleteSelected={handleDeleteSelected}
            />
          </Paper>
        )}
      </Stack>
    </PageWrapper>
  );
}
