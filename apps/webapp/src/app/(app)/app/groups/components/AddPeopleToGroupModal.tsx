"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Stack, Text, Loader, Center } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUserPlus } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  PeopleMultiPickerInput,
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import { DEBOUNCE_MS } from "@/lib/config";
import { searchContacts } from "@/lib/searchContacts";
import { useContactsListQuery } from "@/lib/query/hooks/useContacts";
import {
  useAddContactsToGroupMutation,
  useGroupMembersQuery,
} from "@/lib/query/hooks/useGroups";
import { createModalId, useModalBlocking } from "@/lib/modals";

interface AddPeopleToGroupModalProps {
  groupId: string;
  groupLabel: string;
}

interface AddPeopleToGroupFormProps extends AddPeopleToGroupModalProps {
  modalId: string;
}

function AddPeopleToGroupModalTitle({ groupLabel }: { groupLabel: string }) {
  const t = useTranslations("GroupsPage");
  return (
    <ModalTitle
      text={t("AddPeopleModal.Title", { groupLabel })}
      icon={<IconUserPlus size={24} />}
    />
  );
}

/**
 * Opens a modal that lets user select and add contacts to the provided group.
 */
export function openAddPeopleToGroupModal(props: AddPeopleToGroupModalProps) {
  const modalId = createModalId("add-people-to-group");

  modals.open({
    modalId,
    title: <AddPeopleToGroupModalTitle groupLabel={props.groupLabel} />,
    trapFocus: true,
    size: "md",
    children: <AddPeopleToGroupForm {...props} modalId={modalId} />,
  });
}

function AddPeopleToGroupForm({ groupId, groupLabel, modalId }: AddPeopleToGroupFormProps) {
  const t = useTranslations("GroupsPage");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const existingMemberIdsRef = useRef<Set<string>>(new Set());
  const { data: allContactsData, isLoading: isLoadingAll, isError: isAllContactsError } =
    useContactsListQuery({ limit: 200 });
  const { data: groupMembersData, isLoading: isLoadingMembers, isError: isMembersError } =
    useGroupMembersQuery(groupId, { limit: 200, offset: 0 });
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
          title: t("AddPeopleModal.ErrorTitle"),
          description: t("AddPeopleModal.LoadError"),
        }),
      );
    }
  }, [isAllContactsError, isMembersError, t]);

  const isBlocking = isSubmitting || isLoading;
  useModalBlocking(modalId, isBlocking);

  const handleSearch = useCallback(async (query: string): Promise<Contact[]> => {
    const results = await searchContacts(query);
    return results.filter((c) => !existingMemberIdsRef.current.has(c.id));
  }, []);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      notifications.show({
        title: t("AddPeopleModal.NoSelectionTitle"),
        message: t("AddPeopleModal.NoSelectionDescription"),
        color: "yellow",
      });
      return;
    }

    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("AddPeopleModal.AddingTitle"),
        description: t("AddPeopleModal.AddingDescription"),
      }),
    });

    try {
      const result = await addContactsMutation.mutateAsync(selectedIds);
      const addedCount = result.addedCount ?? selectedIds.length;
      const skippedCount = result.skippedCount ?? 0;

      notifications.hide(loadingNotification);

      const skippedSuffix =
        skippedCount > 0 && addedCount > 0
          ? ` ${
              skippedCount === 1
                ? t("AddPeopleModal.SkippedAlreadyInGroupSingular", { count: skippedCount })
                : t("AddPeopleModal.SkippedAlreadyInGroupPlural", { count: skippedCount })
            }`
          : "";

      notifications.show(
        successNotificationTemplate({
          title: t("AddPeopleModal.SuccessTitle"),
          description:
            addedCount === 0
              ? t("AddPeopleModal.AllAlreadyInGroup", { groupLabel })
              : addedCount === 1
                ? t("AddPeopleModal.SuccessMessageSingular", { groupLabel }) + skippedSuffix
                : t("AddPeopleModal.SuccessMessagePlural", { count: addedCount, groupLabel }) +
                  skippedSuffix,
        }),
      );

      modals.close(modalId);
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          title: t("AddPeopleModal.ErrorTitle"),
          description: error instanceof Error ? error.message : t("AddPeopleModal.AddError"),
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
        <ModalFooter
          cancelLabel={t("AddPeopleModal.Close")}
          onCancel={() => modals.close(modalId)}
        />
      </Stack>
    );
  }

  const actionLabel =
    selectedIds.length === 0
      ? t("AddPeopleModal.ActionDefault")
      : selectedIds.length === 1
        ? t("AddPeopleModal.ActionSingular")
        : t("AddPeopleModal.ActionPlural", { count: selectedIds.length });

  return (
    <Stack gap="md">
      <PeopleMultiPickerInput
        contacts={contacts as Contact[]}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
        placeholder={t("AddPeopleModal.AddContactsPlaceholder")}
        noResultsLabel={t("AddPeopleModal.NoContactsFound")}
        onSearch={handleSearch}
        searchDebounceMs={DEBOUNCE_MS.contactPicker}
        disabled={isSubmitting}
      />

      <ModalFooter
        cancelLabel={t("AddPeopleModal.Cancel")}
        onCancel={() => modals.close(modalId)}
        cancelDisabled={isSubmitting}
        actionLabel={actionLabel}
        onAction={() => {
          void handleSubmit();
        }}
        actionLoading={isSubmitting}
        actionDisabled={selectedIds.length === 0 || isSubmitting}
        actionLeftSection={<IconUserPlus size={16} />}
      />
    </Stack>
  );
}
