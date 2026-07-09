"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  PeopleMultiPickerInput,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUserPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { optionalPluralFragment } from "@/lib/i18n/optionalPluralFragment";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalDismiss } from "@/lib/modals";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { useContactsListQuery } from "@/lib/query/hooks/useContacts";
import { useAddContactsToGroupMutation, useGroupMembersQuery } from "@/lib/query/hooks/useGroups";

interface AddPeopleToGroupModalProps {
  groupId: string;
  groupLabel: string;
}

interface AddPeopleToGroupFormProps extends AddPeopleToGroupModalProps {
  modalId: string;
}

function AddPeopleToGroupModalTitle({ groupLabel }: { groupLabel: string }) {
  const t = useWebTranslations("GroupsPage");
  return (
    <ModalTitle
      icon={<IconUserPlus size={24} />}
      text={t("AddPeopleModal.Title", { groupLabel })}
    />
  );
}

/**
 * Opens a modal that lets user select and add contacts to the provided group.
 */
export function openAddPeopleToGroupModal(props: AddPeopleToGroupModalProps) {
  const modalId = createModalId("add-people-to-group");

  modals.open({
    children: <AddPeopleToGroupForm {...props} modalId={modalId} />,
    modalId,
    size: "md",
    title: <AddPeopleToGroupModalTitle groupLabel={props.groupLabel} />,
    trapFocus: true,
  });
}

function AddPeopleToGroupForm({ groupId, groupLabel, modalId }: AddPeopleToGroupFormProps) {
  const tCommon = useCommonTranslations();
  const t = useWebTranslations("GroupsPage");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const existingMemberIdsRef = useRef<Set<string>>(new Set());
  const {
    data: allContactsData,
    isLoading: isLoadingAll,
    isError: isAllContactsError,
  } = useContactsListQuery({ limit: 200 });
  const {
    data: groupMembersData,
    isLoading: isLoadingMembers,
    isError: isMembersError,
  } = useGroupMembersQuery(groupId, { limit: 200, offset: 0 });
  const addContactsMutation = useAddContactsToGroupMutation(groupId);

  const contacts = useMemo(() => {
    if (!allContactsData?.contacts || !groupMembersData?.contacts) {
      return [];
    }
    const existingIds = new Set(groupMembersData.contacts.map((contact) => contact.id));
    existingMemberIdsRef.current = existingIds;
    return allContactsData.contacts.filter((contact) => !existingIds.has(contact.id));
  }, [allContactsData?.contacts, groupMembersData?.contacts]);

  const isLoading = isLoadingAll || isLoadingMembers;

  useEffect(() => {
    if (isAllContactsError || isMembersError) {
      notifications.show(
        errorNotificationTemplate({
          description: t("AddPeopleModal.LoadError"),
          title: t("AddPeopleModal.ErrorTitle"),
        }),
      );
    }
  }, [isAllContactsError, isMembersError, t]);

  const isBlocking = isSubmitting || isLoading;
  const { closeModal } = useModalDismiss(modalId, isBlocking);

  const handleSearch = useCallback(async (query: string): Promise<Contact[]> => {
    const results = await searchContacts(query);
    return results.filter((c) => !existingMemberIdsRef.current.has(c.id));
  }, []);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      notifications.show({
        color: "yellow",
        message: t("AddPeopleModal.NoSelectionDescription"),
        title: t("AddPeopleModal.NoSelectionTitle"),
      });
      return;
    }

    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("AddPeopleModal.AddingDescription"),
        title: t("AddPeopleModal.AddingTitle"),
      }),
    });

    try {
      const result = await addContactsMutation.mutateAsync(selectedIds);
      const addedCount = result.addedCount ?? selectedIds.length;
      const skippedCount = result.skippedCount ?? 0;

      notifications.hide(loadingNotification);

      const skippedDetails =
        skippedCount > 0 && addedCount > 0
          ? optionalPluralFragment(t, "AddPeopleModal.SkippedAlreadyInGroup", skippedCount, {
              skippedCount,
            })
          : "";

      notifications.show(
        successNotificationTemplate({
          description:
            addedCount === 0
              ? t("AddPeopleModal.AllAlreadyInGroup", { groupLabel })
              : t("AddPeopleModal.SuccessMessage", {
                  count: addedCount,
                  groupLabel,
                  skippedDetails,
                }),
          title: t("AddPeopleModal.SuccessTitle"),
        }),
      );

      closeModal();
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("AddPeopleModal.ErrorTitle"),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (contacts.length === 0) {
    return (
      <Stack gap="md">
        <Text c="dimmed" ta="center">
          {t("AddPeopleModal.EmptyState")}
        </Text>
        <ModalFooter cancelLabel={t("AddPeopleModal.Close")} onCancel={closeModal} />
      </Stack>
    );
  }

  const actionLabel =
    selectedIds.length === 0
      ? t("AddPeopleModal.ActionDefault")
      : t("AddPeopleModal.Action", { count: selectedIds.length });

  return (
    <Stack gap="md">
      <PeopleMultiPickerInput
        contacts={contacts as Contact[]}
        disabled={isSubmitting}
        noResultsLabel={t("AddPeopleModal.NoContactsFound")}
        onChange={setSelectedIds}
        onSearch={handleSearch}
        placeholder={t("AddPeopleModal.AddContactsPlaceholder")}
        searchDebounceMs={DEBOUNCE_MS.contactPicker}
        selectedIds={selectedIds}
      />

      <ModalFooter
        actionDisabled={selectedIds.length === 0 || isSubmitting}
        actionLabel={actionLabel}
        actionLeftSection={<IconUserPlus size={16} />}
        actionLoading={isSubmitting}
        cancelDisabled={isSubmitting}
        cancelLabel={t("AddPeopleModal.Cancel")}
        onAction={() => {
          void handleSubmit();
        }}
        onCancel={closeModal}
      />
    </Stack>
  );
}
