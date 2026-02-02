"use client";

import { Stack, Group, Text, Button, Paper } from "@mantine/core";
import { IconTimeline, IconPlus } from "@tabler/icons-react";
import { useState, useMemo } from "react";
import type { Activity, Contact } from "@bondery/types";
import { NewActivityModal } from "../../../timeline/components/NewActivityModal";
import { ActivityDetailModal } from "../../../timeline/components/ActivityDetailModal";

interface PersonTimelineSectionProps {
  activities: Activity[];
  contact: Contact;
  connectedContacts: Contact[];
}

function ActivityDateIcon({ date }: { date: Date }) {
  const day = date.getDate();
  
  return (
    <div style={{ 
      width: 40, 
      height: 40, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ 
        width: '100%', 
        height: 12, 
        backgroundColor: '#4285F4', // Google Calendar blue-ish
      }} />
      <Text fw={700} size="sm" style={{ flex: 1, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
        {day}
      </Text>
    </div>
  );
}

export function PersonTimelineSection({
  activities,
  contact,
  connectedContacts,
}: PersonTimelineSectionProps) {
  const [activityModalOpened, setActivityModalOpened] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [detailModalOpened, setDetailModalOpened] = useState(false);

  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(activity => {
        const date = new Date(activity.date);
        const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(activity);
      });
    return groups;
  }, [activities]);

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setDetailModalOpened(true);
  };
  
  const handleActivityModalClose = () => {
    setActivityModalOpened(false);
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconTimeline size={16} />
            <Text fw={600} size="sm">Timeline</Text>
          </Group>
          <Button 
            variant="light" 
            size="xs"
            onClick={() => setActivityModalOpened(true)}
          >
            Add Activity
          </Button>
        </Group>
        
        <Stack gap="xl">
          {Object.entries(groupedActivities).map(([dateGroup, groupActivities]) => (
              <div key={dateGroup}>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700} mb="sm" style={{ letterSpacing: '0.5px' }}>
                    {dateGroup}
                  </Text>
                  <Stack gap="sm">
                      {groupActivities.map(activity => {
                          const date = new Date(activity.date);
                          const participants = activity.participants || [];
                          
                          return (
                              <Paper 
                                  key={activity.id} 
                                  p="md" 
                                  withBorder 
                                  radius="md"
                                  onClick={() => handleActivityClick(activity)}
                                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                  className="hover:border-blue-500 hover:shadow-sm"
                              >
                                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                                      <Group wrap="nowrap" align="flex-start">
                                          <ActivityDateIcon date={date} />
                                          <Stack gap={2}>
                                              <Text fw={600} size="md">
                                                {activity.description || activity.type}
                                              </Text>
                                              <Group gap={6}>
                                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{activity.type}</Text>
                                                {activity.location && (
                                                  <>
                                                    <Text size="xs" c="dimmed">•</Text>
                                                    <Text size="xs" c="dimmed">{activity.location}</Text>
                                                  </>
                                                )}
                                              </Group>
                                          </Stack>
                                      </Group>
                                      <Text c="dimmed" size="xs">
                                          {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                      </Text>
                                  </Group>
                              </Paper>
                          );
                      })}
                  </Stack>
              </div>
          ))}
          
          {activities.length === 0 && (
              <Text c="dimmed" size="sm" ta="center" py="xl">
                No activities yet with this person.
              </Text>
          )}
        </Stack>
      </Stack>

      <NewActivityModal
        opened={activityModalOpened}
        onClose={handleActivityModalClose}
        contacts={[contact, ...connectedContacts]}
      />

      <ActivityDetailModal
        opened={detailModalOpened}
        onClose={() => setDetailModalOpened(false)}
        activity={selectedActivity}
        contacts={[contact]} 
      />
    </>
  );
}
