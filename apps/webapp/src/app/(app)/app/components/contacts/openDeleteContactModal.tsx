"use client";

import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { captureEvent } from "@/lib/analytics/client";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useDeleteContactsMutation } from "@/lib/query/hooks/useContacts";
import { createModalId } from "@/lib/modals";
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
  const t = useTranslations("PeoplePage.DeleteContact");

  return (
    <ModalTitle
      text={t("Title", { name: contactName })}
      icon={<IconAlertCircle size={24} />}
      isDangerous={true}
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
  const t = useTranslations("PeoplePage.DeleteContact");
  const tCommon = useTranslations("WebAppCommon");
  const deleteContactsMutation = useDeleteContactsMutation();

  return (
    <StandardConfirmModalBody
      modalId={modalId}
      message={<Text size="sm">{t("Message", { name: contactName })}</Text>}
      confirmLabel={tCommon("YesDelete")}
      cancelLabel={tCommon("NoCancel")}
      confirmColor="red"
      confirmLeftSection={<IconTrash size={16} />}
      onConfirm={async () => {
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
    modalId,
    title: <DeleteContactModalTitle contactName={contactName} />,
    children: (
      <DeleteContactModalBody
        modalId={modalId}
        contactId={contactId}
        contactName={contactName}
        onDeleted={onDeleted}
      />
    ),
  });
}
