import { IconMailForward, IconShare, IconTrash } from "@tabler/icons-react-native";
import { OverflowMenu } from "../../../components/OverflowMenu";
import type { OverflowMenuItemConfig } from "../../../components/OverflowMenuItem";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface ContactDetailOverflowMenuProps {
  isBusy?: boolean;
  isMyselfMode: boolean;
  onDelete: () => void;
  onShare: () => void;
  onShareViaEmail: () => void;
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
      icon: <IconShare size={18} stroke={colors.iconPrimary} />,
      id: "share",
      label: t("ShareContact", { ns: "MobileContactDetail" }),
      onPress: onShare,
    },
    {
      icon: <IconMailForward size={18} stroke={colors.iconPrimary} />,
      id: "share-email",
      label: t("ShareContactViaEmail", { ns: "MobileContactDetail" }),
      onPress: onShareViaEmail,
    },
  ];

  if (!isMyselfMode) {
    items.push({
      icon: <IconTrash size={18} stroke={colors.dangerAccent} />,
      id: "delete",
      label: t("DeleteContact", { ns: "MobileContactDetail" }),
      onPress: onDelete,
      tone: "danger",
    });
  }

  return <OverflowMenu accessibilityLabel="Contact actions" disabled={isBusy} items={items} />;
}
