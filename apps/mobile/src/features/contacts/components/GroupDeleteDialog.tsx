import { useCallback, useState } from "react";
import { IconTrash } from "@tabler/icons-react-native";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { deleteGroup } from "../../../lib/api/client";

interface GroupDeleteDialogProps {
  open: boolean;
  groupId: string;
  groupTitle: string;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
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
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      await deleteGroup(groupId);
      onOpenChange(false);
      onDeleted();
    } catch {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.Groups.DeleteFailed"),
      });
      setIsDeleting(false);
    }
  }, [groupId, isDeleting, onDeleted, onOpenChange, showToast, t]);

  const dialogTitle = t("MobileApp.Groups.DeleteDialogTitle").replace("{title}", groupTitle);

  return (
    <ActionSheetPopup
      open={open}
      title={dialogTitle}
      actions={[
        {
          label: t("MobileApp.Common.Cancel"),
          onPress: () => onOpenChange(false),
          disabled: isDeleting,
          tone: "neutral",
          variant: "outline",
        },
        {
          label: t("MobileApp.Groups.DeleteConfirm"),
          icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
          onPress: handleDelete,
          loading: isDeleting,
          tone: "danger",
          variant: "filled",
        },
      ]}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isDeleting) return;
        onOpenChange(nextOpen);
      }}
      onClose={() => {
        if (isDeleting) return;
        onOpenChange(false);
      }}
      isBusy={isDeleting}
    />
  );
}
