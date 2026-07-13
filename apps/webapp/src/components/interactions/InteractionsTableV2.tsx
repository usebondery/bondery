"use client";

import {
  type BulkAction,
  type DataColumnConfig,
  DataTable,
  type DataTableLabels,
  PersonAvatarGroup,
  type RowAction,
  type SortOption,
} from "@bondery/mantine-next";
import type { Activity, Contact } from "@bondery/schemas";
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
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useCurrentLocale as useLocale } from "@/components/shell/UserLocaleProvider";
import { getActivityTypeConfig } from "@/lib/contacts/activityTypes";
import { useInteractionTypeLabel } from "@/lib/i18n/useInteractionTypeLabel";

// --- Column Key Types ---
export type InteractionColumnKey = "date" | "title" | "type" | "participants" | "notes";
export type InteractionSortOrder = "dateDesc" | "dateAsc" | "participantsDesc" | "participantsAsc";

// --- Column Config ---
export interface InteractionColumnConfig {
  icon: ReactNode;
  key: InteractionColumnKey;
  label: string;
  visible: boolean;
}

// --- Labels Interface ---
export interface InteractionsTableLabels {
  actionsAriaLabel: string;
  // Column headers
  columns: {
    date: string;
    title: string;
    type: string;
    participants: string;
    notes: string;
  };
  deleteLabel: string;
  deleteSelectedAction: string;
  duplicateLabel: string;
  // Row actions
  editLabel: string;
  hiddenColumnsSection: string;
  noHiddenColumns: string;
  noInteractionsFound: string;
  noInteractionsMatchSearch: string;
  noVisibleColumns: string;
  searchPlaceholder: string;
  selectedCountTemplate: string;
  // Sort
  sortButton: string;
  sortDateNewest: string;
  sortDateOldest: string;
  sortParticipantsLeast: string;
  sortParticipantsMost: string;
  totalCountTemplate: string;
  // Column visibility
  visibleColumnsButton: string;
  visibleColumnsSection: string;
}

// --- Props Interface ---
export interface InteractionsTableV2Props {
  activities: Activity[];
  // External state for columns
  columns: InteractionColumnConfig[];
  hasMore?: boolean;
  // Labels
  labels: InteractionsTableLabels;
  loadMoreLabel?: string;
  loadMoreLoading?: boolean;
  onColumnsChange: (columns: InteractionColumnConfig[]) => void;
  onDelete: (activity: Activity) => void;
  onDeleteSelected?: (activities: Activity[]) => void;
  onDuplicate: (activity: Activity) => void;
  // Callbacks
  onEdit: (activity: Activity) => void;
  onLoadMore?: () => void;
  onSearchChange: (value: string) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onSortChange: (order: InteractionSortOrder) => void;
  resolveParticipants: (activity: Activity) => Contact[];
  searchLoading?: boolean;
  // External state for search
  searchValue: string;
  // External state for selection
  selectedIds?: Set<string>;
  // External state for sort
  sortOrder: InteractionSortOrder;
}

// --- Derived Row Type ---
interface DerivedInteractionRow {
  activity: Activity;
  participantNames: string;
  participants: Contact[];
}

/**
 * InteractionsTable built on top of the generic DataTable component.
 * Uses external state management for full control.
 */
