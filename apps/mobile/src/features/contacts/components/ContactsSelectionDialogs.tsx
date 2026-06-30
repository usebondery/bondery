import { IconTrash } from "@tabler/icons-react-native";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { contactsDomain } from "../../../lib/domains/contacts";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { resolveContactsSelectionPersonIds } from "../resolveContactsSelectionPersonIds";
import {
  useContactsEffectiveSelectedCount,
  useContactsSelection,
} from "../contactsSelectionStore";

interface ContactsSelectionDialogsProps {
  debouncedQuery: string;
  onContactsReloaded: () => Promise<void>;
  /** When set, delete targets these loaded group members instead of the global contact filter. */
  loadedGroupMembers?: { id: string }[];
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
        contactsDomain.deleteMany(personIds);

        exitSelectionMode();
        setDeleteConfirmOpen(false);
        await onContactsReloaded();
      } catch {
        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.Contacts.DeleteFailed"),
        });
      } finally {
        setIsDeleting(false);
      }
    })();
  };

  return (
    <ActionSheetPopup
      open={isDeleteConfirmOpen}
      title={t("MobileApp.Contacts.DeleteContactsConfirmTitle").replace(
        "{count}",
        String(effectiveSelectedCount),
      )}
      isBusy={isDeleting}
      onOpenChange={setDeleteConfirmOpen}
      onClose={() => setDeleteConfirmOpen(false)}
      actions={[
        {
          label: t("MobileApp.Common.Cancel"),
          onPress: () => setDeleteConfirmOpen(false),
          disabled: isDeleting,
          tone: "neutral",
          variant: "outline",
        },
        {
          label: t("MobileApp.Common.Delete"),
          icon: <IconTrash size={16} color={colors.textOnPrimary} />,
          onPress: handleConfirmDeleteSelected,
          loading: isDeleting,
          disabled: isDeleting,
          tone: "danger",
          variant: "filled",
        },
      ]}
    />
  );
}
