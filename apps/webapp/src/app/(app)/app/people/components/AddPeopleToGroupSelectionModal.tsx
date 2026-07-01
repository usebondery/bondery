"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Center,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconMinus,
  IconPlus,
  IconSearch,
  IconUsersGroup,
  IconFolderPlus,
} from "@tabler/icons-react";
import {
  PersonChip,
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { ContactPreview, GroupWithCount } from "@bondery/schemas";
import { GroupCard, GROUP_CARD_MAX_WIDTH_BY_VARIANT } from "../../groups/components/GroupCard";
import { openAddGroupModal } from "../../groups/components/AddGroupModal";
import {
  useContactGroupsQueries,
  useContactsListQuery,
} from "@/lib/query/hooks/useContacts";
import {
  useGroupsListQuery,
  useSyncContactGroupMembershipsMutation,
} from "@/lib/query/hooks/useGroups";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalBlocking } from "@/lib/modals";

export interface GroupMembershipUpdate {
  groups: GroupWithCount[];
  selectedGroupIds: string[];
}

interface AddPeopleToGroupSelectionModalProps {
  personIds: string[];
  onUpdated?: (update: GroupMembershipUpdate) => Promise<void> | void;
}

interface AddPeopleToGroupSelectionFormProps extends AddPeopleToGroupSelectionModalProps {
  modalId: string;
}

export function openAddPeopleToGroupSelectionModal(props: AddPeopleToGroupSelectionModalProps) {
  const modalId = createModalId("edit-groups");

  modals.open({
    modalId,
    title: <ModalTitle text="Edit groups" icon={<IconUsersGroup size={24} />} />,
    trapFocus: true,
    size: "xl",
    children: <AddPeopleToGroupSelectionForm {...props} modalId={modalId} />,
  });
}

