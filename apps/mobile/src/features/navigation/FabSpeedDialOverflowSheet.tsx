import { useMemo } from "react";
import { useCommonTranslations, useMobileNavigationTranslations } from "@/lib/i18n/generated/hooks";
import { ActionListSheet } from "../../components/ActionListSheet";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { useFabSpeedDial } from "./fabSpeedDialContext";

export function FabSpeedDialOverflowSheet() {
  const tMobileNavigation = useMobileNavigationTranslations();
  const _t = useCommonTranslations();
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
          label: tMobileNavigation(action.labelKey),
          onPress: () => runAction(action.id),
        };
      }),
    [actions, colors.primary, runAction, tMobileNavigation],
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
      title={tMobileNavigation("Add")}
    />
  );
}
