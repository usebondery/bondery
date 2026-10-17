import type { Group, GroupWithCount } from "@bondery/schemas";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SelectOptionRow, SelectSheet } from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import {
  useCommonTranslations,
  useMobileContactDetailTranslations,
  useMobileContactsTranslations,
} from "@/lib/i18n/generated/hooks";
import { mapGroupToSelectItem } from "@/lib/select/mapGroupToSelectItem";
import { addContactsToGroup, removeContactsFromGroup } from "../../../lib/domains/groups";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { syncEffectState } from "../../../lib/react/syncEffectState";
import { getContactGroups, listGroups } from "../../../lib/sync/hooks/useSyncQuery";
import { notifications } from "../../../lib/toast/notifications";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { filterGroups } from "../groupListSearch";

interface ContactEditGroupsSheetProps {
  contactId: string;
  contactName: string;
  onGroupsReplaced: (groups: Group[]) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function setsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

export function ContactEditGroupsSheet({
  open,
  onOpenChange,
  contactId,
  contactName: _contactName,
  onGroupsReplaced,
}: ContactEditGroupsSheetProps) {
  const tMobileContactDetail = useMobileContactDetailTranslations();
  const tMobileContacts = useMobileContactsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();

  const [query, setQuery] = useState("");
  const [allGroups, setAllGroups] = useState<GroupWithCount[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(() => new Set());

  const filteredGroups = useMemo(() => filterGroups(allGroups, query), [allGroups, query]);
  const hasChanges = useMemo(
    () => !setsEqual(initialSelectedIds, selectedGroupIds),
    [initialSelectedIds, selectedGroupIds],
  );

  useEffect(() => {
    if (!open) {
      syncEffectState(() => {
        setQuery("");
        setAllGroups([]);
        setSelectedGroupIds(new Set());
        setInitialSelectedIds(new Set());
      });
      return;
    }

    let cancelled = false;
    syncEffectState(() => {
      setIsLoadingGroups(true);
    });

    void Promise.resolve()
      .then(() => {
        if (cancelled) {
          return;
        }

        const groups = listGroups();
        setAllGroups(groups);
        const memberIds = new Set(getContactGroups(contactId).map((group) => group.id));
        setInitialSelectedIds(memberIds);
        setSelectedGroupIds(new Set(memberIds));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        notifications.show({
          message: tMobileContactDetail("GroupsLoadError"),
          title: t("feedback.errorTitle"),
          type: "error",
        });
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingGroups(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contactId, onOpenChange, open, tMobileContactDetail, t]);

  const handleCloseSheet = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSaveError = useCallback(() => {
    notifications.show({
      message: tMobileContactDetail("EditGroupsFailed"),
      title: t("feedback.errorTitle"),
      type: "error",
    });
  }, [t, tMobileContactDetail]);

  const performSave = useCallback(() => {
    const added = [...selectedGroupIds].filter((groupId) => !initialSelectedIds.has(groupId));
    const removed = [...initialSelectedIds].filter((groupId) => !selectedGroupIds.has(groupId));

    for (const groupId of added) {
      addContactsToGroup(groupId, [contactId]);
    }
    for (const groupId of removed) {
      removeContactsFromGroup(groupId, [contactId]);
    }

    return allGroups.filter((group) => selectedGroupIds.has(group.id));
  }, [allGroups, contactId, initialSelectedIds, selectedGroupIds]);

  const handleSaveSuccess = useCallback(
    (newGroups: Group[]) => {
      onGroupsReplaced(newGroups);
    },
    [onGroupsReplaced],
  );

  const { isSubmitting, submit } = useSheetLocalAction({
    onClose: handleCloseSheet,
    onError: handleSaveError,
    onSuccess: handleSaveSuccess,
    perform: performSave,
  });

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    onOpenChange(false);
  }

  function toggleGroup(groupId: string) {
    if (isSubmitting || isLoadingGroups) {
      return;
    }

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

  const canSave = hasChanges && !isSubmitting && !isLoadingGroups;

  const listEmpty = isLoadingGroups ? (
    <View className="items-center py-8">
      <ActivityIndicator color={colors.primary} size="small" />
    </View>
  ) : (
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
          disabled: !canSave,
          label: tMobileContactDetail("EditGroupsSave"),
          loading: isSubmitting,
          loadingText: t("feedback.saving"),
          onPress: submit,
          tone: "primary",
          variant: "filled",
        },
      ]}
      data={isLoadingGroups ? [] : filteredGroups}
      emptyLabel={t("feedback.noResults")}
      emptyState={allGroups.length === 0 || isLoadingGroups ? listEmpty : undefined}
      isBusy={isSubmitting}
      keyExtractor={(item) => item.id}
      onClose={handleClose}
      onQueryChange={setQuery}
      opened={open}
      query={query}
      renderItem={({ item }) => (
        <SelectOptionRow
          disabled={isSubmitting || isLoadingGroups}
          isSelected={selectedGroupIds.has(item.id)}
          mode="multiple"
          onPress={() => toggleGroup(item.id)}
          option={mapGroupToSelectItem(item, colors.borderStrong)}
        />
      )}
      searchable
      searchPlaceholder={tMobileContacts("AddToGroupsSearchPlaceholder")}
      snapPoint="selectSearch"
      title={tMobileContactDetail("EditGroupsSheetTitle")}
    />
  );
}
