"use client";

import { useMemo } from "react";
import { Badge, Group, Text, Tooltip } from "@mantine/core";
import {
  IconCalendar,
  IconCopy,
  IconEdit,
  IconMessage,
  IconTag,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useLocale } from "next-intl";
import type { Activity, Contact } from "@bondery/types";
import {
  DataTable,
  PersonAvatarGroup,
  type BulkAction,
  type DataColumnConfig,
  type RowAction,
  type DataTableLabels,
  type SortOption,
} from "@bondery/mantine-next";
import { getActivityTypeConfig } from "@/lib/activityTypes";
import type { ReactNode } from "react";

// --- Column Key Types ---
export type EventColumnKey = "date" | "title" | "type" | "participants" | "notes";
export type EventSortOrder = "dateDesc" | "dateAsc" | "participantsDesc" | "participantsAsc";

// --- Column Config ---
export interface EventColumnConfig {
  key: EventColumnKey;
  label: string;
  icon: ReactNode;
  visible: boolean;
}

// --- Labels Interface ---
export interface EventsTableLabels {
  searchPlaceholder: string;
  noEventsFound: string;
  // Column visibility
  visibleColumnsButton: string;
  visibleColumnsSection: string;
  hiddenColumnsSection: string;
  noVisibleColumns: string;
  noHiddenColumns: string;
  // Sort
  sortButton: string;
  sortDateNewest: string;
  sortDateOldest: string;
  sortParticipantsMost: string;
  sortParticipantsLeast: string;
  // Row actions
  editLabel: string;
  duplicateLabel: string;
  deleteLabel: string;
  deleteSelectedAction: string;
  actionsAriaLabel: string;
  selectedCountTemplate: string;
  totalCountTemplate: string;
  // Column headers
  columns: {
    date: string;
    title: string;
    type: string;
    participants: string;
    notes: string;
  };
}

// --- Props Interface ---
export interface EventsTableV2Props {
  activities: Activity[];
  resolveParticipants: (activity: Activity) => Contact[];
  // External state for selection
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  // External state for columns
  columns: EventColumnConfig[];
  onColumnsChange: (columns: EventColumnConfig[]) => void;
  // External state for sort
  sortOrder: EventSortOrder;
  onSortChange: (order: EventSortOrder) => void;
  // External state for search
  searchValue: string;
  onSearchChange: (value: string) => void;
  // Callbacks
  onEdit: (activity: Activity) => void;
  onDuplicate: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onDeleteSelected?: (activities: Activity[]) => void;
  // Labels
  labels: EventsTableLabels;
}

// --- Derived Row Type ---
interface DerivedEventRow {
  activity: Activity;
  participants: Contact[];
  participantNames: string;
}

/**
 * EventsTable built on top of the generic DataTable component.
 * Uses external state management for full control.
 */
