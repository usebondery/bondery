import { IconCopy, IconEdit, IconTrash } from "@tabler/icons-react-native";
import { StackNavBar, TabRootScreenHeader } from "../../../components/chrome";
import { OverflowMenu } from "../../../components/OverflowMenu";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { useContactsSelectionMode } from "../contactsSelectionStore";
import { ContactsSelectionHeader } from "./ContactsSelectionHeader";

interface GroupContactsScreenHeaderProps {
  emoji: string;
  isDuplicating: boolean;
  label: string;
  onBack: () => void;
  onDeleteGroup: () => void;
  onDuplicateGroup: () => void;
  onEditGroup: () => void;
}

/** Elevated stack nav bar matching settings subpages; full-width selection toolbar when active. */
export function GroupContactsScreenHeader({
  label,
  emoji,
  onBack,
  onEditGroup,
  onDuplicateGroup,
  onDeleteGroup,
  isDuplicating,
}: GroupContactsScreenHeaderProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const selectionMode = useContactsSelectionMode();
  const headerTitle = emoji ? `${emoji} ${label}` : label;

  if (selectionMode) {
    return <TabRootScreenHeader titleRow={<ContactsSelectionHeader />} />;
  }

  return (
    <StackNavBar
      onBack={onBack}
      right={
        <OverflowMenu
          accessibilityLabel={t("MenuAccessibilityLabel", { ns: "MobileGroups" })}
          disabled={isDuplicating}
          items={[
            {
              icon: <IconEdit size={20} stroke={colors.iconPrimary} />,
              id: "edit",
              label: t("EditGroup", { ns: "MobileGroups" }),
              onPress: onEditGroup,
            },
            {
              disabled: isDuplicating,
              icon: <IconCopy size={20} stroke={colors.iconPrimary} />,
              id: "duplicate",
              label: t("DuplicateGroup", { ns: "MobileGroups" }),
              onPress: onDuplicateGroup,
            },
            {
              icon: <IconTrash size={20} stroke={colors.dangerAccent} />,
              id: "delete",
              label: t("DeleteGroup", { ns: "MobileGroups" }),
              onPress: onDeleteGroup,
              tone: "danger",
            },
          ]}
          triggerVariant="nav"
        />
      }
      title={headerTitle}
    />
  );
}
