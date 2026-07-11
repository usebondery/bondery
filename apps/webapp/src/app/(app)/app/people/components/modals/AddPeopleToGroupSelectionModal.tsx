"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalScrollLayout,
  ModalTitle,
  PersonChip,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { ContactPreview, GroupWithCount } from "@bondery/schemas";
import {
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconFolderPlus,
  IconMinus,
  IconPlus,
  IconSearch,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { compoundPluralKey } from "@/lib/i18n/compoundPluralKey";
import { optionalPluralFragment } from "@/lib/i18n/optionalPluralFragment";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalDismiss } from "@/lib/modals";
import {
  useContactGroupsQueries,
  useContactsSelectableListQuery,
} from "@/lib/query/hooks/useContacts";
import {
  useGroupsListQuery,
  useSyncContactGroupMembershipsMutation,
} from "@/lib/query/hooks/useGroups";
import { openAddGroupModal } from "../../../groups/components/AddGroupModal";
import { GROUP_CARD_MAX_WIDTH_BY_VARIANT, GroupCard } from "../../../groups/components/GroupCard";

export interface GroupMembershipUpdate {
  groups: GroupWithCount[];
  selectedGroupIds: string[];
}

interface AddPeopleToGroupSelectionModalProps {
  onUpdated?: (update: GroupMembershipUpdate) => Promise<void> | void;
  personIds: string[];
}

interface AddPeopleToGroupSelectionFormProps extends AddPeopleToGroupSelectionModalProps {
  modalId: string;
}

function EditGroupsModalTitle() {
  const t = useWebTranslations("AddPeopleToGroupSelectionModal");
  return <ModalTitle icon={<IconUsersGroup size={24} />} text={t("Title")} />;
}

export function openAddPeopleToGroupSelectionModal(props: AddPeopleToGroupSelectionModalProps) {
  const modalId = createModalId("edit-groups");

  modals.open({
    children: <AddPeopleToGroupSelectionForm {...props} modalId={modalId} />,
    modalId,
    size: "xl",
    title: <EditGroupsModalTitle />,
    trapFocus: true,
  });
}