export function EventsTableV2({
  activities,
  resolveParticipants,
  selectedIds,
  onSelectionChange,
  columns,
  onColumnsChange,
  sortOrder,
  onSortChange,
  searchValue,
  onSearchChange,
  onEdit,
  onDuplicate,
  onDelete,
  onDeleteSelected,
  labels,
}: EventsTableV2Props) {
  const locale = useLocale();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale || "en-US", {
        dateStyle: "medium",
      }),
    [locale],
  );

  // --- Derive rows with participants ---
  const derivedRows = useMemo<DerivedEventRow[]>(() => {
    return activities.map((activity) => {
      const participants = resolveParticipants(activity);
      const participantNames = participants
        .map((participant) =>
          [participant.firstName, participant.lastName].filter(Boolean).join(" "),
        )
        .join(" ");

      return {
        activity,
        participants,
        participantNames,
      };
    });
  }, [activities, resolveParticipants]);

  // --- Filter and sort ---
  const filteredAndSortedRows = useMemo(() => {
    const searchQuery = searchValue.trim().toLowerCase();

    const filtered = searchQuery
      ? derivedRows.filter(({ activity, participantNames }) => {
          const title = activity.title || "";
          const description = activity.description || "";
          const type = activity.type || "";

          return [title, description, type, participantNames].some((value) =>
            value.toLowerCase().includes(searchQuery),
          );
        })
      : derivedRows;

    return [...filtered].sort((left, right) => {
      switch (sortOrder) {
        case "dateAsc":
          return new Date(left.activity.date).getTime() - new Date(right.activity.date).getTime();
        case "participantsDesc":
          return right.participants.length - left.participants.length;
        case "participantsAsc":
          return left.participants.length - right.participants.length;
        case "dateDesc":
        default:
          return new Date(right.activity.date).getTime() - new Date(left.activity.date).getTime();
      }
    });
  }, [derivedRows, searchValue, sortOrder]);

  // --- Build data columns ---
  const dataColumns: DataColumnConfig<DerivedEventRow>[] = columns.map((col) => ({
    key: col.key,
    label: col.label,
    icon: col.icon,
    visible: col.visible,
    minWidthClass: col.key === "title" ? "min-w-40" : col.key === "date" ? "min-w-36" : "min-w-24",
    render: ({ activity, participants }: DerivedEventRow) => {
      switch (col.key) {
        case "title": {
          const titleValue = activity.title || "-";
          return (
            <Tooltip label={titleValue} withArrow>
              <Text size="sm" fw={600} lineClamp={1}>
                {titleValue}
              </Text>
            </Tooltip>
          );
        }

        case "participants":
          return (
            <Group gap={6} wrap="nowrap">
              {participants.length === 0 ? (
                <Text c="dimmed" size="sm">
                  -
                </Text>
              ) : (
                <PersonAvatarGroup
                  people={participants.map((participant) => ({
                    id: participant.id,
                    firstName: participant.firstName,
                    middleName: participant.middleName,
                    lastName: participant.lastName,
                    headline: participant.headline,
                    avatar: participant.avatar,
                  }))}
                  size="sm"
                  isClickable
                  maxDisplayCount={3}
                />
              )}
            </Group>
          );

        case "type": {
          const typeConfig = getActivityTypeConfig(activity.type);
          return (
            <Badge variant="light" color={typeConfig.color} radius="xl" tt="none">
              {typeConfig.emoji} {activity.type}
            </Badge>
          );
        }

        case "date":
          return (
            <Text size="sm" className="whitespace-nowrap">
              {dateFormatter.format(new Date(activity.date))}
            </Text>
          );

        case "notes": {
          const descriptionValue = activity.description || "-";
          return (
            <Tooltip label={descriptionValue} withArrow>
              <Text size="sm" lineClamp={1} maw={480}>
                {descriptionValue}
              </Text>
            </Tooltip>
          );
        }

        default:
          return null;
      }
    },
  }));

  // --- Build row actions ---
  const rowActions: RowAction<DerivedEventRow>[] = [
    {
      key: "edit",
      label: labels.editLabel,
      icon: <IconEdit size={14} />,
      onClick: ({ activity }) => onEdit(activity),
    },
    {
      key: "duplicate",
      label: labels.duplicateLabel,
      icon: <IconCopy size={14} />,
      onClick: ({ activity }) => onDuplicate(activity),
    },
    {
      key: "delete",
      label: labels.deleteLabel,
      icon: <IconTrash size={14} />,
      color: "red",
      onClick: ({ activity }) => onDelete(activity),
    },
  ];

  // --- Build sort options ---
  const sortOptions: SortOption<EventSortOrder>[] = [
    { key: "dateDesc", label: labels.sortDateNewest },
    { key: "dateAsc", label: labels.sortDateOldest },
    { key: "participantsDesc", label: labels.sortParticipantsMost },
    { key: "participantsAsc", label: labels.sortParticipantsLeast },
  ];

  // --- Build labels ---
  const dataTableLabels: DataTableLabels = {
    searchPlaceholder: labels.searchPlaceholder,
    emptyStateMessage: labels.noEventsFound,
    actionsAriaLabel: labels.actionsAriaLabel,
    selectedCountTemplate: labels.selectedCountTemplate,
    totalCountTemplate: labels.totalCountTemplate,
    columnVisibility: {
      buttonLabel: labels.visibleColumnsButton,
      visibleSection: labels.visibleColumnsSection,
      hiddenSection: labels.hiddenColumnsSection,
      noVisible: labels.noVisibleColumns,
      noHidden: labels.noHiddenColumns,
    },
    sort: {
      buttonLabel: labels.sortButton,
    },
  };

  // --- Handle columns change ---
  const handleColumnsChange = (cols: DataColumnConfig<DerivedEventRow>[]) => {
    const eventColumns: EventColumnConfig[] = cols.map((col) => ({
      key: col.key as EventColumnKey,
      label: col.label,
      icon: col.icon,
      visible: col.visible,
    }));
    onColumnsChange(eventColumns);
  };

  const bulkActions: BulkAction[] = onDeleteSelected
    ? [
        {
          key: "deleteSelected",
          label: labels.deleteSelectedAction,
          icon: <IconTrash size={16} />,
          color: "red",
          onClick: (selected) => {
            const selectedActivities = derivedRows
              .filter(({ activity }) => selected.has(activity.id))
              .map(({ activity }) => activity);
            onDeleteSelected(selectedActivities);
          },
        },
      ]
    : [];

  return (
    <DataTable<DerivedEventRow, EventSortOrder>
      data={filteredAndSortedRows}
      columns={dataColumns}
      getRowId={({ activity }) => activity.id}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      sortOptions={sortOptions}
      currentSort={sortOrder}
      onSortChange={onSortChange}
      onColumnsChange={handleColumnsChange}
      rowActions={rowActions}
      bulkActions={bulkActions.length > 0 ? bulkActions : undefined}
      labels={dataTableLabels}
    />
  );
}

// --- Convenience: Default column configuration factory ---
export function createDefaultEventColumns(columnLabels: {
  date: string;
  type: string;
  title: string;
  participants: string;
  notes: string;
}): EventColumnConfig[] {
  return [
    { key: "date", label: columnLabels.date, icon: <IconCalendar size={16} />, visible: true },
    { key: "type", label: columnLabels.type, icon: <IconTag size={16} />, visible: true },
    { key: "title", label: columnLabels.title, icon: <IconMessage size={16} />, visible: true },
    {
      key: "participants",
      label: columnLabels.participants,
      icon: <IconUsers size={16} />,
      visible: true,
    },
    {
      key: "notes",
      label: columnLabels.notes,
      icon: <IconMessage size={16} />,
      visible: true,
    },
  ];
}
