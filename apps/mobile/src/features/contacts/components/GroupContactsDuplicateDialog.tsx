import { IconCopy } from "@tabler/icons-react-native";
import { Text } from "react-native";
import { useCommonTranslations, useMobileGroupsTranslations } from "@/lib/i18n/generated/hooks";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import type { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { groupContactsScreenStyles as styles } from "./groupContactsScreenStyles";

interface GroupContactsDuplicateDialogProps {
  colors: ReturnType<typeof useMobileThemeColors>;
  isDuplicating: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export function GroupContactsDuplicateDialog({
  colors,
  isDuplicating,
  onClose,
  onConfirm,
  onOpenChange,
  open,
  title,
}: GroupContactsDuplicateDialogProps) {
  const tMobileGroups = useMobileGroupsTranslations();
  const t = useCommonTranslations();

  return (
    <ActionSheetPopup
      actions={[
        {
          disabled: isDuplicating,
          label: t("actions.cancel"),
          onPress: onClose,
          tone: "neutral",
          variant: "outline",
        },
        {
          icon: <IconCopy size={16} stroke={colors.textOnPrimary} />,
          label: tMobileGroups("DuplicateConfirm"),
          loading: isDuplicating,
          onPress: onConfirm,
          tone: "primary",
          variant: "filled",
        },
      ]}
      isBusy={isDuplicating}
      onClose={() => {
        if (isDuplicating) {
          return;
        }
        onClose();
      }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isDuplicating) {
          return;
        }
        onOpenChange(nextOpen);
      }}
      open={open}
      title={title}
    >
      <Text style={[styles.duplicateDialogBody, { color: colors.textSecondary }]}>
        {tMobileGroups("DuplicateDialogBody")}
      </Text>
    </ActionSheetPopup>
  );
}
