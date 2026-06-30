"use client";

import { useCallback } from "react";
import { Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "../modals/openStandardConfirmModal";
import { captureEvent } from "@/lib/analytics/client";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useDeleteContactsMutation } from "@/lib/query/hooks/useContacts";

interface OpenDeleteContactModalParams {
  contactId: string;
  contactName: string;
  onDeleted?: () => Promise<void> | void;
}

/**
 * Opens a standardized confirmation modal and deletes a single contact.
 */
export function useOpenDeleteContactModal() {
  const t = useTranslations("PeoplePage.DeleteContact");
  const tCommon = useTranslations("WebAppCommon");
  const deleteContactsMutation = useDeleteContactsMutation();

  return useCallback(
    ({ contactId, contactName, onDeleted }: OpenDeleteContactModalParams) => {
      openStandardConfirmModal({
        title: (
          <ModalTitle
            text={t("Title", { name: contactName })}
            icon={<IconAlertCircle size={24} />}
            isDangerous={true}
          />
        ),
        message: <Text size="sm">{t("Message", { name: contactName })}</Text>,
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
            await deleteContactsMutation.mutateAsync([contactId]);

            captureEvent("contact_deleted");

            notifications.hide(loadingNotification);
            notifications.show(
              successNotificationTemplate({
                title: tCommon("SuccessTitle"),
                description: t("SuccessDescription"),
              }),
            );

            await onDeleted?.();
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
    [deleteContactsMutation, t, tCommon],
  );
}
