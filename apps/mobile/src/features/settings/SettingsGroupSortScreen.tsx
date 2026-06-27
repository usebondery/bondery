import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { IconPlus } from "@tabler/icons-react-native";
import type { Group, GroupWithCount } from "@bondery/schemas";
import { fetchGroups, updateSettings } from "../../lib/api/client";
import type {
  GroupSortOrder,
  MobilePreferencesState,
} from "../../lib/preferences/useMobilePreferences";
import { useGroupsStore } from "../../lib/store";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { StackNavBar } from "../../components/chrome";
import { ContactsGroupsHeader } from "../contacts/components/ContactsGroupsHeader";
import { GroupEditSheet } from "../contacts/components/GroupEditSheet";
import { sortGroups } from "../contacts/groupSort";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT } from "../../theme/tokens";
import { SettingsAsyncState } from "./components/SettingsAsyncState";
import { SettingsFieldLabel } from "./components/SettingsFieldLabel";
import { SettingsPreviewSection } from "./components/SettingsPreviewSection";
import { SettingsSelect } from "./components/SettingsSelect";

export function SettingsGroupSortScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const groupsById = useGroupsStore((state) => state.byId);
  const upsertGroup = useGroupsStore((state) => state.upsertGroup);
  const upsertGroups = useGroupsStore((state) => state.upsertGroups);
  const removeGroup = useGroupsStore((state) => state.removeGroup);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  const reloadGroups = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetchGroups();
      upsertGroups(response.groups || []);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : t("MobileApp.Settings.GroupsLoadErrorDescription"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, upsertGroups]);

  useEffect(() => {
    void reloadGroups();
  }, [reloadGroups]);

  const groups = useMemo(() => Object.values(groupsById), [groupsById]);
  const previewGroups = useMemo(
    () => sortGroups(groups, groupSortOrder, groupLastOpenedAt),
    [groupLastOpenedAt, groupSortOrder, groups],
  );

  const manageGroups = useMemo(
    () => sortGroups(groups, "alpha-asc", groupLastOpenedAt),
    [groupLastOpenedAt, groups],
  );

  const sortOptions: Array<{ value: GroupSortOrder; label: string }> = [
    {
      value: "recent-opened",
      label: t("MobileApp.Settings.GroupSortRecentOpened"),
    },
    { value: "count-desc", label: t("MobileApp.Settings.GroupSortCountDesc") },
    { value: "count-asc", label: t("MobileApp.Settings.GroupSortCountAsc") },
    { value: "alpha-asc", label: t("MobileApp.Settings.GroupSortAlphaAsc") },
    { value: "alpha-desc", label: t("MobileApp.Settings.GroupSortAlphaDesc") },
  ];

  const handleSortChange = (nextOrder: GroupSortOrder) => {
    if (nextOrder === groupSortOrder) {
      return;
    }

    setGroupSortOrder(nextOrder);
    void updateSettings({ groupSortOrder: nextOrder });
  };

  const handleGroupCreated = useCallback((group: Group) => {
    if (!group?.id || !group.label) {
      return;
    }

    upsertGroup(group);
  }, [upsertGroup]);

  const handleGroupSaved = useCallback(
    (group: Group) => {
      if (!editingGroup) {
        return;
      }

      upsertGroup({ ...group, id: editingGroup.id });
      setEditingGroup(null);
    },
    [editingGroup, upsertGroup],
  );

  const handleGroupDeleted = useCallback(() => {
    if (!editingGroup) {
      return;
    }

    removeGroup(editingGroup.id);
    setEditingGroup(null);
  }, [editingGroup, removeGroup]);

  const previewCaption =
    groups.length === 0 && !isLoading && !loadError
      ? t("MobileApp.Settings.PreviewHintGroupsEmpty")
      : t("MobileApp.Settings.PreviewHintGroups");

  const createButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("MobileApp.Groups.CreateGroup")}
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
        variant="elevated"
        title={t("MobileApp.Settings.GroupSort")}
        onBack={() => router.back()}
        right={createButton}
      />

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
        contentContainerStyle={styles.content}
      >
        <SettingsFieldLabel>
          {t("MobileApp.Settings.GroupSortSelectLabel")}
        </SettingsFieldLabel>
        <SettingsSelect
          label={t("MobileApp.Settings.GroupSortSelectLabel")}
          options={sortOptions}
          value={groupSortOrder}
          onValueChange={handleSortChange}
        />

        <SettingsPreviewSection caption={previewCaption}>
          <SettingsAsyncState
            isLoading={isLoading}
            errorTitle={t("MobileApp.Settings.GroupsLoadErrorTitle")}
            errorDescription={loadError}
            onRetry={() => {
              void reloadGroups();
            }}
          >
            <ContactsGroupsHeader
              layout="chipRow"
              groups={previewGroups}
              shouldShowCreateAction={false}
              isClickable={false}
              showEmptyPlaceholder
            />
          </SettingsAsyncState>
        </SettingsPreviewSection>

        {!isLoading && !loadError ? (
          <>
            <SettingsFieldLabel>
              {t("MobileApp.Settings.ManageGroups")}
            </SettingsFieldLabel>
            <ContactsGroupsHeader
              layout="wrap"
              groups={manageGroups}
              onGroupPress={(group) => setEditingGroup(group)}
              onCreatePress={() => setCreateOpen(true)}
            />
          </>
        ) : null}
      </ScrollView>

      <GroupEditSheet
        mode="create"
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleGroupCreated}
      />

      <GroupEditSheet
        mode="edit"
        open={editingGroup !== null}
        groupId={editingGroup?.id ?? ""}
        initialLabel={editingGroup?.label ?? ""}
        initialEmoji={editingGroup?.emoji ?? ""}
        initialColor={editingGroup?.color ?? ""}
        onOpenChange={(open) => {
          if (!open) {
            setEditingGroup(null);
          }
        }}
        onSaved={handleGroupSaved}
        onDeleted={handleGroupDeleted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    gap: 16,
  },
});
