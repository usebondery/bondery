import { IconTrash } from "@tabler/icons-react-native";
import { useCallback, useState } from "react";
import { Text } from "react-native";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { deleteTag } from "../../../lib/domains/tags";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface TagDeleteDialogProps {
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  tagId: string;
  tagLabel: string;
}

export function TagDeleteDialog({
  open,
  tagId,
  tagLabel,
  onOpenChange,
  onDeleted,
}: TagDeleteDialogProps) {
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
      deleteTag(tagId);
      onOpenChange(false);
      onDeleted();
    } catch {
      showToast({
        description: t("DeleteFailed", { ns: "MobileTags" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
      setIsDeleting(false);
    }
  }, [isDeleting, onDeleted, onOpenChange, showToast, t, tagId]);

  const dialogTitle = t("DeleteConfirmTitle", { ns: "TagsSettings" });
  const dialogMessage = t("DeleteConfirmMessage", { ns: "TagsSettings" }).replace(
    "{label}",
    tagLabel,
  );

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
          label: t("DeleteConfirmButton", { ns: "TagsSettings" }),
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
    >
      <Text style={{ color: colors.textSecondary }}>{dialogMessage}</Text>
    </ActionSheetPopup>
  );
}
