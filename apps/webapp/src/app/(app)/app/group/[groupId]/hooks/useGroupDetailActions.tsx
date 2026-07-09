"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact, GroupWithCount } from "@bondery/schemas";
import { Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { openDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/app/(app)/app/components/contacts/openDeleteContactsModal";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import type { ContactsListFilterParams } from "@/lib/query/contactsListParams";
import {
  useDeleteGroupMutation,
  useDuplicateGroupMutation,
  useRemoveContactsFromGroupMutation,
} from "@/lib/query/hooks/useGroups";
import { openEditGroupModal } from "../../groups/components/EditGroupModal";
import { openAddPeopleToGroupSelectionModal } from "../../people/components/AddPeopleToGroupSelectionModal";
import { openMergeWithModal } from "../../people/components/MergeWithModal";

interface UseGroupDetailActionsParams {
  cardPreviewContacts: Contact[];
  clearSelection: () => void;
  contacts: Contact[];
  excludedIds: Set<string>;
  groupColor: string;
  groupEmoji: string;
  groupId: string;
  groupLabel: string;
  groupTotalCount: number;
  isAllTotalSelected: boolean;
  listFilter: ContactsListFilterParams;
  selectedIds: Set<string>;
}

export function useGroupDetailActions({
  groupId,
  groupLabel,
  groupEmoji,
  groupColor,
  groupTotalCount,
  cardPreviewContacts,
  contacts,
  selectedIds,
  isAllTotalSelected,
  excludedIds,
  listFilter,
  clearSelection,
}: UseGroupDetailActionsParams) {
  const t = useWebTranslations("GroupsPage");
  const tGroupDetail = useWebTranslations("GroupDetailPage");
  const tCommon = useCommonTranslations();
  const router = useRouter();

  const removeContactsMutation = useRemoveContactsFromGroupMutation(groupId);
  const deleteGroupMutation = useDeleteGroupMutation();
  const duplicateGroupMutation = useDuplicateGroupMutation();

  const handleBulkRemoveFromGroup = async () => {
    const ids = isAllTotalSelected ? [] : Array.from(selectedIds);
    if (!isAllTotalSelected && ids.length === 0) {
      return;
    }

    const loadingId = notifications.show({
      ...loadingNotificationTemplate({
        description: tGroupDetail("RemoveContacts.LoadingDescription"),
        title: tGroupDetail("RemoveContacts.LoadingTitle"),
      }),
    });

    try {
      const result = isAllTotalSelected
        ? await removeContactsMutation.mutateAsync({
            excludePersonIds: Array.from(excludedIds),
            memberFilter: { search: listFilter.search, sort: listFilter.sort },
          })
        : await removeContactsMutation.mutateAsync(ids);
      const removedCount = result.removedCount ?? ids.length;

      notifications.update({
        ...successNotificationTemplate({
          description: tGroupDetail("RemoveContacts.SuccessDescription", {
            count: removedCount,
          }),
          title: tCommon("feedback.successTitle"),
        }),
        id: loadingId,
      });

      clearSelection();
    } catch {
      notifications.update({
        ...errorNotificationTemplate({
          description: tGroupDetail("RemoveContacts.ErrorDescription"),
          title: tCommon("feedback.errorTitle"),
        }),
        id: loadingId,
      });
    }
  };

  const handleBulkDelete = (ids: string[]) => {
    if (!isAllTotalSelected && ids.length === 0) {
      return;
    }

    openDeleteContactsModal({
      contactIds: isAllTotalSelected ? [] : ids,
      filterPayload: isAllTotalSelected
        ? {
            excludeIds: Array.from(excludedIds),
            filter: { search: listFilter.search, sort: listFilter.sort },
          }
        : undefined,
      onDeleted: clearSelection,
    });
  };

  const removeFromGroup = async (contactId: string) => {
    const loadingId = notifications.show({
      ...loadingNotificationTemplate({
        description: tGroupDetail("RemoveContact.LoadingDescription"),
        title: tGroupDetail("RemoveContact.LoadingTitle"),
      }),
    });

    try {
      await removeContactsMutation.mutateAsync([contactId]);

      notifications.update({
        ...successNotificationTemplate({
          description: tGroupDetail("RemoveContact.SuccessDescription"),
          title: tCommon("feedback.successTitle"),
        }),
        id: loadingId,
      });

      clearSelection();
    } catch {
      notifications.update({
        ...errorNotificationTemplate({
          description: tGroupDetail("RemoveContact.ErrorDescription"),
          title: tCommon("feedback.errorTitle"),
        }),
        id: loadingId,
      });
    }
  };

  const deleteContact = (contactId: string) => {
    const targetContact = contacts.find((contact) => contact.id === contactId);
    const contactName = targetContact
      ? formatContactName(targetContact)
      : tGroupDetail("ThisContactFallback");

    openDeleteContactModal({
      contactId,
      contactName,
      onDeleted: clearSelection,
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
      disableLeftPicker: true,
      disableRightPicker: Boolean(lockBoth),
      leftPersonId,
      onSearch: searchContacts,
      rightPersonId,
    });
  };

  const groupCardData = useMemo<GroupWithCount>(
    () => ({
      color: groupColor || "blue",
      contactCount: groupTotalCount,
      createdAt: "",
      emoji: groupEmoji || "👥",
      id: groupId,
      label: groupLabel,
      previewContacts: cardPreviewContacts.map((contact) => ({
        avatar: contact.avatar,
        firstName: contact.firstName,
        id: contact.id,
        lastName: contact.lastName,
      })),
      updatedAt: "",
      userId: "",
    }),
    [groupColor, groupEmoji, groupId, groupLabel, cardPreviewContacts, groupTotalCount],
  );

  const handleEditGroup = (group: GroupWithCount) => {
    openEditGroupModal({
      groupId: group.id,
      initialColor: group.color || "",
      initialEmoji: group.emoji || "",
      initialLabel: group.label,
    });
  };

  const handleDeleteGroup = (targetGroupId: string) => {
    openStandardConfirmModal({
      cancelLabel: tCommon("actions.cancel"),
      confirmColor: "red",
      confirmLabel: tCommon("actions.delete"),
      message: <Text size="sm">{t("DeleteGroup.Message", { label: groupLabel })}</Text>,
      onConfirm: async () => {
        const loadingNotification = notifications.show({
          ...loadingNotificationTemplate({
            description: t("DeleteGroup.LoadingDescription", {
              label: groupLabel,
            }),
            title: tCommon("feedback.deleting"),
          }),
        });

        try {
          await deleteGroupMutation.mutateAsync(targetGroupId);

          notifications.update({
            ...successNotificationTemplate({
              description: t("DeleteGroup.SuccessDescription"),
              title: tCommon("feedback.successTitle"),
            }),
            id: loadingNotification,
          });

          router.push(WEBAPP_ROUTES.GROUPS);
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
        description: t("DuplicateGroup.LoadingDescription", {
          label: group.label,
        }),
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

  return {
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
  };
}
