import { IconPencil } from "@tabler/icons-react-native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Group, GroupWithCount } from "@bondery/schemas";
import { LoadErrorCard } from "../../../components/load-state";
import { groupsDomain } from "../../../lib/domains/groups";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobilePreferences } from "../../../lib/preferences/useMobilePreferences";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { sortGroups } from "../groupSort";
import { useNavigateToGroup } from "../hooks/useNavigateToGroup";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { ContactEditGroupsSheet } from "./ContactEditGroupsSheet";
import { ContactsGroupsHeader } from "./ContactsGroupsHeader";
import { GroupEditSheet } from "./GroupEditSheet";

interface ContactGroupsSectionProps {
  contactId: string;
  contactName: string;
  groups: GroupWithCount[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onGroupAdded: (group: Group) => void;
  onGroupsReplaced: (groups: Group[]) => void;
}

function GroupsLoadingSkeleton() {
  const colors = useMobileThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.groupsRow}
    >
      {[72, 96, 84].map((width, index) => (
        <View
          key={index}
          style={[
            styles.skeletonChip,
            { width, backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        />
      ))}
    </ScrollView>
  );
}

export function ContactGroupsSection({
  contactId,
  contactName,
  groups,
  loading,
  error,
  onRetry,
  onGroupAdded,
  onGroupsReplaced,
}: ContactGroupsSectionProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const navigateToGroup = useNavigateToGroup();
  const groupSortOrder = useMobilePreferences((state) => state.groupSortOrder);
  const groupLastOpenedAt = useMobilePreferences((state) => state.groupLastOpenedAt);
  const [isEditSheetOpen, setEditSheetOpen] = useState(false);
  const [isCreateGroupOpen, setCreateGroupOpen] = useState(false);

  const sortedGroups = useMemo(
    () => sortGroups(groups, groupSortOrder, groupLastOpenedAt),
    [groupLastOpenedAt, groupSortOrder, groups],
  );

  const editAccessibilityLabel = t("MobileApp.ContactDetail.GroupsEditAccessibility").replace(
    "{name}",
    contactName,
  );

  const handleGroupCreated = useCallback(
    (group: Group) => {
      try {
        groupsDomain.addMembers(group.id, [contactId]);
        onGroupAdded(group);
      } catch {
        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.Groups.CreateFailed"),
        });
      }
    },
    [contactId, onGroupAdded, showToast, t],
  );

  return (
    <View style={styles.section}>
      <ContactDetailSectionHeader
        titleKey="MobileApp.Contacts.Groups"
        action={
          loading || error
            ? undefined
            : {
                label: t("MobileApp.ContactDetail.GroupsEdit"),
                accessibilityLabel: editAccessibilityLabel,
                icon: <IconPencil size={16} stroke={colors.primary} />,
                onPress: () => setEditSheetOpen(true),
              }
        }
      />

      {loading ? (
        <GroupsLoadingSkeleton />
      ) : error ? (
        <LoadErrorCard
          title={t("MobileApp.Settings.GroupsLoadErrorTitle")}
          description={error}
          onRetry={onRetry}
        />
      ) : (
        <ContactsGroupsHeader
          layout="chipRow"
          groups={sortedGroups}
          onGroupPress={(group) => navigateToGroup(group)}
          onCreatePress={() => setCreateGroupOpen(true)}
        />
      )}

      <GroupEditSheet
        mode="create"
        open={isCreateGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onCreated={handleGroupCreated}
      />

      <ContactEditGroupsSheet
        open={isEditSheetOpen}
        onOpenChange={setEditSheetOpen}
        contactId={contactId}
        contactName={contactName}
        onGroupsReplaced={onGroupsReplaced}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    gap: 8,
  },
  groupsRow: {
    gap: 8,
  },
  skeletonChip: {
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
  },
});
