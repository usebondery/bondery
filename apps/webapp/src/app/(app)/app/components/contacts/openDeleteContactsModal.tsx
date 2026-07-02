"use client";

import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import type { ContactsFilter } from "@bondery/schemas";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { captureEvent } from "@/lib/analytics/client";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  useDeleteContactsFilteredMutation,
  useDeleteContactsMutation,
} from "@/lib/query/hooks/useContacts";
import { createModalId } from "@/lib/modals";
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
  isSingular: boolean;
  countLabel: string;
}

function DeleteContactsModalTitle({ isSingular, countLabel }: DeleteContactsModalTitleProps) {
  const t = useTranslations("PeoplePage.DeleteContacts");

  return (
    <ModalTitle
      text={isSingular ? t("TitleSingular", { countLabel }) : t("TitlePlural", { countLabel })}
      icon={<IconAlertCircle size={24} />}
      isDangerous={true}
    />
  );
}

interface DeleteContactsModalBodyProps extends OpenDeleteContactsModalParams {
  modalId: string;
  isFilterMode: boolean;
  countLabel: string;
  isSingular: boolean;
}

function DeleteContactsModalBody({
  modalId,
  contactIds,
  filterPayload,
  onDeleted,
  isFilterMode,
  countLabel,
  isSingular,
}: DeleteContactsModalBodyProps) {
  const t = useTranslations("PeoplePage.DeleteContacts");
  const tCommon = useTranslations("WebAppCommon");
  const deleteContactsMutation = useDeleteContactsMutation();
  const deleteContactsFilteredMutation = useDeleteContactsFilteredMutation();

  return (
    <StandardConfirmModalBody
      modalId={modalId}
      message={
        <Text size="sm">
          {isSingular
            ? t("MessageSingular", { countLabel })
            : t("MessagePlural", { countLabel })}
        </Text>
      }
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
          const result = isFilterMode
            ? await deleteContactsFilteredMutation.mutateAsync(filterPayload!)
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
    modalId,
    title: (
      <DeleteContactsModalTitleWrapper contactIds={contactIds} isFilterMode={isFilterMode} />
    ),
    children: (
      <DeleteContactsModalBodyWrapper
        modalId={modalId}
        contactIds={contactIds}
        filterPayload={filterPayload}
        onDeleted={onDeleted}
        isFilterMode={isFilterMode}
      />
    ),
  });
}

function DeleteContactsModalTitleWrapper({
  contactIds,
  isFilterMode,
}: {
  contactIds: string[];
  isFilterMode: boolean;
}) {
  const t = useTranslations("PeoplePage.DeleteContacts");
  const countLabel = isFilterMode ? t("CountLabelAllMatching") : String(contactIds.length);
  const isSingular = !isFilterMode && contactIds.length === 1;

  return <DeleteContactsModalTitle isSingular={isSingular} countLabel={countLabel} />;
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
  const t = useTranslations("PeoplePage.DeleteContacts");
  const countLabel = isFilterMode ? t("CountLabelAllMatching") : String(contactIds.length);
  const isSingular = !isFilterMode && contactIds.length === 1;

  return (
    <DeleteContactsModalBody
      modalId={modalId}
      contactIds={contactIds}
      filterPayload={filterPayload}
      onDeleted={onDeleted}
      isFilterMode={isFilterMode}
      countLabel={countLabel}
      isSingular={isSingular}
    />
  );
}
