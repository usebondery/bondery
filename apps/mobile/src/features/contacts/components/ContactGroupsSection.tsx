import type { Group, GroupWithCount } from "@bondery/schemas";
import { IconPencil } from "@tabler/icons-react-native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { LoadErrorCard } from "../../../components/load-state";
import { addContactsToGroup } from "../../../lib/domains/groups";
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
  error: string | null;
  groups: GroupWithCount[];
  loading: boolean;
  onGroupAdded: (group: Group) => void;
  onGroupsReplaced: (groups: Group[]) => void;
  onRetry: () => void;
}

function GroupsLoadingSkeleton() {
  const colors = useMobileThemeColors();

  return (
    <ScrollView
      contentContainerStyle={styles.groupsRow}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {[72, 96, 84].map((width) => (
        <View
          key={width}
          style={[
            styles.skeletonChip,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border, width },
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

  const editAccessibilityLabel = t("GroupsEditAccessibility", {
    ns: "MobileContactDetail",
  }).replace("{name}", contactName);

  const handleGroupCreated = useCallback(
    (group: Group) => {
      try {
        addContactsToGroup(group.id, [contactId]);
        onGroupAdded(group);
      } catch {
        showToast({
          description: t("CreateFailed", { ns: "MobileGroups" }),
          headline: t("feedback.errorTitle", { ns: "common" }),
          type: "error",
        });
      }
    },
    [contactId, onGroupAdded, showToast, t],
  );

  return (
    <View style={styles.section}>
      <ContactDetailSectionHeader
        action={
          loading || error
            ? undefined
            : {
                accessibilityLabel: editAccessibilityLabel,
                icon: <IconPencil size={16} stroke={colors.primary} />,
                label: t("GroupsEdit", { ns: "MobileContactDetail" }),
                onPress: () => setEditSheetOpen(true),
              }
        }
        titleKey="Groups"
        titleNamespace="MobileContacts"
      />

      {loading ? (
        <GroupsLoadingSkeleton />
      ) : error ? (
        <LoadErrorCard
          description={error}
          onRetry={onRetry}
          title={t("GroupsLoadErrorTitle", { ns: "MobileSettings" })}
        />
      ) : (
        <ContactsGroupsHeader
          groups={sortedGroups}
          layout="chipRow"
          onCreatePress={() => setCreateGroupOpen(true)}
          onGroupPress={(group) => navigateToGroup(group)}
        />
      )}

      <GroupEditSheet
        mode="create"
        onCreated={handleGroupCreated}
        onOpenChange={setCreateGroupOpen}
        open={isCreateGroupOpen}
      />

      <ContactEditGroupsSheet
        contactId={contactId}
        contactName={contactName}
        onGroupsReplaced={onGroupsReplaced}
        onOpenChange={setEditSheetOpen}
        open={isEditSheetOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  groupsRow: {
    gap: 8,
  },
  section: {
    gap: 8,
    marginBottom: 24,
  },
  skeletonChip: {
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
  },
});
