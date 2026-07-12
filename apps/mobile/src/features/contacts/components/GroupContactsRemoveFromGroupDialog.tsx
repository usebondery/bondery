import { IconUsersMinus } from "@tabler/icons-react-native";
import { useCommonTranslations, useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { removeContactsFromGroup } from "../../../lib/domains/groups";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { useContactsSelection } from "../contactsSelectionStore";
import { resolveContactsSelectionPersonIds } from "../resolveContactsSelectionPersonIds";

interface GroupContactsRemoveFromGroupDialogProps {
  debouncedQuery: string;
  groupId: string;
  onMembersReloaded: () => Promise<void>;
}

export function GroupContactsRemoveFromGroupDialog({
  groupId,
  debouncedQuery,
  onMembersReloaded,
}: GroupContactsRemoveFromGroupDialogProps) {
  const tMobileContacts = useMobileContactsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const isRemoveFromGroupConfirmOpen = useContactsSelection(
    (state) => state.isRemoveFromGroupConfirmOpen,
  );
  const isRemovingFromGroup = useContactsSelection((state) => state.isRemovingFromGroup);
  const setRemoveFromGroupConfirmOpen = useContactsSelection(
    (state) => state.setRemoveFromGroupConfirmOpen,
  );
  const setIsRemovingFromGroup = useContactsSelection((state) => state.setIsRemovingFromGroup);
  const exitSelectionMode = useContactsSelection((state) => state.exitSelectionMode);

  const handleConfirmRemoveFromGroup = () => {
    void (async () => {
      const selectionState = useContactsSelection.getState();
      const personIds = resolveContactsSelectionPersonIds(selectionState, debouncedQuery, {
        groupId,
      });

      setIsRemovingFromGroup(true);

      try {
        removeContactsFromGroup(groupId, personIds);

        exitSelectionMode();
        setRemoveFromGroupConfirmOpen(false);
        await onMembersReloaded();
      } catch {
        showToast({
          description: tMobileContacts("RemoveFromGroupFailed"),
          headline: t("feedback.errorTitle"),
          type: "error",
        });
      } finally {
        setIsRemovingFromGroup(false);
      }
    })();
  };

  return (
    <ActionSheetPopup
      actions={[
        {
          disabled: isRemovingFromGroup,
          label: t("actions.cancel"),
          onPress: () => setRemoveFromGroupConfirmOpen(false),
          tone: "neutral",
          variant: "outline",
        },
        {
          disabled: isRemovingFromGroup,
          icon: <IconUsersMinus color={colors.textOnPrimary} size={16} />,
          label: tMobileContacts("RemoveFromGroup"),
          loading: isRemovingFromGroup,
          onPress: handleConfirmRemoveFromGroup,
          tone: "danger",
          variant: "filled",
        },
      ]}
      isBusy={isRemovingFromGroup}
      onClose={() => setRemoveFromGroupConfirmOpen(false)}
      onOpenChange={setRemoveFromGroupConfirmOpen}
      open={isRemoveFromGroupConfirmOpen}
    />
  );
}
