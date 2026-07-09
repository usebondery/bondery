import { IconTrash } from "@tabler/icons-react-native";
import { useCallback, useState } from "react";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { deleteGroup } from "../../../lib/domains/groups";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface GroupDeleteDialogProps {
  groupId: string;
  groupTitle: string;
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function GroupDeleteDialog({
  open,
  groupId,
  groupTitle,
  onOpenChange,
  onDeleted,
}: GroupDeleteDialogProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      deleteGroup(groupId);
      onOpenChange(false);
      onDeleted();
    } catch {
      showToast({
        description: t("DeleteFailed", { ns: "MobileGroups" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
      setIsDeleting(false);
    }
  }, [groupId, isDeleting, onDeleted, onOpenChange, showToast, t]);

  const dialogTitle = t("DeleteDialogTitle", { ns: "MobileGroups" }).replace("{title}", groupTitle);

  return (
    <ActionSheetPopup
      actions={[
        {
          disabled: isDeleting,
          label: t("actions.cancel", { ns: "common" }),
          onPress: () => onOpenChange(false),
          tone: "neutral",
          variant: "outline",
        },
        {
          icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
          label: t("DeleteConfirm", { ns: "MobileGroups" }),
          loading: isDeleting,
          onPress: handleDelete,
          tone: "danger",
          variant: "filled",
        },
      ]}
      isBusy={isDeleting}
      onClose={() => {
        if (isDeleting) {
          return;
        }
        onOpenChange(false);
      }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isDeleting) {
          return;
        }
        onOpenChange(nextOpen);
      }}
      open={open}
      title={dialogTitle}
    />
  );
}
