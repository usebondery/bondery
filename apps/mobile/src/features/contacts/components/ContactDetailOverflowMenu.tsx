import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { OverflowMenu } from "../../../components/OverflowMenu";
import type { OverflowMenuItemConfig } from "../../../components/OverflowMenuItem";
import { IconMailForward, IconShare, IconTrash } from "@tabler/icons-react-native";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface ContactDetailOverflowMenuProps {
  isMyselfMode: boolean;
  isBusy?: boolean;
  onShare: () => void;
  onShareViaEmail: () => void;
  onDelete: () => void;
}

export function ContactDetailOverflowMenu({
  isMyselfMode,
  isBusy = false,
  onShare,
  onShareViaEmail,
  onDelete,
}: ContactDetailOverflowMenuProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();

  const items: OverflowMenuItemConfig[] = [
    {
      id: "share",
      icon: <IconShare size={18} stroke={colors.iconPrimary} />,
      label: t("MobileApp.ContactDetail.ShareContact"),
      onPress: onShare,
    },
    {
      id: "share-email",
      icon: <IconMailForward size={18} stroke={colors.iconPrimary} />,
      label: t("MobileApp.ContactDetail.ShareContactViaEmail"),
      onPress: onShareViaEmail,
    },
  ];

  if (!isMyselfMode) {
    items.push({
      id: "delete",
      icon: <IconTrash size={18} stroke={colors.dangerAccent} />,
      label: t("MobileApp.ContactDetail.DeleteContact"),
      tone: "danger",
      onPress: onDelete,
    });
  }

  return (
    <OverflowMenu
      items={items}
      accessibilityLabel="Contact actions"
      disabled={isBusy}
    />
  );
}
