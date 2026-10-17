import { IconTrash } from "@tabler/icons-react-native";

import {
  useCommonTranslations,
  useMobileTagsTranslations,
  useTagsSettingsTranslations,
} from "@/lib/i18n/generated/hooks";
import { Sheet } from "../../../components/ui/Sheet";
import { deleteTag } from "../../../lib/domains/tags";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { notifications } from "../../../lib/toast/notifications";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface TagDeleteDialogProps {
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
  opened: boolean;
  tagId: string;
  tagLabel: string;
}

export function TagDeleteDialog({
  opened: open,
  tagId,
  tagLabel,
  onOpenChange,
  onDeleted,
}: TagDeleteDialogProps) {
  const tMobileTags = useMobileTagsTranslations();
  const tTagsSettings = useTagsSettingsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();

  function handleClose() {
    onOpenChange(false);
  }

  function handleDeleteError() {
    notifications.show({
      message: tMobileTags("DeleteFailed"),
      title: t("feedback.errorTitle"),
      type: "error",
    });
  }

  const { isSubmitting, submit } = useSheetLocalAction({
    onClose: handleClose,
    onError: handleDeleteError,
    onSuccess: onDeleted,
    perform: () => {
      deleteTag(tagId);
    },
  });

  const dialogTitle = tTagsSettings("DeleteConfirmTitle");
  const dialogMessage = tTagsSettings("DeleteConfirmMessage").replace("{label}", tagLabel);

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
          label: tTagsSettings("DeleteConfirmButton"),
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
      subtitle={dialogMessage}
      title={dialogTitle}
    />
  );
}
