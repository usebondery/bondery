import type { GroupWithCount } from "@bondery/schemas";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
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
  headerText?: string;
  isClickable?: boolean;
  isDisabled?: boolean;
  /** @default "section" */
  layout?: ContactsGroupsHeaderLayout;
  onCreatePress?: () => void;
  onGroupPress?: (group: GroupWithCount) => void;
  /** @default true when `onCreatePress` is set */
  shouldShowCreateAction?: boolean;
  /** Shows a static "No groups yet" chip when `groups` is empty (preview / display-only). */
  showEmptyPlaceholder?: boolean;
  title?: string;
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
          group={group}
          isClickable={isClickable}
          key={group.id}
          onPress={isClickable ? () => onGroupPress?.(group) : undefined}
        />
      ))}
      {showCreateAction && onCreatePress ? (
        <CreateGroupChip disabled={isDisabled} onPress={onCreatePress} />
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
  const sectionTitle = headerText ?? title ?? t("Groups", { ns: "MobileContacts" });
  const showCreateAction =
    (shouldShowCreateAction ?? onCreatePress !== undefined) && onCreatePress !== undefined;

  const chipList = (
    <GroupChipList
      groups={groups}
      isClickable={isClickable}
      isDisabled={isDisabled}
      onCreatePress={onCreatePress}
      onGroupPress={onGroupPress}
      showCreateAction={showCreateAction}
      showEmptyPlaceholder={showEmptyPlaceholder}
    />
  );

  return (
    <View
      pointerEvents={isDisabled ? "none" : "auto"}
      style={!isEmbeddedLayout ? styles.section : undefined}
    >
      {!isEmbeddedLayout ? (
        <View style={[styles.titleRow, isDisabled && styles.disabled]}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>{sectionTitle}</Text>
        </View>
      ) : null}

      {isWrapLayout ? (
        <View style={[styles.groupsWrap, isDisabled && styles.disabled]}>{chipList}</View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.groupsRow,
            isChipRowLayout && styles.groupsRowChipRow,
            isDisabled && styles.disabled,
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {chipList}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
  groupsRow: {
    gap: 8,
    paddingHorizontal: 16,
  },
  groupsRowChipRow: {
    paddingLeft: 0,
  },
  groupsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  section: {
    gap: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  titleRow: {
    paddingHorizontal: 16,
  },
  titleText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
