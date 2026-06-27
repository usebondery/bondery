import { XStack } from "@tamagui/stacks";
import { Paragraph } from "@tamagui/text";
import type { GroupWithCount } from "@bondery/schemas";
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
import { addContactsToGroup } from "../../../lib/api/client";
import { MOBILE_OPACITY } from "../../../lib/config";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { SearchActionSheet } from "../../../components/SearchActionSheet";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { buildContactsSelectionGroupPayload } from "../buildContactsSelectionGroupPayload";
import { buildGroupSelectionMemberPersonIds } from "../buildGroupSelectionMemberPersonIds";
import {
  useContactsEffectiveSelectedCount,
  useContactsSelection,
} from "../contactsSelectionStore";
import { GroupSelectRow } from "./GroupSelectRow";

interface ContactsAddToGroupsSheetProps {
  groups: GroupWithCount[];
  debouncedQuery: string;
  onGroupsReloaded: () => Promise<void>;
  /** When set, add uses these loaded group members instead of the global contact filter. */
  loadedGroupMembers?: { id: string }[];
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
      ? t("MobileApp.Contacts.AddToGroupsSheetSubtitleSingular")
      : t("MobileApp.Contacts.AddToGroupsSheetSubtitle").replace(
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
      const body = loadedGroupMembers
        ? { personIds: buildGroupSelectionMemberPersonIds(selectionState, loadedGroupMembers) }
        : buildContactsSelectionGroupPayload(selectionState, debouncedQuery);
      const targetGroupIds = Array.from(selectedGroupIds);

      setIsAddingToGroups(true);

      try {
        await Promise.all(targetGroupIds.map((groupId) => addContactsToGroup(groupId, body)));

        setAddToGroupsSheetOpen(false);
        exitSelectionMode();
        await onGroupsReloaded();
      } catch {
        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.Contacts.AddToGroupsFailed"),
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
        fontSize={MOBILE_TYPOGRAPHY.fontSize.sheetTitle}
        fontWeight={MOBILE_TYPOGRAPHY.fontWeight.bold}
        color={colors.textPrimary}
      >
        {t("MobileApp.Contacts.AddToGroupsSheetTitle")}
      </Paragraph>
      <Paragraph
        fontSize={MOBILE_TYPOGRAPHY.fontSize.caption}
        color={colors.textSecondary}
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
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
            opacity: isAddingToGroups ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        <Text style={[styles.footerButtonText, { color: colors.textSecondary }]}>
          {t("MobileApp.Common.Cancel")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={!canConfirm}
        onPress={handleConfirmAdd}
        style={({ pressed }) => [
          styles.footerButton,
          {
            borderColor: colors.primary,
            backgroundColor: colors.primary,
            opacity: !canConfirm ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        {isAddingToGroups ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <Text style={[styles.footerButtonText, { color: colors.textOnPrimary }]}>
            {t("MobileApp.Contacts.AddToGroupsConfirm")}
          </Text>
        )}
      </Pressable>
    </XStack>
  );

  return (
    <SearchActionSheet
      open={isOpen}
      onOpenChange={handleOpenChange}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={t("MobileApp.Contacts.AddToGroupsSearchPlaceholder")}
      searchEditable={!isAddingToGroups}
      dismissible={!isAddingToGroups}
      header={sheetHeader}
      footer={sheetFooter}
    >
      {groups.length === 0 ? (
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
