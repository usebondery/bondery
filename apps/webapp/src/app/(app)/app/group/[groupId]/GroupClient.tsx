"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { Button, Paper, Stack } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconBrandLinkedin,
  IconUserPlus,
  IconUsersGroup,
  IconUsersMinus,
} from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import ContactsTable, {
  type BulkSelectionAction,
  type ColumnConfig,
  type MenuAction,
  type SortOrder,
} from "@/components/contacts/ContactsTableV2";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { usePatchDocumentTitle } from "@/lib/documentTitle";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { parseContactsListParams } from "@/lib/query/contactsListParams";
import { GROUP_CARD_PREVIEW } from "@/lib/query/groupDetailQueryParams";
import {
  useGroupDetailQuery,
  useGroupMembersInfiniteQuery,
  useGroupMembersQuery,
} from "@/lib/query/hooks/useGroups";
import { openAddPeopleToGroupModal } from "../../groups/components/AddPeopleToGroupModal";
import { GroupCard } from "../../groups/components/GroupCard";
import { useGroupDetailActions } from "./hooks/useGroupDetailActions";
import { useGroupDetailSelection } from "./hooks/useGroupDetailSelection";

interface GroupClientProps {
  groupId: string;
}

export function GroupClient({ groupId }: GroupClientProps) {
  const tGroupDetail = useWebTranslations("GroupDetailPage");
  const tPeople = useWebTranslations("PeoplePage");
  const { columnDefinitions } = useContactsTableCopy();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listFilter = parseContactsListParams({
    search: searchParams.get("search") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });
  const searchDefaultValue = listFilter.search ?? "";

  const { data: group } = useGroupDetailQuery(groupId);
  const groupLabel = group?.label ?? "";
  usePatchDocumentTitle(groupLabel || undefined);
  const groupEmoji = group?.emoji ?? "";
  const groupColor = group?.color ?? "";

  const {
    data: membersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGroupMembersInfiniteQuery(groupId, listFilter);
  const { data: previewData } = useGroupMembersQuery(groupId, GROUP_CARD_PREVIEW);

  const contacts = membersData?.pages.flatMap((page) => page.contacts) ?? [];
  const totalAvailableCount = membersData?.pages[0]?.pagination.totalCount ?? 0;
  const hasMore = hasNextPage ?? false;
  const cardPreviewContacts = previewData?.contacts ?? [];
  const groupTotalCount = previewData?.pagination.totalCount ?? totalAvailableCount;

  const {
    allSelected,
    clearSelection,
    excludedIds,
    handleSelectAll,
    handleSelectAllTotal,
    handleSelectOne,
    isAllTotalSelected,
    selectedIds,
    someSelected,
  } = useGroupDetailSelection({ contacts, totalAvailableCount });

  const {
    deleteContact,
    groupCardData,
    handleAddToGroups,
    handleBulkDelete,
    handleBulkRemoveFromGroup,
    handleDeleteGroup,
    handleDuplicateGroup,
    handleEditGroup,
    openMergeModal,
    removeFromGroup,
  } = useGroupDetailActions({
    cardPreviewContacts,
    clearSelection,
    contacts,
    excludedIds,
    groupColor,
    groupEmoji,
    groupId,
    groupLabel,
    groupTotalCount,
    isAllTotalSelected,
    listFilter,
    selectedIds,
  });

  const [columns, setColumns] = useState<ColumnConfig[]>(() => [
    {
      fixed: true,
      icon: columnDefinitions.name.icon,
      key: "name",
      label: columnDefinitions.name.label,
      visible: true,
    },
    {
      icon: columnDefinitions.headline.icon,
      key: "headline",
      label: columnDefinitions.headline.label,
      visible: true,
    },
    {
      icon: columnDefinitions.location.icon,
      key: "location",
      label: columnDefinitions.location.label,
      visible: true,
    },
    {
      icon: columnDefinitions.lastInteraction.icon,
      key: "lastInteraction",
      label: columnDefinitions.lastInteraction.label,
      visible: true,
    },
    {
      icon: <IconBrandLinkedin size={16} />,
      key: "social",
      label: columnDefinitions.social.label,
      visible: true,
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

  const deferredColumns = useDeferredValue(columns);
  const visibleColumns = deferredColumns.filter((c) => c.visible);

  const handleSortChange = (order: SortOrder) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", order);
    router.replace(`${pathname}?${params.toString()}`);
  };

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

  const handleLoadMore = () => {
    if (isFetchingNextPage || !hasMore) {
      return;
    }
    void fetchNextPage();
  };

  const bulkSelectionActions: BulkSelectionAction[] = [
    {
      icon: <IconUsersMinus size={16} />,
      key: "removeFromGroup",
      label: tGroupDetail("RemoveFromGroup"),
      onClick: () => handleBulkRemoveFromGroup(),
    },
  ];

  const menuActions: MenuAction[] = [
    {
      icon: <IconUsersMinus size={14} />,
      key: "removeFromGroup",
      label: tGroupDetail("RemoveFromGroup"),
      onClick: removeFromGroup,
    },
  ];

  const handleAddContacts = () => {
    openAddPeopleToGroupModal({
      groupId,
      groupLabel,
    });
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          action={
            <Button leftSection={<IconUserPlus size={16} />} onClick={handleAddContacts} size="md">
              {tGroupDetail("AddPeopleToGroup")}
            </Button>
          }
          backOnClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push(WEBAPP_ROUTES.GROUPS);
            }
          }}
          icon={IconUsersGroup}
        />

        <GroupCard
          group={groupCardData}
          interactive={false}
          onAddPeople={handleAddContacts}
          onClick={() => {}}
          onDelete={handleDeleteGroup}
          onDuplicate={handleDuplicateGroup}
          onEdit={handleEditGroup}
        />

        <Paper p="md" radius="md" shadow="sm" withBorder>
          <ContactsTable
            allSelected={allSelected}
            bulkSelectionActions={bulkSelectionActions}
            columnsForMenu={columns}
            contacts={contacts}
            excludedIds={excludedIds}
            hasMore={hasMore}
            isAllTotalSelected={isAllTotalSelected}
            isHeaderShown={true}
            loadMoreAction={{
              label: tPeople("LoadMoreBatch"),
              loading: isFetchingNextPage,
              onClick: handleLoadMore,
            }}
            menuActions={menuActions}
            noContactsFound={tGroupDetail("NoContactsFound")}
            noContactsMatchSearch={tGroupDetail("NoContactsMatchSearch")}
            onSearchChange={handleSearchChange}
            onSelectAll={handleSelectAll}
            onSelectAllTotal={hasMore ? handleSelectAllTotal : undefined}
            onSelectOne={handleSelectOne}
            searchDefaultValue={searchDefaultValue}
            searchLoading={isSearchPending}
            selectedIds={selectedIds}
            setColumnsForMenu={setColumns}
            setSortOrderForMenu={handleSortChange}
            showSelection={true}
            someSelected={someSelected}
            sortOrderForMenu={listFilter.sort}
            standardActions={{
              onAddToGroupsOne: (contactId) => handleAddToGroups([contactId]),
              onAddToGroupsSelected: (contactIds) => handleAddToGroups(contactIds),
              onDeleteOne: deleteContact,
              onDeleteSelected: handleBulkDelete,
              onMergeOne: (contactId) => openMergeModal(contactId),
              onMergeSelected: (leftContactId, rightContactId) =>
                openMergeModal(leftContactId, rightContactId, true),
            }}
            totalCount={totalAvailableCount}
            visibleColumns={visibleColumns}
          />
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
