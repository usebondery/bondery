"use client";

import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { GroupWithCount } from "@bondery/schemas";
import { Button, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrash, IconUsersGroup, IconUsersPlus } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { captureEvent } from "@/lib/analytics/client";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { optimisticGroupDocumentTitle } from "@/lib/metadata/optimisticTitles";
import { useNavigateWithTitle } from "@/lib/metadata/useNavigateWithTitle";
import {
  useDeleteGroupMutation,
  useDuplicateGroupMutation,
  useGroupsListQuery,
} from "@/lib/query/hooks/useGroups";
import { openAddGroupModal } from "./components/AddGroupModal";
import { openAddPeopleToGroupModal } from "./components/AddPeopleToGroupModal";
import { openEditGroupModal } from "./components/EditGroupModal";
import { GroupCard } from "./components/GroupCard";
import { SortMenu, type SortOption } from "./components/SortMenu";

const LIST_PARAMS = { previewLimit: 3 };

export function GroupsClient() {
  const t = useWebTranslations("GroupsPage");
  const tCommon = useCommonTranslations();
  const router = useRouter();
  const { navigateWithTitle } = useNavigateWithTitle();
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
      default:
        return groups.sort((a, b) => b.contactCount - a.contactCount);
    }
  }, [initialGroups, sortBy]);

  const handleCardClick = (groupId: string) => {
    const group = initialGroups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    navigateWithTitle(`/app/group/${group.id}`, optimisticGroupDocumentTitle(group.label));
  };

  const handleEditGroup = (group: GroupWithCount) => {
    openEditGroupModal({
      groupId: group.id,
      initialColor: group.color || "",
      initialEmoji: group.emoji || "",
      initialLabel: group.label,
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
    if (!group) {
      return;
    }

    openStandardConfirmModal({
      cancelLabel: tCommon("actions.cancel"),
      confirmColor: "red",
      confirmLabel: tCommon("actions.delete"),
      message: <Text size="sm">{t("DeleteGroup.Message", { label: group.label })}</Text>,
      onConfirm: async () => {
        const loadingNotification = notifications.show({
          ...loadingNotificationTemplate({
            description: t("DeleteGroup.LoadingDescription", { label: group.label }),
            title: tCommon("feedback.deleting"),
          }),
        });

        try {
          await deleteGroupMutation.mutateAsync(groupId);

          captureEvent("group_deleted");

          notifications.update({
            ...successNotificationTemplate({
              description: t("DeleteGroup.SuccessDescription"),
              title: tCommon("feedback.successTitle"),
            }),
            id: loadingNotification,
          });
        } catch {
          notifications.update({
            ...errorNotificationTemplate({
              description: t("DeleteGroup.ErrorDescription"),
              title: tCommon("feedback.errorTitle"),
            }),
            id: loadingNotification,
          });
        }
      },
      title: (
        <ModalTitle
          icon={<IconTrash size={20} />}
          isDangerous={true}
          text={t("DeleteGroup.Title")}
        />
      ),
    });
  };

  const handleDuplicateGroup = async (group: GroupWithCount) => {
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("DuplicateGroup.LoadingDescription", { label: group.label }),
        title: tCommon("feedback.duplicating"),
      }),
    });

    try {
      await duplicateGroupMutation.mutateAsync({
        input: {
          color: group.color || "#1971C2",
          emoji: group.emoji || "",
          label: t("DuplicateGroup.DuplicatedName", { name: group.label }),
        },
        sourceGroupId: group.id,
      });

      notifications.update({
        ...successNotificationTemplate({
          description: t("DuplicateGroup.SuccessDescription"),
          title: tCommon("feedback.successTitle"),
        }),
        id: loadingNotification,
      });
    } catch {
      notifications.update({
        ...errorNotificationTemplate({
          description: t("DuplicateGroup.ErrorDescription"),
          title: tCommon("feedback.errorTitle"),
        }),
        id: loadingNotification,
      });
    }
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          action={
            <Button
              leftSection={<IconUsersPlus size={16} />}
              onClick={() => openAddGroupModal()}
              size="md"
            >
              {t("CreateNewGroup")}
            </Button>
          }
          helpDoc="concepts.groups"
          helpLabel={t("HeaderDescription")}
          icon={IconUsersGroup}
        />

        <Paper p="md" radius="md" shadow="sm" withBorder>
          <Stack>
            <Group justify="space-between">
              <Group gap="md">
                <Text c="dimmed" size="sm">
                  {totalCount} {totalCount === 1 ? "group" : "groups"}
                </Text>
              </Group>
              <SortMenu setSortBy={handleSortChange} sortBy={sortBy} />
            </Group>

            {sortedGroups.length > 0 ? (
              <SimpleGrid cols={{ base: 1, lg: 3, sm: 2, xl: 4 }} mt="md" spacing="md">
                {sortedGroups.map((group) => (
                  <GroupCard
                    group={group}
                    key={group.id}
                    onAddPeople={handleAddPeopleToGroup}
                    onClick={handleCardClick}
                    onDelete={handleDeleteGroup}
                    onDuplicate={handleDuplicateGroup}
                    onEdit={handleEditGroup}
                  />
                ))}
              </SimpleGrid>
            ) : (
              <Text c="dimmed" py="xl" ta="center">
                {t("Empty")}
              </Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
