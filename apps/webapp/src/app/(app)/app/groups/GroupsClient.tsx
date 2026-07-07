"use client";

import { useMemo } from "react";
import { Text, Button, Stack, Group, Paper, SimpleGrid } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrash, IconUsersGroup, IconUsersPlus } from "@tabler/icons-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import type { GroupWithCount } from "@bondery/schemas";
import { openAddGroupModal } from "./components/AddGroupModal";
import { openEditGroupModal } from "./components/EditGroupModal";
import { openAddPeopleToGroupModal } from "./components/AddPeopleToGroupModal";
import { SortMenu, type SortOption } from "./components/SortMenu";
import { GroupCard } from "./components/GroupCard";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "../components/modals/openStandardConfirmModal";
import { captureEvent } from "@/lib/analytics/client";
import {
  useDeleteGroupMutation,
  useDuplicateGroupMutation,
  useGroupsListQuery,
} from "@/lib/query/hooks/useGroups";

const LIST_PARAMS = { previewLimit: 3 };

export function GroupsClient() {
  const t = useTranslations("GroupsPage");
  const tCommon = useTranslations("WebAppCommon");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data } = useGroupsListQuery(LIST_PARAMS);
  const deleteGroupMutation = useDeleteGroupMutation();
  const duplicateGroupMutation = useDuplicateGroupMutation();
  const initialGroups = data?.groups ?? [];
  const totalCount = data?.totalCount ?? 0;

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

  const handleAddPeopleToGroup = (group: GroupWithCount) => {
    openAddPeopleToGroupModal({
      groupId: group.id,
      groupLabel: group.label,
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = initialGroups.find((g) => g.id === groupId);
    if (!group) return;

    openStandardConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteGroup.Title")}
          icon={<IconTrash size={20} />}
          isDangerous={true}
        />
      ),
      message: (
        <Text size="sm">{t("DeleteGroup.Message", { label: group.label })}</Text>
      ),
      confirmLabel: tCommon("Delete"),
      cancelLabel: tCommon("Cancel"),
      confirmColor: "red",
      onConfirm: async () => {
        const loadingNotification = notifications.show({
          ...loadingNotificationTemplate({
            title: tCommon("Deleting"),
            description: t("DeleteGroup.LoadingDescription", { label: group.label }),
          }),
        });

        try {
          await deleteGroupMutation.mutateAsync(groupId);

          captureEvent("group_deleted");

          notifications.update({
            ...successNotificationTemplate({
              title: tCommon("SuccessTitle"),
              description: t("DeleteGroup.SuccessDescription"),
            }),
            id: loadingNotification,
          });
        } catch (error) {
          console.error("Error deleting group:", error);
          notifications.update({
            ...errorNotificationTemplate({
              title: tCommon("ErrorTitle"),
              description: t("DeleteGroup.ErrorDescription"),
            }),
            id: loadingNotification,
          });
        }
      },
    });
  };

  const handleDuplicateGroup = async (group: GroupWithCount) => {
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: tCommon("Duplicating"),
        description: t("DuplicateGroup.LoadingDescription", { label: group.label }),
      }),
    });

    try {
      await duplicateGroupMutation.mutateAsync({
        sourceGroupId: group.id,
        input: {
          label: `${group.label}${t("DuplicateGroup.CopySuffix")}`,
          emoji: group.emoji || "",
          color: group.color || "#1971C2",
        },
      });

      notifications.update({
        ...successNotificationTemplate({
          title: tCommon("SuccessTitle"),
          description: t("DuplicateGroup.SuccessDescription"),
        }),
        id: loadingNotification,
      });
    } catch (error) {
      console.error("Error duplicating group:", error);
      notifications.update({
        ...errorNotificationTemplate({
          title: tCommon("ErrorTitle"),
          description: t("DuplicateGroup.ErrorDescription"),
        }),
        id: loadingNotification,
      });
    }
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          icon={IconUsersGroup}
          title={t("Title")}
          helpDoc="concepts.groups"
          helpLabel={t("HeaderDescription")}
          action={
            <Button
              size="md"
              leftSection={<IconUsersPlus size={16} />}
              onClick={() => openAddGroupModal()}
            >
              {t("CreateNewGroup")}
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
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" mt="md">
                {sortedGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={handleCardClick}
                    onAddPeople={handleAddPeopleToGroup}
                    onEdit={handleEditGroup}
                    onDuplicate={handleDuplicateGroup}
                    onDelete={handleDeleteGroup}
                  />
                ))}
              </SimpleGrid>
            ) : (
              <Text ta="center" c="dimmed" py="xl">
                {t("Empty")}
              </Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
