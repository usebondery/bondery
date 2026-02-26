"use client";

import { Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "../modals/openStandardConfirmModal";

interface OpenDeleteContactsModalParams {
  contactIds: string[];
  onDeleted?: () => Promise<void> | void;
}

/**
 * Opens a standardized confirmation modal and deletes multiple contacts.
 */
export function openDeleteContactsModal({
  contactIds,
  onDeleted,
}: OpenDeleteContactsModalParams): void {
  if (contactIds.length === 0) {
    return;
  }

  const count = contactIds.length;

  openStandardConfirmModal({
    title: (
      <ModalTitle
        text={`Delete ${count} contact${count === 1 ? "" : "s"}?`}
        icon={<IconAlertCircle size={24} />}
        isDangerous={true}
      />
    ),
    message: (
      <Text size="sm">
        Are you sure you want to delete <strong>{count}</strong> selected contact
        {count === 1 ? "" : "s"}? This action cannot be undone.
      </Text>
    ),
    confirmLabel: "Yes, delete",
    cancelLabel: "No, cancel",
    confirmColor: "red",
    confirmLeftSection: <IconTrash size={16} />,
    onConfirm: async () => {
      const loadingNotification = notifications.show({
        ...loadingNotificationTemplate({
          title: "Deleting contacts...",
          description: "Please wait while we delete selected contacts",
        }),
      });

      try {
        const response = await fetch(API_ROUTES.CONTACTS, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: contactIds }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete contacts");
        }

        notifications.hide(loadingNotification);
        notifications.show(
          successNotificationTemplate({
            title: "Success",
            description: `${count} contact(s) deleted successfully`,
          }),
        );

        await onDeleted?.();
      } catch {
        notifications.hide(loadingNotification);
        notifications.show(
          errorNotificationTemplate({
            title: "Error",
            description: "Failed to delete contacts. Please try again.",
          }),
        );
      }
    },
  });
}
