import type { GroupWithCount } from "@bondery/schemas";
import { IconPlus } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { ActionIcon } from "../../components/ui/ActionIcon";
import { InputWrapper } from "../../components/ui/InputWrapper";
import { Select } from "../../components/ui/Select";
import { Stack } from "../../components/ui/Stack";
import { updateSettings } from "../../lib/api/client";
import {
  useCommonTranslations,
  useMobileGroupsTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import type {
  GroupSortOrder,
  MobilePreferencesState,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useGroups } from "../../lib/sync/hooks/useSyncQuery";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactsGroupFilterField } from "../contacts/components/ContactsGroupFilterField";
import { ContactsGroupsHeader } from "../contacts/components/ContactsGroupsHeader";
import { GroupEditSheet } from "../contacts/components/GroupEditSheet";
import { sortGroups } from "../contacts/groupSort";
import { SettingsAsyncState } from "./components/SettingsAsyncState";
import { SettingsPreviewSection } from "./components/SettingsPreviewSection";

export function SettingsGroupsScreen() {
  const tMobileGroups = useMobileGroupsTranslations();
  const tMobileSettings = useMobileSettingsTranslations();
  const _t = useCommonTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const { data: syncedGroups, isInitialSync, refresh: refreshGroups } = useGroups();
  const [loadError, _setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithCount | null>(null);
  const [previewSelectedGroupId, setPreviewSelectedGroupId] = useState<string | null>(null);

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

  function reloadGroups() {
    refreshGroups();
  }

  const previewGroups = sortGroups(syncedGroups, groupSortOrder, groupLastOpenedAt);
  const manageGroups = sortGroups(syncedGroups, "alpha-asc", groupLastOpenedAt);

  const sortOptions: Array<{ value: GroupSortOrder; label: string }> = [
    {
      label: tMobileSettings("GroupSortRecentOpened"),
      value: "recent-opened",
    },
    { label: tMobileSettings("GroupSortCountDesc"), value: "count-desc" },
    { label: tMobileSettings("GroupSortCountAsc"), value: "count-asc" },
    { label: tMobileSettings("GroupSortAlphaAsc"), value: "alpha-asc" },
    { label: tMobileSettings("GroupSortAlphaDesc"), value: "alpha-desc" },
  ];

  const handleSortChange = (nextOrder: GroupSortOrder) => {
    if (nextOrder === groupSortOrder) {
      return;
    }

    setGroupSortOrder(nextOrder);
    void updateSettings({ groupSortOrder: nextOrder });
  };

  function handleGroupCreated() {
    refreshGroups();
  }

  function handleGroupSaved() {
    setEditingGroup(null);
    refreshGroups();
  }

  function handleGroupDeleted() {
    setEditingGroup(null);
    refreshGroups();
  }

  const previewDescription =
    syncedGroups.length === 0 && !isLoading && !loadError
      ? tMobileSettings("PreviewHintGroupsEmpty")
      : tMobileSettings("PreviewHintGroups");

  return (
    <>
      <StackNavBar
        onBack={() => goBackOrReplace(router, "/settings")}
        right={
          <ActionIcon
            accessibilityLabel={tMobileGroups("CreateGroup")}
            onPress={() => setCreateOpen(true)}
          >
            <IconPlus size={22} stroke={colors.primary} />
          </ActionIcon>
        }
        title={tMobileSettings("Groups")}
        variant="elevated"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
          paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
          paddingTop: MOBILE_LAYOUT.spacing.contentTop,
        }}
        style={{ backgroundColor: colors.appBackground }}
      >
        <Stack gap="lg">
          <Select
            data={sortOptions}
            label={tMobileSettings("GroupSortSelectLabel")}
            onChange={handleSortChange}
            value={groupSortOrder}
          />

          <SettingsPreviewSection description={previewDescription}>
            <SettingsAsyncState
              errorDescription={loadError}
              errorTitle={tMobileSettings("GroupsLoadErrorTitle")}
              isLoading={isLoading}
              onRetry={() => {
                void reloadGroups();
              }}
            >
              <ContactsGroupFilterField
                groups={previewGroups}
                isDisabled={isLoading}
                selectedGroupId={previewSelectedGroupId}
                selectGroup={setPreviewSelectedGroupId}
                showCreateGroupAction={false}
              />
            </SettingsAsyncState>
          </SettingsPreviewSection>

          {!isLoading && !loadError ? (
            <InputWrapper label={tMobileSettings("ManageGroups")}>
              <ContactsGroupsHeader
                groups={manageGroups}
                layout="wrap"
                onCreatePress={() => setCreateOpen(true)}
                onGroupPress={(group) => setEditingGroup(group)}
              />
            </InputWrapper>
          ) : null}
        </Stack>
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
