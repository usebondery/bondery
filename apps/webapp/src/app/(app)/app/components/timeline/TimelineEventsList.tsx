"use client";

import { Badge, Box, Group, Stack, Text, ThemeIcon, Timeline } from "@mantine/core";
import type { Activity, Contact } from "@bondery/types";
import { useMemo } from "react";
import { getActivityTypeConfig } from "@/lib/activityTypes";
import { ActivityCard } from "./ActivityCard";
import { PersonChip } from "../shared/PersonChip";

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
              const hasOverflowParticipants = participants.length > 3;
              const visibleParticipants = hasOverflowParticipants
                ? participants.slice(0, 2)
                : participants.slice(0, 3);
              const remainingParticipantsCount = hasOverflowParticipants
                ? participants.length - visibleParticipants.length
                : 0;

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
                  <Group align="flex-start" wrap="nowrap" gap="sm">
                    <Stack gap={4} className="w-48" style={{ flexShrink: 0 }}>
                      {visibleParticipants.map((participant) => (
                        <PersonChip
                          key={participant.id}
                          person={{
                            id: participant.id,
                            firstName: participant.firstName,
                            lastName: participant.lastName,
                            avatar: participant.avatar,
                          }}
                          size="sm"
                          color="gray"
                          avatarEdge
                          isClickable
                        />
                      ))}
                      {remainingParticipantsCount > 0 && (
                        <Badge
                          size="lg"
                          variant="light"
                          color="gray"
                          radius="xl"
                          w="fit-content"
                          fw={600}
                          tt={"lowercase"}
                        >
                          +{remainingParticipantsCount} more
                        </Badge>
                      )}
                    </Stack>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <ActivityCard
                        activity={activity}
                        editLabel={editLabel}
                        duplicateLabel={duplicateLabel}
                        deleteLabel={deleteLabel}
                        onOpen={() => onOpen(activity)}
                        onEdit={() => onEdit(activity)}
                        onDuplicate={() => onDuplicate(activity)}
                        onDelete={() => onDelete(activity)}
                      />
                    </div>
                  </Group>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </div>
      ))}
    </Stack>
  );
}
