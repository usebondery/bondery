"use client";

import { useCallback } from "react";
import { Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import type { ContactsFilter } from "@bondery/schemas";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "../modals/openStandardConfirmModal";
import { captureEvent } from "@/lib/analytics/client";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  useDeleteContactsFilteredMutation,
  useDeleteContactsMutation,
} from "@/lib/query/hooks/useContacts";

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
 */
export function useOpenDeleteContactsModal() {
  const t = useTranslations("PeoplePage.DeleteContacts");
  const tCommon = useTranslations("WebAppCommon");
  const deleteContactsMutation = useDeleteContactsMutation();
  const deleteContactsFilteredMutation = useDeleteContactsFilteredMutation();

  return useCallback(
    ({ contactIds, filterPayload, onDeleted }: OpenDeleteContactsModalParams) => {
      const isFilterMode = !!filterPayload;
      if (!isFilterMode && contactIds.length === 0) {
        return;
      }

      const countLabel = isFilterMode
        ? t("CountLabelAllMatching")
        : String(contactIds.length);
      const isSingular = !isFilterMode && contactIds.length === 1;

      openStandardConfirmModal({
        title: (
          <ModalTitle
            text={
              isSingular
                ? t("TitleSingular", { countLabel })
                : t("TitlePlural", { countLabel })
            }
            icon={<IconAlertCircle size={24} />}
            isDangerous={true}
          />
        ),
        message: (
          <Text size="sm">
            {isSingular
              ? t("MessageSingular", { countLabel })
              : t("MessagePlural", { countLabel })}
          </Text>
        ),
        confirmLabel: tCommon("YesDelete"),
        cancelLabel: tCommon("NoCancel"),
        confirmColor: "red",
        confirmLeftSection: <IconTrash size={16} />,
        onConfirm: async () => {
          const loadingNotification = notifications.show({
            ...loadingNotificationTemplate({
              title: t("LoadingTitle"),
              description: t("LoadingDescription"),
            }),
          });

          try {
            const result = isFilterMode
              ? await deleteContactsFilteredMutation.mutateAsync(filterPayload)
              : await deleteContactsMutation.mutateAsync(contactIds);

            const deletedCount = result.deletedCount ?? contactIds.length;

            captureEvent("contacts_bulk_deleted", { count: deletedCount });

            notifications.hide(loadingNotification);
            notifications.show(
              successNotificationTemplate({
                title: tCommon("SuccessTitle"),
                description: t("SuccessDescription", { count: deletedCount }),
              }),
            );

            await onDeleted?.(deletedCount);
          } catch {
            notifications.hide(loadingNotification);
            notifications.show(
              errorNotificationTemplate({
                title: tCommon("ErrorTitle"),
                description: t("ErrorDescription"),
              }),
            );
          }
        },
      });
    },
    [deleteContactsFilteredMutation, deleteContactsMutation, t, tCommon],
  );
}
