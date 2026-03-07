"use client";

import { Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ContactsFilter } from "@bondery/types";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "../modals/openStandardConfirmModal";

export interface OpenDeleteContactsModalParams {
  /** Explicit IDs when not using filter mode. */
  contactIds: string[];
  /** When set, the API receives a filter-based payload instead of explicit IDs. */
  filterPayload?: { filter: ContactsFilter; excludeIds?: string[] };
  /** Called after the delete succeeds. `deletedCount` is provided when the API returns it. */
  onDeleted?: (deletedCount?: number) => Promise<void> | void;
}

/**
 * Opens a standardized confirmation modal and deletes multiple contacts.
 * Supports both explicit-ID and filter-based bulk deletion.
 */
export function openDeleteContactsModal({
  contactIds,
  filterPayload,
  onDeleted,
}: OpenDeleteContactsModalParams): void {
  const isFilterMode = !!filterPayload;
  if (!isFilterMode && contactIds.length === 0) {
    return;
  }

  const countLabel = isFilterMode ? "all matching" : String(contactIds.length);

  openStandardConfirmModal({
    title: (
      <ModalTitle
        text={`Delete ${countLabel} contact${!isFilterMode && contactIds.length === 1 ? "" : "s"}?`}
        icon={<IconAlertCircle size={24} />}
        isDangerous={true}
      />
    ),
    message: (
      <Text size="sm">
        Are you sure you want to delete <strong>{countLabel}</strong> selected contact
        {!isFilterMode && contactIds.length === 1 ? "" : "s"}? This action cannot be undone.
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
        const body = isFilterMode ? filterPayload : { ids: contactIds };

        const response = await fetch(API_ROUTES.CONTACTS, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error("Failed to delete contacts");
        }

        const result = (await response.json().catch(() => ({}))) as { deletedCount?: number };
        const deletedCount = result.deletedCount ?? contactIds.length;

        notifications.hide(loadingNotification);
        notifications.show(
          successNotificationTemplate({
            title: "Success",
            description: `${deletedCount} contact(s) deleted successfully`,
          }),
        );

        await onDeleted?.(deletedCount);
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
