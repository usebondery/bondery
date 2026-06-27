import { useMemo } from "react";
import { ActionListSheet } from "../../components/ActionListSheet";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { useFabSpeedDial } from "./fabSpeedDialContext";

export function FabSpeedDialOverflowSheet() {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { actions, isOverflowSheetOpen, closeOverflowSheet, runAction, usesInlineMenu } =
    useFabSpeedDial();

  const rows = useMemo(
    () =>
      actions.map((action) => {
        const Icon = action.icon;

        return {
          id: action.id,
          icon: <Icon size={18} stroke={colors.primary} />,
          label: t(action.labelKey),
          onPress: () => runAction(action.id),
        };
      }),
    [actions, colors.primary, runAction, t],
  );

  if (usesInlineMenu) {
    return null;
  }

  return (
    <ActionListSheet
      open={isOverflowSheetOpen}
      title={t("MobileApp.Navigation.Add")}
      rows={rows}
      onOpenChange={(open) => {
        if (!open) {
          closeOverflowSheet();
        }
      }}
    />
  );
}