export function InteractionsTableV2({
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
  searchLoading,
  onEdit,
  onDuplicate,
  onDelete,
  onDeleteSelected,
  labels,
  hasMore,
  loadMoreLabel,
  loadMoreLoading,
  onLoadMore,
}: InteractionsTableV2Props) {
  const locale = useLocale();
  const getInteractionTypeLabel = useInteractionTypeLabel();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale || "en-US", {
        dateStyle: "medium",
      }),
    [locale],
  );

  // --- Derive rows with participants ---
  const derivedRows = useMemo<DerivedInteractionRow[]>(() => {
    return activities.map((activity) => {
      const participants = resolveParticipants(activity);
      const participantNames = participants
        .map((participant) =>
          [participant.firstName, participant.lastName].filter(Boolean).join(" "),
        )
        .join(" ");

      return {
        activity,
        participantNames,
        participants,
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
        default:
          return new Date(right.activity.date).getTime() - new Date(left.activity.date).getTime();
      }
    });
  }, [derivedRows, searchValue, sortOrder]);

  // --- Build data columns ---
  const dataColumns: DataColumnConfig<DerivedInteractionRow>[] = columns.map((col) => ({
    icon: col.icon,
    key: col.key,
    label: col.label,
    minWidthClass: col.key === "title" ? "min-w-40" : col.key === "date" ? "min-w-36" : "min-w-24",
    render: ({ activity, participants }: DerivedInteractionRow) => {
      switch (col.key) {
        case "title": {
          const titleValue = activity.title || "-";
          return (
            <Tooltip label={titleValue} withArrow>
              <Text fw={600} lineClamp={1} size="sm">
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
                  isClickable
                  maxDisplayCount={3}
                  people={participants.map((participant) => ({
                    avatar: participant.avatar,
                    firstName: participant.firstName,
                    headline: participant.headline,
                    id: participant.id,
                    lastName: participant.lastName,
                    middleName: participant.middleName,
                  }))}
                  size="sm"
                />
              )}
            </Group>
          );

        case "type": {
          const typeConfig = getActivityTypeConfig(activity.type);
          return (
            <Badge color={typeConfig.color} radius="xl" tt="none" variant="light">
              {typeConfig.emoji} {getInteractionTypeLabel(activity.type)}
            </Badge>
          );
        }

        case "date":
          return (
            <Text className="whitespace-nowrap" size="sm">
              {dateFormatter.format(new Date(activity.date))}
            </Text>
          );

        case "notes": {
          const descriptionValue = activity.description || "-";
          return (
            <Tooltip label={descriptionValue} withArrow>
              <Text lineClamp={1} maw={480} size="sm">
                {descriptionValue}
              </Text>
            </Tooltip>
          );
        }

        default:
          return null;
      }
    },
    visible: col.visible,
  }));

  // --- Build row actions ---
  const rowActions: RowAction<DerivedInteractionRow>[] = [
    {
      icon: <IconEdit size={14} />,
      key: "edit",
      label: labels.editLabel,
      onClick: ({ activity }) => onEdit(activity),
    },
    {
      icon: <IconCopy size={14} />,
      key: "duplicate",
      label: labels.duplicateLabel,
      onClick: ({ activity }) => onDuplicate(activity),
    },
    {
      color: "red",
      icon: <IconTrash size={14} />,
      key: "delete",
      label: labels.deleteLabel,
      onClick: ({ activity }) => onDelete(activity),
    },
  ];

  // --- Build sort options ---
  const sortOptions: SortOption<InteractionSortOrder>[] = [
    { key: "dateDesc", label: labels.sortDateNewest },
    { key: "dateAsc", label: labels.sortDateOldest },
    { key: "participantsDesc", label: labels.sortParticipantsMost },
    { key: "participantsAsc", label: labels.sortParticipantsLeast },
  ];

  // --- Build labels ---
  const dataTableLabels: DataTableLabels = {
    actionsAriaLabel: labels.actionsAriaLabel,
    columnVisibility: {
      buttonLabel: labels.visibleColumnsButton,
      hiddenSection: labels.hiddenColumnsSection,
      noHidden: labels.noHiddenColumns,
      noVisible: labels.noVisibleColumns,
      visibleSection: labels.visibleColumnsSection,
    },
    emptyStateMessage:
      searchValue.trim() && activities.length > 0
        ? labels.noInteractionsMatchSearch
        : labels.noInteractionsFound,
    loadMoreLabel,
    searchPlaceholder: labels.searchPlaceholder,
    selectedCountTemplate: labels.selectedCountTemplate,
    sort: {
      buttonLabel: labels.sortButton,
    },
    totalCountTemplate: labels.totalCountTemplate,
  };

  // --- Handle columns change ---
  const handleColumnsChange = (cols: DataColumnConfig<DerivedInteractionRow>[]) => {
    const interactionColumns: InteractionColumnConfig[] = cols.map((col) => ({
      icon: col.icon,
      key: col.key as InteractionColumnKey,
      label: col.label,
      visible: col.visible,
    }));
    onColumnsChange(interactionColumns);
  };

  const bulkActions: BulkAction[] = onDeleteSelected
    ? [
        {
          color: "red",
          icon: <IconTrash size={16} />,
          key: "deleteSelected",
          label: labels.deleteSelectedAction,
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
    <DataTable<DerivedInteractionRow, InteractionSortOrder>
      bulkActions={bulkActions.length > 0 ? bulkActions : undefined}
      columns={dataColumns}
      currentSort={sortOrder}
      data={filteredAndSortedRows}
      getRowId={({ activity }) => activity.id}
      hasMore={Boolean(hasMore && onLoadMore)}
      labels={dataTableLabels}
      loadMoreLoading={loadMoreLoading}
      onColumnsChange={handleColumnsChange}
      onLoadMore={onLoadMore}
      onSearchChange={onSearchChange}
      onSelectionChange={onSelectionChange}
      onSortChange={onSortChange}
      rowActions={rowActions}
      searchLoading={searchLoading}
      searchValue={searchValue}
      selectedIds={selectedIds}
      sortOptions={sortOptions}
    />
  );
}

// --- Convenience: Default column configuration factory ---
export function createDefaultInteractionColumns(columnLabels: {
  date: string;
  type: string;
  title: string;
  participants: string;
  notes: string;
}): InteractionColumnConfig[] {
  return [
    { icon: <IconCalendar size={16} />, key: "date", label: columnLabels.date, visible: true },
    { icon: <IconTag size={16} />, key: "type", label: columnLabels.type, visible: true },
    { icon: <IconMessage size={16} />, key: "title", label: columnLabels.title, visible: true },
    {
      icon: <IconUsers size={16} />,
      key: "participants",
      label: columnLabels.participants,
      visible: true,
    },
    {
      icon: <IconMessage size={16} />,
      key: "notes",
      label: columnLabels.notes,
      visible: true,
    },
  ];
}
