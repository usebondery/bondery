"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Center, Group, Loader, ScrollArea, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconSearch, IconUsersGroup } from "@tabler/icons-react";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { GroupWithCount, GroupsListResponse } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { revalidateGroups } from "../../actions";
import { GroupCard } from "../../groups/components/GroupCard";

interface AddPeopleToGroupSelectionModalProps {
  personIds: string[];
}

export function openAddPeopleToGroupSelectionModal(props: AddPeopleToGroupSelectionModalProps) {
  modals.open({
    title: <ModalTitle text="Add to group" icon={<IconUsersGroup size={24} />} />,
    trapFocus: true,
    size: "lg",
    children: <AddPeopleToGroupSelectionForm {...props} />,
  });
}

function AddPeopleToGroupSelectionForm({ personIds }: AddPeopleToGroupSelectionModalProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const deduplicatedPersonIds = useMemo(() => Array.from(new Set(personIds)), [personIds]);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const response = await fetch(`${API_ROUTES.GROUPS}?previewLimit=3`);

        if (!response.ok) {
          throw new Error("Failed to load groups");
        }

        const data = (await response.json()) as GroupsListResponse;
        setGroups(data.groups || []);
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: "Error",
            description: "Failed to load groups",
          }),
        );
      } finally {
        setIsLoadingGroups(false);
      }
    }

    fetchGroups();
  }, []);

  const filteredGroups = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();

    if (!trimmedSearch) {
      return groups;
    }

    return groups.filter((group) => group.label.toLowerCase().includes(trimmedSearch));
  }, [groups, search]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);

  const handleSubmit = async () => {
    if (!selectedGroupId || deduplicatedPersonIds.length === 0) {
      return;
    }

    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: "Adding people...",
        description: "Please wait while we add selected people to the group",
      }),
    });

    try {
      const response = await fetch(`${API_ROUTES.GROUPS}/${selectedGroupId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: deduplicatedPersonIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add people to group");
      }

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: `${deduplicatedPersonIds.length} ${deduplicatedPersonIds.length === 1 ? "person" : "people"} added to ${selectedGroup?.label || "group"}`,
        }),
      );

      modals.closeAll();
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to add people to group",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingGroups) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <TextInput
        label="Search groups"
        placeholder="Search by group name..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      <Text size="sm" c="dimmed">
        {deduplicatedPersonIds.length} {deduplicatedPersonIds.length === 1 ? "person" : "people"} selected
      </Text>

      {groups.length === 0 ? (
        <Text c="dimmed" ta="center" py="lg">
          No groups found
        </Text>
      ) : (
        <ScrollArea h={360} type="auto">
          <Stack gap="sm">
            {filteredGroups.length === 0 ? (
              <Text c="dimmed" ta="center" py="lg">
                No groups match your search
              </Text>
            ) : (
              filteredGroups.map((group) => (
                <UnstyledButton
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  style={{ width: "100%", textAlign: "left" }}
                >
                  <GroupCard
                    group={group}
                    onClick={() => {}}
                    onAddPeople={() => {}}
                    onEdit={() => {}}
                    onDuplicate={() => {}}
                    onDelete={() => {}}
                    interactive={false}
                    showMenu={false}
                    selected={selectedGroupId === group.id}
                  />
                </UnstyledButton>
              ))
            )}
          </Stack>
        </ScrollArea>
      )}

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={() => modals.closeAll()} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!selectedGroupId || deduplicatedPersonIds.length === 0}
          leftSection={<IconUsersGroup size={16} />}
        >
          Add to group
        </Button>
      </Group>
    </Stack>
  );
}
