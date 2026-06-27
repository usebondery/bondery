import { IconTrash, IconUsersPlus } from "@tabler/icons-react-native";
import { useMemo } from "react";
import { useMobileTranslations } from "../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import {
  useContactsEffectiveSelectedCount,
  useContactsSelection,
} from "../features/contacts/contactsSelectionStore";
import { FloatingActionBar, type FloatingActionBarAction } from "./FloatingActionBar";

interface ContactsSelectionActionBarProps {
  /** Inserted between add-to-groups and delete actions. */
  extraActions?: FloatingActionBarAction[];
}

/**
 * Selection action bar for contacts. Reads live disabled/loading state from the
 * selection store so tab chrome only mounts once per selection session.
 */
export function ContactsSelectionActionBar({ extraActions = [] }: ContactsSelectionActionBarProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const effectiveSelectedCount = useContactsEffectiveSelectedCount();
  const isDeleting = useContactsSelection((state) => state.isDeleting);
  const isAddingToGroups = useContactsSelection((state) => state.isAddingToGroups);
  const isRemovingFromGroup = useContactsSelection((state) => state.isRemovingFromGroup);
  const setDeleteConfirmOpen = useContactsSelection((state) => state.setDeleteConfirmOpen);
  const setAddToGroupsSheetOpen = useContactsSelection((state) => state.setAddToGroupsSheetOpen);
  const isBusy = isDeleting || isAddingToGroups || isRemovingFromGroup;

  const actions = useMemo<FloatingActionBarAction[]>(
    () => [
      {
        id: "add-to-groups",
        icon: <IconUsersPlus size={20} stroke={colors.iconSecondary} />,
        accessibilityLabel: t("MobileApp.Contacts.AddToGroups"),
        onPress: () => setAddToGroupsSheetOpen(true),
        disabled: effectiveSelectedCount === 0 || isBusy,
        loading: isAddingToGroups,
      },
      ...extraActions,
      {
        id: "delete",
        icon: <IconTrash size={20} stroke={colors.dangerAccent} />,
        tone: "danger",
        accessibilityLabel: t("MobileApp.Common.Delete"),
        onPress: () => setDeleteConfirmOpen(true),
        disabled: effectiveSelectedCount === 0 || isBusy,
        loading: isDeleting,
      },
    ],
    [
      colors.dangerAccent,
      colors.iconSecondary,
      effectiveSelectedCount,
      extraActions,
      isAddingToGroups,
      isBusy,
      isDeleting,
      setAddToGroupsSheetOpen,
      setDeleteConfirmOpen,
      t,
    ],
  );

  return (
    <FloatingActionBar
      accessibilityLabel={t("MobileApp.Contacts.SelectionActionsTitle")}
      actions={actions}
    />
  );
}