function AddPeopleToGroupSelectionForm({
  personIds,
  onUpdated,
  modalId,
}: AddPeopleToGroupSelectionFormProps) {
  const t = useTranslations("AddPeopleToGroupSelectionModal");
  const tCommon = useTranslations("WebAppCommon");
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
  const { data: groupsData, isLoading: isLoadingGroups, isError: isGroupsError } =
    useGroupsListQuery({ previewLimit: 3 });
  const membershipQueries = useContactGroupsQueries(deduplicatedPersonIds);
  const { data: contactsData, isLoading: isLoadingContacts, isError: isContactsError } =
    useContactsListQuery({ limit: 200, enabled: deduplicatedPersonIds.length > 0 });
  const syncMembershipsMutation = useSyncContactGroupMembershipsMutation();

  const isLoadingMemberships = membershipQueries.some((query) => query.isLoading);
  const isLoadingGroupsData =
    isLoadingGroups || isLoadingMemberships || isLoadingContacts || !hasInitialized;

  useEffect(() => {
    modals.updateModal({
      modalId,
      title: <ModalTitle text={t("Title")} icon={<IconUsersGroup size={24} />} />,
    });
  }, [modalId, t]);

  const isBlocking = isSubmitting || isLoadingGroupsData;
  useModalBlocking(modalId, isBlocking);

  useEffect(() => {
    if (isGroupsError || isContactsError || membershipQueries.some((query) => query.isError)) {
      notifications.show(
        errorNotificationTemplate({
          title: tCommon("ErrorTitle"),
          description: t("LoadError"),
        }),
      );
    }
  }, [isGroupsError, isContactsError, membershipQueries, t, tCommon]);

  useEffect(() => {
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
        return new Set(
          Array.from(sharedGroupIds).filter((groupId) => membershipSet.has(groupId)),
        );
      },
      memberships[0] ? new Set(memberships[0]) : new Set(),
    );

    const selectedPersonIdsSet = new Set(deduplicatedPersonIds);
    const personChips = (contactsData.contacts || [])
      .filter((person) => selectedPersonIdsSet.has(person.id))
      .map((person) => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        avatar: person.avatar,
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
    isLoadingContacts,
    isLoadingGroups,
    isLoadingMemberships,
    membershipQueries,
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
        title: t("AddingTitle"),
        description: t("AddingDescription"),
      }),
    });

    try {
      const addResults = await syncMembershipsMutation.mutateAsync({
        personIds: deduplicatedPersonIds,
        addToGroupIds: targetGroupIds,
        removeFromGroupIds: removedGroupIds,
      });

      const totalAdded = addResults.reduce(
        (sum, result) => sum + (result.addedCount ?? 0),
        0,
      );
      const totalSkipped = addResults.reduce(
        (sum, result) => sum + (result.skippedCount ?? 0),
        0,
      );

      notifications.hide(loadingNotification);

      const peopleLabel = totalAdded === 1 ? t("PersonSingular") : t("PeoplePlural");
      const groupsLabel =
        targetGroupIds.length === 1 ? t("GroupSingular") : t("GroupsPlural");
      const skippedSuffix =
        totalSkipped > 0
          ? totalSkipped === 1
            ? t("SkippedSuffixSingular", { count: totalSkipped })
            : t("SkippedSuffixPlural", { count: totalSkipped })
          : "";

      const membershipSummary =
        totalAdded === 0 && totalSkipped > 0
          ? t("AllAlreadyInGroups")
          : t("AddedSummary", {
              count: totalAdded,
              peopleLabel,
              skippedSuffix,
              groupCount: targetGroupIds.length,
              groupsLabel,
            });

      notifications.show(
        successNotificationTemplate({
          title: tCommon("SuccessTitle"),
          description:
            removedGroupIds.length > 0
              ? t("MembershipUpdated", {
                  count: deduplicatedPersonIds.length,
                  peopleLabel:
                    deduplicatedPersonIds.length === 1
                      ? t("PersonSingular")
                      : t("PeoplePlural"),
                  groupCount: selectedGroupIds.size,
                  groupsLabel:
                    selectedGroupIds.size === 1 ? t("GroupSingular") : t("GroupsPlural"),
                })
              : membershipSummary,
        }),
      );

      modals.close(modalId);
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
          title: tCommon("ErrorTitle"),
          description: error instanceof Error ? error.message : t("SubmitError"),
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
    <Stack gap="md">
      {selectedPeople.length > 0 && (
        <Group gap="xs" align="center" wrap="wrap">
          {selectedPeople.map((person) => (
            <PersonChip key={person.id} person={person} size="sm" isClickable={false} />
          ))}
        </Group>
      )}

      <TextInput
        label={t("SearchLabel")}
        placeholder={t("SearchPlaceholder")}
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      <ScrollArea h={360} type="auto">
        <Group gap="sm" align="flex-start" justify="flex-start" wrap="wrap" w="full">
          <Box
            style={{
              flex: `1 1 ${modalGroupCardWidth}`,
              width: modalGroupCardWidth,
              maxWidth: modalGroupCardWidth,
            }}
          >
            <GroupCard
              variant="action"
              actionLabel={t("CreateNewGroup")}
              actionIcon={<IconFolderPlus size={20} />}
              actionColor="green"
              onActionClick={() => {
                openAddGroupModal({
                  initialSelectedIds: deduplicatedPersonIds,
                  initialLabel: search.trim(),
                  onCreated: (newGroup) => {
                    setGroups((prev) => [...prev, newGroup]);
                    setInitialSelectedGroupIds((prev) => new Set([...prev, newGroup.id]));
                    setSelectedGroupIds((prev) => new Set([...prev, newGroup.id]));
                  },
                });
              }}
            />
          </Box>

          {filteredGroups.length === 0 ? (
            groups.length > 0 && search.trim() ? (
              <Text c="dimmed" ta="center" py="lg" style={{ width: "100%" }}>
                {t("NoGroupsMatch")}
              </Text>
            ) : null
          ) : (
            filteredGroups.map((group) => (
              <UnstyledButton
                key={group.id}
                onClick={() => handleToggleGroup(group.id)}
                style={{
                  textAlign: "left",
                  flex: `1 1 ${modalGroupCardWidth}`,
                  width: modalGroupCardWidth,
                  maxWidth: modalGroupCardWidth,
                }}
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
                    <Box pos="relative">
                      {selectionState === "remove" && (
                        <Badge
                          size="xs"
                          leftSection={<IconMinus size={10} />}
                          className="top-2 absolute right-2 z-10"
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
                          size="xs"
                          leftSection={<IconPlus size={10} />}
                          className="top-2 absolute right-2 z-10"
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
                          size="xs"
                          className="top-2 absolute right-2 z-10"
                          style={{
                            backgroundColor: "var(--mantine-primary-color-filled)",
                            color: "var(--mantine-color-white)",
                          }}
                        >
                          {t("BadgeAlreadyPartOf")}
                        </Badge>
                      )}

                      <GroupCard
                        group={group}
                        onClick={() => {}}
                        onAddPeople={() => {}}
                        onEdit={() => {}}
                        onDuplicate={() => {}}
                        onDelete={() => {}}
                        interactive={false}
                        cursorType="pointer"
                        variant={modalGroupCardVariant}
                        showMenu={false}
                        selected={isCurrentlySelected}
                        highlightColor={
                          selectionState === "add"
                            ? "green"
                            : selectionState === "remove"
                              ? "red"
                              : selectionState === "already"
                                ? "primary"
                                : undefined
                        }
                      />
                    </Box>
                  );
                })()}
              </UnstyledButton>
            ))
          )}
        </Group>
      </ScrollArea>

      <ModalFooter
        cancelLabel={t("Cancel")}
        onCancel={() => modals.close(modalId)}
        cancelDisabled={isSubmitting}
        actionLabel={t("Submit")}
        onAction={() => {
          void handleSubmit();
        }}
        actionLoading={isSubmitting}
        actionDisabled={deduplicatedPersonIds.length === 0 || isSubmitting}
        actionLeftSection={<IconUsersGroup size={16} />}
      />
    </Stack>
  );
}
