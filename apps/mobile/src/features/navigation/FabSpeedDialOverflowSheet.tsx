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
          icon: <Icon size={18} stroke={colors.primary} />,
          id: action.id,
          label: t(action.labelKey, { ns: action.labelNamespace ?? "MobileNavigation" }),
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
      onOpenChange={(open) => {
        if (!open) {
          closeOverflowSheet();
        }
      }}
      open={isOverflowSheetOpen}
      rows={rows}
      title={t("Add", { ns: "MobileNavigation" })}
    />
  );
}
