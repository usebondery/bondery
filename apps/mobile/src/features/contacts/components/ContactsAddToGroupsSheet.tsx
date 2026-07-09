import type { GroupWithCount } from "@bondery/schemas";
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
import { SearchActionSheet } from "../../../components/SearchActionSheet";
import { MOBILE_OPACITY } from "../../../lib/config";
import { addContactsToGroup } from "../../../lib/domains/groups";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { useContactsEffectiveSelectedCount, useContactsSelection } from "../contactsSelectionStore";
import { resolveContactsSelectionPersonIds } from "../resolveContactsSelectionPersonIds";
import { GroupSelectRow } from "./GroupSelectRow";

interface ContactsAddToGroupsSheetProps {
  debouncedQuery: string;
  groups: GroupWithCount[];
  /** When set, add uses these loaded group members instead of the global contact filter. */
  loadedGroupMembers?: { id: string }[];
  onGroupsReloaded: () => Promise<void>;
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

export function ContactsAddToGroupsSheet({
  groups,
  debouncedQuery,
  onGroupsReloaded,
  loadedGroupMembers,
}: ContactsAddToGroupsSheetProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const effectiveSelectedCount = useContactsEffectiveSelectedCount();
  const isOpen = useContactsSelection((state) => state.isAddToGroupsSheetOpen);
  const isAddingToGroups = useContactsSelection((state) => state.isAddingToGroups);
  const setAddToGroupsSheetOpen = useContactsSelection((state) => state.setAddToGroupsSheetOpen);
  const setIsAddingToGroups = useContactsSelection((state) => state.setIsAddingToGroups);
  const exitSelectionMode = useContactsSelection((state) => state.exitSelectionMode);

  const [query, setQuery] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set());

  const filteredGroups = useMemo(() => filterGroups(groups, query), [groups, query]);

  const subtitle =
    effectiveSelectedCount === 1
      ? t("AddToGroupsSheetSubtitleSingular", { ns: "MobileContacts" })
      : t("AddToGroupsSheetSubtitle", { ns: "MobileContacts" }).replace(
          "{count}",
          String(effectiveSelectedCount),
        );

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedGroupIds(new Set());
    }
  }, [isOpen]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isAddingToGroups) {
      return;
    }

    setAddToGroupsSheetOpen(nextOpen);
  }

  function handleClose() {
    if (isAddingToGroups) {
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

  const handleConfirmAdd = () => {
    void (async () => {
      if (selectedGroupIds.size === 0) {
        return;
      }

      const selectionState = useContactsSelection.getState();
      const personIds = resolveContactsSelectionPersonIds(
        selectionState,
        debouncedQuery,
        loadedGroupMembers ? { loadedGroupMembers } : undefined,
      );
      const targetGroupIds = Array.from(selectedGroupIds);

      setIsAddingToGroups(true);

      try {
        for (const groupId of targetGroupIds) {
          addContactsToGroup(groupId, personIds);
        }

        setAddToGroupsSheetOpen(false);
        exitSelectionMode();
        await onGroupsReloaded();
      } catch {
        showToast({
          description: t("AddToGroupsFailed", { ns: "MobileContacts" }),
          headline: t("feedback.errorTitle", { ns: "common" }),
          type: "error",
        });
      } finally {
        setIsAddingToGroups(false);
      }
    })();
  };

  const renderItem = ({ item }: ListRenderItemInfo<GroupWithCount>) => (
    <GroupSelectRow
      group={item}
      isSelected={selectedGroupIds.has(item.id)}
      onToggle={() => toggleGroup(item.id)}
    />
  );

  const canConfirm = selectedGroupIds.size > 0 && !isAddingToGroups;

  const sheetHeader = (
    <>
      <Paragraph
        color={colors.textPrimary}
        fontSize={MOBILE_TYPOGRAPHY.fontSize.sheetTitle}
        fontWeight={MOBILE_TYPOGRAPHY.fontWeight.bold}
      >
        {t("AddToGroupsSheetTitle", { ns: "MobileContacts" })}
      </Paragraph>
      <Paragraph
        color={colors.textSecondary}
        fontSize={MOBILE_TYPOGRAPHY.fontSize.caption}
        marginTop={4}
      >
        {subtitle}
      </Paragraph>
    </>
  );

  const sheetFooter = (
    <XStack gap={10}>
      <Pressable
        accessibilityRole="button"
        disabled={isAddingToGroups}
        onPress={handleClose}
        style={({ pressed }) => [
          styles.footerButton,
          styles.footerButtonOutline,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            opacity: isAddingToGroups
              ? MOBILE_OPACITY.disabled
              : pressed
                ? MOBILE_OPACITY.pressed
                : 1,
          },
        ]}
      >
        <Text style={[styles.footerButtonText, { color: colors.textSecondary }]}>
          {t("actions.cancel", { ns: "common" })}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={!canConfirm}
        onPress={handleConfirmAdd}
        style={({ pressed }) => [
          styles.footerButton,
          {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
            opacity: !canConfirm ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        {isAddingToGroups ? (
          <ActivityIndicator color={colors.textOnPrimary} size="small" />
        ) : (
          <Text style={[styles.footerButtonText, { color: colors.textOnPrimary }]}>
            {t("AddToGroupsConfirm", { ns: "MobileContacts" })}
          </Text>
        )}
      </Pressable>
    </XStack>
  );

  return (
    <SearchActionSheet
      dismissible={!isAddingToGroups}
      footer={sheetFooter}
      header={sheetHeader}
      onOpenChange={handleOpenChange}
      onQueryChange={setQuery}
      open={isOpen}
      query={query}
      searchEditable={!isAddingToGroups}
      searchPlaceholder={t("AddToGroupsSearchPlaceholder", { ns: "MobileContacts" })}
    >
      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Paragraph
            color={colors.textPrimary}
            fontSize={MOBILE_TYPOGRAPHY.fontSize.body}
            fontWeight={MOBILE_TYPOGRAPHY.fontWeight.semibold}
            textAlign="center"
          >
            {t("NoGroupsYet", { ns: "MobileContacts" })}
          </Paragraph>
          <Paragraph
            color={colors.textSecondary}
            fontSize={MOBILE_TYPOGRAPHY.fontSize.caption}
            marginTop={6}
            textAlign="center"
          >
            {t("NoGroupsYetHint", { ns: "MobileContacts" })}
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
              {t("feedback.noResults", { ns: "common" })}
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
  searchList: {
    flex: 1,
  },
});
