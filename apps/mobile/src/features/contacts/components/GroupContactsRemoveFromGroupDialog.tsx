import { IconUsersMinus } from "@tabler/icons-react-native";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { groupsDomain } from "../../../lib/domains/groups";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { resolveContactsSelectionPersonIds } from "../resolveContactsSelectionPersonIds";
import {
  useContactsEffectiveSelectedCount,
  useContactsSelection,
} from "../contactsSelectionStore";

interface GroupContactsRemoveFromGroupDialogProps {
  groupId: string;
  debouncedQuery: string;
  onMembersReloaded: () => Promise<void>;
}

export function GroupContactsRemoveFromGroupDialog({
  groupId,
  debouncedQuery,
  onMembersReloaded,
}: GroupContactsRemoveFromGroupDialogProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const effectiveSelectedCount = useContactsEffectiveSelectedCount();
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
      const personIds = resolveContactsSelectionPersonIds(
        selectionState,
        debouncedQuery,
        { groupId },
      );

      setIsRemovingFromGroup(true);

      try {
        groupsDomain.removeMembers(groupId, personIds);

        exitSelectionMode();
        setRemoveFromGroupConfirmOpen(false);
        await onMembersReloaded();
      } catch {
        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.Contacts.RemoveFromGroupFailed"),
        });
      } finally {
        setIsRemovingFromGroup(false);
      }
    })();
  };

  return (
    <ActionSheetPopup
      open={isRemoveFromGroupConfirmOpen}
      title={t("MobileApp.Contacts.RemoveFromGroupConfirmTitle").replace(
        "{count}",
        String(effectiveSelectedCount),
      )}
      isBusy={isRemovingFromGroup}
      onOpenChange={setRemoveFromGroupConfirmOpen}
      onClose={() => setRemoveFromGroupConfirmOpen(false)}
      actions={[
        {
          label: t("MobileApp.Common.Cancel"),
          onPress: () => setRemoveFromGroupConfirmOpen(false),
          disabled: isRemovingFromGroup,
          tone: "neutral",
          variant: "outline",
        },
        {
          label: t("MobileApp.Contacts.RemoveFromGroup"),
          icon: <IconUsersMinus size={16} color={colors.textOnPrimary} />,
          onPress: handleConfirmRemoveFromGroup,
          loading: isRemovingFromGroup,
          disabled: isRemovingFromGroup,
          tone: "danger",
          variant: "filled",
        },
      ]}
    />
  );
}
