import { IconPlus } from "@tabler/icons-react-native";
import { View } from "react-native";
import { useCreateContactSheet } from "../../features/contacts/createContactSheetContext";
import { useMobileNavigationTranslations } from "../../lib/i18n/generated/hooks";
import { MOBILE_LAYOUT } from "../../theme/layout";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ActionButton } from "../ui/ActionButton";
import { getActionButtonIconSize } from "../ui/actionButtonTokens";

/**
 * Primary create action beside the tab navigation pill.
 */
export function FloatingCreateContactButton() {
  const tMobileNavigation = useMobileNavigationTranslations();
  const colors = useMobileThemeColors();
  const { openCreateContact } = useCreateContactSheet();
  const iconSize = getActionButtonIconSize("lg");

  return (
    <View
      style={{
        borderRadius: MOBILE_LAYOUT.borderRadius.pill,
        elevation: 4,
        shadowColor: colors.shadow,
        shadowOffset: { height: 6, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      }}
    >
      <ActionButton
        accessibilityLabel={tMobileNavigation("Add")}
        color="primary"
        indicatorColor={colors.textOnPrimary}
        onPress={openCreateContact}
        size="lg"
        testID="fab-create-person"
        variant="filled"
      >
        <IconPlus size={iconSize} stroke={colors.textOnPrimary} />
      </ActionButton>
    </View>
  );
}
