"use client";

import { Button, Group, Paper, SegmentedControl, Stack, Text, Tooltip, Kbd } from "@mantine/core";
import { IconCalendarPlus, IconCopy, IconTable, IconTimelineEventText } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { useDebouncedCallback, useHotkeys } from "@mantine/hooks";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { openNewActivityModal } from "./components/NewActivityModal";
import type { Contact, Activity } from "@bondery/schemas";
import { WEBSITE_URL, DEBOUNCE_MS, HOTKEYS } from "@/lib/config";
import { peopleSearchActions } from "../components/PeopleSearchSpotlight";
import { PageHeader } from "../components/PageHeader";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import {
  InteractionsTableV2,
  createDefaultInteractionColumns,
  type InteractionColumnConfig,
  type InteractionSortOrder,
} from "../components/interactions/InteractionsTableV2";
import { openStandardConfirmModal } from "../components/modals/openStandardConfirmModal";
import { InteractionsList } from "../components/interactions/InteractionsList";
import {
  useCreateInteractionMutation,
  useDeleteInteractionMutation,
} from "@/lib/query/hooks/useInteractions";

interface InteractionsClientProps {
  initialContacts: Contact[];
  initialActivities: Activity[];
}

export function InteractionsClient({
  initialContacts,
  initialActivities,
}: InteractionsClientProps) {
  const t = useTranslations("InteractionsPage");
  const tHeader = useTranslations("PageHeader");
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
    [HOTKEYS.LOG_INTERACTION, () => openNewActivityModal({ contacts: initialContacts })],
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
            firstName: participant.firstName || "Unknown",
            middleName: participant.middleName || participant.middle_name || null,
            lastName: participant.lastName || null,
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
          await deleteInteractionMutation.mutateAsync(activity.id);

          notifications.show(
            successNotificationTemplate({
              title: t("SuccessTitle"),
              description: t("ActivityDeleted"),
            }),
          );
        } catch {
          notifications.show(
            errorNotificationTemplate({
              title: t("ErrorTitle"),
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
      await createInteractionMutation.mutateAsync({
        title: activity.title || "",
        type: activity.type,
        description: activity.description || "",
        date: activity.date,
        participantIds,
      });

      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
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
            activities.map((item) => deleteInteractionMutation.mutateAsync(item.id)),
          );

          notifications.update({
            ...successNotificationTemplate({
              title: t("SuccessTitle"),
              description: t("ActivitiesDeleted", { count: activities.length }),
            }),
            id: loadingNotificationId,
          });

          setSelectedIds(new Set());
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

  const sortedInteractionsActivities = useMemo(
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
          helpHref={`${WEBSITE_URL}/docs/concepts/interactions`}
          helpLabel={t("HeaderDescription")}
          secondaryAction={
            <SegmentedControl
              value={viewMode}
              onChange={(value) => setViewMode(value as "interactions" | "table")}
              data={[
                {
                  value: "interactions",
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
            <Tooltip
              label={
                <Group gap="xs" wrap="nowrap">
                  <Text size="xs" inherit>
                    {t("AddActivity")}
                  </Text>
                  <Kbd size="xs">{HOTKEYS.LOG_INTERACTION.toUpperCase()}</Kbd>
                </Group>
              }
              withArrow
            >
              <Button
                size="md"
                leftSection={<IconCalendarPlus size={16} />}
                onClick={() => {
                  openNewActivityModal({
                    contacts: initialContacts,
                  });
                }}
              >
                {t("AddActivity")}
              </Button>
            </Tooltip>
          }
        />

        {viewMode === "interactions" ? (
          <InteractionsList
            activities={sortedInteractionsActivities}
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
            <InteractionsTableV2
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
              searchLoading={isSearchLoading}
              labels={{
                searchPlaceholder: t("SearchPlaceholder"),
                noInteractionsFound: t("NoActivitiesFound"),
                noInteractionsMatchSearch: t("NoActivitiesFiltered"),
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
                selectedCountTemplate: t("SelectedCountTemplate"),
                totalCountTemplate: t("TotalCountTemplate"),
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
