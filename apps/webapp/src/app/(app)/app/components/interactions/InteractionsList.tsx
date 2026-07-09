"use client";

import { PersonAvatarGroup } from "@bondery/mantine-next";
import type { Activity, Contact } from "@bondery/schemas";
import { Stack, Text, ThemeIcon, Timeline } from "@mantine/core";
import { useMemo } from "react";
import { getActivityTypeConfig } from "@/lib/contacts/activityTypes";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { ActivityCard } from "./ActivityCard";

const TIMELINE_BORDER_COLOR = "var(--mantine-color-default-border)";

interface InteractionsListProps {
  activities: Activity[];
  deleteLabel: string;
  duplicateLabel: string;
  editLabel: string;
  onDelete: (activity: Activity) => void;
  onDuplicate: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onOpen: (activity: Activity) => void;
  resolveParticipants: (activity: Activity) => Contact[];
}

/**
 * Renders grouped activity cards in a Mantine Timeline.
 * Keeps home and timeline pages visually consistent.
 */
export function InteractionsList({
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

  const groupedActivities = useMemo(() => {
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
  }, [activities, formatter]);

  return (
    <Stack gap="lg">
      {Object.entries(groupedActivities).map(([dateGroup, monthActivities]) => (
        <div key={dateGroup}>
          <Text c="dimmed" mb="md" size="sm">
            {dateGroup}
          </Text>
          <Timeline
            active={monthActivities.length}
            bulletSize={32}
            lineWidth={2}
            style={{ "--tl-color": TIMELINE_BORDER_COLOR } as React.CSSProperties}
            styles={{
              itemBullet: {
                backgroundColor: "transparent",
                border: "none",
                padding: 0,
              },
            }}
          >
            {monthActivities.map((activity) => {
              const participants = resolveParticipants(activity);
              const typeConfig = getActivityTypeConfig(activity.type);
              const visibleParticipants = participants.slice(0, 3);

              return (
                <Timeline.Item
                  bullet={
                    <ThemeIcon color={typeConfig.color} radius="xl" size={32} variant="white">
                      {typeConfig.emoji}
                    </ThemeIcon>
                  }
                  key={activity.id}
                >
                  <ActivityCard
                    activity={activity}
                    deleteLabel={deleteLabel}
                    duplicateLabel={duplicateLabel}
                    editLabel={editLabel}
                    leftSection={
                      <PersonAvatarGroup
                        isClickable
                        maxDisplayCount={3}
                        people={visibleParticipants.map((participant) => ({
                          avatar: participant.avatar,
                          firstName: participant.firstName,
                          headline: participant.headline,
                          id: participant.id,
                          lastName: participant.lastName,
                          middleName: participant.middleName,
                        }))}
                        size="md"
                        totalCount={participants.length}
                        wrap
                      />
                    }
                    onDelete={() => onDelete(activity)}
                    onDuplicate={() => onDuplicate(activity)}
                    onEdit={() => onEdit(activity)}
                    onOpen={() => onOpen(activity)}
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
