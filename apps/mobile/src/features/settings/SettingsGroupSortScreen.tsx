import type { GroupWithCount } from "@bondery/schemas";
import { IconPlus } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { updateSettings } from "../../lib/api/client";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import type {
  GroupSortOrder,
  MobilePreferencesState,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useGroups } from "../../lib/sync/hooks/useSyncQuery";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactsGroupsHeader } from "../contacts/components/ContactsGroupsHeader";
import { GroupEditSheet } from "../contacts/components/GroupEditSheet";
import { sortGroups } from "../contacts/groupSort";
import { SettingsAsyncState } from "./components/SettingsAsyncState";
import { SettingsFieldLabel } from "./components/SettingsFieldLabel";
import { SettingsPreviewSection } from "./components/SettingsPreviewSection";
import { SettingsSelect } from "./components/SettingsSelect";

export function SettingsGroupSortScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { data: syncedGroups, isInitialSync, refresh: refreshGroups } = useGroups();
  const [loadError, _setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithCount | null>(null);

  const groupSortOrder = useMobilePreferences(
    (state: MobilePreferencesState) => state.groupSortOrder,
  );
  const groupLastOpenedAt = useMobilePreferences(
    (state: MobilePreferencesState) => state.groupLastOpenedAt,
  );
  const setGroupSortOrder = useMobilePreferences(
    (state: MobilePreferencesState) => state.setGroupSortOrder,
  );

  const isLoading = isInitialSync && syncedGroups.length === 0;

  const reloadGroups = useCallback(() => {
    refreshGroups();
  }, [refreshGroups]);

  const previewGroups = useMemo(
    () => sortGroups(syncedGroups, groupSortOrder, groupLastOpenedAt),
    [groupLastOpenedAt, groupSortOrder, syncedGroups],
  );

  const manageGroups = useMemo(
    () => sortGroups(syncedGroups, "alpha-asc", groupLastOpenedAt),
    [groupLastOpenedAt, syncedGroups],
  );

  const sortOptions: Array<{ value: GroupSortOrder; label: string }> = [
    {
      label: t("GroupSortRecentOpened", { ns: "MobileSettings" }),
      value: "recent-opened",
    },
    { label: t("GroupSortCountDesc", { ns: "MobileSettings" }), value: "count-desc" },
    { label: t("GroupSortCountAsc", { ns: "MobileSettings" }), value: "count-asc" },
    { label: t("GroupSortAlphaAsc", { ns: "MobileSettings" }), value: "alpha-asc" },
    { label: t("GroupSortAlphaDesc", { ns: "MobileSettings" }), value: "alpha-desc" },
  ];

  const handleSortChange = (nextOrder: GroupSortOrder) => {
    if (nextOrder === groupSortOrder) {
      return;
    }

    setGroupSortOrder(nextOrder);
    void updateSettings({ groupSortOrder: nextOrder });
  };

  const handleGroupCreated = useCallback(() => {
    refreshGroups();
  }, [refreshGroups]);

  const handleGroupSaved = useCallback(() => {
    setEditingGroup(null);
    refreshGroups();
  }, [refreshGroups]);

  const handleGroupDeleted = useCallback(() => {
    setEditingGroup(null);
    refreshGroups();
  }, [refreshGroups]);

  const previewCaption =
    syncedGroups.length === 0 && !isLoading && !loadError
      ? t("PreviewHintGroupsEmpty", { ns: "MobileSettings" })
      : t("PreviewHintGroups", { ns: "MobileSettings" });

  const createButton = (
    <Pressable
      accessibilityLabel={t("CreateGroup", { ns: "MobileGroups" })}
      accessibilityRole="button"
      hitSlop={MOBILE_HIT_SLOP}
      onPress={() => setCreateOpen(true)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <IconPlus size={22} stroke={colors.primary} />
    </Pressable>
  );

  return (
    <>
      <StackNavBar
        onBack={() => router.back()}
        right={createButton}
        title={t("GroupSort", { ns: "MobileSettings" })}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <SettingsFieldLabel>
          {t("GroupSortSelectLabel", { ns: "MobileSettings" })}
        </SettingsFieldLabel>
        <SettingsSelect
          label={t("GroupSortSelectLabel", { ns: "MobileSettings" })}
          onValueChange={handleSortChange}
          options={sortOptions}
          value={groupSortOrder}
        />

        <SettingsPreviewSection caption={previewCaption}>
          <SettingsAsyncState
            errorDescription={loadError}
            errorTitle={t("GroupsLoadErrorTitle", { ns: "MobileSettings" })}
            isLoading={isLoading}
            onRetry={() => {
              void reloadGroups();
            }}
          >
            <ContactsGroupsHeader
              groups={previewGroups}
              isClickable={false}
              layout="chipRow"
              shouldShowCreateAction={false}
              showEmptyPlaceholder
            />
          </SettingsAsyncState>
        </SettingsPreviewSection>

        {!isLoading && !loadError ? (
          <>
            <SettingsFieldLabel>{t("ManageGroups", { ns: "MobileSettings" })}</SettingsFieldLabel>
            <ContactsGroupsHeader
              groups={manageGroups}
              layout="wrap"
              onCreatePress={() => setCreateOpen(true)}
              onGroupPress={(group) => setEditingGroup(group)}
            />
          </>
        ) : null}
      </ScrollView>

      <GroupEditSheet
        mode="create"
        onCreated={handleGroupCreated}
        onOpenChange={setCreateOpen}
        open={isCreateOpen}
      />

      <GroupEditSheet
        groupId={editingGroup?.id ?? ""}
        initialColor={editingGroup?.color ?? ""}
        initialEmoji={editingGroup?.emoji ?? ""}
        initialLabel={editingGroup?.label ?? ""}
        mode="edit"
        onDeleted={handleGroupDeleted}
        onOpenChange={(open) => {
          if (!open) {
            setEditingGroup(null);
          }
        }}
        onSaved={handleGroupSaved}
        open={editingGroup !== null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
  },
  screen: {
    flex: 1,
  },
});
