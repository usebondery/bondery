import { Pressable, StyleSheet, Text } from "react-native";

import { ToolbarHeader } from "../../../components/chrome";

import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";

import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

import {

  useContactsEffectiveSelectedCount,

  useContactsSelection,

} from "../contactsSelectionStore";



export function ContactsSelectionHeader() {

  const t = useMobileTranslations();

  const colors = useMobileThemeColors();

  const effectiveSelectedCount = useContactsEffectiveSelectedCount();

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

          onPress={handleLeftAction}

          disabled={totalCount === 0}

          accessibilityRole="button"

          accessibilityLabel={

            showSelectAll

              ? t("MobileApp.Contacts.SelectAll")

              : t("MobileApp.Contacts.DeselectAll")

          }

          hitSlop={8}

          style={({ pressed }) => [{ opacity: totalCount === 0 ? 0.45 : pressed ? 0.7 : 1 }]}

        >

          <Text style={[styles.headerAction, { color: colors.primary }]}>

            {showSelectAll

              ? t("MobileApp.Contacts.SelectAll")

              : t("MobileApp.Contacts.DeselectAll")}

          </Text>

        </Pressable>

      }

      center={

        <Text style={[styles.selectionCount, { color: colors.textSecondary }]}>

          {t("MobileApp.Contacts.SelectedCount").replace(

            "{count}",

            String(effectiveSelectedCount),

          )}

        </Text>

      }

      right={

        <Pressable

          onPress={handleCancel}

          accessibilityRole="button"

          accessibilityLabel={t("MobileApp.Common.Cancel")}

          hitSlop={8}

        >

          <Text style={[styles.headerAction, styles.headerActionRight, { color: colors.primary }]}>

            {t("MobileApp.Common.Cancel")}

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


