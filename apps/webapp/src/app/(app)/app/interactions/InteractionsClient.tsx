"use client";

import {
  errorNotificationTemplate,
  Kbd,
  loadingNotificationTemplate,
  ModalTitle,
  parseShortcutKeys,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Activity, Contact } from "@bondery/schemas";

type ActivityParticipantRef = string | { id: string };

import { Button, Group, Paper, SegmentedControl, Stack, Text, Tooltip } from "@mantine/core";
import { useDebouncedCallback, useHotkeys } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarPlus,
  IconCopy,
  IconTable,
  IconTimelineEventText,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { InteractionsList } from "@/components/interactions/InteractionsList";
import {
  createDefaultInteractionColumns,
  type InteractionColumnConfig,
  type InteractionSortOrder,
  InteractionsTableV2,
} from "@/components/interactions/InteractionsTableV2";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { peopleSearchActions } from "@/components/shell/PeopleSearchSpotlight";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { DEBOUNCE_MS, HOTKEYS } from "@/lib/platform/config";
import { useContactsListQuery } from "@/lib/query/hooks/useContacts";
import {
  useCreateInteractionMutation,
  useDeleteInteractionMutation,
  useInteractionsListQuery,
} from "@/lib/query/hooks/useInteractions";
import { INTERACTIONS_TIMELINE, SELECTABLE_CONTACTS } from "@/lib/query/sharedListParams";
import { openNewActivityModal } from "./components/NewActivityModal";

