import { IconTrash } from "@tabler/icons-react-native";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { deleteContacts } from "../../../lib/domains/contacts";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { useContactsEffectiveSelectedCount, useContactsSelection } from "../contactsSelectionStore";
import { resolveContactsSelectionPersonIds } from "../resolveContactsSelectionPersonIds";

interface ContactsSelectionDialogsProps {
  debouncedQuery: string;
  /** When set, delete targets these loaded group members instead of the global contact filter. */
  loadedGroupMembers?: { id: string }[];
  onContactsReloaded: () => Promise<void>;
}

export function ContactsSelectionDialogs({
  debouncedQuery,
  onContactsReloaded,
  loadedGroupMembers,
}: ContactsSelectionDialogsProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const effectiveSelectedCount = useContactsEffectiveSelectedCount();
  const isDeleteConfirmOpen = useContactsSelection((state) => state.isDeleteConfirmOpen);
  const isDeleting = useContactsSelection((state) => state.isDeleting);
  const setDeleteConfirmOpen = useContactsSelection((state) => state.setDeleteConfirmOpen);
  const setIsDeleting = useContactsSelection((state) => state.setIsDeleting);
  const exitSelectionMode = useContactsSelection((state) => state.exitSelectionMode);

  const handleConfirmDeleteSelected = () => {
    void (async () => {
      const selectionState = useContactsSelection.getState();

      setIsDeleting(true);

      try {
        const personIds = resolveContactsSelectionPersonIds(
          selectionState,
          debouncedQuery,
          loadedGroupMembers ? { loadedGroupMembers } : undefined,
        );
        deleteContacts(personIds);

        exitSelectionMode();
        setDeleteConfirmOpen(false);
        await onContactsReloaded();
      } catch {
        showToast({
          description: t("DeleteFailed", { ns: "MobileContacts" }),
          headline: t("feedback.errorTitle", { ns: "common" }),
          type: "error",
        });
      } finally {
        setIsDeleting(false);
      }
    })();
  };

  return (
    <ActionSheetPopup
      actions={[
        {
          disabled: isDeleting,
          label: t("actions.cancel", { ns: "common" }),
          onPress: () => setDeleteConfirmOpen(false),
          tone: "neutral",
          variant: "outline",
        },
        {
          disabled: isDeleting,
          icon: <IconTrash color={colors.textOnPrimary} size={16} />,
          label: t("actions.delete", { ns: "common" }),
          loading: isDeleting,
          onPress: handleConfirmDeleteSelected,
          tone: "danger",
          variant: "filled",
        },
      ]}
      isBusy={isDeleting}
      onClose={() => setDeleteConfirmOpen(false)}
      onOpenChange={setDeleteConfirmOpen}
      open={isDeleteConfirmOpen}
    />
  );
}
