import { Pressable, StyleSheet, Text } from "react-native";
import { useCommonTranslations, useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";

import { ToolbarHeader } from "../../../components/chrome";

import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

import { useContactsSelection } from "../contactsSelectionStore";

export function ContactsSelectionHeader() {
  const tMobileContacts = useMobileContactsTranslations();
  const t = useCommonTranslations();

  const colors = useMobileThemeColors();

  const totalCount = useContactsSelection((state) => state.totalCount);

  const isAllTotalSelected = useContactsSelection((state) => state.isAllTotalSelected);

  const selectAllTotal = useContactsSelection((state) => state.selectAllTotal);

  const deselectAllInSession = useContactsSelection((state) => state.deselectAllInSession);

  const exitSelectionMode = useContactsSelection((state) => state.exitSelectionMode);

  const showSelectAll = !isAllTotalSelected;

  const handleLeftAction = () => {
    if (showSelectAll) {
      selectAllTotal();

      return;
    }

    deselectAllInSession();
  };

  const handleCancel = () => {
    exitSelectionMode();
  };

  return (
    <ToolbarHeader
      left={
        <Pressable
          accessibilityLabel={
            showSelectAll ? tMobileContacts("SelectAll") : tMobileContacts("DeselectAll")
          }
          accessibilityRole="button"
          disabled={totalCount === 0}
          hitSlop={8}
          onPress={handleLeftAction}
          style={({ pressed }) => [{ opacity: totalCount === 0 ? 0.45 : pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.headerAction, { color: colors.primary }]}>
            {showSelectAll ? tMobileContacts("SelectAll") : tMobileContacts("DeselectAll")}
          </Text>
        </Pressable>
      }
      right={
        <Pressable
          accessibilityLabel={t("actions.cancel")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleCancel}
        >
          <Text style={[styles.headerAction, styles.headerActionRight, { color: colors.primary }]}>
            {t("actions.cancel")}
          </Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  headerAction: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,

    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },

  headerActionRight: {
    textAlign: "right",
  },

  selectionCount: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,

    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,

    textAlign: "center",
  },
});