export function InteractionsClient() {
  const t = useWebTranslations("InteractionsPage");
  const { data: contactsData } = useContactsListQuery(SELECTABLE_CONTACTS);
  const { data: interactionsData } = useInteractionsListQuery(INTERACTIONS_TIMELINE);
  const contacts = contactsData?.contacts ?? [];
  const activities = interactionsData?.activities ?? [];
  const deleteInteractionMutation = useDeleteInteractionMutation();
  const createInteractionMutation = useCreateInteractionMutation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState("");
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  // Debounced: SearchInput owns its own input state; this only fires the
  // expensive client-side filter in InteractionsTableV2 after the user pauses.
  const debouncedSetSearchValue = useDebouncedCallback((value: string) => {
    setSearchValue(value);
    setIsSearchLoading(false);
  }, DEBOUNCE_MS.localFilter);

  useHotkeys([
    [HOTKEYS.LOG_INTERACTION, () => openNewActivityModal({ contacts })],
    [HOTKEYS.FIND_PERSON, () => peopleSearchActions.open()],
  ]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setIsSearchLoading(true);
      debouncedSetSearchValue(value);
    },
    [debouncedSetSearchValue],
  );
  const [viewMode, setViewMode] = useState<"interactions" | "table">("interactions");
  const [sortOrder, setSortOrder] = useState<InteractionSortOrder>("dateDesc");
  const [columns, setColumns] = useState<InteractionColumnConfig[]>(() =>
    createDefaultInteractionColumns({
      date: t("TableColumnDate"),
      notes: t("TableColumnNotes"),
      participants: t("TableColumnParticipants"),
      title: t("TableColumnTitle"),
      type: t("TableColumnType"),
    }),
  );

  const contactsById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts],
  );

  const resolveParticipants = useCallback(
    (activity: Activity): Contact[] => {
      return (activity.participants || [])
        .map((participant: ActivityParticipantRef) => {
          const participantId = typeof participant === "string" ? participant : participant.id;
          const knownContact = contactsById.get(participantId);

          if (knownContact) {
            return knownContact;
          }

          if (!participantId || typeof participant === "string") {
            return null;
          }

          return {
            avatar: participant.avatar || null,
            firstName: participant.firstName || t("UnknownPerson"),
            id: participantId,
            lastName: participant.lastName || null,
            middleName: participant.middleName || participant.middle_name || null,
          } as Contact;
        })
        .filter((participant): participant is Contact => Boolean(participant));
    },
    [contactsById, t],
  );

  const handleActivityClick = (activity: Activity) => {
    openNewActivityModal({
      activity,
      contacts,
    });
  };

  const handleDelete = (activity: Activity) => {
    openStandardConfirmModal({
      cancelLabel: t("Cancel"),
      confirmColor: "red",
      confirmLabel: t("DeleteAction"),
      message: <Text size="sm">{t("DeleteConfirmMessage")}</Text>,
      onConfirm: async () => {
        try {
          await deleteInteractionMutation.mutateAsync(activity.id);

          notifications.show(
            successNotificationTemplate({
              description: t("ActivityDeleted"),
              title: t("SuccessTitle"),
            }),
          );
        } catch {
          notifications.show(
            errorNotificationTemplate({
              description: t("DeleteFailed"),
              title: t("ErrorTitle"),
            }),
          );
        }
      },
      title: (
        <ModalTitle
          icon={<IconTrash size={20} />}
          isDangerous={true}
          text={t("DeleteConfirmTitle")}
        />
      ),
    });
  };

  const handleDuplicate = async (activity: Activity) => {
    const participantIds = (activity.participants || [])
      .map((participant: ActivityParticipantRef) =>
        typeof participant === "string" ? participant : participant.id,
      )
      .filter((id): id is string => Boolean(id));

    try {
      await createInteractionMutation.mutateAsync({
        date: activity.date,
        description: activity.description || "",
        participantIds,
        title: activity.title || "",
        type: activity.type,
      });

      notifications.show(
        successNotificationTemplate({
          description: t("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
          title: t("SuccessTitle"),
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: t("DuplicateFailed"),
          title: t("ErrorTitle"),
        }),
      );
    }
  };

  const handleDeleteSelected = (activities: Activity[]) => {
    if (activities.length === 0) {
      return;
    }

    openStandardConfirmModal({
      cancelLabel: t("Cancel"),
      confirmColor: "red",
      confirmLabel: t("DeleteAction"),
      message: (
        <Text size="sm">{t("DeleteSelectedConfirmMessage", { count: activities.length })}</Text>
      ),
      onConfirm: async () => {
        const loadingNotificationId = notifications.show({
          ...loadingNotificationTemplate({
            description: t("DeletingSelectedDescription", { count: activities.length }),
            title: t("DeletingSelectedTitle"),
          }),
        });

        try {
          await Promise.all(
            activities.map((item) => deleteInteractionMutation.mutateAsync(item.id)),
          );

          notifications.update({
            ...successNotificationTemplate({
              description: t("ActivitiesDeleted", { count: activities.length }),
              title: t("SuccessTitle"),
            }),
            id: loadingNotificationId,
          });

          setSelectedIds(new Set());
        } catch {
          notifications.update({
            ...errorNotificationTemplate({
              description: t("DeleteFailed"),
              title: t("ErrorTitle"),
            }),
            id: loadingNotificationId,
          });
        }
      },
      title: (
        <ModalTitle
          icon={<IconTrash size={20} />}
          isDangerous={true}
          text={t("DeleteSelectedConfirmTitle", { count: activities.length })}
        />
      ),
    });
  };

  const sortedInteractionsActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [activities],
  );

  return (
    <PageWrapper>
      <Stack gap="lg">
        <PageHeader
          helpDoc="concepts.interactions"
          helpLabel={t("HeaderDescription")}
          icon={IconTimelineEventText}
          primaryAction={
            <Tooltip
              label={
                <Group gap="xs" wrap="nowrap">
                  <Text inherit size="xs">
                    {t("AddActivity")}
                  </Text>
                  <Kbd keys={parseShortcutKeys(HOTKEYS.LOG_INTERACTION)} size="xs" />
                </Group>
              }
              withArrow
            >
              <Button
                leftSection={<IconCalendarPlus size={16} />}
                onClick={() => {
                  openNewActivityModal({
                    contacts,
                  });
                }}
                size="md"
              >
                {t("AddActivity")}
              </Button>
            </Tooltip>
          }
          secondaryAction={
            <SegmentedControl
              data={[
                {
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconTimelineEventText size={14} />
                      <span>{t("TimelineView")}</span>
                    </Group>
                  ),
                  value: "interactions",
                },
                {
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconTable size={14} />
                      <span>{t("TableView")}</span>
                    </Group>
                  ),
                  value: "table",
                },
              ]}
              onChange={(value) => setViewMode(value as "interactions" | "table")}
              value={viewMode}
            />
          }
          title={t("PageTitle")}
        />

        {viewMode === "interactions" ? (
          <InteractionsList
            activities={sortedInteractionsActivities}
            deleteLabel={t("DeleteAction")}
            duplicateLabel={t("DuplicateAction")}
            editLabel={t("EditAction")}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onEdit={handleActivityClick}
            onOpen={handleActivityClick}
            resolveParticipants={resolveParticipants}
          />
        ) : (
          <Paper p="md" radius="md" shadow="sm" withBorder>
            <InteractionsTableV2
              activities={activities}
              columns={columns}
              labels={{
                actionsAriaLabel: t("TableColumnActions"),
                columns: {
                  date: t("TableColumnDate"),
                  notes: t("TableColumnNotes"),
                  participants: t("TableColumnParticipants"),
                  title: t("TableColumnTitle"),
                  type: t("TableColumnType"),
                },
                deleteLabel: t("DeleteAction"),
                deleteSelectedAction: t("DeleteSelectedAction"),
                duplicateLabel: t("DuplicateAction"),
                editLabel: t("EditAction"),
                hiddenColumnsSection: t("HiddenColumnsSection"),
                noHiddenColumns: t("NoHiddenColumns"),
                noInteractionsFound: t("NoActivitiesFound"),
                noInteractionsMatchSearch: t("NoActivitiesFiltered"),
                noVisibleColumns: t("NoVisibleColumns"),
                searchPlaceholder: t("SearchPlaceholder"),
                selectedCountTemplate: t("SelectedCountTemplate"),
                sortButton: t("SortButton"),
                sortDateNewest: t("SortDateNewest"),
                sortDateOldest: t("SortDateOldest"),
                sortParticipantsLeast: t("SortParticipantsLeast"),
                sortParticipantsMost: t("SortParticipantsMost"),
                totalCountTemplate: t("TotalCountTemplate"),
                visibleColumnsButton: t("VisibleColumnsButton"),
                visibleColumnsSection: t("VisibleColumnsSection"),
              }}
              onColumnsChange={setColumns}
              onDelete={handleDelete}
              onDeleteSelected={handleDeleteSelected}
              onDuplicate={handleDuplicate}
              onEdit={handleActivityClick}
              onSearchChange={handleSearchChange}
              onSelectionChange={setSelectedIds}
              onSortChange={setSortOrder}
              resolveParticipants={resolveParticipants}
              searchLoading={isSearchLoading}
              searchValue={searchValue}
              selectedIds={selectedIds}
              sortOrder={sortOrder}
            />
          </Paper>
        )}
      </Stack>
    </PageWrapper>
  );
}
