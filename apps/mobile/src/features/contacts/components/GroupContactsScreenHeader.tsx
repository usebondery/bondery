import { IconCopy, IconEdit, IconTrash } from "@tabler/icons-react-native";
import { StackNavBar, TabRootScreenHeader } from "../../../components/chrome";
import { OverflowMenu } from "../../../components/OverflowMenu";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { useContactsSelectionMode } from "../contactsSelectionStore";
import { ContactsSelectionHeader } from "./ContactsSelectionHeader";

interface GroupContactsScreenHeaderProps {
  label: string;
  emoji: string;
  onBack: () => void;
  onEditGroup: () => void;
  onDuplicateGroup: () => void;
  onDeleteGroup: () => void;
  isDuplicating: boolean;
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
      variant="elevated"
      onBack={onBack}
      title={headerTitle}
      right={
        <OverflowMenu
          triggerVariant="nav"
          accessibilityLabel={t("MobileApp.Groups.MenuAccessibilityLabel")}
          disabled={isDuplicating}
          items={[
            {
              id: "edit",
              icon: <IconEdit size={20} stroke={colors.iconPrimary} />,
              label: t("MobileApp.Groups.EditGroup"),
              onPress: onEditGroup,
            },
            {
              id: "duplicate",
              icon: <IconCopy size={20} stroke={colors.iconPrimary} />,
              label: t("MobileApp.Groups.DuplicateGroup"),
              onPress: onDuplicateGroup,
              disabled: isDuplicating,
            },
            {
              id: "delete",
              icon: <IconTrash size={20} stroke={colors.dangerAccent} />,
              label: t("MobileApp.Groups.DeleteGroup"),
              tone: "danger",
              onPress: onDeleteGroup,
            },
          ]}
        />
      }
    />
  );
}
