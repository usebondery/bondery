import { IconTrash } from "@tabler/icons-react-native";
import { useCallback, useEffect } from "react";
import { useCommonTranslations, useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import { Sheet } from "../../../components/ui/Sheet";
import { deleteContacts } from "../../../lib/domains/contacts";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { syncEffectState } from "../../../lib/react/syncEffectState";
import { notifications } from "../../../lib/toast/notifications";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { useContactsSelection } from "../contactsSelectionStore";
import { resolveContactsSelectionPersonIds } from "../resolveContactsSelectionPersonIds";

interface ContactsSelectionDialogsProps {
  debouncedQuery: string;
  filterGroupId?: string | null;
  /** When set, delete targets these loaded group members instead of the global contact filter. */
  loadedGroupMembers?: { id: string }[];
  onContactsReloaded: () => void;
}

export function ContactsSelectionDialogs({
  debouncedQuery,
  filterGroupId,
  onContactsReloaded,
  loadedGroupMembers,
}: ContactsSelectionDialogsProps) {
  const tMobileContacts = useMobileContactsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const isDeleteConfirmOpen = useContactsSelection((state) => state.isDeleteConfirmOpen);
  const setDeleteConfirmOpen = useContactsSelection((state) => state.setDeleteConfirmOpen);
  const setIsDeleting = useContactsSelection((state) => state.setIsDeleting);
  const exitSelectionMode = useContactsSelection((state) => state.exitSelectionMode);

  const handleClose = useCallback(() => {
    setDeleteConfirmOpen(false);
  }, [setDeleteConfirmOpen]);

  const handleDeleteError = useCallback(() => {
    notifications.show({
      message: tMobileContacts("DeleteFailed"),
      title: t("feedback.errorTitle"),
      type: "error",
    });
  }, [t, tMobileContacts]);

  const performDelete = useCallback(() => {
    const selectionState = useContactsSelection.getState();
    const scope = loadedGroupMembers
      ? { loadedGroupMembers }
      : filterGroupId
        ? { groupId: filterGroupId }
        : undefined;
    const personIds = resolveContactsSelectionPersonIds(selectionState, debouncedQuery, scope);
    deleteContacts(personIds);
  }, [debouncedQuery, filterGroupId, loadedGroupMembers]);

  const handleDeleteSuccess = useCallback(() => {
    exitSelectionMode();
    onContactsReloaded();
  }, [exitSelectionMode, onContactsReloaded]);

  const { isSubmitting, submit } = useSheetLocalAction({
    onClose: handleClose,
    onError: handleDeleteError,
    onSuccess: handleDeleteSuccess,
    perform: performDelete,
  });

  useEffect(() => {
    syncEffectState(() => {
      setIsDeleting(isSubmitting);
    });
  }, [isSubmitting, setIsDeleting]);

  return (
    <Sheet
      actions={[
        {
          disabled: isSubmitting,
          label: t("actions.cancel"),
          onPress: () => setDeleteConfirmOpen(false),
          tone: "neutral",
          variant: "outline",
        },
        {
          disabled: isSubmitting,
          icon: <IconTrash color={colors.textOnPrimary} size={16} />,
          label: t("actions.delete"),
          loading: isSubmitting,
          loadingText: t("feedback.deleting"),
          onPress: submit,
          tone: "danger",
          variant: "filled",
        },
      ]}
      isBusy={isSubmitting}
      onClose={() => {
        if (isSubmitting) {
          return;
        }
        setDeleteConfirmOpen(false);
      }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSubmitting) {
          return;
        }
        setDeleteConfirmOpen(nextOpen);
      }}
      opened={isDeleteConfirmOpen}
      title={tMobileContacts("DeleteTitle")}
    />
  );
}
