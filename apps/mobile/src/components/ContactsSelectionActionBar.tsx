import { IconTrash, IconUsersPlus } from "@tabler/icons-react-native";
import { useMemo } from "react";
import { useCommonTranslations, useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import {
  useContactsEffectiveSelectedCount,
  useContactsSelection,
} from "../features/contacts/contactsSelectionStore";
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
  const t = useCommonTranslations();
  const tMobileContacts = useMobileContactsTranslations();
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
        accessibilityLabel: tMobileContacts("AddToGroups"),
        disabled: effectiveSelectedCount === 0 || isBusy,
        icon: <IconUsersPlus size={20} stroke={colors.iconSecondary} />,
        id: "add-to-groups",
        loading: isAddingToGroups,
        onPress: () => setAddToGroupsSheetOpen(true),
      },
      ...extraActions,
      {
        accessibilityLabel: t("actions.delete"),
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
      tMobileContacts,
    ],
  );

  return (
    <FloatingActionBar
      accessibilityLabel={tMobileContacts("SelectionActionsTitle")}
      actions={actions}
    />
  );
}
