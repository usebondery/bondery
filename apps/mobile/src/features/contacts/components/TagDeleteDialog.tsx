import { useCallback, useState } from "react";
import { Text } from "react-native";
import { IconTrash } from "@tabler/icons-react-native";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { tagsDomain } from "../../../lib/domains/tags";

interface TagDeleteDialogProps {
  open: boolean;
  tagId: string;
  tagLabel: string;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
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
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      tagsDomain.delete(tagId);
      onOpenChange(false);
      onDeleted();
    } catch {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.Tags.DeleteFailed"),
      });
      setIsDeleting(false);
    }
  }, [isDeleting, onDeleted, onOpenChange, showToast, t, tagId]);

  const dialogTitle = t("MobileApp.TagsSettings.DeleteConfirmTitle");
  const dialogMessage = t("MobileApp.TagsSettings.DeleteConfirmMessage").replace(
    "{label}",
    tagLabel,
  );

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
          label: t("MobileApp.TagsSettings.DeleteConfirmButton"),
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
    >
      <Text style={{ color: colors.textSecondary }}>{dialogMessage}</Text>
    </ActionSheetPopup>
  );
}
