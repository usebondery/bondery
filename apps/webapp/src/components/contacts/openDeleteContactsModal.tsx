"use client";

import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { ContactsFilter } from "@bondery/schemas";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { captureEvent } from "@/lib/analytics/client";
import { useCommonTranslations, usePeoplePageTranslations } from "@/lib/i18n/generated/hooks";
import { createModalId } from "@/lib/modals";
import {
  useDeleteContactsFilteredMutation,
  useDeleteContactsMutation,
} from "@/lib/query/hooks/useContacts";
import { StandardConfirmModalBody } from "../modals/StandardConfirmModalBody";

export interface OpenDeleteContactsModalParams {
  /** Explicit IDs when not using filter mode. */
  contactIds: string[];
  /** When set, the API receives a filter-based payload instead of explicit IDs. */
  filterPayload?: { filter: ContactsFilter; excludeIds?: string[] };
  /** Called after the delete succeeds. `deletedCount` is provided when the API returns it. */
  onDeleted?: (deletedCount?: number) => Promise<void> | void;
}

interface DeleteContactsModalTitleProps {
  contactCount: number;
  isFilterMode: boolean;
}

function DeleteContactsModalTitle({ isFilterMode, contactCount }: DeleteContactsModalTitleProps) {
  const t = usePeoplePageTranslations("DeleteContacts");

  return (
    <ModalTitle
      icon={<IconAlertCircle size={24} />}
      isDangerous={true}
      text={isFilterMode ? t("TitleAllMatching") : t("Title", { count: contactCount })}
    />
  );
}

interface DeleteContactsModalBodyProps extends OpenDeleteContactsModalParams {
  contactCount: number;
  isFilterMode: boolean;
  modalId: string;
}

function DeleteContactsModalBody({
  modalId,
  contactIds,
  filterPayload,
  onDeleted,
  isFilterMode,
  contactCount,
}: DeleteContactsModalBodyProps) {
  const t = usePeoplePageTranslations("DeleteContacts");
  const tCommon = useCommonTranslations();
  const deleteContactsMutation = useDeleteContactsMutation();
  const deleteContactsFilteredMutation = useDeleteContactsFilteredMutation();

  return (
    <StandardConfirmModalBody
      cancelLabel={tCommon("confirm.noCancel")}
      confirmColor="red"
      confirmLabel={tCommon("confirm.yesDelete")}
      confirmLeftSection={<IconTrash size={16} />}
      message={
        <Text size="sm">
          {isFilterMode ? t("MessageAllMatching") : t("Message", { count: contactCount })}
        </Text>
      }
      modalId={modalId}
      onConfirm={async () => {
        const loadingNotification = notifications.show({
          ...loadingNotificationTemplate({
            description: t("LoadingDescription"),
            title: t("LoadingTitle"),
          }),
        });

        try {
          const result = isFilterMode
            ? await (async () => {
                if (!filterPayload) {
                  throw new Error("Filter payload is required for bulk delete by filter");
                }
                return deleteContactsFilteredMutation.mutateAsync(filterPayload);
              })()
            : await deleteContactsMutation.mutateAsync(contactIds);

          const deletedCount = result.deletedCount ?? contactIds.length;

          captureEvent("contacts_bulk_deleted", { count: deletedCount });

          notifications.hide(loadingNotification);
          notifications.show(
            successNotificationTemplate({
              description: t("SuccessDescription", { count: deletedCount }),
              title: tCommon("feedback.successTitle"),
            }),
          );

          await onDeleted?.(deletedCount);
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

export function openDeleteContactsModal({
  contactIds,
  filterPayload,
  onDeleted,
}: OpenDeleteContactsModalParams) {
  const isFilterMode = !!filterPayload;
  if (!isFilterMode && contactIds.length === 0) {
    return;
  }

  const modalId = createModalId("delete-contacts");

  modals.open({
    children: (
      <DeleteContactsModalBodyWrapper
        contactIds={contactIds}
        filterPayload={filterPayload}
        isFilterMode={isFilterMode}
        modalId={modalId}
        onDeleted={onDeleted}
      />
    ),
    modalId,
    title: <DeleteContactsModalTitleWrapper contactIds={contactIds} isFilterMode={isFilterMode} />,
  });
}

function DeleteContactsModalTitleWrapper({
  contactIds,
  isFilterMode,
}: {
  contactIds: string[];
  isFilterMode: boolean;
}) {
  return <DeleteContactsModalTitle contactCount={contactIds.length} isFilterMode={isFilterMode} />;
}

function DeleteContactsModalBodyWrapper({
  modalId,
  contactIds,
  filterPayload,
  onDeleted,
  isFilterMode,
}: {
  modalId: string;
  contactIds: string[];
  filterPayload?: OpenDeleteContactsModalParams["filterPayload"];
  onDeleted?: OpenDeleteContactsModalParams["onDeleted"];
  isFilterMode: boolean;
}) {
  return (
    <DeleteContactsModalBody
      contactCount={contactIds.length}
      contactIds={contactIds}
      filterPayload={filterPayload}
      isFilterMode={isFilterMode}
      modalId={modalId}
      onDeleted={onDeleted}
    />
  );
}
