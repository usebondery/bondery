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
import { useEffect, useDeferredValue, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@mantine/hooks";
import { useTranslations } from "next-intl";
import { openAddPeopleToGroupModal } from "../../groups/components/AddPeopleToGroupModal";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { WEBSITE_URL } from "@/lib/config";
import { formatContactName } from "@/lib/nameHelpers";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { notifications } from "@mantine/notifications";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";
import { revalidateContacts, revalidateGroups } from "../../actions";
import { openDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/app/(app)/app/components/contacts/openDeleteContactsModal";
import { GroupCard } from "../../groups/components/GroupCard";
import { openEditGroupModal } from "../../groups/components/EditGroupModal";
import type { Contact, GroupWithCount, MergeConflictField } from "@bondery/types";
import { openAddPeopleToGroupSelectionModal } from "../../people/components/AddPeopleToGroupSelectionModal";
import { MERGE_CONFLICT_FIELDS, openMergeWithModal } from "../../people/components/MergeWithModal";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";

interface GroupDetailClientProps {
  groupId: string;
  groupLabel: string;
  groupEmoji: string;
  groupColor: string;
  initialContacts: Contact[];
  totalCount: number;
  initialSearch: string;
  initialSort: SortOrder;
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
}: GroupDetailClientProps) {
  const t = useTranslations("GroupsPage");
  const tGroupDetail = useTranslations("GroupDetailPage");
  const tMerge = useTranslations("MergeWithModal");
  const tHeader = useTranslations("PageHeader");
  const mergeTexts = useMemo(
    () => ({
      errorTitle: tMerge("ErrorTitle"),
      successTitle: tMerge("SuccessTitle"),
      selectBothPeopleError: tMerge("SelectBothPeopleError"),
      differentPeopleError: tMerge("DifferentPeopleError"),
      mergingTitle: tMerge("MergingTitle"),
      mergingDescription: tMerge("MergingDescription"),
      mergeSuccess: tMerge("MergeSuccess"),
      mergeFailed: tMerge("MergeFailed"),
      mergeWithLabel: tMerge("MergeWithLabel"),
      selectLeftPerson: tMerge("SelectLeftPerson"),
      selectRightPerson: tMerge("SelectRightPerson"),
      searchPeople: tMerge("SearchPeople"),
      noPeopleFound: tMerge("NoPeopleFound"),
      cancel: tMerge("Cancel"),
      continue: tMerge("Continue"),
      back: tMerge("Back"),
      merge: tMerge("Merge"),
      noConflicts: tMerge("NoConflicts"),
      conflictHint: tMerge("ConflictHint"),
      processing: tMerge("Processing"),
      steps: {
        pick: tMerge("Steps.Pick"),
        resolve: tMerge("Steps.Resolve"),
        process: tMerge("Steps.Process"),
      },
      fields: Object.fromEntries(
        MERGE_CONFLICT_FIELDS.map((field) => [field, tMerge(`Fields.${field}`)]),
      ) as Record<MergeConflictField, string>,
    }),
    [tMerge],
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(initialContacts.length);
  const [totalAvailableCount, setTotalAvailableCount] = useState(totalCount);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setContacts(initialContacts);
    setLoadedCount(initialContacts.length);
    setTotalAvailableCount(totalCount);
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, [initialContacts, totalCount]);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    {
      key: "name",
      label: "Name",
      visible: true,
      icon: <IconUser size={16} />,
      fixed: true,
    },
    {
      key: "headline",
      label: "Headline",
      visible: true,
      icon: <IconBriefcase size={16} />,
    },
    {
      key: "place",
      label: "Location",
      visible: true,
      icon: <IconMapPin size={16} />,
    },
    {
      key: "lastInteraction",
      label: "Last Interaction",
      visible: true,
      icon: <IconClock size={16} />,
    },
    {
      key: "social",
      label: "Social Media",
      visible: true,
      icon: <IconBrandLinkedin size={16} />,
    },
  ]);

  // Defer the columns update to prevent UI freezing
  const deferredColumns = useDeferredValue(columns);
  const visibleColumns = deferredColumns.filter((c) => c.visible);

  const handleSortChange = (order: SortOrder) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", order);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Debounced: updates the URL so the server component re-fetches with the new query.
  const handleSearchChange = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("offset", String(loadedCount));
      if (initialSearch) params.set("q", initialSearch);
      if (initialSort) params.set("sort", initialSort);

      const response = await fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load more contacts");

      const data = await response.json();
      const fetchedContacts = ((data.contacts || []) as Contact[]).map((c) => ({
        ...c,
        lastInteraction: c.lastInteraction ? new Date(c.lastInteraction) : null,
        createdAt: c.createdAt ? new Date(c.createdAt) : null,
      }));

      setContacts((prev) => [...prev, ...fetchedContacts]);
      setLoadedCount((prev) => prev + fetchedContacts.length);
      if (Number.isFinite(data.totalCount)) {
        setTotalAvailableCount(data.totalCount);
      }
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to load more contacts. Please try again.",
        }),
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string, options?: { shiftKey?: boolean; index?: number }) => {
    const currentIndex = options?.index ?? contacts.findIndex((contact) => contact.id === id);

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
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const loadingId = notifications.show({
      ...loadingNotificationTemplate({
        title: "Removing contacts",
        description: "Updating group members...",
      }),
    });

    try {
      const res = await fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: ids }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove contacts from group");
      }

      notifications.update({
        ...successNotificationTemplate({
          title: "Success",
          description: `${ids.length} contact(s) removed from group successfully`,
        }),
        id: loadingId,
      });

      setSelectedIds(new Set());
      setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
      setLoadedCount((prev) => Math.max(0, prev - ids.length));
      setTotalAvailableCount((prev) => Math.max(0, prev - ids.length));
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      console.error("Error removing contacts from group", error);
      notifications.update({
        ...errorNotificationTemplate({
          title: "Error",
          description: "Could not remove contacts from group. Please try again.",
        }),
        id: loadingId,
      });
    }
  };

  const handleBulkDelete = (ids: string[]) => {
    if (ids.length === 0) return;

    openDeleteContactsModal({
      contactIds: ids,
      onDeleted: async () => {
        setSelectedIds(new Set());
        setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
        setLoadedCount((prev) => Math.max(0, prev - ids.length));
        setTotalAvailableCount((prev) => Math.max(0, prev - ids.length));
        await revalidateContacts();
        await revalidateGroups();
        router.refresh();
      },
    });
  };

  const removeFromGroup = async (contactId: string) => {
    const loadingId = notifications.show({
      ...loadingNotificationTemplate({
        title: "Removing contact",
        description: "Updating group members...",
      }),
    });

    try {
      const res = await fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: [contactId] }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove contact from group");
      }

      notifications.update({
        ...successNotificationTemplate({
          title: "Success",
          description: "Contact removed from group successfully",
        }),
        id: loadingId,
      });

      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      setLoadedCount((prev) => Math.max(0, prev - 1));
      setTotalAvailableCount((prev) => Math.max(0, prev - 1));
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      console.error("Error removing contact from group", error);
      notifications.update({
        ...errorNotificationTemplate({
          title: "Error",
          description: "Could not remove contact from group. Please try again.",
        }),
        id: loadingId,
      });
    }
  };

  const deleteContact = (contactId: string) => {
    const targetContact = contacts.find((contact) => contact.id === contactId);
    const contactName = targetContact ? formatContactName(targetContact) : "this contact";

    openDeleteContactModal({
      contactId,
      contactName,
      onDeleted: async () => {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        setLoadedCount((prev) => Math.max(0, prev - 1));
        setTotalAvailableCount((prev) => Math.max(0, prev - 1));
        await revalidateContacts();
        await revalidateGroups();
        router.refresh();
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
      titleText: tMerge("ModalTitle"),
      texts: mergeTexts,
    });
  };

  // Computed selection values
  const allSelected = contacts.length > 0 && selectedIds.size === contacts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < contacts.length;

  const bulkSelectionActions: BulkSelectionAction[] = [
    {
      key: "removeFromGroup",
      label: "Remove from group",
      icon: <IconUsersMinus size={16} />,
      onClick: () => handleBulkRemoveFromGroup(),
    },
  ];

  const menuActions: MenuAction[] = [
    {
      key: "removeFromGroup",
      label: "Remove from group",
      icon: <IconUsersMinus size={14} />,
      onClick: removeFromGroup,
    },
  ];

  const handleAddContacts = () => {
    openAddPeopleToGroupModal({
      groupId,
      groupLabel,
      texts: {
        title: t("AddPeopleModal.Title", { groupLabel }),
        errorTitle: t("AddPeopleModal.ErrorTitle"),
        successTitle: t("AddPeopleModal.SuccessTitle"),
        loadError: t("AddPeopleModal.LoadError"),
        noSelectionTitle: t("AddPeopleModal.NoSelectionTitle"),
        noSelectionDescription: t("AddPeopleModal.NoSelectionDescription"),
        addingTitle: t("AddPeopleModal.AddingTitle"),
        addingDescription: t("AddPeopleModal.AddingDescription"),
        addError: t("AddPeopleModal.AddError"),
        emptyState: t("AddPeopleModal.EmptyState"),
        close: t("AddPeopleModal.Close"),
        cancel: t("AddPeopleModal.Cancel"),
        addContactsPlaceholder: t("AddPeopleModal.AddContactsPlaceholder"),
        noContactsFound: t("AddPeopleModal.NoContactsFound"),
        formatActionLabel: (count: number) =>
          count === 0
            ? t("AddPeopleModal.ActionDefault")
            : count === 1
              ? t("AddPeopleModal.ActionSingular")
              : t("AddPeopleModal.ActionPlural", { count }),
        formatSuccessMessage: (count: number, targetGroupLabel: string) =>
          count === 1
            ? t("AddPeopleModal.SuccessMessageSingular", { groupLabel: targetGroupLabel })
            : t("AddPeopleModal.SuccessMessagePlural", {
                count,
                groupLabel: targetGroupLabel,
              }),
      },
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
      contactCount: totalAvailableCount,
      previewContacts: contacts.slice(0, 3).map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        avatar: contact.avatar,
      })),
    }),
    [groupColor, groupEmoji, groupId, groupLabel, contacts, totalAvailableCount],
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
      title: <ModalTitle text="Delete group?" icon={<IconTrash size={20} />} isDangerous={true} />,
      message: (
        <Text size="sm">
          Are you sure you want to delete "{groupLabel}"? This action cannot be undone. The contacts
          in this group will not be deleted.
        </Text>
      ),
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      confirmColor: "red",
      onConfirm: async () => {
        const loadingNotification = notifications.show({
          ...loadingNotificationTemplate({
            title: "Deleting...",
            description: `Deleting group "${groupLabel}"`,
          }),
        });

        try {
          const res = await fetch(`${API_ROUTES.GROUPS}/${targetGroupId}`, {
            method: "DELETE",
          });

          if (!res.ok) throw new Error("Failed to delete group");

          notifications.update({
            ...successNotificationTemplate({
              title: "Success",
              description: "Group deleted successfully",
            }),
            id: loadingNotification,
          });

          await revalidateGroups();
          router.push(WEBAPP_ROUTES.GROUPS);
        } catch (error) {
          console.error("Error deleting group:", error);
          notifications.update({
            ...errorNotificationTemplate({
              title: "Error",
              description: "Failed to delete group. Please try again.",
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
        title: "Duplicating...",
        description: `Duplicating group "${group.label}"`,
      }),
    });

    try {
      const duplicateLabel = `${group.label} (Copy)`;

      // Fetch all member IDs from the API (no limit) to ensure we capture every member,
      // not just the currently loaded page.
      const allMembersRes = await fetch(`${API_ROUTES.GROUPS}/${group.id}/contacts`);
      const allMembersData = allMembersRes.ok ? await allMembersRes.json() : { contacts: [] };
      const personIds = ((allMembersData.contacts || []) as { id: string }[]).map((c) => c.id);

      const res = await fetch(API_ROUTES.GROUPS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: duplicateLabel,
          emoji: group.emoji || "",
          color: group.color || "",
        }),
      });

      if (!res.ok) throw new Error("Failed to duplicate group");

      const createdGroupPayload = (await res.json()) as { id?: string };
      if (!createdGroupPayload.id) throw new Error("Failed to parse duplicated group id");

      if (personIds.length > 0) {
        const membershipRes = await fetch(
          `${API_ROUTES.GROUPS}/${createdGroupPayload.id}/contacts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ personIds }),
          },
        );

        if (!membershipRes.ok) throw new Error("Failed to duplicate group members");
      }

      notifications.update({
        ...successNotificationTemplate({
          title: "Success",
          description: "Group duplicated successfully",
        }),
        id: loadingNotification,
      });

      await revalidateGroups();
      router.refresh();
    } catch (error) {
      console.error("Error duplicating group:", error);
      notifications.update({
        ...errorNotificationTemplate({
          title: "Error",
          description: "Failed to duplicate group. Please try again.",
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
          title={"Group's details"}
          backHref={WEBAPP_ROUTES.GROUPS}
          action={
            <Button size="md" leftSection={<IconUserPlus size={16} />} onClick={handleAddContacts}>
              Add people to group
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
            hasMoreToLoad={contacts.length < totalAvailableCount}
          />
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
