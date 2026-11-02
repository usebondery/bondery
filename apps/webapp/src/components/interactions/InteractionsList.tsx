"use client";

import type { Activity, PersonPreview } from "@bondery/schemas";
import { Stack, Text, Timeline } from "@mantine/core";
import type { CSSProperties } from "react";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { ActivityCard } from "./ActivityCard";

const TIMELINE_BORDER_COLOR = "var(--mantine-color-default-border)";

interface InteractionsListProps {
  actionsLabel: string;
  activities: Activity[];
  deleteLabel: string;
  duplicateLabel: string;
  editLabel: string;
  onDelete: (activity: Activity) => void;
  onDuplicate: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onOpen: (activity: Activity) => void;
  resolveParticipants: (activity: Activity) => PersonPreview[];
}

/**
 * Renders grouped activity cards in a Mantine Timeline.
 * Keeps home and timeline pages visually consistent.
 */
export function InteractionsList({
  actionsLabel,
  activities,
  resolveParticipants,
  editLabel,
  duplicateLabel,
  deleteLabel,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
}: InteractionsListProps) {
  const formatter = useFormatter();

  const groupedActivities = (() => {
    const groups: Record<string, Activity[]> = {};

    activities.forEach((activity) => {
      const date = new Date(activity.date);
      const key = formatter.dateTime(date, { month: "long", year: "numeric" });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });

    return groups;
  })();

  return (
    <Stack gap="lg">
      {Object.entries(groupedActivities).map(([dateGroup, monthActivities]) => (
        <div key={dateGroup}>
          <Text c="dimmed" mb="md" size="sm">
            {dateGroup}
          </Text>
          <Timeline
            active={monthActivities.length}
            bulletSize={12}
            lineWidth={2}
            style={{ "--tl-color": TIMELINE_BORDER_COLOR } as CSSProperties}
          >
            {monthActivities.map((activity) => {
              const participants = resolveParticipants(activity);

              return (
                <Timeline.Item key={activity.id}>
                  <ActivityCard
                    actionsLabel={actionsLabel}
                    activity={activity}
                    deleteLabel={deleteLabel}
                    duplicateLabel={duplicateLabel}
                    editLabel={editLabel}
                    onDelete={() => onDelete(activity)}
                    onDuplicate={() => onDuplicate(activity)}
                    onEdit={() => onEdit(activity)}
                    onOpen={() => onOpen(activity)}
                    participants={participants}
                  />
                </Timeline.Item>
              );
            })}
          </Timeline>
        </div>
      ))}
    </Stack>
  );
}
