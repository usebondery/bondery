import type { GroupWithCount } from "@bondery/schemas";
import { useEffect, useState } from "react";
import { SelectOptionRow, SelectSheet } from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import { useCommonTranslations, useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import { mapGroupToSelectItem } from "@/lib/select/mapGroupToSelectItem";
import { addContactsToGroup } from "../../../lib/domains/groups";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { syncEffectState } from "../../../lib/react/syncEffectState";
import { notifications } from "../../../lib/toast/notifications";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { useContactsEffectiveSelectedCount, useContactsSelection } from "../contactsSelectionStore";
import { filterGroups } from "../groupListSearch";
import { resolveContactsSelectionPersonIds } from "../resolveContactsSelectionPersonIds";

interface ContactsAddToGroupsSheetProps {
  debouncedQuery: string;
  filterGroupId?: string | null;
  groups: GroupWithCount[];
  /** When set, add uses these loaded group members instead of the global contact filter. */
  loadedGroupMembers?: { id: string }[];
  onGroupsReloaded: () => void;
}

export function ContactsAddToGroupsSheet({
  groups,
  debouncedQuery,
  filterGroupId,
  onGroupsReloaded,
  loadedGroupMembers,
}: ContactsAddToGroupsSheetProps) {
  const tMobileContacts = useMobileContactsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const effectiveSelectedCount = useContactsEffectiveSelectedCount();
  const isOpen = useContactsSelection((state) => state.isAddToGroupsSheetOpen);
  const setAddToGroupsSheetOpen = useContactsSelection((state) => state.setAddToGroupsSheetOpen);
  const setIsAddingToGroups = useContactsSelection((state) => state.setIsAddingToGroups);
  const exitSelectionMode = useContactsSelection((state) => state.exitSelectionMode);

  const [query, setQuery] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set());

  const filteredGroups = filterGroups(groups, query);

  const subtitle =
    effectiveSelectedCount === 1
      ? tMobileContacts("AddToGroupsSheetSubtitleSingular")
      : tMobileContacts("AddToGroupsSheetSubtitle").replace(
          "{count}",
          String(effectiveSelectedCount),
        );

  useEffect(() => {
    if (!isOpen) {
      syncEffectState(() => {
        setQuery("");
        setSelectedGroupIds(new Set());
      });
    }
  }, [isOpen]);

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setAddToGroupsSheetOpen(false);
  }

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  }

  function handleCloseSheet() {
    setAddToGroupsSheetOpen(false);
  }

  function handleAddError() {
    notifications.show({
      message: tMobileContacts("AddToGroupsFailed"),
      title: t("feedback.errorTitle"),
      type: "error",
    });
  }

  function performAdd() {
    const selectionState = useContactsSelection.getState();
    const scope = loadedGroupMembers
      ? { loadedGroupMembers }
      : filterGroupId
        ? { groupId: filterGroupId }
        : undefined;
    const personIds = resolveContactsSelectionPersonIds(selectionState, debouncedQuery, scope);
    const targetGroupIds = Array.from(selectedGroupIds);

    for (const groupId of targetGroupIds) {
      addContactsToGroup(groupId, personIds);
    }
  }

  function handleAddSuccess() {
    exitSelectionMode();
    onGroupsReloaded();
  }

  const { isSubmitting, submit: submitAdd } = useSheetLocalAction({
    onClose: handleCloseSheet,
    onError: handleAddError,
    onSuccess: handleAddSuccess,
    perform: performAdd,
  });

  useEffect(() => {
    syncEffectState(() => {
      setIsAddingToGroups(isSubmitting);
    });
  }, [isSubmitting, setIsAddingToGroups]);

  const handleConfirmAdd = () => {
    if (selectedGroupIds.size === 0 || isSubmitting) {
      return;
    }

    submitAdd();
  };

  const canConfirm = selectedGroupIds.size > 0 && !isSubmitting;

  const emptyState = (
    <>
      <Text className="text-center" fw={600}>
        {tMobileContacts("NoGroupsYet")}
      </Text>
      <Text c="secondary" className="mt-1.5 text-center" size="sm">
        {tMobileContacts("NoGroupsYetHint")}
      </Text>
    </>
  );

  return (
    <SelectSheet
      actions={[
        {
          disabled: isSubmitting,
          label: t("actions.cancel"),
          onPress: handleClose,
          tone: "neutral",
          variant: "outline",
        },
        {
          disabled: !canConfirm,
          label: tMobileContacts("AddToGroupsConfirm"),
          loading: isSubmitting,
          loadingText: t("feedback.adding"),
          onPress: handleConfirmAdd,
          tone: "primary",
          variant: "filled",
        },
      ]}
      data={filteredGroups}
      emptyLabel={t("feedback.noResults")}
      emptyState={groups.length === 0 ? emptyState : undefined}
      isBusy={isSubmitting}
      keyExtractor={(item) => item.id}
      onClose={handleClose}
      onQueryChange={setQuery}
      opened={isOpen}
      query={query}
      renderItem={({ item }) => (
        <SelectOptionRow
          isSelected={selectedGroupIds.has(item.id)}
          mode="multiple"
          onPress={() => toggleGroup(item.id)}
          option={mapGroupToSelectItem(item, colors.borderStrong)}
        />
      )}
      searchable
      searchPlaceholder={tMobileContacts("AddToGroupsSearchPlaceholder")}
      snapPoint="selectSearch"
      subtitle={subtitle}
      title={tMobileContacts("AddToGroupsSheetTitle")}
    />
  );
}
