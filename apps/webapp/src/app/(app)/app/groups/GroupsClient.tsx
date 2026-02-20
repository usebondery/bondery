"use client";

import { useMemo } from "react";
import { Text, Button, Stack, Group, Paper, SimpleGrid } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconTrash, IconUsersGroup, IconUsersPlus } from "@tabler/icons-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import type { GroupWithCount } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { openAddGroupModal } from "./components/AddGroupModal";
import { openEditGroupModal } from "./components/EditGroupModal";
import { SortMenu, type SortOption } from "./components/SortMenu";
import { GroupCard } from "./components/GroupCard";
import { ModalTitle } from "@bondery/mantine-next";

interface GroupsClientProps {
  initialGroups: GroupWithCount[];
  totalCount: number;
}

export function GroupsClient({ initialGroups, totalCount }: GroupsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sortParam = searchParams.get("sort");
  const sortBy: SortOption =
    sortParam === "count-asc" ||
    sortParam === "count-desc" ||
    sortParam === "alpha-asc" ||
    sortParam === "alpha-desc"
      ? sortParam
      : "count-desc";

  const handleSortChange = (option: SortOption) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", option);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Sort groups based on selected option
  const sortedGroups = useMemo(() => {
    const groups = [...initialGroups];
    switch (sortBy) {
      case "alpha-asc":
        return groups.sort((a, b) => a.label.localeCompare(b.label));
      case "alpha-desc":
        return groups.sort((a, b) => b.label.localeCompare(a.label));
      case "count-asc":
        return groups.sort((a, b) => a.contactCount - b.contactCount);
      case "count-desc":
      default:
        return groups.sort((a, b) => b.contactCount - a.contactCount);
    }
  }, [initialGroups, sortBy]);

  const handleCardClick = (groupId: string) => {
    router.push(`/app/group/${groupId}`);
  };

  const handleEditGroup = (group: GroupWithCount) => {
    openEditGroupModal({
      groupId: group.id,
      initialLabel: group.label,
      initialEmoji: group.emoji || "",
      initialColor: group.color || "",
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = initialGroups.find((g) => g.id === groupId);
    if (!group) return;

    modals.openConfirmModal({
      title: <ModalTitle text="Delete group?" icon={<IconTrash size={20} />} isDangerous={true} />,
      children: (
        <Text size="sm">
          Are you sure you want to delete "{group.label}"? This action cannot be undone. The
          contacts in this group will not be deleted.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        const loadingNotification = notifications.show({
          title: "Deleting...",
          message: `Deleting group "${group.label}"`,
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });

        try {
          const res = await fetch(`${API_ROUTES.GROUPS}/${groupId}`, {
            method: "DELETE",
          });

          if (!res.ok) throw new Error("Failed to delete group");

          notifications.update({
            id: loadingNotification,
            title: "Success",
            message: "Group deleted successfully",
            color: "green",
            loading: false,
            autoClose: 3000,
            withCloseButton: true,
          });

          // Refresh the page to update the groups list
          window.location.reload();
        } catch (error) {
          console.error("Error deleting group:", error);
          notifications.update({
            id: loadingNotification,
            title: "Error",
            message: "Failed to delete group. Please try again.",
            color: "red",
            loading: false,
            autoClose: 5000,
            withCloseButton: true,
          });
        }
      },
    });
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          icon={IconUsersGroup}
          title="Groups"
          action={
            <Button size="md" leftSection={<IconUsersPlus size={16} />} onClick={openAddGroupModal}>
              Add new group
            </Button>
          }
        />

        <Paper withBorder shadow="sm" radius="md" p="md">
          <Stack>
            <Group justify="space-between">
              <Group gap="md">
                <Text size="sm" c="dimmed">
                  {totalCount} {totalCount === 1 ? "group" : "groups"}
                </Text>
              </Group>
              <SortMenu sortBy={sortBy} setSortBy={handleSortChange} />
            </Group>

            {sortedGroups.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mt="md">
                {sortedGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={handleCardClick}
                    onEdit={handleEditGroup}
                    onDelete={handleDeleteGroup}
                  />
                ))}
              </SimpleGrid>
            ) : (
              <Text ta="center" c="dimmed" py="xl">
                No groups found. Create your first group to organize your contacts.
              </Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
