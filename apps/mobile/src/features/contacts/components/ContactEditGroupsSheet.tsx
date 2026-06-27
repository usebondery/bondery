import { XStack } from "@tamagui/stacks";
import { Paragraph } from "@tamagui/text";
import type { Group, GroupWithCount } from "@bondery/schemas";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";
import {
  addContactsToGroup,
  fetchContactGroups,
  fetchGroups,
  removeGroupMembers,
} from "../../../lib/api/client";
import { MOBILE_OPACITY } from "../../../lib/config";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { SearchActionSheet } from "../../../components/SearchActionSheet";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { GroupSelectRow } from "./GroupSelectRow";

interface ContactEditGroupsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  onGroupsReplaced: (groups: Group[]) => void;
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
  const t = useMobileTranslations();
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

    void Promise.all([fetchGroups(), fetchContactGroups(contactId)])
      .then(([groupsResponse, membershipResponse]) => {
        if (cancelled) {
          return;
        }

        setAllGroups(groupsResponse.groups);
        const memberIds = new Set(membershipResponse.groups.map((group) => group.id));
        setInitialSelectedIds(memberIds);
        setSelectedGroupIds(new Set(memberIds));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.ContactDetail.GroupsLoadError"),
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
  }, [contactId, onOpenChange, open, showToast, t]);

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
        await Promise.all([
          ...added.map((groupId) =>
            addContactsToGroup(groupId, { personIds: [contactId] }),
          ),
          ...removed.map((groupId) =>
            removeGroupMembers(groupId, { personIds: [contactId] }),
          ),
        ]);

        const newGroups = allGroups.filter((group) => selectedGroupIds.has(group.id));
        onOpenChange(false);
        onGroupsReplaced(newGroups);
      } catch {
        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.ContactDetail.EditGroupsFailed"),
        });
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const renderItem = ({ item }: ListRenderItemInfo<GroupWithCount>) => (
    <GroupSelectRow
      group={item}
      isSelected={selectedGroupIds.has(item.id)}
      onToggle={() => toggleGroup(item.id)}
      disabled={isSaving || isLoadingGroups}
    />
  );

  const canSave = hasChanges && !isSaving && !isLoadingGroups;

  const sheetHeader = (
    <Paragraph
      fontSize={MOBILE_TYPOGRAPHY.fontSize.sheetTitle}
      fontWeight={MOBILE_TYPOGRAPHY.fontWeight.bold}
      color={colors.textPrimary}
    >
      {t("MobileApp.ContactDetail.EditGroupsSheetTitle")}
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
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
            opacity: isSaving ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        <Text style={[styles.footerButtonText, { color: colors.textPrimary }]}>
          {t("MobileApp.Common.Cancel")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={!canSave}
        onPress={handleSave}
        style={({ pressed }) => [
          styles.footerButton,
          {
            borderColor: colors.primary,
            backgroundColor: colors.primary,
            opacity: !canSave ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <Text style={[styles.footerButtonText, { color: colors.textOnPrimary }]}>
            {t("MobileApp.ContactDetail.EditGroupsSave")}
          </Text>
        )}
      </Pressable>
    </XStack>
  );

  return (
    <SearchActionSheet
      open={open}
      onOpenChange={handleOpenChange}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={t("MobileApp.Contacts.AddToGroupsSearchPlaceholder")}
      searchEditable={!isSaving && !isLoadingGroups}
      dismissible={!isSaving}
      header={sheetHeader}
      footer={sheetFooter}
    >
      {isLoadingGroups ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : allGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Paragraph
            fontSize={MOBILE_TYPOGRAPHY.fontSize.body}
            fontWeight={MOBILE_TYPOGRAPHY.fontWeight.semibold}
            color={colors.textPrimary}
            textAlign="center"
          >
            {t("MobileApp.Contacts.NoGroupsYet")}
          </Paragraph>
          <Paragraph
            fontSize={MOBILE_TYPOGRAPHY.fontSize.caption}
            color={colors.textSecondary}
            textAlign="center"
            marginTop={6}
          >
            {t("MobileApp.Contacts.NoGroupsYetHint")}
          </Paragraph>
        </View>
      ) : (
        <FlatList
          style={styles.searchList}
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          initialNumToRender={24}
          maxToRenderPerBatch={24}
          windowSize={8}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("MobileApp.Common.NoResults")}
            </Text>
          }
        />
      )}
    </SearchActionSheet>
  );
}

const styles = StyleSheet.create({
  searchList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  footerButton: {
    flex: 1,
    minHeight: MOBILE_LAYOUT.touchTarget,
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerButtonOutline: {},
  footerButtonText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
