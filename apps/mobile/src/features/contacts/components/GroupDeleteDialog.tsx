import { IconTrash } from "@tabler/icons-react-native";

import { useCommonTranslations, useMobileGroupsTranslations } from "@/lib/i18n/generated/hooks";
import { Sheet } from "../../../components/ui/Sheet";
import { deleteGroup } from "../../../lib/domains/groups";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { notifications } from "../../../lib/toast/notifications";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface GroupDeleteDialogProps {
  groupId: string;
  groupTitle: string;
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
  opened: boolean;
}

export function GroupDeleteDialog({
  opened: open,
  groupId,
  groupTitle,
  onOpenChange,
  onDeleted,
}: GroupDeleteDialogProps) {
  const tMobileGroups = useMobileGroupsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();

  function handleClose() {
    onOpenChange(false);
  }

  function handleDeleteError() {
    notifications.show({
      message: tMobileGroups("DeleteFailed"),
      title: t("feedback.errorTitle"),
      type: "error",
    });
  }

  const { isSubmitting, submit } = useSheetLocalAction({
    onClose: handleClose,
    onError: handleDeleteError,
    onSuccess: onDeleted,
    perform: () => {
      deleteGroup(groupId);
    },
  });

  const dialogTitle = tMobileGroups("DeleteDialogTitle").replace("{title}", groupTitle);

  return (
    <Sheet
      actions={[
        {
          disabled: isSubmitting,
          label: t("actions.cancel"),
          onPress: () => onOpenChange(false),
          tone: "neutral",
          variant: "outline",
        },
        {
          icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
          label: tMobileGroups("DeleteConfirm"),
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
        onOpenChange(false);
      }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSubmitting) {
          return;
        }
        onOpenChange(nextOpen);
      }}
      opened={open}
      title={dialogTitle}
    />
  );
}
