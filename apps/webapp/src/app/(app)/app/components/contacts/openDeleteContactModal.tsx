"use client";

import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";

interface OpenDeleteContactModalParams {
  contactId: string;
  contactName: string;
  onDeleted?: () => Promise<void> | void;
}

/**
 * Opens a standardized confirmation modal and deletes a single contact.
 *
 * This keeps delete UX and behavior consistent between ContactsTable-based views
 * and the single-person detail view.
 */
export function openDeleteContactModal({
  contactId,
  contactName,
  onDeleted,
}: OpenDeleteContactModalParams): void {
  modals.openConfirmModal({
    title: (
      <ModalTitle
        text={`Delete ${contactName}?`}
        icon={<IconAlertCircle size={24} />}
        isDangerous={true}
      />
    ),
    children: (
      <Text size="sm">
        Are you sure you want to delete <strong>{contactName}</strong>? This person&apos;s data,
        mentions, and related information will be deleted. And this action cannot be restored.
      </Text>
    ),
    labels: { confirm: "Yes, delete", cancel: "No, cancel" },
    confirmProps: { color: "red", leftSection: <IconTrash size={16} /> },
    onConfirm: async () => {
      const loadingNotification = notifications.show({
        ...loadingNotificationTemplate({
          title: "Deleting contact...",
          description: "Please wait while we delete this contact",
        }),
      });

      try {
        const response = await fetch(API_ROUTES.CONTACTS, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [contactId] }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete contact");
        }

        notifications.hide(loadingNotification);
        notifications.show(
          successNotificationTemplate({
            title: "Success",
            description: "Contact deleted successfully",
          }),
        );

        await onDeleted?.();
      } catch {
        notifications.hide(loadingNotification);
        notifications.show(
          errorNotificationTemplate({
            title: "Error",
            description: "Failed to delete contact. Please try again.",
          }),
        );
      }
    },
  });
}
