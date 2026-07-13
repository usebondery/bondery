import type { Group, GroupWithCount } from "@bondery/schemas";
import { XStack } from "@tamagui/stacks";
import { Paragraph } from "@tamagui/text";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCommonTranslations,
  useMobileContactDetailTranslations,
  useMobileContactsTranslations,
} from "@/lib/i18n/generated/hooks";
import { SearchActionSheet } from "../../../components/SearchActionSheet";
import { MOBILE_OPACITY } from "../../../lib/config";
import { addContactsToGroup, removeContactsFromGroup } from "../../../lib/domains/groups";
import { getContactGroups, listGroups } from "../../../lib/sync/hooks/useSyncQuery";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { GroupSelectRow } from "./GroupSelectRow";

interface ContactEditGroupsSheetProps {
  contactId: string;
  contactName: string;
  onGroupsReplaced: (groups: Group[]) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function filterGroups(groups: GroupWithCount[], query: string): GroupWithCount[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return groups;
  }

  return groups.filter((group) => {
    const haystack = `${group.label} ${group.emoji ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
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
  const { showToast } = useAppToast();

  const [query, setQuery] = useState("");
  const [allGroups, setAllGroups] = useState<GroupWithCount[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(() => new Set());

  const filteredGroups = useMemo(() => filterGroups(allGroups, query), [allGroups, query]);
  const hasChanges = useMemo(
    () => !setsEqual(initialSelectedIds, selectedGroupIds),
    [initialSelectedIds, selectedGroupIds],
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setAllGroups([]);
      setSelectedGroupIds(new Set());
      setInitialSelectedIds(new Set());
      return;
    }

    let cancelled = false;
    setIsLoadingGroups(true);

    void Promise.resolve()
      .then(() => {
        if (cancelled) {
          return;
        }

        const allGroups = listGroups();
        setAllGroups(allGroups);
        const memberIds = new Set(getContactGroups(contactId).map((group) => group.id));
        setInitialSelectedIds(memberIds);
        setSelectedGroupIds(new Set(memberIds));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        showToast({
          description: tMobileContactDetail("GroupsLoadError"),
          headline: t("feedback.errorTitle"),
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
  }, [contactId, onOpenChange, open, showToast, tMobileContactDetail, t]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isSaving) {
      return;
    }

    onOpenChange(nextOpen);
  }

  function handleClose() {
    if (isSaving) {
      return;
    }

    onOpenChange(false);
  }

  function toggleGroup(groupId: string) {
    if (isSaving || isLoadingGroups) {
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

  const handleSave = () => {
    void (async () => {
      if (!hasChanges || isSaving) {
        return;
      }

      const added = [...selectedGroupIds].filter((groupId) => !initialSelectedIds.has(groupId));
      const removed = [...initialSelectedIds].filter((groupId) => !selectedGroupIds.has(groupId));

      setIsSaving(true);

      try {
        for (const groupId of added) {
          addContactsToGroup(groupId, [contactId]);
        }
        for (const groupId of removed) {
          removeContactsFromGroup(groupId, [contactId]);
        }

        const newGroups = allGroups.filter((group) => selectedGroupIds.has(group.id));
        onOpenChange(false);
        onGroupsReplaced(newGroups);
      } catch {
        showToast({
          description: tMobileContactDetail("EditGroupsFailed"),
          headline: t("feedback.errorTitle"),
          type: "error",
        });
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const renderItem = ({ item }: ListRenderItemInfo<GroupWithCount>) => (
    <GroupSelectRow
      disabled={isSaving || isLoadingGroups}
      group={item}
      isSelected={selectedGroupIds.has(item.id)}
      onToggle={() => toggleGroup(item.id)}
    />
  );

  const canSave = hasChanges && !isSaving && !isLoadingGroups;

  const sheetHeader = (
    <Paragraph
      color={colors.textPrimary}
      fontSize={MOBILE_TYPOGRAPHY.fontSize.sheetTitle}
      fontWeight={MOBILE_TYPOGRAPHY.fontWeight.bold}
    >
      {tMobileContactDetail("EditGroupsSheetTitle")}
    </Paragraph>
  );

  const sheetFooter = (
    <XStack gap={10}>
      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={handleClose}
        style={({ pressed }) => [
          styles.footerButton,
          styles.footerButtonOutline,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            opacity: isSaving ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        <Text style={[styles.footerButtonText, { color: colors.textPrimary }]}>
          {t("actions.cancel")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={!canSave}
        onPress={handleSave}
        style={({ pressed }) => [
          styles.footerButton,
          {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
            opacity: !canSave ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.textOnPrimary} size="small" />
        ) : (
          <Text style={[styles.footerButtonText, { color: colors.textOnPrimary }]}>
            {tMobileContactDetail("EditGroupsSave")}
          </Text>
        )}
      </Pressable>
    </XStack>
  );

  return (
    <SearchActionSheet
      dismissible={!isSaving}
      footer={sheetFooter}
      header={sheetHeader}
      onOpenChange={handleOpenChange}
      onQueryChange={setQuery}
      open={open}
      query={query}
      searchEditable={!isSaving && !isLoadingGroups}
      searchPlaceholder={tMobileContacts("AddToGroupsSearchPlaceholder")}
    >
      {isLoadingGroups ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : allGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Paragraph
            color={colors.textPrimary}
            fontSize={MOBILE_TYPOGRAPHY.fontSize.body}
            fontWeight={MOBILE_TYPOGRAPHY.fontWeight.semibold}
            textAlign="center"
          >
            {tMobileContacts("NoGroupsYet")}
          </Paragraph>
          <Paragraph
            color={colors.textSecondary}
            fontSize={MOBILE_TYPOGRAPHY.fontSize.caption}
            marginTop={6}
            textAlign="center"
          >
            {tMobileContacts("NoGroupsYetHint")}
          </Paragraph>
        </View>
      ) : (
        <FlatList
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.listContent}
          data={filteredGroups}
          initialNumToRender={24}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("feedback.noResults")}
            </Text>
          }
          maxToRenderPerBatch={24}
          renderItem={renderItem}
          style={styles.searchList}
          windowSize={8}
        />
      )}
    </SearchActionSheet>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    paddingVertical: 24,
    textAlign: "center",
  },
  footerButton: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: MOBILE_LAYOUT.touchTarget,
  },
  footerButtonOutline: {},
  footerButtonText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  listContent: {
    paddingBottom: 12,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  searchList: {
    flex: 1,
  },
});
