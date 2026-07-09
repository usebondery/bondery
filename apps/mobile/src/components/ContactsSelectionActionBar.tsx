import { IconTrash, IconUsersPlus } from "@tabler/icons-react-native";
import { useMemo } from "react";
import {
  useContactsEffectiveSelectedCount,
  useContactsSelection,
} from "../features/contacts/contactsSelectionStore";
import { useMobileTranslations } from "../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
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
        accessibilityLabel: t("AddToGroups", { ns: "MobileContacts" }),
        disabled: effectiveSelectedCount === 0 || isBusy,
        icon: <IconUsersPlus size={20} stroke={colors.iconSecondary} />,
        id: "add-to-groups",
        loading: isAddingToGroups,
        onPress: () => setAddToGroupsSheetOpen(true),
      },
      ...extraActions,
      {
        accessibilityLabel: t("actions.delete", { ns: "common" }),
        disabled: effectiveSelectedCount === 0 || isBusy,
        icon: <IconTrash size={20} stroke={colors.dangerAccent} />,
        id: "delete",
        loading: isDeleting,
        onPress: () => setDeleteConfirmOpen(true),
        tone: "danger",
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
      accessibilityLabel={t("SelectionActionsTitle", { ns: "MobileContacts" })}
      actions={actions}
    />
  );
}
