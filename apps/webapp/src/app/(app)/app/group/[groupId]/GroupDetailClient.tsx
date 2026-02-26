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
} from "@/app/(app)/app/components/ContactsTable";
import { type SortOrder } from "@/app/(app)/app/components/contacts/SortMenu";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import type { Contact } from "@bondery/types";
import { useDeferredValue, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@mantine/hooks";
import { useTranslations } from "next-intl";
import { openAddPeopleToGroupModal } from "../../groups/components/AddPeopleToGroupModal";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
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
import type { GroupWithCount, MergeConflictField } from "@bondery/types";
import { openAddPeopleToGroupSelectionModal } from "../../people/components/AddPeopleToGroupSelectionModal";
import { MERGE_CONFLICT_FIELDS, openMergeWithModal } from "../../people/components/MergeWithModal";

interface GroupDetailClientProps {
  groupId: string;
  groupLabel: string;
  initialContacts: Contact[];
  totalCount: number;
}

export function GroupDetailClient({
  groupId,
  groupLabel,
  initialContacts,
  totalCount,
}: GroupDetailClientProps) {
  const t = useTranslations("GroupsPage");
  const tMerge = useTranslations("MergeWithModal");
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
  const initialSearch = searchParams.get("q") || "";
  const sortParam = searchParams.get("sort") as SortOrder | null;
  const sortOrder: SortOrder =
    sortParam === "nameAsc" ||
    sortParam === "nameDesc" ||
    sortParam === "surnameAsc" ||
    sortParam === "surnameDesc" ||
    sortParam === "interactionAsc" ||
    sortParam === "interactionDesc"
      ? sortParam
      : "nameAsc";
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    {
      key: "name",
      label: "Name",
      visible: true,
      icon: <IconUser size={16} />,
      fixed: true,
    },
    {
      key: "title",
      label: "Title",
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

  const handleSearch = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  const filteredAndSortedContacts = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();
    const filtered = normalizedQuery
      ? initialContacts.filter((contact) =>
          formatContactName(contact).toLowerCase().includes(normalizedQuery),
        )
      : initialContacts;

    const nameValue = (contact: Contact) => formatContactName(contact).toLowerCase();
    const surnameValue = (contact: Contact) => contact.lastName?.toLowerCase() || "";
    const interactionValue = (contact: Contact): number | null => {
      if (!contact.lastInteraction) return null;
      return typeof contact.lastInteraction === "string"
        ? new Date(contact.lastInteraction).getTime()
        : new Date(contact.lastInteraction).getTime();
    };

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "nameDesc":
          return nameValue(b).localeCompare(nameValue(a));
        case "surnameAsc":
          return (
            surnameValue(a).localeCompare(surnameValue(b)) ||
            nameValue(a).localeCompare(nameValue(b))
          );
        case "surnameDesc":
          return (
            surnameValue(b).localeCompare(surnameValue(a)) ||
            nameValue(b).localeCompare(nameValue(a))
          );
        case "interactionAsc": {
          const aVal = interactionValue(a) ?? Infinity;
          const bVal = interactionValue(b) ?? Infinity;
          return aVal - bVal;
        }
        case "interactionDesc": {
          const aVal = interactionValue(a) ?? -Infinity;
          const bVal = interactionValue(b) ?? -Infinity;
          return bVal - aVal;
        }
        case "nameAsc":
        default:
          return nameValue(a).localeCompare(nameValue(b));
      }
    });

    return sorted;
  }, [initialContacts, searchValue, sortOrder]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedContacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string, options?: { shiftKey?: boolean; index?: number }) => {
    const currentIndex =
      options?.index ?? filteredAndSortedContacts.findIndex((contact) => contact.id === id);

    if (options?.shiftKey && lastSelectedIndex !== null && currentIndex >= 0) {
      const shouldSelect = !selectedIds.has(id);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = filteredAndSortedContacts.slice(start, end + 1).map((contact) => contact.id);

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
    const targetContact = initialContacts.find((contact) => contact.id === contactId);
    const contactName = targetContact ? formatContactName(targetContact) : "this contact";

    openDeleteContactModal({
      contactId,
      contactName,
      onDeleted: async () => {
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
      contacts: initialContacts,
      leftPersonId,
      rightPersonId,
      disableLeftPicker: true,
      disableRightPicker: Boolean(lockBoth),
      titleText: tMerge("ModalTitle"),
      texts: mergeTexts,
    });
  };

  // Computed selection values
  const allSelected =
    filteredAndSortedContacts.length > 0 && selectedIds.size === filteredAndSortedContacts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredAndSortedContacts.length;

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
      emoji: "👥",
      color: "",
      createdAt: "",
      updatedAt: "",
      contactCount: totalCount,
      previewContacts: initialContacts.slice(0, 3).map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        avatar: contact.avatar,
      })),
    }),
    [groupId, groupLabel, initialContacts, totalCount],
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
      const personIds = initialContacts.map((contact) => contact.id);

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
          title="Group"
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
            contacts={filteredAndSortedContacts}
            selectedIds={selectedIds}
            isHeaderShown={true}
            searchValue={searchValue}
            onSearchChange={(value) => {
              setSearchValue(value);
              handleSearch(value);
            }}
            columnsForMenu={columns}
            setColumnsForMenu={setColumns}
            sortOrderForMenu={sortOrder}
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
          />
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
