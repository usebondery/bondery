"use client";

import { Text, Stack, Group, Paper, Button, Box } from "@mantine/core";
import {
  IconUsersGroup,
  IconUser,
  IconBriefcase,
  IconMapPin,
  IconClock,
  IconBrandLinkedin,
  IconUserPlus,
  IconUsersMinus,
  IconTrash,
} from "@tabler/icons-react";
import ContactsTable, {
  BulkSelectionAction,
  ColumnConfig,
  MenuAction,
  type SortOrder,
} from "@/app/(app)/app/components/contacts/ContactsTableV2";
import { useEffect, useDeferredValue, useMemo, useState, useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedCallback } from "@mantine/hooks";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { openAddPeopleToGroupModal } from "../../groups/components/AddPeopleToGroupModal";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { DEBOUNCE_MS } from "@/lib/config";
import { formatContactName } from "@/lib/nameHelpers";
import { notifications } from "@mantine/notifications";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";
import { openDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/app/(app)/app/components/contacts/openDeleteContactsModal";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";
import { GroupCard } from "../../groups/components/GroupCard";
import { openEditGroupModal } from "../../groups/components/EditGroupModal";
import type { Contact, GroupWithCount } from "@bondery/schemas";
import { openAddPeopleToGroupSelectionModal } from "../../people/components/AddPeopleToGroupSelectionModal";
import { openMergeWithModal } from "../../people/components/MergeWithModal";
import { searchContacts } from "@/lib/searchContacts";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { createGroupMembersQueryFn } from "@/lib/query/fetchers/groups";
import { groupKeys } from "@/lib/query/keys";
import {
  useDeleteGroupMutation,
  useDuplicateGroupMutation,
  useGroupMembersQuery,
  useRemoveContactsFromGroupMutation,
} from "@/lib/query/hooks/useGroups";

interface GroupDetailClientProps {
  groupId: string;
  groupLabel: string;
  groupEmoji: string;
  groupColor: string;
  initialContacts: Contact[];
  totalCount: number;
  initialSearch: string;
  initialSort: SortOrder;
  /** First 3 group members fetched without any search filter — stable across searches. */
  cardPreviewContacts: Contact[];
  /** Total group member count without any search filter — stable across searches. */
  groupTotalCount: number;
}

export function GroupDetailClient({
  groupId,
  groupLabel,
  groupEmoji,
  groupColor,
  initialContacts,
  totalCount,
  initialSearch,
  initialSort,
  cardPreviewContacts,
  groupTotalCount,
}: GroupDetailClientProps) {
  const t = useTranslations("GroupsPage");
  const tGroupDetail = useTranslations("GroupDetailPage");
  const tCommon = useTranslations("WebAppCommon");
  const tPeople = useTranslations("PeoplePage");
  const tHeader = useTranslations("PageHeader");
  const { columnDefinitions } = useContactsTableCopy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const removeContactsMutation = useRemoveContactsFromGroupMutation(groupId);
  const deleteGroupMutation = useDeleteGroupMutation();
  const duplicateGroupMutation = useDuplicateGroupMutation();

  const membersParams = useMemo(
    () => ({
      limit: 50,
      offset: 0,
      search: initialSearch || undefined,
      sort: initialSort,
    }),
    [initialSearch, initialSort],
  );

  const { data: firstPageData } = useGroupMembersQuery(groupId, membersParams);

  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalAvailableCount, setTotalAvailableCount] = useState(totalCount);
  const [hasMore, setHasMore] = useState(initialContacts.length < totalCount);
  const loadedCount = contacts.length;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllTotalSelected, setIsAllTotalSelected] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (firstPageData) {
      setContacts(firstPageData.contacts);
      setTotalAvailableCount(firstPageData.pagination.totalCount);
      setHasMore(firstPageData.pagination.hasMore);
    }
    setSelectedIds(new Set());
    setIsAllTotalSelected(false);
    setExcludedIds(new Set());
    setLastSelectedIndex(null);
  }, [firstPageData]);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => [
    {
      key: "name",
      label: columnDefinitions.name.label,
      visible: true,
      icon: columnDefinitions.name.icon,
      fixed: true,
    },
    {
      key: "headline",
      label: columnDefinitions.headline.label,
      visible: true,
      icon: columnDefinitions.headline.icon,
    },
    {
      key: "location",
      label: columnDefinitions.location.label,
      visible: true,
      icon: columnDefinitions.location.icon,
    },
    {
      key: "lastInteraction",
      label: columnDefinitions.lastInteraction.label,
      visible: true,
      icon: columnDefinitions.lastInteraction.icon,
    },
    {
      key: "social",
      label: columnDefinitions.social.label,
      visible: true,
      icon: <IconBrandLinkedin size={16} />,
    },
  ]);

  useEffect(() => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        label: columnDefinitions[col.key as keyof typeof columnDefinitions]?.label ?? col.label,
      })),
    );
  }, [columnDefinitions]);

  // Defer the columns update to prevent UI freezing
  const deferredColumns = useDeferredValue(columns);
  const visibleColumns = deferredColumns.filter((c) => c.visible);

  const handleSortChange = (order: SortOrder) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", order);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Debounced: updates the URL so the server component re-fetches with the new query.
  const [isSearchPending, startSearchTransition] = useTransition();
  const handleSearchChange = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    startSearchTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }, DEBOUNCE_MS.search);

  const fetchMoreMembers = useCallback(
    async (offset: number, limit: number) => {
      const params = {
        ...membersParams,
        offset,
        limit,
      };
      return queryClient.fetchQuery({
        queryKey: groupKeys.members(groupId, params),
        queryFn: createGroupMembersQueryFn(groupId, params),
      });
    },
    [groupId, membersParams, queryClient],
  );

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await fetchMoreMembers(loadedCount, 50);
      setContacts((prev) => {
        const existingIds = new Set(prev.map((contact) => contact.id));
        const uniqueNew = data.contacts.filter((contact) => !existingIds.has(contact.id));
        return [...prev, ...uniqueNew];
      });
      if (typeof data.pagination?.totalCount === "number" && Number.isFinite(data.pagination.totalCount)) {
        setTotalAvailableCount(data.pagination.totalCount);
      }
      setHasMore(data.pagination.hasMore);
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: tCommon("ErrorTitle"),
          description: tPeople("LoadMoreError"),
        }),
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const refillToPageSize = useCallback(
    async (remaining: Contact[], newTotal: number): Promise<Contact[]> => {
      const PAGE_SIZE = 50;
      const needed = Math.min(PAGE_SIZE - remaining.length, newTotal - remaining.length);
      if (needed <= 0) return remaining;

      try {
        const data = await fetchMoreMembers(remaining.length, needed);
        const existingIds = new Set(remaining.map((contact) => contact.id));
        const uniqueExtra = data.contacts.filter((contact) => !existingIds.has(contact.id));
        return [...remaining, ...uniqueExtra];
      } catch {
        return remaining;
      }
    },
    [fetchMoreMembers],
  );

  const applyLocalMemberRemoval = useCallback(
    async (removedCount: number, remaining: Contact[]) => {
      const newTotal = Math.max(0, totalAvailableCount - removedCount);
      const refilled = await refillToPageSize(remaining, newTotal);
      setContacts(refilled);
      setTotalAvailableCount(newTotal);
    },
    [refillToPageSize, totalAvailableCount],
  );

  const handleSelectAll = () => {
    if (isAllTotalSelected) {
      setIsAllTotalSelected(false);
      setExcludedIds(new Set());
      setSelectedIds(new Set());
      return;
    }
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string, options?: { shiftKey?: boolean; index?: number }) => {
    const currentIndex = options?.index ?? contacts.findIndex((contact) => contact.id === id);

    if (isAllTotalSelected) {
      const newExcluded = new Set(excludedIds);
      if (newExcluded.has(id)) {
        newExcluded.delete(id);
      } else {
        newExcluded.add(id);
      }
      if (newExcluded.size >= totalAvailableCount) {
        setIsAllTotalSelected(false);
        setExcludedIds(new Set());
        setSelectedIds(new Set());
      } else {
        setExcludedIds(newExcluded);
      }
      if (currentIndex >= 0) setLastSelectedIndex(currentIndex);
      return;
    }

    if (options?.shiftKey && lastSelectedIndex !== null && currentIndex >= 0) {
      const shouldSelect = !selectedIds.has(id);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = contacts.slice(start, end + 1).map((contact) => contact.id);

      const newSelected = new Set(selectedIds);

      if (shouldSelect) {
        rangeIds.forEach((rangeId) => newSelected.add(rangeId));
      } else {
        rangeIds.forEach((rangeId) => newSelected.delete(rangeId));
      }

      setSelectedIds(newSelected);
      setLastSelectedIndex(currentIndex);
      return;
    }

    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);

    if (currentIndex >= 0) {
      setLastSelectedIndex(currentIndex);
    }
  };

  const handleBulkRemoveFromGroup = async () => {
    const ids = isAllTotalSelected ? [] : Array.from(selectedIds);
    if (!isAllTotalSelected && ids.length === 0) return;

    const loadingId = notifications.show({
      ...loadingNotificationTemplate({
        title: tGroupDetail("RemoveContacts.LoadingTitle"),
        description: tGroupDetail("RemoveContacts.LoadingDescription"),
      }),
    });

    try {
      const result = isAllTotalSelected
        ? await removeContactsMutation.mutateAsync({
            memberFilter: { search: initialSearch || undefined, sort: initialSort || undefined },
            excludePersonIds: Array.from(excludedIds),
          })
        : await removeContactsMutation.mutateAsync(ids);
      const removedCount = result.removedCount ?? ids.length;

      notifications.update({
        ...successNotificationTemplate({
          title: tCommon("SuccessTitle"),
          description: tGroupDetail("RemoveContacts.SuccessDescription", {
            count: removedCount,
          }),
        }),
        id: loadingId,
      });

      setIsAllTotalSelected(false);
      setExcludedIds(new Set());
      setSelectedIds(new Set());
      const remaining = isAllTotalSelected
        ? contacts.filter((c) => excludedIds.has(c.id))
        : contacts.filter((c) => !ids.includes(c.id));
      await applyLocalMemberRemoval(removedCount, remaining);
    } catch (error) {
      console.error("Error removing contacts from group", error);
      notifications.update({
        ...errorNotificationTemplate({
          title: tCommon("ErrorTitle"),
          description: tGroupDetail("RemoveContacts.ErrorDescription"),
        }),
        id: loadingId,
      });
    }
  };

  const handleBulkDelete = (ids: string[]) => {
    if (!isAllTotalSelected && ids.length === 0) return;

    openDeleteContactsModal({
      contactIds: isAllTotalSelected ? [] : ids,
      filterPayload: isAllTotalSelected
        ? {
            filter: { search: initialSearch || undefined, sort: initialSort || undefined },
            excludeIds: Array.from(excludedIds),
          }
        : undefined,
      onDeleted: async (deletedCount?: number) => {
        const removedCount = deletedCount ?? ids.length;
        setIsAllTotalSelected(false);
        setExcludedIds(new Set());
        setSelectedIds(new Set());
        const remaining = isAllTotalSelected
          ? contacts.filter((c) => excludedIds.has(c.id))
          : contacts.filter((c) => !ids.includes(c.id));
        await applyLocalMemberRemoval(removedCount, remaining);
      },
    });
  };

  const removeFromGroup = async (contactId: string) => {
    const loadingId = notifications.show({
      ...loadingNotificationTemplate({
        title: tGroupDetail("RemoveContact.LoadingTitle"),
        description: tGroupDetail("RemoveContact.LoadingDescription"),
      }),
    });

    try {
      await removeContactsMutation.mutateAsync([contactId]);

      notifications.update({
        ...successNotificationTemplate({
          title: tCommon("SuccessTitle"),
          description: tGroupDetail("RemoveContact.SuccessDescription"),
        }),
        id: loadingId,
      });

      const remaining = contacts.filter((c) => c.id !== contactId);
      await applyLocalMemberRemoval(1, remaining);
    } catch (error) {
      console.error("Error removing contact from group", error);
      notifications.update({
        ...errorNotificationTemplate({
          title: tCommon("ErrorTitle"),
          description: tGroupDetail("RemoveContact.ErrorDescription"),
        }),
        id: loadingId,
      });
    }
  };

  const deleteContact = (contactId: string) => {
    const targetContact = contacts.find((contact) => contact.id === contactId);
    const contactName = targetContact ? formatContactName(targetContact) : tGroupDetail("ThisContactFallback");

    openDeleteContactModal({
      contactId,
      contactName,
      onDeleted: async () => {
        const remaining = contacts.filter((c) => c.id !== contactId);
        await applyLocalMemberRemoval(1, remaining);
      },
    });
  };

  const handleAddToGroups = (personIds: string[]) => {
    if (personIds.length === 0) {
      return;
    }

    openAddPeopleToGroupSelectionModal({ personIds });
  };

  const openMergeModal = (leftPersonId: string, rightPersonId?: string, lockBoth?: boolean) => {
    openMergeWithModal({
      contacts,
      leftPersonId,
      rightPersonId,
      disableLeftPicker: true,
      disableRightPicker: Boolean(lockBoth),
      onSearch: searchContacts,
    });
  };

  /** Instant: flip the sentinel flag — no network call. */
  const handleSelectAllTotal = () => {
    setIsAllTotalSelected(true);
    setExcludedIds(new Set());
  };

  // Computed selection values
  const allSelected = isAllTotalSelected
    ? contacts.length > 0 && contacts.every((c) => !excludedIds.has(c.id))
    : contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));
  const someSelected = isAllTotalSelected
    ? !allSelected && excludedIds.size < totalAvailableCount
    : !allSelected && selectedIds.size > 0;

  const bulkSelectionActions: BulkSelectionAction[] = [
    {
      key: "removeFromGroup",
      label: tGroupDetail("RemoveFromGroup"),
      icon: <IconUsersMinus size={16} />,
      onClick: () => handleBulkRemoveFromGroup(),
    },
  ];

  const menuActions: MenuAction[] = [
    {
      key: "removeFromGroup",
      label: tGroupDetail("RemoveFromGroup"),
      icon: <IconUsersMinus size={14} />,
      onClick: removeFromGroup,
    },
  ];

  const handleAddContacts = () => {
    openAddPeopleToGroupModal({
      groupId,
      groupLabel,
    });
  };

  const groupCardData = useMemo<GroupWithCount>(
    () => ({
      id: groupId,
      userId: "",
      label: groupLabel,
      emoji: groupEmoji || "👥",
      color: groupColor || "blue",
      createdAt: "",
      updatedAt: "",
      contactCount: groupTotalCount,
      previewContacts: cardPreviewContacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        avatar: contact.avatar,
      })),
    }),
    [groupColor, groupEmoji, groupId, groupLabel, cardPreviewContacts, groupTotalCount],
  );

  const handleEditGroup = (group: GroupWithCount) => {
    openEditGroupModal({
      groupId: group.id,
      initialLabel: group.label,
      initialEmoji: group.emoji || "",
      initialColor: group.color || "",
    });
  };

  const handleDeleteGroup = (targetGroupId: string) => {
    openStandardConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteGroup.Title")}
          icon={<IconTrash size={20} />}
          isDangerous={true}
        />
      ),
      message: (
        <Text size="sm">{t("DeleteGroup.Message", { label: groupLabel })}</Text>
      ),
      confirmLabel: tCommon("Delete"),
      cancelLabel: tCommon("Cancel"),
      confirmColor: "red",
      onConfirm: async () => {
        const loadingNotification = notifications.show({
          ...loadingNotificationTemplate({
            title: tCommon("Deleting"),
            description: t("DeleteGroup.LoadingDescription", { label: groupLabel }),
          }),
        });

        try {
          await deleteGroupMutation.mutateAsync(targetGroupId);

          notifications.update({
            ...successNotificationTemplate({
              title: tCommon("SuccessTitle"),
              description: t("DeleteGroup.SuccessDescription"),
            }),
            id: loadingNotification,
          });

          router.push(WEBAPP_ROUTES.GROUPS);
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
          title={tGroupDetail("DetailPageTitle")}
          backOnClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push(WEBAPP_ROUTES.GROUPS);
            }
          }}
          action={
            <Button size="md" leftSection={<IconUserPlus size={16} />} onClick={handleAddContacts}>
              {tGroupDetail("AddPeopleToGroup")}
            </Button>
          }
        />

        <GroupCard
          group={groupCardData}
          onClick={() => {}}
          onAddPeople={handleAddContacts}
          onEdit={handleEditGroup}
          onDuplicate={handleDuplicateGroup}
          onDelete={handleDeleteGroup}
          interactive={false}
        />

        <Paper withBorder shadow="sm" radius="md" p="md">
          <ContactsTable
            contacts={contacts}
            selectedIds={selectedIds}
            isHeaderShown={true}
            searchDefaultValue={initialSearch}
            onSearchChange={handleSearchChange}
            searchLoading={isSearchPending}
            noContactsFound={tGroupDetail("NoContactsFound")}
            noContactsMatchSearch={tGroupDetail("NoContactsMatchSearch")}
            columnsForMenu={columns}
            setColumnsForMenu={setColumns}
            sortOrderForMenu={initialSort}
            setSortOrderForMenu={handleSortChange}
            visibleColumns={visibleColumns}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            allSelected={allSelected}
            someSelected={someSelected}
            showSelection={true}
            standardActions={{
              onMergeOne: (contactId) => openMergeModal(contactId),
              onMergeSelected: (leftContactId, rightContactId) =>
                openMergeModal(leftContactId, rightContactId, true),
              onAddToGroupsOne: (contactId) => handleAddToGroups([contactId]),
              onAddToGroupsSelected: (contactIds) => handleAddToGroups(contactIds),
              onDeleteOne: deleteContact,
              onDeleteSelected: handleBulkDelete,
            }}
            menuActions={menuActions}
            bulkSelectionActions={bulkSelectionActions}
            loadMoreAction={{
              label: "Load another 50 contacts",
              onClick: handleLoadMore,
              loading: isLoadingMore,
            }}
            hasMore={hasMore}
            totalCount={totalAvailableCount}
            onSelectAllTotal={hasMore ? handleSelectAllTotal : undefined}
            isAllTotalSelected={isAllTotalSelected}
            excludedIds={excludedIds}
          />
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
