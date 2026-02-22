"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Center,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconSearch, IconUsersGroup } from "@tabler/icons-react";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact, ContactPreview, GroupWithCount, GroupsListResponse } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { revalidateGroups } from "../../actions";
import { GroupCard } from "../../groups/components/GroupCard";
import { PersonChip } from "../../components/shared/PersonChip";

interface AddPeopleToGroupSelectionModalProps {
  personIds: string[];
}

export function openAddPeopleToGroupSelectionModal(props: AddPeopleToGroupSelectionModalProps) {
  modals.open({
    title: <ModalTitle text="Add to group" icon={<IconUsersGroup size={24} />} />,
    trapFocus: true,
    size: "xl",
    children: <AddPeopleToGroupSelectionForm {...props} />,
  });
}

function AddPeopleToGroupSelectionForm({ personIds }: AddPeopleToGroupSelectionModalProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [initialSelectedGroupIds, setInitialSelectedGroupIds] = useState<Set<string>>(new Set());
  const [selectedPeople, setSelectedPeople] = useState<ContactPreview[]>([]);

  const deduplicatedPersonIds = useMemo(() => Array.from(new Set(personIds)), [personIds]);

  useEffect(() => {
    async function fetchGroupsAndMemberships() {
      try {
        const [groupsResponse, membershipResponses, contactsResponse] = await Promise.all([
          fetch(`${API_ROUTES.GROUPS}?previewLimit=3`),
          Promise.all(
            deduplicatedPersonIds.map((personId) =>
              fetch(`${API_ROUTES.CONTACTS}/${personId}/groups`),
            ),
          ),
          fetch(API_ROUTES.CONTACTS),
        ]);

        if (
          !groupsResponse.ok ||
          membershipResponses.some((response) => !response.ok) ||
          !contactsResponse.ok
        ) {
          throw new Error("Failed to load groups");
        }

        const data = (await groupsResponse.json()) as GroupsListResponse;
        setGroups(data.groups || []);

        const memberships = await Promise.all(
          membershipResponses.map(async (response) => {
            const membershipData = (await response.json()) as { groups?: Array<{ id: string }> };
            return new Set((membershipData.groups || []).map((group) => group.id));
          }),
        );

        const intersection = memberships.reduce<Set<string>>(
          (sharedGroupIds, membershipSet) => {
            return new Set(
              Array.from(sharedGroupIds).filter((groupId) => membershipSet.has(groupId)),
            );
          },
          memberships[0] ? new Set(memberships[0]) : new Set(),
        );

        const contactsData = (await contactsResponse.json()) as { contacts?: Contact[] };
        const selectedPersonIdsSet = new Set(deduplicatedPersonIds);
        const personChips = (contactsData.contacts || [])
          .filter((person) => selectedPersonIdsSet.has(person.id))
          .map((person) => ({
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            avatar: person.avatar,
          }));

        setInitialSelectedGroupIds(intersection);
        setSelectedGroupIds(new Set(intersection));
        setSelectedPeople(personChips);
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: "Error",
            description: "Failed to load groups and memberships",
          }),
        );
      } finally {
        setIsLoadingGroups(false);
      }
    }

    fetchGroupsAndMemberships();
  }, [deduplicatedPersonIds]);

  const filteredGroups = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();

    if (!trimmedSearch) {
      return groups;
    }

    return groups.filter((group) => group.label.toLowerCase().includes(trimmedSearch));
  }, [groups, search]);

  const handleToggleGroup = (groupId: string) => {
    const nextSelectedIds = new Set(selectedGroupIds);

    if (nextSelectedIds.has(groupId)) {
      nextSelectedIds.delete(groupId);
    } else {
      nextSelectedIds.add(groupId);
    }

    setSelectedGroupIds(nextSelectedIds);
  };

  const handleSubmit = async () => {
    if (selectedGroupIds.size === 0 || deduplicatedPersonIds.length === 0) {
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
      const targetGroupIds = Array.from(selectedGroupIds);
      const removedGroupIds = Array.from(initialSelectedGroupIds).filter(
        (groupId) => !selectedGroupIds.has(groupId),
      );

      const addResponses = await Promise.all(
        targetGroupIds.map((groupId) =>
          fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personIds: deduplicatedPersonIds }),
          }),
        ),
      );

      const removeResponses = await Promise.all(
        removedGroupIds.map((groupId) =>
          fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personIds: deduplicatedPersonIds }),
          }),
        ),
      );

      const responses = [...addResponses, ...removeResponses];

      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add people to groups");
        }
      }

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: `${deduplicatedPersonIds.length} ${deduplicatedPersonIds.length === 1 ? "person" : "people"} membership updated in ${selectedGroupIds.size} ${selectedGroupIds.size === 1 ? "group" : "groups"}`,
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
      {selectedPeople.length > 0 && (
        <Group gap="xs" align="center" wrap="wrap">
          {selectedPeople.map((person) => (
            <PersonChip key={person.id} person={person} size="sm" isClickable={false} />
          ))}
        </Group>
      )}

      <TextInput
        label="Search groups"
        placeholder="Search by group name..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      {groups.length === 0 ? (
        <Text c="dimmed" ta="center" py="lg">
          No groups found
        </Text>
      ) : (
        <ScrollArea h={360} type="auto">
          <Group gap="sm" align="flex-start" wrap="wrap">
            {filteredGroups.length === 0 ? (
              <Text c="dimmed" ta="center" py="lg">
                No groups match your search
              </Text>
            ) : (
              filteredGroups.map((group) => (
                <UnstyledButton
                  key={group.id}
                  onClick={() => handleToggleGroup(group.id)}
                  style={{
                    textAlign: "left",
                    flex: "1 1 18rem",
                    minWidth: "16rem",
                    maxWidth: "20rem",
                  }}
                >
                  <GroupCard
                    group={group}
                    onClick={() => {}}
                    onAddPeople={() => {}}
                    onEdit={() => {}}
                    onDuplicate={() => {}}
                    onDelete={() => {}}
                    interactive={false}
                    cursorType="pointer"
                    variant="small"
                    showMenu={false}
                    selected={selectedGroupIds.has(group.id)}
                  />
                </UnstyledButton>
              ))
            )}
          </Group>
        </ScrollArea>
      )}

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={() => modals.closeAll()} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={selectedGroupIds.size === 0 || deduplicatedPersonIds.length === 0}
          leftSection={<IconUsersGroup size={16} />}
        >
          Add to groups
        </Button>
      </Group>
    </Stack>
  );
}
