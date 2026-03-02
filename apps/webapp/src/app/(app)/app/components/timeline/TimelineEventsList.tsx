"use client";

import { Box, Group, Stack, Text, ThemeIcon, Timeline } from "@mantine/core";
import type { Activity, Contact } from "@bondery/types";
import { useMemo } from "react";
import { getActivityTypeConfig } from "@/lib/activityTypes";
import { PersonAvatarGroup } from "@bondery/mantine-next";
import { ActivityCard } from "./ActivityCard";

interface TimelineEventsListProps {
  activities: Activity[];
  resolveParticipants: (activity: Activity) => Contact[];
  editLabel: string;
  duplicateLabel: string;
  deleteLabel: string;
  onOpen: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onDuplicate: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
}

/**
 * Renders grouped activity cards in a Mantine Timeline.
 * Keeps home and timeline pages visually consistent.
 */
export function TimelineEventsList({
  activities,
  resolveParticipants,
  editLabel,
  duplicateLabel,
  deleteLabel,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
}: TimelineEventsListProps) {
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};

    activities.forEach((activity) => {
      const date = new Date(activity.date);
      const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });

    return groups;
  }, [activities]);

  return (
    <Stack gap="lg">
      {Object.entries(groupedActivities).map(([dateGroup, monthActivities]) => (
        <div key={dateGroup}>
          <Text c="dimmed" size="sm" mb="md">
            {dateGroup}
          </Text>
          <Timeline
            active={monthActivities.length}
            bulletSize={32}
            lineWidth={2}
            color="gray.4"
            styles={{
              itemBullet: {
                border: "none",
                backgroundColor: "transparent",
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
                  key={activity.id}
                  mt="sm"
                  bullet={
                    <Box
                      w={32}
                      h={32}
                      style={{
                        borderRadius: 999,
                        backgroundColor: "var(--mantine-color-body)",
                        border: "1px solid var(--mantine-color-default-border)",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ThemeIcon size={"30"} radius="xl" variant="light" color={typeConfig.color}>
                        {typeConfig.emoji}
                      </ThemeIcon>
                    </Box>
                  }
                >
                  <ActivityCard
                    activity={activity}
                    leftSection={
                      <PersonAvatarGroup
                        people={visibleParticipants.map((participant) => ({
                          id: participant.id,
                          firstName: participant.firstName,
                          middleName: participant.middleName,
                          lastName: participant.lastName,
                          headline: participant.headline,
                          avatar: participant.avatar,
                        }))}
                        totalCount={participants.length}
                        size="md"
                        isClickable
                        maxDisplayCount={3}
                        wrap
                      />
                    }
                    editLabel={editLabel}
                    duplicateLabel={duplicateLabel}
                    deleteLabel={deleteLabel}
                    onOpen={() => onOpen(activity)}
                    onEdit={() => onEdit(activity)}
                    onDuplicate={() => onDuplicate(activity)}
                    onDelete={() => onDelete(activity)}
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
