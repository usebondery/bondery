"use client";

import { Title, Button, Stack, Group, Text, Paper, Avatar, ThemeIcon, TextInput, ActionIcon } from "@mantine/core";
import { IconPlus, IconFilter, IconSearch, IconLayoutGrid, IconTimeline } from "@tabler/icons-react";
import { useState, useMemo } from "react";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { NewActivityModal } from "./components/NewActivityModal";
import { ActivityDetailModal } from "./components/ActivityDetailModal";
import type { Contact, Activity } from "@bondery/types";
import Link from "next/link";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { PageHeader } from "../components/PageHeader";

interface TimelineClientProps {
  initialContacts: Contact[];
  initialActivities: Activity[];
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
      <Text fw={700} size="sm" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        {day}
      </Text>
    </div>
  );
}

export function TimelineClient({ initialContacts, initialActivities }: TimelineClientProps) {
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [search, setSearch] = useState("");

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setDetailModalOpened(true);
  };

  const filteredActivities = useMemo(() => {
    return initialActivities.filter(activity => 
      activity.type.toLowerCase().includes(search.toLowerCase()) ||
      activity.description?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [initialActivities, search]);

  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    filteredActivities.forEach(activity => {
      const date = new Date(activity.date);
      const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });
    return groups;
  }, [filteredActivities]);

  return (
    <PageWrapper>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
                <PageHeader title="Timeline" icon={IconTimeline} />
            </Stack>
            <Button 
                leftSection={<IconPlus size={16} />} 
                onClick={() => setModalOpened(true)}
            >
              Add activity
            </Button>
        </Group>

        <Group justify="flex-end">
            {/* <Button variant="default" leftSection={<IconFilter size={16} />}>Filter</Button> */}
            <TextInput 
                placeholder="Search..." 
                leftSection={<IconSearch size={16} />} 
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                w={300}
            />
        </Group>

        <NewActivityModal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          contacts={initialContacts}
        />

        <ActivityDetailModal
          opened={detailModalOpened}
          onClose={() => setDetailModalOpened(false)}
          activity={selectedActivity}
          contacts={initialContacts}
        />

        <Stack gap="xl">
            {Object.entries(groupedActivities).map(([dateGroup, activities]) => (
                <div key={dateGroup}>
                    <Text c="dimmed" size="sm" mb="md">{dateGroup}</Text>
                    <Stack gap="sm">
                        {activities.map(activity => {
                            const date = new Date(activity.date);
                            const participants = activity.participants || [];
                            
                            return (
                                <Paper 
                                    key={activity.id} 
                                    p="md" 
                                    withBorder 
                                    radius="md"
                                    onClick={() => handleActivityClick(activity)}
                                    style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                                    className="hover:border-blue-500"
                                >
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group wrap="nowrap">
                                            <ActivityDateIcon date={date} />
                                            <Stack gap={2}>
                                                <Text fw={600} size="md">
                                                  {activity.description || activity.type}
                                                </Text>
                                                {participants.length > 0 && (
                                                  <Group gap={4} align="center">
                                                      <Text size="sm" c="dimmed">with</Text>
                                                      {participants.map((p: any, index: number) => {
                                                          const contact = initialContacts.find((c) => c.id === p.id);
                                                          return (
                                                            <span key={contact?.id || p} onClick={(e) => e.stopPropagation()}>
                                                                <Text 
                                                                    component={Link} 
                                                                    href={`${WEBAPP_ROUTES.PERSON}/${contact?.id}`} 
                                                                    className="hover:underline"
                                                                    fw={500}
                                                                    size="sm"
                                                                >
                                                                    {contact?.firstName} {contact?.lastName || ""}
                                                                </Text>
                                                                {index < participants.length - 1 && <Text span c="dimmed">, </Text>}
                                                            </span>
                                                          );
                                                      })}
                                                  </Group>
                                                )}
                                            </Stack>
                                        </Group>
                                        <Text c="dimmed" size="sm" style={{ whiteSpace: 'nowrap' }}>
                                            {participants.length > 0 ? `${participants.length} attendees · ` : ''}
                                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </Text>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </Stack>
                </div>
            ))}
            
            {filteredActivities.length === 0 && (
                <Paper p="xl" withBorder radius="md" ta="center">
                    <Text c="dimmed">No activities found.</Text>
                </Paper>
            )}
        </Stack>
      </Stack>
    </PageWrapper>
  );
}
