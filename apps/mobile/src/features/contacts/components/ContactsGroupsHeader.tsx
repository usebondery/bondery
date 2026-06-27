import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { GroupWithCount } from "@bondery/schemas";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { CreateGroupChip } from "./CreateGroupChip";
import { EmptyGroupsChip } from "./EmptyGroupsChip";
import { GroupChip } from "./GroupChip";

/**
 * Where the groups row is rendered on screen.
 *
 * - `section` — Self-contained block with its own uppercase title, vertical section
 *   spacing, and horizontal inset on the chip row (Contacts tab list header).
 * - `chipRow` — Horizontal chip scroller only. Use when a parent already provides
 *   the section title and spacing (contact detail, settings preview). Omits outer
 *   vertical padding so spacing matches sibling sections.
 * - `wrap` — Wrapping chip row; all groups visible without scrolling (settings manage list).
 */
export type ContactsGroupsHeaderLayout = "section" | "chipRow" | "wrap";

interface ContactsGroupsHeaderProps {
  groups: GroupWithCount[];
  /** @default "section" */
  layout?: ContactsGroupsHeaderLayout;
  title?: string;
  headerText?: string;
  isDisabled?: boolean;
  isClickable?: boolean;
  /** @default true when `onCreatePress` is set */
  shouldShowCreateAction?: boolean;
  onGroupPress?: (group: GroupWithCount) => void;
  onCreatePress?: () => void;
  /** Shows a static "No groups yet" chip when `groups` is empty (preview / display-only). */
  showEmptyPlaceholder?: boolean;
}

function GroupChipList({
  groups,
  isDisabled,
  isClickable,
  showCreateAction,
  showEmptyPlaceholder,
  onGroupPress,
  onCreatePress,
}: {
  groups: GroupWithCount[];
  isDisabled: boolean;
  isClickable: boolean;
  showCreateAction: boolean;
  showEmptyPlaceholder: boolean;
  onGroupPress?: (group: GroupWithCount) => void;
  onCreatePress?: () => void;
}) {
  if (groups.length === 0 && showEmptyPlaceholder) {
    return <EmptyGroupsChip />;
  }

  return (
    <>
      {groups.map((group) => (
        <GroupChip
          key={group.id}
          group={group}
          isClickable={isClickable}
          onPress={isClickable ? () => onGroupPress?.(group) : undefined}
        />
      ))}
      {showCreateAction && onCreatePress ? (
        <CreateGroupChip onPress={onCreatePress} disabled={isDisabled} />
      ) : null}
    </>
  );
}

export function ContactsGroupsHeader({
  groups,
  layout = "section",
  title,
  headerText,
  isDisabled = false,
  isClickable = true,
  shouldShowCreateAction,
  onGroupPress,
  onCreatePress,
  showEmptyPlaceholder = false,
}: ContactsGroupsHeaderProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const isChipRowLayout = layout === "chipRow";
  const isWrapLayout = layout === "wrap";
  const isEmbeddedLayout = isChipRowLayout || isWrapLayout;
  const sectionTitle = headerText ?? title ?? t("MobileApp.Contacts.Groups");
  const showCreateAction =
    (shouldShowCreateAction ?? onCreatePress !== undefined) &&
    onCreatePress !== undefined;

  const chipList = (
    <GroupChipList
      groups={groups}
      isDisabled={isDisabled}
      isClickable={isClickable}
      showCreateAction={showCreateAction}
      showEmptyPlaceholder={showEmptyPlaceholder}
      onGroupPress={onGroupPress}
      onCreatePress={onCreatePress}
    />
  );

  return (
    <View
      style={!isEmbeddedLayout ? styles.section : undefined}
      pointerEvents={isDisabled ? "none" : "auto"}
    >
      {!isEmbeddedLayout ? (
        <View style={[styles.titleRow, isDisabled && styles.disabled]}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>
            {sectionTitle}
          </Text>
        </View>
      ) : null}

      {isWrapLayout ? (
        <View style={[styles.groupsWrap, isDisabled && styles.disabled]}>
          {chipList}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.groupsRow,
            isChipRowLayout && styles.groupsRowChipRow,
            isDisabled && styles.disabled,
          ]}
        >
          {chipList}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  titleRow: {
    paddingHorizontal: 16,
  },
  titleText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  groupsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  groupsRowChipRow: {
    paddingLeft: 0,
  },
  groupsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
