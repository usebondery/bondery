"use client";

import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { captureEvent } from "@/lib/analytics/client";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId } from "@/lib/modals";
import { useDeleteContactsMutation } from "@/lib/query/hooks/useContacts";
import { StandardConfirmModalBody } from "../modals/StandardConfirmModalBody";

interface OpenDeleteContactModalParams {
  contactId: string;
  contactName: string;
  onDeleted?: () => Promise<void> | void;
}

interface DeleteContactModalTitleProps {
  contactName: string;
}

function DeleteContactModalTitle({ contactName }: DeleteContactModalTitleProps) {
  const t = useWebTranslations("PeoplePage", "DeleteContact");

  return (
    <ModalTitle
      icon={<IconAlertCircle size={24} />}
      isDangerous={true}
      text={t("Title", { name: contactName })}
    />
  );
}

interface DeleteContactModalBodyProps extends OpenDeleteContactModalParams {
  modalId: string;
}

function DeleteContactModalBody({
  modalId,
  contactId,
  contactName,
  onDeleted,
}: DeleteContactModalBodyProps) {
  const t = useWebTranslations("PeoplePage", "DeleteContact");
  const tCommon = useCommonTranslations();
  const deleteContactsMutation = useDeleteContactsMutation();

  return (
    <StandardConfirmModalBody
      cancelLabel={tCommon("confirm.noCancel")}
      confirmColor="red"
      confirmLabel={tCommon("confirm.yesDelete")}
      confirmLeftSection={<IconTrash size={16} />}
      message={<Text size="sm">{t("Message", { name: contactName })}</Text>}
      modalId={modalId}
      onConfirm={async () => {
        const loadingNotification = notifications.show({
          ...loadingNotificationTemplate({
            description: t("LoadingDescription"),
            title: t("LoadingTitle"),
          }),
        });

        try {
          await deleteContactsMutation.mutateAsync([contactId]);

          captureEvent("contact_deleted");

          notifications.hide(loadingNotification);
          notifications.show(
            successNotificationTemplate({
              description: t("SuccessDescription"),
              title: tCommon("feedback.successTitle"),
            }),
          );

          await onDeleted?.();
        } catch {
          notifications.hide(loadingNotification);
          notifications.show(
            errorNotificationTemplate({
              description: t("ErrorDescription"),
              title: tCommon("feedback.errorTitle"),
            }),
          );
        }
      }}
    />
  );
}

export function openDeleteContactModal({
  contactId,
  contactName,
  onDeleted,
}: OpenDeleteContactModalParams) {
  const modalId = createModalId("delete-contact");

  modals.open({
    children: (
      <DeleteContactModalBody
        contactId={contactId}
        contactName={contactName}
        modalId={modalId}
        onDeleted={onDeleted}
      />
    ),
    modalId,
    title: <DeleteContactModalTitle contactName={contactName} />,
  });
}