function AddPeopleToGroupSelectionForm({
  personIds,
  onUpdated,
  modalId,
}: AddPeopleToGroupSelectionFormProps) {
  const t = useWebTranslations("AddPeopleToGroupSelectionModal");
  const tCommon = useCommonTranslations();
  const modalGroupCardVariant = "small" as const;
  const modalGroupCardWidth = GROUP_CARD_MAX_WIDTH_BY_VARIANT[modalGroupCardVariant];
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [initialSelectedGroupIds, setInitialSelectedGroupIds] = useState<Set<string>>(new Set());
  const [selectedPeople, setSelectedPeople] = useState<ContactPreview[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  const deduplicatedPersonIds = useMemo(() => Array.from(new Set(personIds)), [personIds]);
  const {
    data: groupsData,
    isLoading: isLoadingGroups,
    isError: isGroupsError,
  } = useGroupsListQuery({ previewLimit: 3 });
  const membershipQueries = useContactGroupsQueries(deduplicatedPersonIds);
  const {
    data: contactsData,
    isLoading: isLoadingContacts,
    isError: isContactsError,
  } = useContactsSelectableListQuery({ enabled: deduplicatedPersonIds.length > 0, limit: 200 });
  const syncMembershipsMutation = useSyncContactGroupMembershipsMutation();

  const isLoadingMemberships = membershipQueries.some((query) => query.isLoading);
  const isLoadingGroupsData =
    isLoadingGroups || isLoadingMemberships || isLoadingContacts || !hasInitialized;

  useEffect(() => {
    modals.updateModal({
      modalId,
      title: <ModalTitle icon={<IconUsersGroup size={24} />} text={t("Title")} />,
    });
  }, [modalId, t]);

  const isBlocking = isSubmitting || isLoadingGroupsData;
  const { closeModal, closeModalSync } = useModalDismiss(modalId, isBlocking);

  useEffect(() => {
    if (isGroupsError || isContactsError || membershipQueries.some((query) => query.isError)) {
      notifications.show(
        errorNotificationTemplate({
          description: t("LoadError"),
          title: tCommon("feedback.errorTitle"),
        }),
      );
    }
  }, [isGroupsError, isContactsError, membershipQueries, t, tCommon]);

  useEffect(() => {
    if (hasInitialized) {
      return;
    }

    if (
      isLoadingGroups ||
      isLoadingContacts ||
      isLoadingMemberships ||
      !groupsData ||
      !contactsData
    ) {
      return;
    }

    const memberships = membershipQueries.map(
      (query) => new Set((query.data || []).map((group) => group.id)),
    );

    const intersection = memberships.reduce<Set<string>>(
      (sharedGroupIds, membershipSet) => {
        return new Set(Array.from(sharedGroupIds).filter((groupId) => membershipSet.has(groupId)));
      },
      memberships[0] ? new Set(memberships[0]) : new Set(),
    );

    const selectedPersonIdsSet = new Set(deduplicatedPersonIds);
    const personChips = (contactsData.contacts || [])
      .filter((person) => selectedPersonIdsSet.has(person.id))
      .map((person) => ({
        avatar: person.avatar,
        firstName: person.firstName,
        id: person.id,
        lastName: person.lastName,
      }));

    setGroups(groupsData.groups || []);
    setInitialSelectedGroupIds(intersection);
    setSelectedGroupIds(new Set(intersection));
    setSelectedPeople(personChips);
    setHasInitialized(true);
  }, [
    contactsData,
    deduplicatedPersonIds,
    groupsData,
    hasInitialized,
    isLoadingContacts,
    isLoadingGroups,
    isLoadingMemberships,
    membershipQueries.map,
  ]);

  const filteredGroups = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();

    if (!trimmedSearch) {
      return groups;
    }

    return groups.filter((group) => group.label.toLowerCase().includes(trimmedSearch));
  }, [groups, search]);

  const handleToggleGroup = (groupId: string) => {
    const nextSelectedIds = new Set(selectedGroupIds);

    if (nextSelectedIds.has(groupId)) {
      nextSelectedIds.delete(groupId);
    } else {
      nextSelectedIds.add(groupId);
    }

    setSelectedGroupIds(nextSelectedIds);
  };

  const handleSubmit = async () => {
    if (deduplicatedPersonIds.length === 0) {
      return;
    }

    const targetGroupIds = Array.from(selectedGroupIds);
    const removedGroupIds = Array.from(initialSelectedGroupIds).filter(
      (groupId) => !selectedGroupIds.has(groupId),
    );

    if (targetGroupIds.length === 0 && removedGroupIds.length === 0) {
      return;
    }

    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("AddingDescription"),
        title: t("AddingTitle"),
      }),
    });

    try {
      const addResults = await syncMembershipsMutation.mutateAsync({
        addToGroupIds: targetGroupIds,
        personIds: deduplicatedPersonIds,
        removeFromGroupIds: removedGroupIds,
      });

      const totalAdded = addResults.reduce((sum, result) => sum + (result.addedCount ?? 0), 0);
      const totalSkipped = addResults.reduce((sum, result) => sum + (result.skippedCount ?? 0), 0);

      notifications.hide(loadingNotification);

      const skippedDetails = optionalPluralFragment(t, "SkippedSuffix", totalSkipped);

      const membershipSummary =
        totalAdded === 0 && totalSkipped > 0
          ? t("AllAlreadyInGroups")
          : t(compoundPluralKey("AddedSummary", [totalAdded, targetGroupIds.length]), {
              count: totalAdded,
              groupCount: targetGroupIds.length,
              skippedDetails,
            });

      notifications.show(
        successNotificationTemplate({
          description:
            removedGroupIds.length > 0
              ? t(
                  compoundPluralKey("MembershipUpdated", [
                    deduplicatedPersonIds.length,
                    selectedGroupIds.size,
                  ]),
                  {
                    count: deduplicatedPersonIds.length,
                    groupCount: selectedGroupIds.size,
                  },
                )
              : membershipSummary,
          title: tCommon("feedback.successTitle"),
        }),
      );

      closeModalSync();
      if (onUpdated) {
        await onUpdated({
          groups,
          selectedGroupIds: Array.from(selectedGroupIds),
        });
      }
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: tCommon("feedback.errorTitle"),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingGroupsData) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <ModalScrollLayout
      footer={
        <ModalFooter
          actionDisabled={deduplicatedPersonIds.length === 0 || isSubmitting}
          actionLabel={t("Submit")}
          actionLeftSection={<IconUsersGroup size={16} />}
          actionLoading={isSubmitting}
          cancelDisabled={isSubmitting}
          cancelLabel={t("Cancel")}
          mt={0}
          onAction={() => {
            void handleSubmit();
          }}
          onCancel={closeModal}
        />
      }
      header={
        <Stack gap="md">
          {selectedPeople.length > 0 && (
            <Group align="center" gap="xs" wrap="wrap">
              {selectedPeople.map((person) => (
                <PersonChip isClickable={false} key={person.id} person={person} size="sm" />
              ))}
            </Group>
          )}

          <TextInput
            label={t("SearchLabel")}
            leftSection={<IconSearch size={16} />}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={t("SearchPlaceholder")}
            value={search}
          />
        </Stack>
      }
    >
      <Stack gap="md">
        {filteredGroups.length === 0 && groups.length > 0 && search.trim() ? (
          <Text c="dimmed" py="lg" ta="center" w="100%">
            {t("NoGroupsMatch")}
          </Text>
        ) : null}

        <Group align="flex-start" gap="md" justify="space-between" w="100%" wrap="wrap">
          <Box style={{ flex: "0 0 auto", width: modalGroupCardWidth }}>
            <GroupCard
              actionColor="green"
              actionIcon={<IconFolderPlus size={20} />}
              actionLabel={t("CreateNewGroup")}
              onActionClick={() => {
                openAddGroupModal({
                  initialLabel: search.trim(),
                  initialSelectedIds: deduplicatedPersonIds,
                  onCreated: (newGroup) => {
                    setGroups((prev) => [...prev, newGroup]);
                    setInitialSelectedGroupIds((prev) => new Set([...prev, newGroup.id]));
                    setSelectedGroupIds((prev) => new Set([...prev, newGroup.id]));
                  },
                });
              }}
              variant="action"
            />
          </Box>

          {filteredGroups.map((group) => (
            <Box key={group.id} style={{ flex: "0 0 auto", width: modalGroupCardWidth }}>
              <UnstyledButton
                className="w-full text-left"
                onClick={() => handleToggleGroup(group.id)}
              >
                {(() => {
                  const isInitiallySelected = initialSelectedGroupIds.has(group.id);
                  const isCurrentlySelected = selectedGroupIds.has(group.id);

                  const selectionState = isInitiallySelected
                    ? isCurrentlySelected
                      ? "already"
                      : "remove"
                    : isCurrentlySelected
                      ? "add"
                      : "none";

                  return (
                    <div className="relative">
                      {selectionState === "remove" && (
                        <Badge
                          className="absolute top-2 right-2 z-10"
                          leftSection={<IconMinus size={10} />}
                          size="xs"
                          style={{
                            backgroundColor: "var(--mantine-color-red-filled)",
                            color: "var(--mantine-color-white)",
                          }}
                        >
                          {t("BadgeRemoveFrom")}
                        </Badge>
                      )}
                      {selectionState === "add" && (
                        <Badge
                          className="absolute top-2 right-2 z-10"
                          leftSection={<IconPlus size={10} />}
                          size="xs"
                          style={{
                            backgroundColor: "var(--mantine-color-green-filled)",
                            color: "var(--mantine-color-white)",
                          }}
                        >
                          {t("BadgeAddTo")}
                        </Badge>
                      )}
                      {selectionState === "already" && (
                        <Badge
                          className="absolute top-2 right-2 z-10"
                          size="xs"
                          style={{
                            backgroundColor: "var(--mantine-primary-color-filled)",
                            color: "var(--mantine-color-white)",
                          }}
                        >
                          {t("BadgeAlreadyPartOf")}
                        </Badge>
                      )}

                      <GroupCard
                        cursorType="pointer"
                        group={group}
                        highlightColor={
                          selectionState === "add"
                            ? "green"
                            : selectionState === "remove"
                              ? "red"
                              : selectionState === "already"
                                ? "primary"
                                : undefined
                        }
                        interactive={false}
                        onAddPeople={() => {}}
                        onClick={() => {}}
                        onDelete={() => {}}
                        onDuplicate={() => {}}
                        onEdit={() => {}}
                        selected={isCurrentlySelected}
                        showMenu={false}
                        variant={modalGroupCardVariant}
                      />
                    </div>
                  );
                })()}
              </UnstyledButton>
            </Box>
          ))}
        </Group>
      </Stack>
    </ModalScrollLayout>
  );
}
